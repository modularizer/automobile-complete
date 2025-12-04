"""
Wordlist generation module.

This module provides different methods for creating wordlist files
in the format: word #frequency

Available generators:
- wordfreq: Fetch words from wordfreq language wordlists
- corpus: Parse words from large text corpora
- merge: Merge multiple wordlists with weights
"""

from automobile_complete.wordlist.write.wordfreq import generate_wordfreq_wordlist
from automobile_complete.wordlist.write.corpus import generate_corpus_wordlist
from automobile_complete.wordlist.merge.merge import merge_wordlists
from automobile_complete.wordlist.write.cli import main

__all__ = [
    "generate_wordfreq_wordlist",
    "generate_corpus_wordlist",
    "merge_wordlists",
    "main",
]

