"""
Wordlist merging utility.

Merges multiple wordlist files together with configurable weights.
Supports both absolute weights and relative weights based on percentiles.
"""
from pathlib import Path

from automobile_complete.utils.typehints import Word, Freq
from automobile_complete.wordlist.read import read_wordlist_file


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


def calculate_weight(
    wordlist: dict[Word, Freq],
    weight: float | dict[str, float],
    reference_wordlist: dict[Word, Freq] | None = None,
) -> float:
    """
    Calculate the actual weight multiplier for a wordlist.
    
    Args:
        wordlist: The wordlist to calculate weight for
        weight: Either a float (absolute weight) or a dict with:
            - "percentile": percentile in this wordlist (0-100)
            - "reference_percentile": percentile in reference wordlist (0-100)
            - "reference_wordlist": index of reference wordlist (0-based)
        reference_wordlist: Reference wordlist for relative weighting
    
    Returns:
        The calculated weight multiplier
    """
    if isinstance(weight, (int, float)):
        # Absolute weight
        return float(weight)
    elif isinstance(weight, dict):
        # Relative weight based on percentiles
        if reference_wordlist is None:
            raise ValueError("Reference wordlist required for relative weighting")
        
        this_percentile = weight.get("percentile", 50.0)
        ref_percentile = weight.get("reference_percentile", 50.0)
        
        this_freq = get_percentile_freq(wordlist, this_percentile)
        ref_freq = get_percentile_freq(reference_wordlist, ref_percentile)
        
        if this_freq == 0:
            return 1.0
        
        # Scale so that this_percentile of this wordlist equals ref_percentile of reference
        return ref_freq / this_freq
    else:
        raise ValueError(f"Invalid weight type: {type(weight)}")


def merge_wordlists(
    wordlist_files: list[Path],
    weights: list[float | dict[str, float]] | None = None,
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
    
    # Parse all wordlists (expand ~ in paths)
    wordlists = []
    for wordlist_file in wordlist_files:
        wordlist_file = Path(wordlist_file).expanduser()
        if not wordlist_file.exists():
            raise FileNotFoundError(f"Wordlist file not found: {wordlist_file}")
        wordlists.append(read_wordlist_file(wordlist_file))
    
    # Default weights to 1.0 for all
    if weights is None:
        weights = [1.0] * len(wordlists)
    
    if len(weights) != len(wordlists):
        raise ValueError(f"Number of weights ({len(weights)}) must match number of wordlists ({len(wordlists)})")
    
    # Calculate actual weights (resolve relative weights)
    actual_weights = []
    for i, (wordlist, weight) in enumerate(zip(wordlists, weights)):
        if isinstance(weight, dict):
            # Relative weight - need reference wordlist
            ref_index = weight.get("reference_index", 0)
            if ref_index < 0 or ref_index >= len(wordlists):
                raise ValueError(f"Invalid reference_index {ref_index} (must be 0-{len(wordlists)-1})")
            reference_wordlist = wordlists[ref_index]
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

