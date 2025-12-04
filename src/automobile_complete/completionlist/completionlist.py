"""
Preprocess wordlist files into completion files.

This module takes wordlist files (word #freq format) and processes them
into completion files (pre|post #freq format) using trie analysis.
"""

import re
from pathlib import Path

from automobile_complete.completionlist.node import (
    dfs,
    Node,
)
from automobile_complete.utils.typehints import Prob, Index
from automobile_complete.wordlist.read import read_wordlist_file


def build_completionlist(
    wordlist_file: Path,
    output_file: Path | None = None,
    word_threshold: Prob | None = None,
    subtree_threshold: Prob | None = 0.5,
    word_ratio_threshold: float = 1.0,
    subtree_ratio_threshold: float = 1.0,
    min_prefix_len: Index = 2,
    min_suffix_len: Index = 2,
    preserve_freqs: bool = True,
) -> list[str]:
    """
    Preprocess a wordlist file into completion format.
    
    Args:
        wordlist_file: Path to wordlist file to process
        output_file: Output file path (if None, returns list of strings)
        word_threshold: Minimum probability threshold for word completion
        subtree_threshold: Minimum probability threshold for subtree completion
        word_ratio_threshold: Ratio threshold for frequency comparison
        subtree_ratio_threshold: Ratio threshold for subtree frequency comparison
        min_prefix_len: Minimum length of prefix before auto-completion
        min_suffix_len: Minimum length of completion suffix
        preserve_freqs: If True, include frequencies in output
        
    Returns:
        List of completion strings in "pre|post #freq" or "pre|post" format
    """
    # Expand ~ in path
    wordlist_file = Path(wordlist_file).expanduser()
    wordlist_dict = read_wordlist_file(wordlist_file)
    
    # Convert dict to list of tuples and sort by frequency (descending)
    # Remove duplicates (keep first occurrence when sorted)
    all_words = list(wordlist_dict.items())
    # Sort by frequency (descending) and remove duplicates (keep first occurrence)
    seen = set()
    unique_words = []
    for word, freq in sorted(all_words, key=lambda x: x[1], reverse=True):
        if word not in seen:
            seen.add(word)
            unique_words.append((word, freq))
    all_words = unique_words
    
    # Create word frequency dict once (for efficient lookup later)
    word_freq_dict = dict(all_words)
    
    # Build trie
    anchor_freq = all_words[0][1] if all_words else 1.0
    tree: Node = Node.build(all_words, anchor_freq)
    
    # Compute frequency statistics via DFS
    word_list = [w for (w, _) in all_words]
    dfs(
        word_list,
        tree,
        1,
        word_threshold=word_threshold,
        subtree_threshold=subtree_threshold,
        word_ratio_threshold=word_ratio_threshold,
        subtree_ratio_threshold=subtree_ratio_threshold,
        min_suffix_len=min_suffix_len,
        min_prefix_len=min_prefix_len,
    )
    
    # Build completion map
    completion_map = tree.build_map()
    
    if completion_map is None:
        completion_map = {}
    
    # Format completions
    output_lines = []
    for word, prefix_completion in completion_map.items():
        # prefix_completion is a list [prefix, completion]
        prefix, completion = prefix_completion[0], prefix_completion[1]
        # Find frequency for this word
        word_freq = word_freq_dict.get(word, 1.0)
        
        if preserve_freqs:
            rounded_freq = int(round(word_freq))
            output_lines.append(f"{prefix}|{completion} #{rounded_freq}")
        else:
            output_lines.append(f"{prefix}|{completion}")
    
    # Sort by frequency (descending)
    output_lines.sort(
        key=lambda line: (
            int(re.search(r"#(\d+)$", line).group(1)) if re.search(r"#(\d+)$", line) else 0
        ) if preserve_freqs else 0,
        reverse=True
    )
    
    # Write output
    if output_file:
        output_file = Path(output_file).expanduser()
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text("\n".join(output_lines))
    
    return output_lines

