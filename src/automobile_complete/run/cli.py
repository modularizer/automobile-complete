"""
Simple interactive autocomplete demo using only builtins.

This demo shows completions in light gray after the cursor, similar to
modern IDE autocomplete. Uses the same Trie methods as .sim() for consistency.

Features:
- Inline grey text completions
- Tab to accept
- Backspace to delete
- Real-time updates as you type
"""
import argparse
import contextlib
import sys
import termios
import time
import tty
from pathlib import Path
from typing import Literal, Any

from automobile_complete.engine import Trie
from automobile_complete.utils.env import env
from automobile_complete.utils.terminal.chars import ESC, CARRIAGE_RETURN, CTRL, TAB
from automobile_complete.utils.terminal.terminal import print_with_suggestion
from automobile_complete.utils.terminal.terminal_colors import GRAY, RESET


def get_char():
    """
    Read a single character or escape sequence from stdin (Unix/Linux/Mac).
    
    Returns:
        Single character string, or escape sequence string, or None on EOF.
    """
    try:
        fd = sys.stdin.fileno()
        old_settings = termios.tcgetattr(fd)
        try:
            tty.setraw(sys.stdin.fileno())
            ch = sys.stdin.read(1)
            
            # Check for escape sequence (might be Shift+Enter or other special keys)
            if ch == ESC:  # ESC character
                # Try to read the rest of the escape sequence
                # Use non-blocking read with a small delay
                import select
                seq = ch
                # Read up to 10 more characters with small timeout
                for _ in range(10):
                    if select.select([sys.stdin], [], [], 0.05)[0]:
                        seq += sys.stdin.read(1)
                    else:
                        break
                return seq
            
            return ch
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
    except (termios.error, OSError, ImportError):
        # Fallback for non-terminal environments or if select is not available
        return sys.stdin.read(1) if sys.stdin.readable() else None






def interactive_demo(trie: Trie,
                     noisy: bool = False,
                     display_stream: Literal["stderr", "stdout", "/dev/tty"] | Any = "/dev/tty",
                     placeholder: str = "Start typing to test the auto-complete...",
                     print = print,
                     get_char = get_char,
                     ):
    """
    Run an interactive autocomplete demo.
    
    Shows completions in light gray after the cursor as you type.
    Tab accepts completions, Backspace deletes, Ctrl+C exits.
    
    When stdout is piped, intermediate states are written to stderr,
    and only the final text is written to stdout.
    
    Args:
        trie: Optional Trie to use. If None, creates a demo trie.
    """
    # Detect if stdout is being piped
    is_piped = not sys.stdout.isatty()
    display_stream_opened = display_stream == "/dev/tty"
    display_stream = open('/dev/tty', 'w') if display_stream == "/dev/tty" else sys.stderr if display_stream == "stderr" else sys.stdout if display_stream == "stdout" else display_stream

    def log(m="", **kw):
        if noisy:
            print(m, file=display_stream, **kw)


    log("Interactive Autocomplete Demo")
    log("=" * 50)
    log("Features:")
    log("  - Completions show in light gray after cursor")
    log("  - Press Tab to accept the completion")
    log("  - Press Backspace to delete")
    log("  - Press Ctrl+C to exit")
    log("=" * 50)
    log()
    
    # Initialize state - start at root
    current_node = trie
    has_typed = False
    print_with_suggestion("", placeholder, end=CARRIAGE_RETURN, file=display_stream, print=print)

    recording = ""
    try:
        while True:
            # Get current state from trie (it tracks full_text internally)
            full_text = current_node.full_text or ""
            completion = current_node.completion or ""

            # print
            if full_text:
                print_with_suggestion(full_text, completion, file=display_stream, print = print)
            elif has_typed:
                print_with_suggestion("", placeholder, file=display_stream, print = print)

            # Read a character
            ch = get_char()

            if ch is None:
                break

            if not has_typed:
                has_typed = True
            recording += ch


            # Handle special characters
            if (ch in [CTRL.C, CTRL.D, CTRL.X, CTRL.Q, CTRL["["]]) or ((ch == CARRIAGE_RETURN or ch == '\n') and not current_node.esc):  # Ctrl+D (EOF)
                current_node.full_text += "\n"
                full_text += "\n"
                print_with_suggestion(full_text, "", file=display_stream, print = print)
                log("\n\nExiting...")
                break
            elif ch == TAB:  # Tab - accept completion
                if completion and not current_node.esc:
                    # Accept the completion
                    current_node = current_node.accept()
                else:
                    current_node = current_node.walk_to("    ")
            elif (ch == CARRIAGE_RETURN or ch == '\n') and current_node.esc:
                current_node = current_node.walk_to("\n")
            else: # regular character
                current_node = current_node.walk_to(ch)
    except KeyboardInterrupt:
        log("\n\nExiting...")
    except BrokenPipeError:
        log("\n\nBroken Pipe")
    except Exception as e:
        import traceback
        log(f"\n\nError: {e}\n{str(traceback.format_exc())}")
    finally:
        # Write final result to stdout (only when piped, otherwise it's already there)
        final_text = current_node.full_text or ""
        if not final_text.endswith("\n"):
            final_text += "\n"
        if is_piped:
            with contextlib.suppress(BrokenPipeError):
                print(final_text, file=sys.stdout, flush=True)
            # Close stdout and stderr to prevent Python from trying to flush them
            # during shutdown, which causes "Exception ignored" messages
            with contextlib.suppress(BrokenPipeError, OSError):
                sys.stdout.close()
            with contextlib.suppress(BrokenPipeError, OSError):
                sys.stderr.close()
        # Close display stream if we opened /dev/tty
        if display_stream_opened:
            with contextlib.suppress(BrokenPipeError, OSError):
                display_stream.close()

        # print("=========================")
        # print("recording")
        # print("=========================")
        # print("|".join(ch for ch in recording).encode('unicode_escape').decode())
        return final_text




def main():
    """
    Main entry point for the interactive autocomplete demo.
    
    Parses command-line arguments and runs the interactive demo with
    either a custom word file or the default demo trie.
    """
    parser = argparse.ArgumentParser(
        description="Interactive autocomplete demo with inline gray text suggestions",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run with out.txt
  python interactive_demo.py

  # Run with custom word file
  python interactive_demo.py out.txt

  # Run with verbose output
  python interactive_demo.py out.txt --noisy
        """
    )
    
    # Environment variables are automatically loaded by env object
    
    default_completion_file = env.get_as("AMC_SRC", "path_str")
    parser.add_argument(
        "completion_files",
        type=str,
        nargs="*",
        default=[default_completion_file] if default_completion_file else [],
        help=f"One or more completion files to load (pre|post #freq format). Default from .env.sample: {default_completion_file or '(not set)'}"
    )
    
    parser.add_argument(
        "-n", "--noisy",
        action="store_true",
        help=f"Enable verbose output (show loading messages, etc.). Default from .env.sample: {env.get_as('AMC_RUN_NOISY', bool, False) or 'false'}"
    )
    
    default_placeholder = env.get_as("AMC_RUN_PLACEHOLDER", str, "Start typing to test the auto-complete...")
    parser.add_argument(
        "--placeholder",
        type=str,
        default=default_placeholder,
        help=f"Placeholder text to show before typing. Default from .env.sample: {default_placeholder}"
    )
    
    parser.add_argument(
        "--env-file",
        type=str,
        default=None,
        help="Path to .env file to load (overrides .env.sample). Default: .env in project root"
    )
    
    args = parser.parse_args()
    
    # Detect if stdout is being piped
    is_piped = not sys.stdout.isatty()
    # When piped, send noisy messages to stderr
    noisy_stream = sys.stderr if is_piped else sys.stdout
    
    # Load trie from completion file(s)
    # Re-check defaults (env object already loaded everything)
    default_completion_file = env.get_as("AMC_SRC", "path_str")
    completion_files = args.completion_files if args.completion_files else ([default_completion_file] if default_completion_file else [])
    
    # Check env var for --noisy if flag not set
    if not args.noisy:
        args.noisy = env.get_as("AMC_RUN_NOISY", bool, False)
    
    # Check env var for --placeholder if not set via CLI
    if args.placeholder == default_placeholder:
        # Re-check in case .env was loaded
        args.placeholder = env.get_as("AMC_RUN_PLACEHOLDER", str, "Start typing to test the auto-complete...")
    
    if args.noisy:
        print(f"Loading trie from {len(completion_files)} file(s): {', '.join(completion_files)}", file=noisy_stream)

    t0 = time.perf_counter()
    # Load all files and concatenate their content (expand ~ in paths)
    all_lines = []
    for completion_file in completion_files:
        file_path = Path(completion_file).expanduser()
        if not file_path.exists():
            parser.error(f"Completion file not found: {completion_file}")
        all_lines.append(file_path.read_text())
    
    # Create trie from all concatenated content
    trie = Trie.from_words("\n".join(all_lines))
    t1 = time.perf_counter()
    if args.noisy:
        print(f"Loaded trie with {len(trie.root.words)} words in {(t1 - t0):.3f}s\n", file=noisy_stream)
    interactive_demo(trie, noisy=args.noisy, placeholder=args.placeholder)



if __name__ == "__main__":
    main()
