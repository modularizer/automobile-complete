"""
Command-line interface for wordlist generation.
"""

import argparse
from pathlib import Path

from automobile_complete.wordlist.write.corpus import generate_corpus_wordlist
from automobile_complete.wordlist.write.wordfreq import generate_wordfreq_wordlist


def main():
    """
    Command-line interface for converting wordfreq wordlists to word #freq format.
    """
    parser = argparse.ArgumentParser(
        description="Generate wordlist files in word #frequency format",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate from wordfreq (default)
  automobile-wordlist --output wordlist.txt --lang en --max-words 100000

  # Generate from corpus files
  automobile-wordlist --output wordlist.txt --from-corpus file1.txt file2.txt

  # Generate with custom filters
  automobile-wordlist --output wordlist.txt --lang en --max-words 10000 --min-length 3
        """
    )
    
    parser.add_argument(
        "-o", "--output",
        type=str,
        default=None,
        help="Output file path. If not provided, writes to stdout. Default: stdout"
    )
    
    # Method selection
    parser.add_argument(
        "--from-corpus",
        nargs="+",
        type=str,
        metavar="FILE",
        help="Generate wordlist from corpus file(s) instead of wordfreq"
    )
    
    # Wordfreq options
    parser.add_argument(
        "-l", "--lang",
        type=str,
        default="en",
        help="Language code for wordfreq wordlist (e.g., 'en', 'es', 'fr'). Default: en"
    )
    
    parser.add_argument(
        "--pattern",
        type=str,
        default=r"^[a-zA-Z].+",
        help="Regex pattern to filter words. Default: '^[a-zA-Z].+' (starts with letter)"
    )
    
    parser.add_argument(
        "--max-words",
        type=int,
        default=None,
        help="Maximum number of words to include. Default: None (all matching words)"
    )
    
    parser.add_argument(
        "--min-length",
        type=int,
        default=2,
        help="Minimum word length (in characters). Default: 2"
    )
    
    parser.add_argument(
        "--no-freqs",
        action="store_true",
        help="Omit frequency information from output (format: 'word' instead of 'word #freq')"
    )
    
    args = parser.parse_args()
    
    # Generate wordlist based on method
    include_freqs = not args.no_freqs
    
    if args.from_corpus:
        # Generate from corpus files
        corpus_files = [Path(f) for f in args.from_corpus]
        try:
            output_lines = generate_corpus_wordlist(
                corpus_files=corpus_files,
                pattern=args.pattern,
                max_words=args.max_words,
                min_length=args.min_length,
                include_freqs=include_freqs,
            )
        except Exception as e:
            parser.error(f"Error generating wordlist from corpus: {e}")
    else:
        # Generate from wordfreq (default)
        try:
            output_lines = generate_wordfreq_wordlist(
                lang=args.lang,
                pattern=args.pattern,
                max_words=args.max_words,
                min_length=args.min_length,
                include_freqs=include_freqs,
            )
        except Exception as e:
            parser.error(f"Error generating wordlist from wordfreq: {e}")
    
    # Write output
    output_text = "\n".join(output_lines)
    
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(output_text)
        print(f"Wrote {len(output_lines)} words to {output_path}", file=__import__("sys").stderr)
    else:
        # Write to stdout
        print(output_text)


if __name__ == "__main__":
    main()

