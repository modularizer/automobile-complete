#!/usr/bin/env python3

"""
Unified CLI for automobile-complete.

Provides a single entry point 'amc' that dispatches to all subcommands.
"""
import sys
from pathlib import Path

# Import all CLI main functions
from automobile_complete.wordlist.write.cli import main as wordlist_main
from automobile_complete.wordlist.merge.cli import main as wordlist_merge_main
from automobile_complete.completionlist.cli import main as preprocess_main
from automobile_complete.completionlist.merge.cli import main as preprocess_merge_main
from automobile_complete.run.cli import main as run_main
from automobile_complete.build.cli import main as build_main


def setup_main():
    """
    Run the complete setup pipeline:
    1. Generate wordlist (amcw)
    2. Merge wordlists (amcmw)
    3. Generate completionlist (amcc)
    4. Merge completionlists (amcmc)
    5. Build react-native-engine (amc build)
    """
    import sys
    
    steps = [
        ("Generating wordlist", wordlist_main),
        ("Merging wordlists", wordlist_merge_main),
        ("Generating completionlist", preprocess_main),
        ("Merging completionlists", preprocess_merge_main),
        ("Building react-native-engine", build_main),
    ]
    
    print("Running setup pipeline...", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    
    for step_name, step_func in steps:
        print(f"\n[{step_name}]", file=sys.stderr)
        print("-" * 60, file=sys.stderr)
        try:
            # Save original argv
            original_argv = sys.argv.copy()
            # Set argv to just the script name (each main() expects to parse its own args)
            sys.argv = [sys.argv[0]]
            step_func()
            # Restore original argv
            sys.argv = original_argv
        except SystemExit as e:
            # argparse raises SystemExit on errors or --help
            if e.code != 0:
                print(f"\n❌ Error in step '{step_name}': {e}", file=sys.stderr)
                sys.exit(e.code)
            # If code is 0, it was --help, which we'll allow
            sys.exit(0)
        except Exception as e:
            print(f"\n❌ Error in step '{step_name}': {e}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            sys.exit(1)
    
    print("\n" + "=" * 60, file=sys.stderr)
    print("✅ Setup complete!", file=sys.stderr)


def main():
    """
    Unified CLI dispatcher.
    
    Usage:
        amc wordlist [args]              # Generate wordlist
        amc wordlist-merge [args]        # Merge wordlists
        amc preprocess [args]            # Generate completion list
        amc preprocess-merge [args]      # Merge completion lists
        amc run [args]                   # Interactive autocomplete
        amc [args]                       # Alias for 'amc run [args]'
    """
    # Known subcommands with short aliases
    subcommands = {
        'wordlist': wordlist_main,
        'w': wordlist_main,
        'wordlist-merge': wordlist_merge_main,
        'wm': wordlist_merge_main,
        'preprocess': preprocess_main,
        'c': preprocess_main,  # 'c' for completionlist
        'preprocess-merge': preprocess_merge_main,
        'cm': preprocess_merge_main,  # 'cm' for completionlist-merge
        'setup': setup_main,
        'build': build_main,
        'b': build_main,  # 'b' for build
        'run': run_main,
        'r': run_main,
    }
    
    if len(sys.argv) < 2:
        # No subcommand provided, default to 'run'
        # Keep argv as-is (run_main expects the script name)
        run_main()
        return
    
    subcommand = sys.argv[1]
    
    # Handle help
    if subcommand in ('-h', '--help', 'help'):
        print_help()
        return
    
    # Check if it's a known subcommand
    if subcommand in subcommands:
        # Remove subcommand from argv so the subcommand's main() receives correct args
        sys.argv = [sys.argv[0]] + sys.argv[2:]
        subcommands[subcommand]()
    else:
        # Unknown subcommand, treat as 'run' with the subcommand as first arg
        # This allows: amc file.txt -> amc run file.txt
        # Keep argv as-is (run_main will parse it)
        run_main()


def print_help():
    """Print help message for the unified CLI."""
    help_text = """
Automobile Complete (amc) - Unified CLI

Usage:
    amc <command> [args...]

Commands:
    wordlist, w           Generate wordlist files (word #frequency format)
    wordlist-merge, wm    Merge multiple wordlist files with weights
    preprocess, c         Preprocess wordlist into completion list (prefix|completion format)
    preprocess-merge, cm  Merge multiple completion lists with conflict resolution
    setup                 Run complete setup pipeline (w -> wm -> c -> cm -> build)
    build, b              Build react-native-engine (runs npm run build)
    run, r                Interactive autocomplete CLI (default if no command specified)

Examples:
    # Generate wordlist
    amc wordlist --output wordlist.txt --lang en --max-words 100000
    amc w --output wordlist.txt --lang en --max-words 100000
    
    # Merge wordlists
    amc wordlist-merge list1.txt list2.txt --output merged.txt
    amc wm list1.txt list2.txt --output merged.txt
    
    # Generate completion list
    amc preprocess wordlist.txt --output completions.txt
    amc c wordlist.txt --output completions.txt
    
    # Merge completion lists
    amc preprocess-merge comp1.txt comp2.txt --output merged.txt
    amc cm comp1.txt comp2.txt --output merged.txt
    
    # Run complete setup pipeline
    amc setup
    
    # Build react-native-engine
    amc build
    amc b
    
    # Interactive autocomplete (default)
    amc completions.txt
    amc run completions.txt
    amc r completions.txt

For help on a specific command:
    amc <command> --help
"""
    print(help_text)


if __name__ == "__main__":
    main()
