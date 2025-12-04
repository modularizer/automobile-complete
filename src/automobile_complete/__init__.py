"""
Automobile Complete - An intelligent autocomplete system.

This package provides tools for building and using frequency-based
autocomplete trie data structures.
"""

__version__ = "0.1.0"

from automobile_complete.engine import Trie, CoreTrie
from automobile_complete.completionlist import (
    dfs,
    Node,
    build_completionlist,
    merge_completions,
    parse_completion_file,
)
from automobile_complete.wordlist import (
    generate_wordfreq_wordlist,
    generate_corpus_wordlist,
    merge_wordlists,

)
