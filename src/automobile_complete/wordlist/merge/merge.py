"""
Wordlist merging utility.

Merges multiple wordlist files together with configurable weights.
Supports both absolute weights and relative weights based on percentiles.
"""
from pathlib import Path

from automobile_complete.utils.typehints import Word, Freq
from automobile_complete.wordlist.read import read_wordlist_file, read_wordlist_file_with_weight


def get_percentile_freq(wordlist: dict[Word, Freq], percentile: float) -> Freq:
    """
    Get the frequency at a given percentile in a wordlist.
    
    Args:
        wordlist: Dictionary mapping words to frequencies
        percentile: Percentile value (0.0 to 100.0), e.g., 50.0 for median
    
    Returns:
        Frequency value at the specified percentile
    """
    if not wordlist:
        return 1.0
    
    freqs = sorted(wordlist.values(), reverse=True)
    index = int(len(freqs) * (percentile / 100.0))
    index = max(0, min(index, len(freqs) - 1))
    return freqs[index]


def get_rank_freq(wordlist: dict[Word, Freq], rank: int) -> Freq:
    """
    Get the frequency at a given rank in a wordlist.
    
    Args:
        wordlist: Dictionary mapping words to frequencies
        rank: Rank (1-based, positive for highest to lowest, negative for lowest to highest)
              e.g., 1 = highest, 2 = second highest, -1 = lowest, -2 = second lowest
    
    Returns:
        Frequency value at the specified rank
    """
    if not wordlist:
        return 1.0
    
    freqs = sorted(wordlist.values(), reverse=True)
    
    if rank > 0:
        # Positive rank: 1 = highest, 2 = second highest, etc.
        index = rank - 1
        if index < 0:
            index = 0
        if index >= len(freqs):
            index = len(freqs) - 1
        return freqs[index]
    elif rank < 0:
        # Negative rank: -1 = lowest, -2 = second lowest, etc.
        index = len(freqs) + rank  # rank is negative, so this subtracts
        if index < 0:
            index = 0
        if index >= len(freqs):
            index = len(freqs) - 1
        return freqs[index]
    else:
        # rank == 0, invalid
        raise ValueError("Rank cannot be 0. Use positive (e.g., #1) or negative (e.g., #-1) rank.")


def calculate_weight(
    wordlist: dict[Word, Freq],
    weight: float | str,
    reference_wordlist: dict[Word, Freq] | None = None,
) -> float:
    """
    Calculate the actual weight multiplier for a wordlist.
    
    Args:
        wordlist: The wordlist to calculate weight for (custom/secondary list)
        weight: Either:
            - float: Absolute weight (multiply all frequencies by this)
            - str ending with "%": Percentile-based relative weight (e.g., "50%")
              Scales so that freq 1 in custom list = x percentile freq from reference list
            - str starting with "#": Rank-based relative weight (e.g., "#5" or "#-1")
              Scales so that freq 1 in custom list = rank N freq from reference list
              Positive rank: #5 = 5th highest, #1 = highest
              Negative rank: #-1 = lowest, #-2 = second lowest
        reference_wordlist: Reference wordlist (first list) for relative weighting
    
    Returns:
        The calculated weight multiplier
    """
    if isinstance(weight, (int, float)):
        # Absolute weight: multiply frequencies by this value
        return float(weight)
    elif isinstance(weight, str) and weight.endswith("%"):
        # Percentile-based relative weight
        if reference_wordlist is None:
            raise ValueError("Reference wordlist required for percentile-based weighting")
        
        try:
            percentile = float(weight[:-1])
        except ValueError:
            raise ValueError(f"Invalid percentile format: {weight}")
        
        if percentile < 0 or percentile > 100:
            raise ValueError(f"Percentile must be between 0 and 100, got {percentile}")
        
        # Get the frequency at the specified percentile in the reference (first) list
        ref_freq = get_percentile_freq(reference_wordlist, percentile)
        
        # Scale so that freq 1 in custom list = ref_freq
        return ref_freq
    elif isinstance(weight, str) and weight.startswith("#"):
        # Rank-based relative weight
        if reference_wordlist is None:
            raise ValueError("Reference wordlist required for rank-based weighting")
        
        try:
            rank = int(weight[1:])  # Remove the "#" prefix
        except ValueError:
            raise ValueError(f"Invalid rank format: {weight}. Use #N (e.g., #5) or #-N (e.g., #-1)")
        
        if rank == 0:
            raise ValueError("Rank cannot be 0. Use positive (e.g., #1) or negative (e.g., #-1) rank.")
        
        # Get the frequency at the specified rank in the reference (first) list
        ref_freq = get_rank_freq(reference_wordlist, rank)
        
        # Scale so that freq 1 in custom list = ref_freq
        return ref_freq
    else:
        raise ValueError(
            f"Invalid weight type: {type(weight)}. Expected float, string ending with '%', or string starting with '#'."
        )


def merge_wordlists(
    wordlist_files: list[Path],
    weights: list[float | str] | None = None,
    output_file: Path | None = None,
    include_freqs: bool = True,
) -> list[str]:
    """
    Merge multiple wordlist files with optional weights.
    
    Args:
        wordlist_files: List of paths to wordlist files to merge
        weights: List of weights for each wordlist. Can be:
            - float: Absolute weight (multiply all frequencies by this)
            - dict: Relative weight with keys:
                - "percentile": percentile in this wordlist (default: 50.0)
                - "reference_percentile": percentile in reference wordlist (default: 50.0)
                - "reference_index": index of reference wordlist (0-based)
            If None, all wordlists get weight 1.0
        output_file: Output file path (if None, returns list of strings)
        include_freqs: If True, include frequencies in output
    
    Returns:
        List of strings in "word #frequency" or "word" format, sorted by frequency (descending)
    """
    if not wordlist_files:
        raise ValueError("At least one wordlist file is required")
    
    # Parse all wordlists and extract weights from files (expand ~ in paths)
    wordlists = []
    file_weights = []
    for wordlist_file in wordlist_files:
        wordlist_file = Path(wordlist_file).expanduser()
        if not wordlist_file.exists():
            raise FileNotFoundError(f"Wordlist file not found: {wordlist_file}")
        wordlist, file_weight = read_wordlist_file_with_weight(wordlist_file)
        wordlists.append(wordlist)
        file_weights.append(file_weight)
    
    # Use file-based weights if present, otherwise use provided weights, otherwise default to 1.0
    # File weights take highest priority
    if weights is None:
        weights = [1.0] * len(wordlists)
    
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
    
    if len(weights) != len(wordlists):
        raise ValueError(f"Number of weights ({len(weights)}) must match number of wordlists ({len(wordlists)})")
    
    # Calculate actual weights (resolve percentile-based and rank-based weights)
    # First list is always the reference for relative weights
    reference_wordlist = wordlists[0] if wordlists else None
    actual_weights = []
    for i, (wordlist, weight) in enumerate(zip(wordlists, weights)):
        if isinstance(weight, str) and (weight.endswith("%") or weight.startswith("#")):
            # Percentile-based or rank-based relative weight - use first list as reference
            actual_weight = calculate_weight(wordlist, weight, reference_wordlist)
        else:
            # Absolute weight
            actual_weight = float(weight)
        actual_weights.append(actual_weight)
    
    # Merge wordlists with weights
    merged: dict[Word, Freq] = {}
    for wordlist, weight in zip(wordlists, actual_weights):
        for word, freq in wordlist.items():
            weighted_freq = freq * weight
            # Sum frequencies if word appears in multiple lists
            merged[word] = merged.get(word, 0.0) + weighted_freq
    
    # Sort by frequency (descending)
    sorted_words = sorted(merged.items(), key=lambda x: x[1], reverse=True)
    
    # Format output
    output_lines = []
    for word, freq in sorted_words:
        if include_freqs:
            rounded_freq = int(round(freq))
            output_lines.append(f"{word} #{rounded_freq}")
        else:
            output_lines.append(word)
    
    # Write output
    if output_file:
        output_file = Path(output_file).expanduser()
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text("\n".join(output_lines))
    
    return output_lines

