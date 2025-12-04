"""
Wordlist generation module.

This module provides different methods for creating wordlist files
in the format: word #frequency

Available generators:
- wordfreq: Fetch words from wordfreq language wordlists
- corpus: Parse words from large text corpora
- merge: Merge multiple wordlists with weights
"""

from .write import generate_wordfreq_wordlist, generate_corpus_wordlist, main as write_cli
from .merge import merge_wordlists, main as merge_cli
from .read import read_wordlist_file