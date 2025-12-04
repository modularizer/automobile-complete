"""
Command-line interface for preprocessing wordlists into completions.
"""

import argparse
from pathlib import Path

from automobile_complete.utils.env import env
from automobile_complete.completionlist import build_completionlist


def main():
    # Environment variables are automatically loaded by env object
    """
    Command-line interface for preprocessing wordlists into completions.
    """
    parser = argparse.ArgumentParser(
        description="Preprocess a wordlist file into completion file",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Preprocess a wordlist file
  automobile-preprocess wordlist.txt --output completions.txt

  # Preprocess with custom thresholds
  automobile-preprocess wordlist.txt --output completions.txt \\
      --word-threshold 0.25 --subtree-threshold 0.5

  # Output without frequencies
  automobile-preprocess wordlist.txt --output completions.txt --no-preserve-freqs

Note: To merge multiple wordlists before preprocessing, use automobile-wordlist-merge first.
        """
    )
    
    parser.add_argument(
        "wordlist_file",
        type=str,
        nargs="?",
        default=env.get_as("AMC_COMPLETIONLIST_SRC", "path_str"),
        help=f"Wordlist file to process (word #freq or word format). Default from .env.sample: {env.get_as('AMC_COMPLETIONLIST_SRC', 'path_str') or '(not set)'}"
    )
    
    parser.add_argument(
        "-o", "--output",
        type=str,
        default=env.get_as("AMC_COMPLETIONLIST_DST", "path_str"),
        help=f"Output file path for completions (pre|post #freq format). Default from .env.sample: {env.get_as('AMC_COMPLETIONLIST_DST', 'path_str') or '(not set)'}"
    )
    
    parser.add_argument(
        "--word-threshold",
        type=float,
        default=env.get_as("AMC_COMPLETIONLIST_WORD_THRESHOLD", float),
        help=f"Minimum probability threshold (0.0-1.0) for word completion. Default from .env.sample: {env.get_as('AMC_COMPLETIONLIST_WORD_THRESHOLD', float) or '(uses subtree-threshold)'}"
    )
    
    parser.add_argument(
        "--subtree-threshold",
        type=float,
        default=env.get_as("AMC_COMPLETIONLIST_SUBTREE_THRESHOLD", float, 0.5),
        help=f"Minimum probability threshold (0.0-1.0) for subtree completion. Default from .env.sample: {env.get_as('AMC_COMPLETIONLIST_SUBTREE_THRESHOLD', float, 0.5) or '0.5'}"
    )
    
    parser.add_argument(
        "--word-ratio-threshold",
        type=float,
        default=env.get_as("AMC_COMPLETIONLIST_WORD_RATIO_THRESHOLD", float, 1.0),
        help=f"Selected completion must be this many times more likely than alternatives. Default from .env.sample: {env.get_as('AMC_COMPLETIONLIST_WORD_RATIO_THRESHOLD', float, 1.0) or '1.0'}"
    )
    
    parser.add_argument(
        "--subtree-ratio-threshold",
        type=float,
        default=env.get_as("AMC_COMPLETIONLIST_SUBTREE_RATIO_THRESHOLD", float, 1.0),
        help=f"Selected completion must be this many times more likely than alternatives. Default from .env.sample: {env.get_as('AMC_COMPLETIONLIST_SUBTREE_RATIO_THRESHOLD', float, 1.0) or '1.0'}"
    )
    
    parser.add_argument(
        "--min-prefix-len",
        type=int,
        default=env.get_as("AMC_COMPLETIONLIST_MIN_PREFIX_LEN", int, 2),
        help=f"Minimum length of prefix before auto-completion. Default from .env.sample: {env.get_as('AMC_COMPLETIONLIST_MIN_PREFIX_LEN', int, 2) or '2'}"
    )
    
    parser.add_argument(
        "--min-suffix-len",
        type=int,
        default=env.get_as("AMC_COMPLETIONLIST_MIN_SUFFIX_LEN", int, 2),
        help=f"Minimum length of completion suffix. Default from .env.sample: {env.get_as('AMC_COMPLETIONLIST_MIN_SUFFIX_LEN', int, 2) or '2'}"
    )
    
    parser.add_argument(
        "--no-preserve-freqs",
        action="store_true",
        help="Omit frequency information from output (format: 'pre|post' instead of 'pre|post #freq')"
    )
    
    parser.add_argument(
        "--env-file",
        type=str,
        default=None,
        help="Path to .env file to load (overrides .env.sample). Default: .env in project root"
    )
    
    args = parser.parse_args()
    
    # Re-check defaults (env object already loaded everything)
    if not args.wordlist_file:
        args.wordlist_file = env.get_as("AMC_COMPLETIONLIST_SRC", "path_str")
    if not args.output:
        args.output = env.get_as("AMC_COMPLETIONLIST_DST", "path_str")
    if args.word_threshold is None:
        args.word_threshold = env.get_as("AMC_COMPLETIONLIST_WORD_THRESHOLD", float)
    if args.subtree_threshold is None:
        args.subtree_threshold = env.get_as("AMC_COMPLETIONLIST_SUBTREE_THRESHOLD", float, 0.5)
    if args.word_ratio_threshold is None:
        args.word_ratio_threshold = env.get_as("AMC_COMPLETIONLIST_WORD_RATIO_THRESHOLD", float, 1.0)
    if args.subtree_ratio_threshold is None:
        args.subtree_ratio_threshold = env.get_as("AMC_COMPLETIONLIST_SUBTREE_RATIO_THRESHOLD", float, 1.0)
    if args.min_prefix_len is None:
        args.min_prefix_len = env.get_as("AMC_COMPLETIONLIST_MIN_PREFIX_LEN", int, 2)
    if args.min_suffix_len is None:
        args.min_suffix_len = env.get_as("AMC_COMPLETIONLIST_MIN_SUFFIX_LEN", int, 2)
    
    # Check env var for --no-preserve-freqs if flag not set
    if not args.no_preserve_freqs:
        args.no_preserve_freqs = env.get_as("AMC_COMPLETIONLIST_NO_PRESERVE_FREQS", bool, False)
    
    # Convert to Path objects (expand ~ in paths)
    wordlist_file = Path(args.wordlist_file).expanduser()
    output_file = Path(args.output).expanduser()
    
    # Preprocess
    try:
        completions = build_completionlist(
            wordlist_file=wordlist_file,
            output_file=output_file,
            word_threshold=args.word_threshold,
            subtree_threshold=args.subtree_threshold,
            word_ratio_threshold=args.word_ratio_threshold,
            subtree_ratio_threshold=args.subtree_ratio_threshold,
            min_prefix_len=args.min_prefix_len,
            min_suffix_len=args.min_suffix_len,
            preserve_freqs=not args.no_preserve_freqs,
        )
        print(f"Preprocessed {len(completions)} completions to {output_file}", file=__import__("sys").stderr)
    except Exception as e:
        parser.error(f"Error preprocessing wordlist: {e}")


if __name__ == "__main__":
    main()

