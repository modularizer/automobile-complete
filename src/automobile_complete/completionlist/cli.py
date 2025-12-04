"""
Command-line interface for preprocessing wordlists into completions.
"""

import argparse
from pathlib import Path

from automobile_complete import build_completionlist


def main():
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
        help="Wordlist file to process (word #freq or word format)"
    )
    
    parser.add_argument(
        "-o", "--output",
        type=str,
        required=True,
        help="Output file path for completions (pre|post #freq format)"
    )
    
    parser.add_argument(
        "--word-threshold",
        type=float,
        default=None,
        help="Minimum probability threshold (0.0-1.0) for word completion. Default: None (uses subtree-threshold)"
    )
    
    parser.add_argument(
        "--subtree-threshold",
        type=float,
        default=0.5,
        help="Minimum probability threshold (0.0-1.0) for subtree completion. Default: 0.5"
    )
    
    parser.add_argument(
        "--word-ratio-threshold",
        type=float,
        default=1.0,
        help="Selected completion must be this many times more likely than alternatives. Default: 1.0"
    )
    
    parser.add_argument(
        "--subtree-ratio-threshold",
        type=float,
        default=1.0,
        help="Selected completion must be this many times more likely than alternatives. Default: 1.0"
    )
    
    parser.add_argument(
        "--min-prefix-len",
        type=int,
        default=2,
        help="Minimum length of prefix before auto-completion. Default: 2"
    )
    
    parser.add_argument(
        "--min-suffix-len",
        type=int,
        default=2,
        help="Minimum length of completion suffix. Default: 2"
    )
    
    parser.add_argument(
        "--no-preserve-freqs",
        action="store_true",
        help="Omit frequency information from output (format: 'pre|post' instead of 'pre|post #freq')"
    )
    
    args = parser.parse_args()
    
    # Convert to Path objects
    wordlist_file = Path(args.wordlist_file)
    output_file = Path(args.output)
    
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

