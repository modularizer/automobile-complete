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
    for line in src.read_text().splitlines():
        line = line.strip()
        if not line:
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