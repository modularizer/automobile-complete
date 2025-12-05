"""
Preprocessed completions merging utility.

Merges multiple preprocessed completion files together with configurable weights.
Handles conflicting paths by disabling lower-weighted completions.
"""
from pathlib import Path

from automobile_complete.completionlist.node import Node
from automobile_complete.completionlist.parse import parse_completion_file, parse_completion_file_with_weight
from automobile_complete.utils.typehints import Words
from automobile_complete.wordlist.merge.merge import (
    calculate_weight,
)


def merge_completions(
    completion_files: list[Path],
    weights: list[float | str] | None = None,
    output_file: Path | None = None,
    include_freqs: bool = True,
) -> list[str]:
    """
    Merge multiple preprocessed completion files with optional weights.
    
    Handles conflicting paths by disabling lower-weighted completions.
    When the same prefix has different completions, the one with the
    higher weighted frequency is kept, and the other is disabled.
    
    Args:
        completion_files: List of paths to completion files to merge
        weights: List of weights for each completion file. Can be:
            - float: Absolute weight (multiply all frequencies by this)
            - dict: Relative weight with keys:
                - "percentile": percentile in this completion file (default: 50.0)
                - "reference_percentile": percentile in reference file (default: 50.0)
                - "reference_index": index of reference file (0-based)
            If None, all files get weight 1.0
        output_file: Output file path (if None, returns list of strings)
        include_freqs: If True, include frequencies in output
    
    Returns:
        List of strings in "pre|post #frequency" or "pre|post" format, sorted by frequency (descending)
    """
    if not completion_files:
        raise ValueError("At least one completion file is required")
    
    # Parse all completion files and extract weights from files (expand ~ in paths)
    all_completions = []
    file_weights = []
    for completion_file in completion_files:
        completion_file = Path(completion_file).expanduser()
        if not completion_file.exists():
            raise FileNotFoundError(f"Completion file not found: {completion_file}")
        completions, file_weight = parse_completion_file_with_weight(completion_file)
        all_completions.append(completions)
        file_weights.append(file_weight)
    
    # Use file-based weights if present, otherwise use provided weights, otherwise default to 1.0
    # File weights take highest priority
    if weights is None:
        weights = [1.0] * len(all_completions)
    
    # Override with file-based weights where present
    final_weights = []
    for i, (file_weight, arg_weight) in enumerate(zip(file_weights, weights)):
        if file_weight is not None:
            # File weight takes priority
            final_weights.append(file_weight)
        else:
            # Use argument weight
            final_weights.append(arg_weight)
    
    weights = final_weights
    
    if len(weights) != len(all_completions):
        raise ValueError(
            f"Number of weights ({len(weights)}) must match number of completion files ({len(all_completions)})"
        )
    
    # Build frequency dictionaries for percentile calculation
    freq_dicts = []
    for completions in all_completions:
        freq_dict = {f"{pre}|{post}": freq for pre, post, freq in completions}
        freq_dicts.append(freq_dict)
    
    # Calculate actual weights (resolve percentile-based and rank-based weights)
    # First file is always the reference for relative weights
    reference_freq_dict = freq_dicts[0] if freq_dicts else None
    actual_weights = []
    for i, (freq_dict, weight) in enumerate(zip(freq_dicts, weights)):
        if isinstance(weight, str) and (weight.endswith("%") or weight.startswith("#")):
            # Percentile-based or rank-based relative weight - use first file as reference
            actual_weight = calculate_weight(freq_dict, weight, reference_freq_dict)
        else:
            # Absolute weight
            actual_weight = float(weight)
        actual_weights.append(actual_weight)
    
    # Build tries for each completion file to handle conflicts
    # Convert completions to words: (prefix, completion, freq) -> (word, freq)
    tries = []
    # Track which trie contains which completion: (pre, post) -> list of (trie_index, weighted_freq)
    completion_to_tries: dict[tuple[str, str], list[tuple[int, float]]] = {}
    
    for trie_index, (completions, weight) in enumerate(zip(all_completions, actual_weights)):
        # Convert completion pairs to words for building Node trie
        words: Words = []
        for pre, post, freq in completions:
            weighted_freq = freq * weight
            word = pre + post  # Complete word = prefix + completion
            words.append((word, weighted_freq))
            key = (pre, post)
            if key not in completion_to_tries:
                completion_to_tries[key] = []
            completion_to_tries[key].append((trie_index, weighted_freq))
        
        # Build Node trie from words
        anchor_freq = words[0][1] if words else 1.0
        trie = Node.build(words, anchor_freq=anchor_freq)
        
        # Set auto_suffix for each completion node
        for pre, post, freq in completions:
            node = trie
            for ch in pre:
                node = node[ch]  # Navigate to prefix node using __getitem__
            # Set auto_suffix to the completion
            node.auto_suffix = post
        
        tries.append(trie)
    
    # Group completions by prefix to detect conflicts
    # prefix -> list of (completion, total_weighted_freq, list of trie_indices that have it)
    prefix_to_completions: dict[str, list[tuple[str, float, list[int]]]] = {}
    for (pre, post), trie_info_list in completion_to_tries.items():
        # Sum weighted frequencies if same completion appears in multiple files
        total_weighted_freq = sum(weighted_freq for _, weighted_freq in trie_info_list)
        trie_indices = [trie_index for trie_index, _ in trie_info_list]
        if pre not in prefix_to_completions:
            prefix_to_completions[pre] = []
        prefix_to_completions[pre].append((post, total_weighted_freq, trie_indices))
    
    # For each prefix, find the completion with highest weighted frequency
    # and disable all others in all tries that contain them
    for pre, completions_list in prefix_to_completions.items():
        if len(completions_list) <= 1:
            # No conflict, keep this completion
            continue
        
        # Sort by weighted frequency (descending)
        completions_list.sort(key=lambda x: x[1], reverse=True)
        
        # Keep the highest-weighted completion, disable all others
        for post, total_weighted_freq, trie_indices in completions_list[1:]:
            # Disable this completion in all tries that contain it
            for trie_index in trie_indices:
                tries[trie_index].disable(pre, post)
    
    # Collect final completions from all tries (excluding disabled ones)
    final_completions: dict[tuple[str, str], tuple[float, int]] = {}
    for trie_index, (trie, completions, weight) in enumerate(zip(tries, all_completions, actual_weights)):
        for completion_index, (pre, post, freq) in enumerate(completions):
            # Check if this completion is disabled
            node = trie
            is_disabled = False
            for ch in pre:
                node = node[ch]  # Navigate using __getitem__
                if node is None:
                    # Path doesn't exist, skip
                    is_disabled = True
                    break
            
            if not is_disabled and node is not None:
                # Check if auto_suffix matches (if it doesn't or is None, it was disabled)
                if node.auto_suffix != post:
                    is_disabled = True
            
            if not is_disabled:
                weighted_freq = freq * weight
                key = (pre, post)
                # Sum frequencies if same prefix|completion appears in multiple files
                # Track the minimum original index for tiebreaking
                existing = final_completions.get(key, (0.0, float('inf')))
                # Use the minimum index (earliest occurrence) as tiebreaker
                min_index = min(existing[1], completion_index)
                final_completions[key] = (existing[0] + weighted_freq, min_index)
    
    # Format output
    output_lines = []
    # Sort by frequency (descending), then by original index (ascending) as tiebreaker
    for (pre, post), (weighted_freq, orig_index) in sorted(
        final_completions.items(), key=lambda x: (-x[1][0], x[1][1])
    ):
        if include_freqs:
            rounded_freq = int(round(weighted_freq))
            output_lines.append(f"{pre}|{post} #{rounded_freq}")
        else:
            output_lines.append(f"{pre}|{post}")
    
    # Write output
    if output_file:
        output_file = Path(output_file).expanduser()
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text("\n".join(output_lines))
    
    return output_lines

