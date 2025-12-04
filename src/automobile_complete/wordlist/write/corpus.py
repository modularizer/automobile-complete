"""
Corpus-based wordlist generation.

Parses words from large text corpora and outputs them
in the format: word #frequency
"""

import re
from collections import Counter
from pathlib import Path


from automobile_complete.utils.typehints import Index



def parse_corpus_file(file_path: Path, pattern: str = r"^[a-zA-Z].+", min_length: int = 2) -> Counter[str]:
    """
    Parse words from a corpus file and count their frequencies.
    
    Args:
        file_path: Path to the corpus text file
        pattern: Regex pattern to filter words. Defaults to r"^[a-zA-Z].+".
        min_length: Minimum word length. Defaults to 2.
    
    Returns:
        Counter mapping words to their frequencies
    """
    word_pattern = re.compile(pattern)
    word_counter = Counter()
    
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            # Split on whitespace and punctuation
            words = re.findall(r'\b\w+\b', line.lower())
            for word in words:
                if len(word) >= min_length and word_pattern.match(word):
                    word_counter[word] += 1
    
    return word_counter


def parse_corpus_files(
    file_paths: list[Path],
    pattern: str = r"^[a-zA-Z].+",
    min_length: int = 2,
) -> Counter[str]:
    """
    Parse words from multiple corpus files and count their frequencies.
    
    Args:
        file_paths: List of paths to corpus text files
        pattern: Regex pattern to filter words. Defaults to r"^[a-zA-Z].+".
        min_length: Minimum word length. Defaults to 2.
    
    Returns:
        Counter mapping words to their total frequencies across all files
    """
    total_counter = Counter()
    
    for file_path in file_paths:
        if not file_path.exists():
            raise FileNotFoundError(f"Corpus file not found: {file_path}")
        file_counter = parse_corpus_file(file_path, pattern, min_length)
        total_counter.update(file_counter)
    
    return total_counter


def generate_corpus_wordlist(
    corpus_files: list[Path],
    pattern: str = r"^[a-zA-Z].+",
    max_words: Index | None = None,
    min_length: Index = 2,
    include_freqs: bool = True,
) -> list[str]:
    """
    Generate wordlist lines in word or word #freq format from corpus files.
    
    Args:
        corpus_files: List of paths to corpus text files
        pattern: Regex pattern to filter words. Defaults to r"^[a-zA-Z].+".
        max_words: Maximum number of words to include. Defaults to None.
        min_length: Minimum word length. Defaults to 2.
        include_freqs: If True, include frequencies (format: "word #freq").
            If False, omit frequencies (format: "word"). Defaults to True.
    
    Returns:
        List of strings in "word #frequency" or "word" format, sorted by frequency (descending)
    """
    word_counter = parse_corpus_files(corpus_files, pattern, min_length)
    
    # Get most common words
    if max_words:
        most_common = word_counter.most_common(max_words)
    else:
        most_common = word_counter.most_common()
    
    # Format as "word #frequency" or just "word"
    output_lines = []
    for word, freq in most_common:
        if include_freqs:
            output_lines.append(f"{word} #{freq}")
        else:
            output_lines.append(word)
    
    return output_lines

