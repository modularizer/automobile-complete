#!/usr/bin/env python3

"""
Unified CLI for automobile-complete.

Provides a single entry point 'amc' that dispatches to all subcommands.
"""
import subprocess
import sys
from pathlib import Path
import platform

# Import all CLI main functions
from automobile_complete.wordlist.write.cli import main as wordlist_main
from automobile_complete.wordlist.merge.cli import main as wordlist_merge_main
from automobile_complete.completionlist.cli import main as preprocess_main
from automobile_complete.completionlist.merge.cli import main as preprocess_merge_main
from automobile_complete.run.cli import main as run_main
from automobile_complete.build.cli import main as build_web_main
from automobile_complete.utils.find_project_root import find_project_root


def build_all_main():
    """
    Run the complete build pipeline (everything except pyinstaller):
    1. Generate wordlist
    2. Merge wordlists
    3. Generate completionlist
    4. Merge completionlists
    5. Build react-native-engine (web)
    """
    steps = [
        ("Generating wordlist", wordlist_main),
        ("Merging wordlists", wordlist_merge_main),
        ("Generating completionlist", preprocess_main),
        ("Merging completionlists", preprocess_merge_main),
        ("Building react-native-engine", build_web_main),
    ]
    
    print("Running build pipeline...", file=sys.stderr)
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
    print("✅ Build complete!", file=sys.stderr)


def build_exe_main():
    """Build the executable for the current platform."""
    project_root = find_project_root()
    if not project_root:
        print("❌ Error: Could not find project root", file=sys.stderr)
        sys.exit(1)
    
    project_root = Path(project_root)
    
    # Determine which build script to use
    system = platform.system().lower()
    if system == "windows":
        script = project_root / "build-windows.bat"
        cmd = [str(script)]
    elif system == "linux":
        script = project_root / "build-ubuntu.sh"
        cmd = ["bash", str(script)]
    else:
        print(f"❌ Error: Unsupported platform: {system}", file=sys.stderr)
        sys.exit(1)
    
    if not script.exists():
        print(f"❌ Error: Build script not found: {script}", file=sys.stderr)
        sys.exit(1)
    
    print(f"🔨 Building executable for {system}...", file=sys.stderr)
    try:
        result = subprocess.run(cmd, cwd=project_root, check=True)
        sys.exit(result.returncode)
    except subprocess.CalledProcessError as e:
        print(f"❌ Build failed with exit code {e.returncode}", file=sys.stderr)
        sys.exit(e.returncode)
    except FileNotFoundError:
        print("❌ Error: Could not execute build script", file=sys.stderr)
        sys.exit(1)


def build_ext_main():
    """Build the chrome extension."""
    # The extension is built as part of the web build, so we just call that
    # The build.js script already copies to chrome-extension and creates a zip
    build_web_main()


def build_main():
    """
    Build command dispatcher.
    
    Handles:
    - amc build (no args) -> build all (everything except pyinstaller)
    - amc build web -> build react-native-engine
    - amc build ext -> build chrome extension
    - amc build exe -> build executable for current platform
    - amc build words -> generate wordlist
    - amc build completions -> generate completionlist
    """
    if len(sys.argv) < 2:
        # No target specified, build everything
        build_all_main()
        return
    
    target = sys.argv[1]
    
    # Remove target from argv so subcommands receive correct args
    sys.argv = [sys.argv[0]] + sys.argv[2:]
    
    if target == "web":
        build_web_main()
    elif target == "ext":
        build_ext_main()
    elif target == "exe":
        build_exe_main()
    elif target == "words":
        wordlist_main()
    elif target == "completions":
        preprocess_main()
    else:
        print(f"❌ Error: Unknown build target: {target}", file=sys.stderr)
        print("Valid targets: web, ext, exe, words, completions", file=sys.stderr)
        sys.exit(1)


def merge_main():
    """
    Merge command dispatcher.
    
    Handles:
    - amc merge words -> merge wordlists
    - amc merge completions -> merge completionlists
    """
    if len(sys.argv) < 2:
        print("❌ Error: merge command requires a target", file=sys.stderr)
        print("Valid targets: words, completions", file=sys.stderr)
        sys.exit(1)
    
    target = sys.argv[1]
    
    # Remove target from argv so subcommands receive correct args
    sys.argv = [sys.argv[0]] + sys.argv[2:]
    
    if target == "words":
        wordlist_merge_main()
    elif target == "completions":
        preprocess_merge_main()
    else:
        print(f"❌ Error: Unknown merge target: {target}", file=sys.stderr)
        print("Valid targets: words, completions", file=sys.stderr)
        sys.exit(1)


def main():
    """
    Unified CLI dispatcher.
    
    Usage:
        amc build [target]               # Build targets (web, ext, exe, words, completions)
        amc merge [target]               # Merge targets (words, completions)
        amc run [args]                   # Interactive autocomplete
        amc [args]                       # Alias for 'amc run [args]'
    """
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
    
    # Handle build and merge commands
    if subcommand == 'build':
        # Remove 'build' from argv, build_main will handle the rest
        sys.argv = [sys.argv[0]] + sys.argv[2:]
        build_main()
        return
    elif subcommand == 'merge':
        # Remove 'merge' from argv, merge_main will handle the rest
        sys.argv = [sys.argv[0]] + sys.argv[2:]
        merge_main()
        return
    elif subcommand == 'run':
        # Remove 'run' from argv
        sys.argv = [sys.argv[0]] + sys.argv[2:]
        run_main()
        return
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
    amc                           # Start interactive autocomplete (default)
    amc [command] [args...]       # Run a command

Commands:
    build [target]        Build targets (default: all except exe)
    merge [target]        Merge targets
    run [args]            Interactive autocomplete CLI (same as running 'amc' alone)

Build Targets:
    amc build             Build everything except pyinstaller (words -> merge words -> completions -> merge completions -> web)
    amc build web         Build react-native-engine (npm run build)
    amc build ext         Build chrome extension
    amc build exe         Build executable for current platform
    amc build words       Generate wordlist files
    amc build completions Generate completion list files

Merge Targets:
    amc merge words       Merge multiple wordlist files
    amc merge completions Merge multiple completion list files

Examples:
    # Start interactive autocomplete (just run 'amc' by itself)
    amc
    amc completions.txt
    
    # Build everything
    amc build
    
    # Build specific targets
    amc build web
    amc build ext
    amc build exe
    amc build words --output wordlist.txt --lang en --max-words 100000
    amc build completions wordlist.txt --output completions.txt
    
    # Merge files
    amc merge words list1.txt list2.txt --output merged.txt
    amc merge completions comp1.txt comp2.txt --output merged.txt
    
    # Explicitly run autocomplete
    amc run completions.txt

For help on a specific command:
    amc <command> --help
"""
    print(help_text)


if __name__ == "__main__":
    main()
