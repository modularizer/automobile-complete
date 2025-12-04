"""
Command-line interface for wordlist generation.
"""

import argparse
from pathlib import Path

from automobile_complete.utils.env import env
from automobile_complete.wordlist.write.corpus import generate_corpus_wordlist
from automobile_complete.wordlist.write.wordfreq import generate_wordfreq_wordlist


def main():
    # Environment variables are automatically loaded by env object
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
        default=env.get_as("AMC_WORDLIST_DST", "path_str"),
        help=f"Output file path. Default from .env.sample: {env.get_as('AMC_WORDLIST_DST', 'path_str') or '(not set)'}"
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
        default=env.get_as("AMC_WORDLIST_LANG", str),
        help=f"Language code for wordfreq wordlist (e.g., 'en', 'es', 'fr'). Default from .env.sample: {env.get_as('AMC_WORDLIST_LANG', str) or '(not set)'}"
    )
    
    parser.add_argument(
        "--pattern",
        type=str,
        default=env.get_as("AMC_WORDLIST_PATTERN", str),
        help=f"Regex pattern to filter words. Default from .env.sample: {env.get_as('AMC_WORDLIST_PATTERN', str) or '(not set)'}"
    )
    
    parser.add_argument(
        "--max-words",
        type=int,
        default=env.get_as("AMC_WORDLIST_MAX_WORDS", int),
        help=f"Maximum number of words to include. Default from .env.sample: {env.get_as('AMC_WORDLIST_MAX_WORDS', int) or '(all matching words)'}"
    )
    
    parser.add_argument(
        "--min-length",
        type=int,
        default=env.get_as("AMC_WORDLIST_MIN_LENGTH", int, 2),
        help=f"Minimum word length (in characters). Default from .env.sample: {env.get_as('AMC_WORDLIST_MIN_LENGTH', int, 2) or '2'}"
    )
    
    parser.add_argument(
        "--no-freqs",
        action="store_true",
        help="Omit frequency information from output (format: 'word' instead of 'word #freq')"
    )
    
    parser.add_argument(
        "--env-file",
        type=str,
        default=None,
        help="Path to .env file to load (overrides .env.sample). Default: .env in project root"
    )
    
    args = parser.parse_args()
    
    # Re-check defaults (env object already loaded everything)
    if not args.output:
        args.output = env.get_as("AMC_WORDLIST_DST", "path_str")
    if not args.lang:
        args.lang = env.get_as("AMC_WORDLIST_LANG", str)
    if not args.pattern:
        args.pattern = env.get_as("AMC_WORDLIST_PATTERN", str)
    if args.max_words is None:
        args.max_words = env.get_as("AMC_WORDLIST_MAX_WORDS", int)
    if args.min_length is None:
        args.min_length = env.get_as("AMC_WORDLIST_MIN_LENGTH", int, 2)
    
    # Generate wordlist based on method
    # Check env var for --no-freqs if flag not set
    if not args.no_freqs:
        args.no_freqs = env.get_as("AMC_WORDLIST_NO_FREQS", bool, False)
    include_freqs = not args.no_freqs
    
    if args.from_corpus:
        # Generate from corpus files
        corpus_files = [Path(f).expanduser() for f in args.from_corpus]
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
    output_path = Path(args.output).expanduser()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(output_lines))
    print(f"Wrote {len(output_lines)} words to {output_path}", file=__import__("sys").stderr)


if __name__ == "__main__":
    main()

