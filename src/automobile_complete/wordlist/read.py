from pathlib import Path

from automobile_complete.utils.typehints import Word, Freq



def read_wordlist_file(path: str | Path) -> dict[Word, Freq]:
    """
    Parse a wordlist file into a word->frequency dictionary.

    Args:
        path: Path to wordlist file (supports ~ for home directory)

    Returns:
        Dictionary mapping words to frequencies. Words without frequency default to 1.0
    """
    src = Path(path).expanduser()
    if not src.exists():
        raise FileNotFoundError(f"Wordlist file not found: {src}")
    word_freqs = {}
    lines = src.read_text().splitlines()
    
    # Check first line for WEIGHT= directive (skip it if present)
    first_line_processed = False
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Check first non-empty line for WEIGHT= directive
        if not first_line_processed:
            first_line_processed = True
            if line.upper().startswith("WEIGHT="):
                # Skip this line - weight will be extracted by read_wordlist_file_with_weight
                continue
        
        # Parse "word #frequency" or just "word"
        if " #" in line:
            word, freq_str = line.rsplit(" #", 1)
            try:
                freq = float(freq_str)
                word_freqs[word] = freq
            except ValueError:
                continue
        else:
            # Word without frequency defaults to 1
            word_freqs[line] = 1.0
    
    if not word_freqs:
        raise ValueError("No words found in wordlist file")
    return word_freqs


def read_wordlist_file_with_weight(path: str | Path) -> tuple[dict[Word, Freq], str | None]:
    """
    Parse a wordlist file into a word->frequency dictionary and extract WEIGHT= from first line.
    
    Args:
        path: Path to wordlist file (supports ~ for home directory)
    
    Returns:
        Tuple of (word->frequency dictionary, weight string or None)
        Weight string can be absolute (e.g., "1.5"), percentile (e.g., "50%"), or rank (e.g., "#5")
    """
    src = Path(path).expanduser()
    if not src.exists():
        raise FileNotFoundError(f"Wordlist file not found: {src}")
    
    word_freqs = {}
    weight = None
    lines = src.read_text().splitlines()
    
    # Check first line for WEIGHT= directive
    first_line_processed = False
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Check first non-empty line for WEIGHT= directive
        if not first_line_processed:
            first_line_processed = True
            if line.upper().startswith("WEIGHT="):
                # Extract weight value
                weight_str = line[7:].strip()  # Remove "WEIGHT=" prefix
                if weight_str:
                    weight = weight_str
                continue
        
        # Parse "word #frequency" or just "word"
        if " #" in line:
            word, freq_str = line.rsplit(" #", 1)
            try:
                freq = float(freq_str)
                word_freqs[word] = freq
            except ValueError:
                continue
        else:
            # Word without frequency defaults to 1
            word_freqs[line] = 1.0
    
    if not word_freqs:
        raise ValueError("No words found in wordlist file")
    return word_freqs, weight