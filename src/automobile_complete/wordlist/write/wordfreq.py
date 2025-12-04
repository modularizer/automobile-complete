"""
Wordfreq-based wordlist generation.

Fetches words from wordfreq language wordlists and outputs them
in the format: word #frequency
"""

import re

from wordfreq import iter_wordlist, zipf_frequency
from automobile_complete.utils.typehints import Word, Words, Freq, Index


def get_words(
    lang: str = "en",
    pattern: str = r"^[a-zA-Z].+",
    max_words: Index | None = None,
    min_length: Index = 2,
) -> Words:
    """
    Get a sorted list of words and their frequencies from language wordlists.
    
    Fetches words from the wordfreq library and filters them according to specified
    criteria. The words are sorted by frequency (descending).
    
    Args:
        lang: Language code (e.g., "en" for English). Defaults to "en".
        pattern: Regular expression pattern to filter words. Only words matching
            this pattern are included. Defaults to r"^[a-zA-Z].+" (starts with
            letter, followed by one or more characters).
        max_words: Maximum number of words to return. If None, all matching words
            are included. Defaults to None.
        min_length: Minimum word length (in characters). Words shorter than this
            are excluded. Defaults to 2.
    
    Returns:
        List of (word, frequency) tuples, sorted by frequency (descending)
    """
    # Fetch words from wordfreq library and filter by pattern and length
    words_by_freq: list[Word] = [w for w in iter_wordlist(lang) if re.match(pattern, w) and len(w) >= min_length]
    # Convert zipf frequency scores to actual frequency values
    word_occurences: list[Freq] = [10 ** zipf_frequency(k, lang) for k in words_by_freq]
    
    # Zip words with frequencies, sort by frequency (descending), and limit count
    z = zip(words_by_freq, word_occurences)
    z: Words = list(sorted(z, key=lambda x: x[1], reverse=True))[:max_words]
    return z


def generate_wordfreq_wordlist(
    lang: str = "en",
    pattern: str = r"^[a-zA-Z].+",
    max_words: Index | None = None,
    min_length: Index = 2,
    include_freqs: bool = True,
) -> list[str]:
    """
    Generate wordlist lines in word or word #freq format from wordfreq.
    
    Args:
        lang: Language code (e.g., "en" for English). Defaults to "en".
        pattern: Regex pattern to filter words. Defaults to r"^[a-zA-Z].+".
        max_words: Maximum number of words to include. Defaults to None.
        min_length: Minimum word length. Defaults to 2.
        include_freqs: If True, include frequencies (format: "word #freq").
            If False, omit frequencies (format: "word"). Defaults to True.
    
    Returns:
        List of strings in "word #frequency" or "word" format
    """
    words = get_words(lang=lang, pattern=pattern, max_words=max_words, min_length=min_length)
    
    # Format words as "word #frequency" or just "word"
    output_lines = []
    for word, freq in words:
        if include_freqs:
            rounded_freq = int(round(freq))
            output_lines.append(f"{word} #{rounded_freq}")
        else:
            output_lines.append(word)
    
    return output_lines

