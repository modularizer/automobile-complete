"""
Preprocessing module for building autocomplete tries.

This module provides functionality to preprocess wordlist files into
completion files using trie analysis.
"""

from automobile_complete.completionlist.node import Node, dfs
from automobile_complete.completionlist.completionlist import (
    build_completionlist
)
from automobile_complete.completionlist.parse import parse_completion_file
from automobile_complete.completionlist.cli import main
from automobile_complete.completionlist.merge import merge_completions

