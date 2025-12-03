"""
Preprocessing module for building an autocomplete trie data structure.

This module provides functionality to:
- Fetch and filter words from language wordlists
- Build a trie (prefix tree) data structure for efficient autocomplete
- Compute frequency statistics and auto-completion suggestions
- Export the trie to various file formats (JSON, JS, TS, Python, etc.)

The trie structure enables efficient prefix-based word completion with frequency
weighting, allowing for intelligent autocomplete suggestions based on word usage
statistics.
"""

import argparse
import json
import re
import time
from pathlib import Path
from typing import Any, Literal

from wordfreq import iter_wordlist, zipf_frequency


# Type aliases for self-documenting type hints
Word = str  # A single word string
Prefix = str  # A prefix string (may or may not be a complete word)
Completion = str  # A completion/suffix string to append to a prefix
Freq = float  # Word frequency value
Prob = float  # Probability value (0.0 to 1.0)
Index = int  # Index into a list/array
RoundedFreq = int  # Rounded frequency value (integer)
Sort = Literal["prefix", "freq", "sum_freq"]  # Sorting options for word lists

# Composite type aliases
Words = list[tuple[Word, Freq]]  # List of (word, frequency) tuples

def get_words(
    lang: str | None = "en",
    pattern: str = r"^[a-zA-Z].+",
    max_words: Index | None = None,
    min_length: Index = 2,
    custom_words: dict[Word, RoundedFreq] | list[Word] | None = None,
    custom_words_anchor_place: Index | None = None,
    custom_words_anchor_freq: Freq | None = None,
) -> tuple[Words, Freq]:
    """
    Get a sorted list of words and their frequencies from language wordlists.
    
    Fetches words from the wordfreq library, filters them according to specified
    criteria, and optionally merges in custom words with appropriate frequency
    anchoring. The words are sorted by frequency (descending).
    
    Args:
        lang: Language code (e.g., "en" for English). If None, only custom words
            are used. Defaults to "en".
        pattern: Regular expression pattern to filter words. Only words matching
            this pattern are included. Defaults to r"^[a-zA-Z].+" (starts with
            letter, followed by one or more characters).
        max_words: Maximum number of words to return. If None, all matching words
            are included. Defaults to None.
        min_length: Minimum word length (in characters). Words shorter than this
            are excluded. Defaults to 2.
        custom_words: Custom words to add to the wordlist. Can be:
            - A dict mapping words to relative frequencies (e.g., {"word": 2})
            - A list of words (each gets frequency 1)
            - None to skip custom words
            Defaults to None.
        custom_words_anchor_place: Index position in the sorted wordlist to use
            as an anchor for custom word frequencies. The frequency of the word
            at this position is used as a baseline. If None, uses the word at
            position 200 (or the last word if fewer than 200 words exist).
            Defaults to None.
        custom_words_anchor_freq: Explicit frequency value to use as anchor for
            custom words. If provided, overrides custom_words_anchor_place.
            Defaults to None.
    
    Returns:
        A tuple containing:
            - List of (word, frequency) tuples, sorted by frequency (descending)
            - The anchor frequency value used for custom words
    
    Example:
        >>> words, anchor = get_words(lang="en", max_words=1000, min_length=3)
        >>> print(f"Found {len(words)} words with anchor frequency {anchor}")
    """
    # Handle case where no language is specified (custom words only)
    if not lang:
        words_by_freq: list[Word] = []  # Words from wordlist, filtered and sorted
        word_occurences: list[Freq] = []  # Frequency values for each word
        # Use provided anchor frequency or default to 1
        anchor_freq: Freq = custom_words_anchor_freq or 1
    else:
        # Fetch words from wordfreq library and filter by pattern and length
        words_by_freq: list[Word] = [w for w in iter_wordlist(lang) if re.match(pattern, w) and len(w) >= min_length]
        # Convert zipf frequency scores to actual frequency values
        # zipf_frequency returns log10 values, so we exponentiate to get frequencies
        word_occurences: list[Freq] = [10 ** zipf_frequency(k, lang) for k in words_by_freq]

        # Determine anchor frequency for custom words
        if custom_words_anchor_freq is not None:
            # Use explicitly provided anchor frequency
            anchor_freq: Freq = custom_words_anchor_freq
        else:
            # Calculate anchor frequency from word at specified position
            # Clamp the anchor position to valid range
            custom_words_anchor: Index = max(-len(words_by_freq), min(len(words_by_freq), custom_words_anchor_place or 200))
            # Get frequency of anchor word and add small offset to ensure custom words
            # are slightly more prominent than the anchor
            anchor_freq: Freq = 10 ** zipf_frequency(words_by_freq[custom_words_anchor], lang) + 0.1

    # Process custom words: convert list to dict or scale frequencies by anchor
    # If custom_words is a list, assign anchor_freq to each word
    # If it's a dict, multiply each frequency by anchor_freq
    cw: dict[Word, Freq] = {cw: anchor_freq for cw in custom_words} if isinstance(custom_words, list) else {w: v*anchor_freq for w, v in custom_words.items()} if custom_words else {}
    # Remove custom words that already exist in the wordlist to avoid duplicates
    cw = {w: v for w, v in cw.items() if w not in words_by_freq}

    # Combine base words and custom words
    all_words: list[Word] = words_by_freq + list(cw.keys())
    all_freqs: list[Freq] = word_occurences + list(cw.values())
    
    # Zip words with frequencies, sort by frequency (descending), and limit count
    z = zip(all_words, all_freqs)
    z: Words = list(sorted(z, key=lambda x: x[1], reverse=True))[:max_words]
    return z, anchor_freq


class Node:
    """
    Represents a node in a trie (prefix tree) data structure for autocomplete.
    
    Each node corresponds to a prefix string and stores:
    - The prefix string itself
    - Child nodes for each possible next character
    - Word completion information if this prefix is a complete word
    - Frequency statistics for autocomplete ranking
    - Auto-completion suggestions based on frequency analysis
    
    The trie enables efficient prefix-based word lookup and completion suggestions
    by organizing words in a tree structure where each path from root to leaf
    represents a word, and shared prefixes share common nodes.
    
    Attributes:
        words: The complete wordlist as (word, frequency) tuples
        prefix: The prefix string represented by this node
        children: Dictionary mapping next characters to child Node objects
        word_id: Index of this word in the wordlist if prefix is a complete word, else None
        word_freq: Frequency of this word (if prefix is a word), else 0.0
        sum_freq: Total frequency of this node plus all descendants (subtree frequency)
        best_word_id: Index of the highest-frequency word in this node's subtree
        best_word_freq: Frequency of the best word in this subtree
        best_word_subtree_id: Index of the word with best sum_freq in subtree
        best_word_subtree_freq: Word frequency of the best subtree word
        best_word_subtree_sum_freq: Subtree frequency of the best subtree word
        best_child_char: Character leading to the child with highest sum_freq
        best_child_sum_freq: Highest sum_freq among all children
        auto_word_id: Index of the word selected for auto-completion at this prefix
        auto_suffix: Suffix to append to prefix to complete the auto-selected word
        has_auto: Whether this node has an auto-completion suggestion
        anchor_freq: Reference frequency used for normalization
    """
    def __init__(self, words: Words, prefix: Prefix, anchor_freq: Freq = 1,):
        """Initialize a trie node with the given prefix and wordlist."""
        self.words = words  # Complete wordlist: list of (word, frequency) tuples
        self.prefix: Prefix = prefix  # The prefix string this node represents
        self.children: dict[str, "Node"] = {}  # Child nodes keyed by next character


        # Word completion information (if this prefix is a complete word)
        self.word_id: Index | None = None  # Index of this word in the wordlist
        self.word_freq: Freq = 0.0  # Frequency of this word (if prefix is a word)

        # Subtree frequency: sum of this node's frequency plus all descendants
        # This represents the total probability mass in this subtree
        self.sum_freq: Freq = 0.0

        # Best word tracking: find the highest-frequency word in this subtree
        # This may be the word at this node or a word in a child subtree
        self.best_word_id: Index | None = None  # Index of best word in subtree
        self.best_word_freq: Freq = 0.0  # Frequency of best word

        # Best subtree word: find the word with the best sum_freq (subtree frequency)
        # This considers not just the word itself but all words that extend from it
        self.best_word_subtree_id: Index | None = None  # Index of word with best subtree
        self.best_word_subtree_freq: Freq = 0.0  # Word frequency of best subtree word
        self.best_word_subtree_sum_freq: Freq = 0.0  # Subtree frequency of best word

        # Best child tracking: find which next character leads to the best subtree
        self.best_child_char: str | None = None  # Character leading to best child
        self.best_child_sum_freq: Freq = 0.0  # Sum frequency of best child subtree

        # Auto-completion selection: the word and suffix chosen for auto-complete
        # These are computed during DFS traversal based on frequency thresholds
        self.auto_word_id: Index | None = None  # Index of auto-completed word
        self.auto_suffix: Completion | None = None  # Suffix to append for auto-completion
        self.has_auto: bool | None = None  # Whether auto-completion is available

        self.anchor_freq: Freq = anchor_freq  # Reference frequency for normalization

    @property
    def is_word(self) -> bool:
        """
        Check if this node represents a complete word.
        
        Returns:
            True if this prefix is a complete word in the wordlist, False otherwise.
        """
        return self.word_id is not None

    @property
    def auto_word(self) -> Word | None:
        """
        Get the auto-completed word for this prefix.
        
        Returns:
            The full word selected for auto-completion, or None if no auto-completion
            is available at this prefix.
        """
        return self.words[self.auto_word_id][0] if self.auto_word_id is not None else None

    @property
    def best_word_subtree(self) -> Word | None:
        """
        Get the word with the best subtree frequency in this node's subtree.
        
        Returns:
            The word with the highest subtree frequency, or None if no such word exists.
        """
        return self.words[self.best_word_subtree_id][0] if self.best_word_subtree_id is not None else None

    @property
    def best_word(self) -> Word | None:
        """
        Get the highest-frequency word in this node's subtree.
        
        Returns:
            The word with the highest individual frequency, or None if no words exist.
        """
        return self.words[self.best_word_id][0] if self.best_word_id is not None else None

    def get_all_words(self, words: list | None = None) -> list[tuple[Prefix, Freq, Freq]]:
        """
        Recursively collect all words in this node's subtree.
        
        Args:
            words: Accumulator list for collecting words. If None, creates a new list.
        
        Returns:
            List of tuples (prefix, word_freq, sum_freq) for all words in the subtree.
        """
        words = words or []
        if self.is_word:
            words.append((self.prefix, self.word_freq, self.sum_freq))
        for ch in self.children:
            self.children[ch].get_all_words(words)
        return words

    def sorted_next_char(self) -> list[str]:
        """
        Get next characters sorted by their word frequency (descending).
        
        Returns:
            List of characters that can follow this prefix, sorted by the frequency
            of the word at each child node (highest first).
        """
        return [k for k, v in sorted(self.children.items(), key=lambda x: x[1].word_freq, reverse=True)]

    def sorted_next_char_str(self, j: str = "") -> str:
        """
        Get next characters as a joined string, sorted by frequency.
        
        Args:
            j: Joiner string to use between characters. Defaults to "" (no separator).
        
        Returns:
            String of next characters joined together, sorted by frequency.
        """
        return j.join(self.sorted_next_char())

    def __repr__(self) -> str:
        """
        String representation of the node showing autocomplete options.
        
        Returns:
            Formatted string showing top autocomplete suggestions with frequencies.
        """
        return self.build_show_str(10, word_threshold=0.01, sum_threshold=0.1, sum_ratio_threshold=10)

    def __getattr__(self, name: str):
        """
        Enable attribute-style access to child nodes by character sequence.
        
        Allows accessing nodes like node.abc instead of node.children['a'].children['b'].children['c']
        
        Args:
            name: String of characters representing the path to a child node.
        
        Returns:
            The Node at the end of the path, or None if the path doesn't exist.
        """
        node = self
        for char in name:
            node = node.children.get(char)
            if node is None:
                return None
        return node

    def __getitem__(self, item):
        """
        Enable dictionary-style access to child nodes.
        
        Args:
            item: Character or string path to a child node.
        
        Returns:
            The Node at the specified path, or None if it doesn't exist.
        """
        return getattr(self, item)

    def __dir__(self) -> list[str]:
        """
        Return list of available attributes including child node characters.
        
        This enables tab completion in interactive environments to show available
        next characters for navigation.
        
        Returns:
            List of attribute names including standard attributes plus child characters.
        """
        return super().__dir__() + self.sorted_next_char()

    def list_options(self,
                     n: Index | None = None,
                     word_freq_threshold: Freq = 0.0,
                     sum_freq_threshold: Freq = 0.0,
                     word_ratio_threshold: float = 1000,
                     sum_ratio_threshold: float = 1000,
                     sort_by: Sort | None = None) -> list[tuple[Word, "Node"]]:
        """
        Return top-n words in this node's subtree as (word, node) tuples.
        
        Collects all words in the subtree that meet the specified frequency thresholds
        and returns them sorted by the requested criteria. This is used to generate
        autocomplete suggestions for a given prefix.
        
        Args:
            n: Maximum number of words to return. If None, returns all matching words.
            word_freq_threshold: Minimum word frequency (absolute) to include a word.
                Words with frequency below this are filtered out.
            sum_freq_threshold: Minimum subtree frequency (absolute) to include a word.
                Words with subtree frequency below this are filtered out.
            word_ratio_threshold: Ratio threshold for word frequency. Words must have
                frequency at least (best_word_freq / word_ratio_threshold) to be included.
                Higher values allow more words through.
            sum_ratio_threshold: Ratio threshold for subtree frequency. Words must have
                subtree frequency at least (best_subtree_freq / sum_ratio_threshold).
                Higher values allow more words through.
            sort_by: How to sort the results. Options:
                - "prefix": Alphabetical by word
                - "freq": By word frequency (descending)
                - "sum_freq": By subtree frequency (descending)
                - None: No sorting (keeps DFS traversal order)
        
        Returns:
            List of (word, node) tuples for words meeting the criteria, sorted as
            specified. Each node contains frequency information for the word.
        
        Note:
            Assumes dfs(...) has already been run to populate sum_freq and other
            frequency statistics in the subtree.
        """
        # Early return if no words exist in this subtree
        if self.sum_freq <= 0 or not self.children:
            return []

        words: list[tuple[str, Node]] = []
        # Track best frequencies for ratio-based filtering
        stats = {
            "bwf": 0.0,  # Best word frequency
            "bwsf": 0.0,  # Best word subtree frequency
        }
        
        def collect(node: "Node", skip_first=True):
            """
            Recursively collect words from the subtree.
            
            Args:
                node: Current node being processed
                skip_first: If True, skip the root node (to avoid double-counting)
            """
            # Any node with a word_id is a valid completion, even if it has children
            # (a word can be a prefix of other words)
            if not skip_first and node.word_id is not None and (node.word_freq or 0) >= word_freq_threshold and (node.sum_freq or 0) >= sum_freq_threshold:
                w = node.words[node.word_id][0]  # Get the actual word string
                words.append((w, node))
                # Update best frequencies for ratio calculations
                if (node.word_freq or 0) > stats["bwf"]:
                    stats["bwf"] = node.word_freq
                if (node.sum_freq or 0) > stats["bwsf"]:
                    stats["bwsf"] = node.sum_freq
            # Recursively process all children
            for child in node.children.values():
                collect(child, False)

        # Collect all words in the subtree
        collect(self)
        # Apply ratio-based filtering: words must be within ratio_threshold of the best
        words = [(w, n) for w, n in words if (n.word_freq or 0) >= (stats["bwf"]/word_ratio_threshold) and (n.sum_freq or 0) >= (stats["bwsf"]/sum_ratio_threshold)]

        # Sort by the specified criteria
        if sort_by:
            # Sort by the requested attribute (freq, sum_freq, or prefix)
            if sort_by == "prefix":
                words.sort(key=lambda x: x[0])  # Alphabetical by word
            else:
                # Sort by node attribute (freq or sum_freq), descending
                words.sort(key=lambda x: getattr(x[1], sort_by), reverse=True)

        # Return top n words
        return words[:n]

    def list_options_normalized(self, n: Index | None = None, word_threshold: Prob = 0.0, sum_threshold: Prob = 0.0,  word_ratio_threshold: float = 1000,
                     sum_ratio_threshold: float = 1000, sort_by: Sort = "sum_freq"):
        """
        List autocomplete options with normalized thresholds.
        
        This is a convenience wrapper around list_options that normalizes thresholds
        relative to this node's subtree frequency. This makes it easier to specify
        thresholds as percentages of the total subtree frequency.
        
        Args:
            n: Maximum number of words to return.
            word_threshold: Minimum word frequency as a fraction of subtree frequency.
            sum_threshold: Minimum subtree frequency as a fraction of this node's sum_freq.
            word_ratio_threshold: Ratio threshold for word frequency filtering.
            sum_ratio_threshold: Ratio threshold for subtree frequency filtering.
            sort_by: How to sort results ("prefix", "freq", or "sum_freq").
        
        Returns:
            List of (word, node) tuples meeting the criteria.
        """
        # Normalize thresholds by multiplying by subtree frequency
        return self.list_options(n, word_freq_threshold=word_threshold*self.sum_freq, sum_freq_threshold=sum_threshold*self.sum_freq, word_ratio_threshold=word_ratio_threshold, sum_ratio_threshold=sum_ratio_threshold, sort_by=sort_by)

    def list_words(self, n: Index | None = None, word_threshold: Prob = 0.0, sum_threshold: Prob = 0.0,  word_ratio_threshold: float = 1000,
                     sum_ratio_threshold: float = 1000, sort_by: Sort = "sum_freq"):
        """
        Get list of word strings (without node objects) for autocomplete options.
        
        Convenience method that extracts just the word strings from list_options_normalized.
        
        Args:
            n: Maximum number of words to return.
            word_threshold: Minimum word frequency as a fraction of subtree frequency.
            sum_threshold: Minimum subtree frequency as a fraction of this node's sum_freq.
            word_ratio_threshold: Ratio threshold for word frequency filtering.
            sum_ratio_threshold: Ratio threshold for subtree frequency filtering.
            sort_by: How to sort results ("prefix", "freq", or "sum_freq").
        
        Returns:
            List of word strings (not tuples) meeting the criteria.
        """
        return [w for (w, _) in self.list_options_normalized(n, word_threshold=word_threshold, sum_threshold=sum_threshold, word_ratio_threshold=word_ratio_threshold, sum_ratio_threshold=sum_ratio_threshold, sort_by=sort_by)]

    def build_show_str(self, n: Index | None = 5, word_threshold: Prob = 0.0, sum_threshold: Prob = 0.0,  word_ratio_threshold: float = 1000,
                     sum_ratio_threshold: float = 1000, sort_by: Sort = "sum_freq"):
        """
        Build a formatted string showing autocomplete options with frequencies.
        
        Creates a human-readable string showing the top autocomplete suggestions,
        with percentages and highlighting for the auto-selected word.
        
        Args:
            n: Maximum number of words to show.
            word_threshold: Minimum word frequency as a fraction of subtree frequency.
            sum_threshold: Minimum subtree frequency as a fraction of this node's sum_freq.
            word_ratio_threshold: Ratio threshold for word frequency filtering.
            sum_ratio_threshold: Ratio threshold for subtree frequency filtering.
            sort_by: How to sort results ("prefix", "freq", or "sum_freq").
        
        Returns:
            Formatted string with one word per line, showing:
            - Word text
            - Word frequency as percentage of subtree
            - Subtree frequency as percentage (if word is not the only word in subtree)
            - Green highlighting for auto-selected word
        """
        options: list[tuple[Word, "Node"]] = self.list_options_normalized(n, word_threshold=word_threshold, sum_threshold=sum_threshold, word_ratio_threshold=word_ratio_threshold, sum_ratio_threshold=sum_ratio_threshold, sort_by=sort_by)
        a: Word | None = self.auto_word  # Auto-selected word
        t: Freq = self.sum_freq  # Total subtree frequency
        s: str = ""  # Formatted output string
        for w, n in options:
            # Highlight auto-selected word with green background (ANSI code \033[102m)
            s += "\033[102m" if w == a else ""
            s += w
            # Show word frequency as percentage of total subtree frequency
            s += f" {round(100*n.word_freq/t,1)}%"
            # If word has children (subtree frequency > word frequency), show subtree percentage
            if (n.word_freq/n.sum_freq) < 0.99:
                s += f" {round(100*n.sum_freq/t,1)}%"
            # Reset color if we highlighted
            s += "\033[0m" if w == a else ""
            s += "\n"
        return s

    def show(self, n: Index | None = 5, word_threshold: Prob = 0.0, sum_threshold: Prob = 0.0,  word_ratio_threshold: float = 1000,
                     sum_ratio_threshold: float = 1000, sort_by: Sort = "sum_freq"):
        """
        Print formatted autocomplete options to stdout.
        
        Convenience method that prints the output of build_show_str.
        
        Args:
            n: Maximum number of words to show.
            word_threshold: Minimum word frequency as a fraction of subtree frequency.
            sum_threshold: Minimum subtree frequency as a fraction of this node's sum_freq.
            word_ratio_threshold: Ratio threshold for word frequency filtering.
            sum_ratio_threshold: Ratio threshold for subtree frequency filtering.
            sort_by: How to sort results ("prefix", "freq", or "sum_freq").
        """
        print(self.build_show_str(n, word_threshold=word_threshold, sum_threshold=sum_threshold, word_ratio_threshold=word_ratio_threshold, sum_ratio_threshold=sum_ratio_threshold, sort_by=sort_by))

    def disable(self, pre: str, post: str):
        # disable completions for a word
        node = self[pre]
        if node is None:
            return
        if node.auto_suffix:
            node.auto_suffix = None
        for ch in post:
            node = node[ch]
            if node is None:
                break
            if node.auto_suffix:
                node.auto_suffix = None


def build_trie(
    words: Words,
    anchor_freq: Freq = 1,
) -> Node:
    """
    Build a trie (prefix tree) data structure from a list of words and frequencies.
    
    Constructs a trie where each node represents a prefix, and paths from root to
    leaf nodes represent complete words. Shared prefixes share common nodes for
    efficient storage and lookup.
    
    Args:
        words: List of (word, frequency) tuples to build the trie from.
        anchor_freq: Reference frequency used for normalization. Defaults to 1.
    
    Returns:
        Root node of the constructed trie.
    """
    word_list: list[Word] = [w for (w, f) in words]  # Extract word strings
    freq_list: list[Freq] = [f for (w, f) in words]  # Extract frequency values
    root: Node = Node(words=words, prefix="", anchor_freq=anchor_freq)  # Root node with empty prefix

    for i, w in enumerate(word_list):
        f: Freq = freq_list[i]  # Frequency for current word
        node: Node = root  # Start from root for each word
        # Build the path down to the node, character by character
        for char in w:
            # Get existing child node or create new one if it doesn't exist
            # This is equivalent to: get node.children[char] if exists, otherwise
            # set node.children[char] = Node() then return node.children[char]
            node = node.children.setdefault(char, Node(words=words, prefix=node.prefix + char, anchor_freq=anchor_freq))
        # Mark this node as a complete word and store its frequency
        node.word_id = i
        node.word_freq = f
    return root


def dfs(
    word_list: list[Word],
    node: Node,
    prefix_len: Index,
        *,
    word_threshold: Prob | None,
    subtree_threshold: Prob | None,
    word_ratio_threshold: float = 1,
    subtree_ratio_threshold: float = 1,
    min_suffix_len: Index = 1,
    min_prefix_len: Index = 1,
) -> bool:
    """
    Perform depth-first search to compute frequency statistics and auto-completion.
    
    Recursively traverses the trie to compute subtree frequencies, identify best
    words, and determine auto-completion suggestions based on frequency thresholds.
    This function populates the node attributes used for autocomplete ranking.
    
    Args:
        word_list: Complete list of words in the trie.
        node: Current node being processed.
        prefix_len: Length of the prefix represented by this node.
        word_threshold: Minimum probability threshold for a word to be considered.
            If None, uses subtree_threshold.
        subtree_threshold: Minimum probability threshold for a subtree to be considered.
            If None, uses word_threshold.
        word_ratio_threshold: Ratio threshold for comparing word frequencies.
        subtree_ratio_threshold: Ratio threshold for comparing subtree frequencies.
        min_suffix_len: Minimum length of completion suffix.
        min_prefix_len: Minimum length of prefix before auto-completion.
    
    Returns:
        True if this node or any descendant has auto-completion, False otherwise.
    
    Raises:
        ValueError: If both word_threshold and subtree_threshold are None.
        RuntimeError: If word_threshold > subtree_threshold.
    """
    if word_threshold is None and subtree_threshold is None:
        raise ValueError("atleast one of word_threshold or subtree_threshold is required")
    elif word_threshold is None:
        word_threshold = subtree_threshold
    elif subtree_threshold is None:
        subtree_threshold = word_threshold

    if word_threshold > subtree_threshold:
        raise RuntimeError("word_threshold must be less or equal to subtree_threshold")
    # Start by counting the frequency of a word ending at this node
    total: Freq = node.word_freq  # Total subtree frequency (starts with this node's frequency)

    best_subtree_freq: Freq = node.word_freq  # Best subtree frequency found so far
    best_subtree_char: str | None = None  # Character leading to best subtree (None means this node itself)

    best_word_freq: Freq = node.word_freq  # Best individual word frequency in subtree
    best_word_id: Index | None = node.word_id  # Index of best word

    for ch, child in list(node.children.items()):
        dfs(
            word_list, child, prefix_len + 1,
            word_threshold=word_threshold, subtree_threshold=subtree_threshold,
            word_ratio_threshold=word_ratio_threshold,
            subtree_ratio_threshold=subtree_ratio_threshold,
            min_suffix_len=min_suffix_len,
        )
        total += child.sum_freq

    # Now total subtree freq for this prefix
    node.sum_freq = total

    best_word_subtree_id: Index | None = node.word_id  # Word with best subtree frequency
    best_word_subtree_freq: Freq = node.word_freq  # Word frequency of best subtree word
    # Subtree frequency of best word (only if it meets word_threshold)
    best_word_subtree_sum_freq: Freq = node.sum_freq if (node.word_freq/total) >= word_threshold else 0.0
    second_best_word_subtree_sum_freq: Freq = 0.0  # Second-best subtree frequency (for ratio comparison)
    second_best_word_subtree_freq: Freq = 0.0  # Second-best word frequency (for ratio comparison)

    has_auto: bool = node.auto_word_id is not None  # Whether this node has auto-completion


    # Visit children first
    for ch, child in list(node.children.items()):
        # Best by subtree sum
        if child.sum_freq > best_subtree_freq:
            best_subtree_freq = child.sum_freq
            best_subtree_char = ch

        # Best single word
        if child.best_word_id is not None and child.best_word_freq > best_word_freq:
            best_word_freq = child.best_word_freq
            best_word_id = child.best_word_id

        if (child.best_word_subtree_id is not None) and (child.best_word_subtree_sum_freq > best_word_subtree_sum_freq) and (child.best_word_subtree_sum_freq / total) >= subtree_threshold and ((child.best_word_subtree_freq/total) >= word_threshold):
                best_word_subtree_sum_freq = child.best_word_subtree_sum_freq
                best_word_subtree_freq = child.best_word_subtree_freq
                best_word_subtree_id = child.best_word_subtree_id
        else:
            if child.best_word_subtree_sum_freq > second_best_word_subtree_sum_freq:
                second_best_word_subtree_sum_freq = child.best_word_subtree_sum_freq
            if child.best_word_subtree_freq > second_best_word_subtree_freq:
                second_best_word_subtree_freq = child.best_word_subtree_freq


        if child.has_auto:
            has_auto = True


    # best subtree
    node.best_child_sum_freq = best_subtree_freq
    node.best_child_char = best_subtree_char

    # best word anywhere in node's tree
    node.best_word_freq = best_word_freq
    node.best_word_id = best_word_id

    # find the word in the subtree with the best sum freq
    node.best_word_subtree_sum_freq = best_word_subtree_sum_freq
    node.best_word_subtree_freq = best_word_subtree_freq
    # Check if best word meets all thresholds for auto-completion
    valid: bool = (best_word_subtree_sum_freq >= subtree_threshold and
                   best_word_subtree_freq >= word_threshold and
                   best_word_subtree_freq >= (second_best_word_subtree_freq * word_ratio_threshold) and
                   best_word_subtree_sum_freq >= (second_best_word_subtree_sum_freq * subtree_ratio_threshold)
                   )
    node.best_word_subtree_id = best_word_subtree_id if valid else None


    # select not the best sub-word, but the best sub-tree which is a word
    if valid:
        w: Word = word_list[best_word_subtree_id]  # Best word for auto-completion
        suffix_len: Index = len(w) - (prefix_len - 1)  # Length of completion suffix
        if suffix_len >= min_suffix_len and (prefix_len - 1) >= min_prefix_len:
            node.auto_word_id = best_word_subtree_id
            node.auto_suffix = w[prefix_len - 1:]  # Suffix to append for completion
            has_auto = True

    node.has_auto = has_auto
    return has_auto




def prune_tree(node: Node):
    """
    Recursively prune the trie to remove nodes without auto-completion.
    
    Removes all branches that don't lead to any auto-completion suggestions,
    reducing the tree size while preserving all valid completion paths.
    
    Args:
        node: Root node of the subtree to prune.
    """
    for ch, child in list(node.children.items()):
        if child.has_auto:
            prune_tree(child)
        else:
            del node.children[ch]


def build_json(node: Node) -> dict[str, Any] | Completion | None:
    """
    Convert trie node to JSON-serializable dictionary structure.
    
    Recursively builds a nested dictionary where keys are characters and values
    are either child dictionaries or completion suffixes. The empty string key
    ('') stores the auto-completion suffix if present.
    
    Args:
        node: Root node of the subtree to convert.
    
    Returns:
        Dictionary representation of the trie, completion string, or None if empty.
    """
    d: dict[str, Any] = {ch: build_json(child) for ch, child in node.children.items()}
    d = {k: v for k, v in d.items() if v is not None}  # Remove None values
    if node.auto_suffix:
        if not d:
            return node.auto_suffix  # Return just the suffix if no children
        d[''] = node.auto_suffix  # Store suffix under empty string key
    if not d:
        return None
    return d


def build_map(node: Node, map: dict[Word, list[Prefix, Completion]] | None = None, calc: bool = True) -> dict[Word, list[Prefix, Completion]] | None:
    """
    Build a mapping from complete words to [prefix, completion] pairs.
    
    Creates a dictionary mapping each complete word to its prefix and completion
    suffix, which can be used for efficient word lookup and completion.
    
    Args:
        node: Root node of the subtree to process.
        map: Accumulator dictionary. If None, creates a new one.
        calc: If True, returns sorted dictionary. If False, returns None (for recursion).
    
    Returns:
        Dictionary mapping words to [prefix, completion] lists, or None if calc=False.
    """
    map = map if map is not None else {}
    if node.auto_suffix:
        w: Word = node.prefix + node.auto_suffix  # Complete word
        if w not in map:
            map[w] = [node.prefix, node.auto_suffix]
    elif node.has_auto:
        for child in node.children.values():
            build_map(child, map, False)
    return dict(sorted(map.values())) if calc else None


def get_autocomplete_trie(
    word_threshold: Prob | None = None,
    subtree_threshold: Prob | None = 0.5,
    word_ratio_threshold: float = 1,
    subtree_ratio_threshold: float = 1,
    lang: str | None = "en",
    pattern: str = r"^[a-zA-Z].+",
    max_words: Index | None = None,
    min_suffix_len: Index = 2,
    min_prefix_len: Index = 2,
    prune: bool = False,
    custom_words: dict[Word, RoundedFreq] | list[Word] | None = None,
    custom_words_anchor_place: Index | None = None,
    custom_words_anchor_freq: Freq | None = None,
) -> Node:
    """
    Build a complete autocomplete trie with frequency analysis.
    
    Main entry point for creating an autocomplete trie. Fetches words, builds
    the trie structure, computes frequency statistics via DFS, and optionally
    prunes the tree to remove unnecessary nodes.
    
    Args:
        word_threshold: Minimum probability threshold for word completion.
        subtree_threshold: Minimum probability threshold for subtree completion.
        word_ratio_threshold: Ratio threshold for frequency comparison.
        subtree_ratio_threshold: Ratio threshold for subtree frequency comparison.
        lang: Language code for wordlist. If None, uses only custom words.
        pattern: Regex pattern to filter words.
        max_words: Maximum number of words to include.
        min_suffix_len: Minimum length of completion suffix.
        min_prefix_len: Minimum length of prefix before auto-completion.
        prune: If True, remove nodes without auto-completion.
        custom_words: Custom words to add (dict with frequencies or list).
        custom_words_anchor_place: Position in wordlist to anchor custom word frequencies.
        custom_words_anchor_freq: Explicit anchor frequency for custom words.
    
    Returns:
        Root node of the completed autocomplete trie.
    """
    words: Words
    anchor_freq: Freq
    words, anchor_freq = get_words(lang, pattern, max_words, min_length=min_suffix_len + 1,
                                   custom_words=custom_words,
                                   custom_words_anchor_place=custom_words_anchor_place,
                                   custom_words_anchor_freq=custom_words_anchor_freq)
    tree: Node = build_trie(words, anchor_freq)
    word_list: list[Word] = [w for (w, _) in words]
    dfs(word_list, tree, 1,
        word_threshold=word_threshold,
        subtree_threshold=subtree_threshold,
        subtree_ratio_threshold=subtree_ratio_threshold,
        word_ratio_threshold=word_ratio_threshold,
        min_suffix_len=min_suffix_len,
        min_prefix_len=min_prefix_len
        )
    if prune:
        prune_tree(tree)
    return tree


def parse_custom_words(src: str | Path) -> tuple[dict[Word, RoundedFreq] | list[Word], dict[Prefix, Completion]]:
    """
    Parse custom words from a text file or JSON file.
    
    Supports multiple formats:
    - JSON files: Returns the parsed JSON directly
    - Text files with formats:
      * "word #frequency" - word with explicit frequency
      * "prefix|completion" - prefix to completion mapping
      * "word" - word with default frequency 1
    
    Args:
        src: Path to the custom words file (text or JSON).
    
    Returns:
        Tuple of (custom_words, custom_map) where:
        - custom_words: dict mapping words to frequencies, or list of words if all have frequency 1
        - custom_map: dict mapping prefixes to completions
    """
    src: Path = Path(src)
    if src.suffix == ".json":
        with open(src) as f:
            return json.load(f)
    lines: list[str] = [x.strip() for x in Path(src).read_text().splitlines()]
    lines = [x for x in lines if x]  # Remove empty lines
    cw: dict[Word, RoundedFreq] = {}  # Custom words with frequencies
    m: dict[Prefix, Completion] = {}  # Prefix to completion mappings
    for line in lines:
        # Parse "word #frequency" format
        if re.match(r"^.* #\d+", line):
            v: Word
            f: str
            v, f = line.rsplit(" #", maxsplit=1)
            cw[v] = int(f)
        # Parse "prefix|completion" format
        elif re.match(r"^.+\|.+\s?#?\d*", line):
            pre: Prefix
            post: Completion
            pre, post = line.rsplit(" #", maxsplit=1)[0].rsplit("|", maxsplit=1)
            m[pre] = post
        else:
            # Plain word with default frequency 1
            cw[line] = 1
    # If all words have frequency 1, return as list instead of dict
    if all(v == 1 for v in cw.values()):
        return list(cw.keys()), m
    return cw, m


def write_trie(
    dst: str | Path | None = None,
    word_threshold: Prob | None = None,
    subtree_threshold: Prob | None = 0.5,
    word_ratio_threshold: float = 1,
    subtree_ratio_threshold: float = 1,
    lang: str | None = "en",
    pattern: str = r"^[a-zA-Z].+",
    max_words: Index | None = None,
    min_prefix_len: Index = 2,
    min_suffix_len: Index = 2,
    custom_words: str | Path | dict[Word, RoundedFreq] | list[Word] | None = None,
    custom_words_anchor_place: Index | None = None,
    custom_words_anchor_freq: Freq | None = None,
    indent: Index = 2,
    preserve_freqs: bool = True,
) -> tuple[Node, list[str]]:
    """
    Build an autocomplete trie and write it to a file in various formats.
    
    Creates a complete autocomplete trie, processes it, and exports it to a file
    in one of many supported formats (JSON, JS, TS, Python, Dart, Swift, Kotlin, Go, Rust, or text).
    
    Args:
        dst: Destination file path. Format determined by file extension.
            If None, defaults to "out.txt".
        word_threshold: Minimum probability threshold for word completion.
        subtree_threshold: Minimum probability threshold for subtree completion.
        word_ratio_threshold: The selected option must be this many times better than the other options.
        subtree_ratio_threshold: The selected option must be this many times better than the other options.
        lang: Language code for wordlist.
        pattern: Regex pattern to filter words.
        max_words: Maximum number of words to include.
        min_prefix_len: Minimum length of prefix before auto-completion.
        min_suffix_len: Minimum length of completion suffix.
        custom_words: Custom words file path or dict/list of words.
        custom_words_anchor_place: Position in wordlist to anchor custom word frequencies.
        custom_words_anchor_freq: Explicit anchor frequency for custom words.
        indent: JSON indentation level for formatted output.
        preserve_freqs: If True, include frequency information in word strings
            (format: "prefix|completion #frequency"). If False, omit frequencies
            (format: "prefix|completion"). Default: True.
    
    Returns:
        Tuple of (trie_root_node, words_list) where words_list contains formatted
        word entries as "prefix|completion" or "prefix|completion #frequency" strings
        depending on preserve_freqs.
    
    Raises:
        NotImplementedError: If file extension is not supported.
    """
    t0 = time.perf_counter()
    dst: Path = Path(dst or f"out.txt")
    if isinstance(custom_words, str | Path):
        custom_words, custom_map = parse_custom_words(custom_words)
    else:
        custom_map: dict[Prefix, Completion] = {}
    params: dict[str, Any] = {
        "word_threshold": word_threshold,
        "subtree_threshold": subtree_threshold,
        "word_ratio_threshold": word_ratio_threshold,
        "subtree_ratio_threshold": subtree_ratio_threshold,
        "lang": lang,
        "pattern": pattern,
        "max_words": max_words,
        "min_suffix_len": min_suffix_len,
        "min_prefix_len": min_prefix_len,
        "custom_words": custom_words,
        "custom_words_anchor_place": custom_words_anchor_place,
        "custom_words_anchor_freq": custom_words_anchor_freq,
    }
    tree: Node = get_autocomplete_trie(**params)

    # hack: disable the tree at each node from custom_map
    # what this does is basically if we have a custom mapping of "ap|plication" it makes sure to remove "app|le" from the original list so we arent competing
    for pre, post in custom_map.items():
        tree.disable(pre, post)

    m: dict[Word, list[Prefix, Completion]] = {**custom_map, **build_map(tree)}  # Word to [prefix, completion] mapping
    wf: dict[Word, Freq] = {**dict(tree.words), **{(k+v): tree.anchor_freq for k, v in custom_map.items()}}  # Word to frequency mapping
    z: list[tuple[str, Freq]] = []  # List of (formatted_string, frequency) tuples
    for k, v in m.items():
        w: Word = k + v  # Complete word
        f: Freq = wf[w]  # Word frequency
        # Format word string with or without frequency based on preserve_freqs
        word_str: str = f"{k}|{v} #{round(f)}" if preserve_freqs else f"{k}|{v}"
        z.append((word_str, f))
    words: list[str] = [w for w, _ in sorted(z, key=lambda x: x[1], reverse=True)]  # Sorted word strings

    if dst is not None:
        dst.parent.mkdir(parents=True, exist_ok=True)
        if dst.suffix == ".json":
            s = json.dumps({"params": params, "words": words}, indent=indent)
            dst.write_text(s)
        elif dst.suffix == ".js":
            p = json.dumps(params, indent=indent)
            s = json.dumps(words, indent=indent)
            dst.write_text(f"const params = {p};\n\nconst words = {s};\n\nexport default words;")
        elif dst.suffix == ".ts":
            p = json.dumps(params, indent=indent)
            s = json.dumps(words, indent=indent)
            dst.write_text(f"const params: Record<string, any> = {p};\n\nconst words: string[] = {s};\n\nexport default words;")
        elif dst.suffix == ".py":
            p = json.dumps(params, indent=indent)
            s = json.dumps(words, indent=indent)
            dst.write_text(f"params = {p}\n\nwords = {s}\n\n")
        elif dst.suffix == ".txt":
            s = "\n".join(w for w in words)
            dst.write_text(s)
        elif dst.suffix == ".dart":
            p = json.dumps(params, indent=indent)
            s = json.dumps(words, indent=indent)
            dst.write_text(
                "final Map<String, dynamic> params = "
                f"{p};\n\n"
                "final List<String> words = "
                f"{s};\n"
            )
        elif dst.suffix == ".swift":
            p = json.dumps(params, indent=indent)
            s = json.dumps(words, indent=indent)
            dst.write_text(
                "let params: [String: Any] = "
                f"{p}\n\n"
                "let words: [String] = "
                f"{s}\n"
            )

        elif dst.suffix == ".kt":  # Kotlin
            p = json.dumps(params, indent=indent)
            s = json.dumps(words, indent=indent)
            dst.write_text(
                "val params: Map<String, Any?> = "
                f"{p}\n\n"
                "val words: List<String> = "
                f"{s}\n"
            )

        elif dst.suffix == ".go":
            p = json.dumps(params, indent=indent)
            s = json.dumps(words, indent=indent)
            dst.write_text(
                "package data\n\n"
                "var Params = "
                f"{p}\n\n"
                "var Words = "
                f"{s}\n"
            )

        elif dst.suffix == ".rs":  # Rust
            p = json.dumps(params, indent=indent)
            s = json.dumps(words, indent=indent)
            dst.write_text(
                "use std::collections::HashMap;\n\n"
                f"static PARAMS: &str = r#\"{p}\"#;\n\n"
                f"static WORDS: &str = r#\"{s}\"#;\n"
            )
        else:
            raise NotImplementedError(dst.suffix)
    print(f"Successfully built trie with {len(words)} words")
    if dst is not None:
        file_size: int = dst.stat().st_size  # File size in bytes
        # Format file size in human-readable format
        if file_size < 1024:
            size_str: str = f"{file_size} B"
        elif file_size < 1024 * 1024:
            size_str = f"{file_size / 1024:.2f} KB"
        elif file_size < 1024 * 1024 * 1024:
            size_str = f"{file_size / (1024 * 1024):.2f} MB"
        else:
            size_str = f"{file_size / (1024 * 1024 * 1024):.2f} GB"
        print(f"Output written to: {dst}")
        print(f"File size: {size_str} ({file_size:,} bytes)")
    t1 = time.perf_counter()
    print(f"Elapsed time: {t1 - t0:.3f} seconds")
    return tree, words


def main():
    """
    Command-line interface for building autocomplete tries.
    
    Parses command-line arguments and calls write_trie to build and export
    an autocomplete trie data structure.
    """
    parser = argparse.ArgumentParser(
        description="Build an autocomplete trie from wordlists and export to various formats",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Build a basic English trie and save as JSON
  python preprocess.py --output out.txt

  # Build with custom words and thresholds
  python preprocess.py --output out.txt --custom-words custom.txt \\
      --word-threshold 0.25 --subtree-threshold 0.5

  # Build for a different language
  python preprocess.py --output out.txt --lang es --max-words 50000

  # Export as TypeScript
  python preprocess.py --output trie.ts --lang en
        """
    )
    
    # Output file
    parser.add_argument(
        "-o", "--output", "--dst",
        type=str,
        default="out.txt",
        help="Output file path. Format determined by extension (.json, .js, .ts, .py, .txt, .dart, .swift, .kt, .go, .rs). Default: out.txt"
    )
    
    # Language and word filtering
    parser.add_argument(
        "-l", "--lang",
        type=str,
        default="en",
        help="Language code for wordlist (e.g., 'en', 'es', 'fr'). Use 'none' for custom words only. Default: en"
    )
    
    parser.add_argument(
        "--pattern",
        type=str,
        default=r"^[a-zA-Z].+",
        help="Regex pattern to filter words. Default: '^[a-zA-Z].+'"
    )
    
    parser.add_argument(
        "--max-words",
        type=int,
        default=None,
        help="Maximum number of words to include. Default: unlimited"
    )
    
    # Thresholds for autocomplete selection
    parser.add_argument(
        "--word-threshold",
        type=float,
        default=None,
        help="Minimum probability threshold (0.0-1.0) for a word to be auto-completed. Higher = more selective. Default: None (uses subtree-threshold)"
    )
    
    parser.add_argument(
        "--subtree-threshold",
        type=float,
        default=0.4,
        help="Minimum probability threshold (0.0-1.0) for a subtree to be considered. Default: 0.5"
    )

    parser.add_argument(
        "--word-ratio-threshold",
        type=float,
        default=1.0,
        help="The selected completion must be this many times more likely than any alternative. Default: 1.0"
    )
    
    parser.add_argument(
        "--subtree-ratio-threshold",
        type=float,
        default=1.5,
        help="The selected completion must be this many times more likely than any alternative. Default: 1.5"
    )
    
    # Length constraints
    parser.add_argument(
        "--min-prefix-len",
        type=int,
        default=1,
        help="Minimum length of prefix before auto-completion is allowed. Default: 2"
    )
    
    parser.add_argument(
        "--min-suffix-len",
        type=int,
        default=2,
        help="Minimum length of completion suffix. Default: 2"
    )
    
    # Custom words
    parser.add_argument(
        "-c", "--custom-words",
        type=str,
        default="custom.txt" if Path("custom.txt").exists() else None,
        help="Path to custom words file (text or JSON). Text format: 'word #frequency' or 'prefix|completion'"
    )
    
    parser.add_argument(
        "--custom-words-anchor-place",
        type=int,
        default=None,
        help="Index position in sorted wordlist to use as anchor for custom word frequencies. Default: 200"
    )
    
    parser.add_argument(
        "--custom-words-anchor-freq",
        type=float,
        default=None,
        help="Explicit frequency value to use as anchor for custom words. Overrides --custom-words-anchor-place"
    )
    
    # Output formatting
    parser.add_argument(
        "--indent",
        type=int,
        default=2,
        help="JSON indentation level for formatted output. Default: 2"
    )
    
    parser.add_argument(
        "--no-preserve-freqs",
        action="store_true",
        help="Omit frequency information from word strings (format: 'prefix|completion' instead of 'prefix|completion #frequency')"
    )
    
    args = parser.parse_args()
    
    # Convert 'none' lang to None
    lang: str | None = None if args.lang.lower() == "none" else args.lang
    
    # Build and write the trie
    write_trie(
        dst=args.output,
        word_threshold=args.word_threshold,
        subtree_threshold=args.subtree_threshold,
        subtree_ratio_threshold=args.subtree_ratio_threshold,
        lang=lang,
        pattern=args.pattern,
        max_words=args.max_words,
        min_prefix_len=args.min_prefix_len,
        min_suffix_len=args.min_suffix_len,
        custom_words=args.custom_words,
        custom_words_anchor_place=args.custom_words_anchor_place,
        custom_words_anchor_freq=args.custom_words_anchor_freq,
        indent=args.indent,
        preserve_freqs=not args.no_preserve_freqs,
    )


if __name__ == "__main__":
    main()