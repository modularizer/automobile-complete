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
import sys
import termios
import time
import tty
from pathlib import Path
from typing import Literal, Any

from automobile_complete.engine import Trie
from automobile_complete.utils.env import load_env_sample, load_env, get_env, get_env_bool
from automobile_complete.utils.chars import BACKSPACE, TAB, CTRL_D_ORD, CTRL_C_ORD, BACKSPACE_ORD, CARRIAGE_RETURN
from automobile_complete.utils.colors import RESET, REPLACE_LINE, GRAY, ESC


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


def format_with_completion(text: str, completion: str) -> str:
    """
    Format text with completion shown in light gray.
    
    Args:
        text: Full text that has been typed
        completion: Completion suggestion to show in gray
    
    Returns:
        Formatted string with ANSI codes (text + gray completion)
    """
    # ANSI color codes

    
    # Clean text (remove control characters for display)
    display_text = text.replace(TAB, "").replace(BACKSPACE, "")
    
    # Format completion in gray if available
    if completion:
        formatted_completion = f"{GRAY}{completion}{RESET}"
    else:
        formatted_completion = ""
    
    # Return: typed text + gray completion (no clearing, no cursor)
    return f"{display_text}{formatted_completion}"


def format_text_only(text: str) -> str:
    """
    Format just the text without completion.
    
    Args:
        text: Full text that has been typed
    
    Returns:
        Clean text string
    """
    # Clean text (remove control characters for display)
    return text.replace(TAB, "").replace(BACKSPACE, "")


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

    # Use /dev/tty (controlling terminal) for intermediate display if available,
    # otherwise fall back to stderr. This ensures display works even when stdout is piped.
    display_stream_opened = False
    display_stream = open('/dev/tty', 'w') if display_stream == "/dev/tty" else sys.stderr if display_stream == "stderr" else sys.stdout if display_stream == "stdout" else display_stream

    # Helper function to safely print to display stream
    def safe_print(*args, **kwargs):
        print(*args, file=display_stream, **kwargs)


    if noisy:
        safe_print("Interactive Autocomplete Demo")
        safe_print("=" * 50)
        safe_print("Features:")
        safe_print("  - Completions show in light gray after cursor")
        safe_print("  - Press Tab to accept the completion")
        safe_print("  - Press Backspace to delete")
        safe_print("  - Press Ctrl+C to exit")
        safe_print("=" * 50)
        safe_print()
    
    # Initialize state - start at root
    current_node = trie
    has_typed = False
    safe_print(f"{GRAY}{placeholder}{RESET}" if placeholder else "", end=CARRIAGE_RETURN)
    
    try:
        while True:
            # Get current state from trie (it tracks full_text internally)
            full_text = current_node.full_text or ""
            completion = current_node.completion or ""



            # Display using two-step approach to show completion after cursor:
            # 1. Print line WITH completion (moves cursor to end of completion)
            # 2. Print line WITHOUT completion (moves cursor back to end of text, but gray text remains)
            if completion:
                # Clear line first to remove any old characters
                formatted_with = format_with_completion(full_text, completion)

                safe_print(f"{REPLACE_LINE}{formatted_with}", end="", flush=True)
                # Step 2: Print without completion (don't clear - gray text stays visible)
                formatted_without = format_text_only(full_text)
                safe_print(f"{CARRIAGE_RETURN}{formatted_without}", end="", flush=True)
            elif has_typed:
                # No completion, just print the text
                formatted = format_text_only(full_text)
                safe_print(f"{REPLACE_LINE}{formatted}", end="", flush=True)
            # Read a character
            ch = get_char()

            if ch is None:
                break

            if not has_typed:
                has_typed = True


            # Handle special characters
            if ord(ch) == CTRL_C_ORD:  # Ctrl+C
                if noisy:
                    safe_print("\n\nExiting...")
                break
            elif ord(ch) == CTRL_D_ORD:  # Ctrl+D (EOF)
                if noisy:
                    safe_print("\n\nExiting...")
                break
            elif ch == TAB:  # Tab - accept completion
                if completion:
                    # Accept the completion
                    current_node = current_node.accept()
                    # Show just the accepted text in normal color (no completion)
                    full_text = current_node.full_text or ""
                    formatted = format_text_only(full_text)
                    safe_print(f"{REPLACE_LINE}{formatted}", end="", flush=True)
                continue
            elif ch == BACKSPACE or ord(ch) == BACKSPACE_ORD:  # Backspace
                # Use trie's built-in backspace handling via walk_to
                current_node = current_node.walk_to(BACKSPACE)
                continue
            elif ch == CARRIAGE_RETURN or ch == '\n':  # Regular Enter - exit
                # Accept current completion if any
                if completion:
                    current_node = current_node.accept()
                    full_text = current_node.full_text or ""
                # Clear line, print final text to display stream, then newline before exiting
                safe_print(f"{REPLACE_LINE}{full_text}")  # Clear to end, print text, newline
                break
            elif ch.startswith(ESC) and ('13;2' in ch or 'OM' in ch):  # Shift+Enter (escape sequence)
                # Shift+Enter detected - insert newline instead of exiting
                # Note: Shift+Enter detection works on most modern terminals but may vary
                # Accept current completion if any, then newline
                if completion:
                    current_node = current_node.accept()
                    full_text = current_node.full_text or ""
                # Clear line and print final text, then newline
                safe_print(f"{REPLACE_LINE}{full_text}")  # Clear to end, print text, newline
                # Reset to root for new line
                current_node = trie
                continue
            else:
                # Regular character - use walk_to (same as .sim())
                current_node = current_node.walk_to(ch)
    except KeyboardInterrupt:
        if noisy:
            safe_print("\n\nExiting...")
    except BrokenPipeError:
        # Handle broken pipe gracefully when stdout is closed
        pass
    except Exception as e:
        safe_print(f"\n\nError: {e}")
        import traceback
        traceback.print_exc(file=display_stream)
    finally:
        # Write final result to stdout (only when piped, otherwise it's already there)
        final_text = current_node.full_text or ""
        if not final_text.endswith("\n"):
            final_text += "\n"
        if is_piped:
            try:
                print(final_text, file=sys.stdout, flush=True)
            except BrokenPipeError:
                # If stdout is closed, just ignore
                pass
            finally:
                # Close stdout and stderr to prevent Python from trying to flush them
                # during shutdown, which causes "Exception ignored" messages
                try:
                    sys.stdout.close()
                except (BrokenPipeError, OSError):
                    pass
                try:
                    sys.stderr.close()
                except (BrokenPipeError, OSError):
                    pass
        # Close display stream if we opened /dev/tty
        if display_stream_opened:
            try:
                display_stream.close()
            except (BrokenPipeError, OSError):
                pass
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
    
    # Load .env.sample first (single source of truth for defaults)
    load_env_sample()
    
    default_completion_file = get_env("AMC_COMPLETIONLIST_FILE")
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
        help=f"Enable verbose output (show loading messages, etc.). Default from .env.sample: {get_env('AMC_RUN_NOISY') or 'false'}"
    )
    
    parser.add_argument(
        "--env-file",
        type=str,
        default=None,
        help="Path to .env file to load (overrides .env.sample). Default: .env in project root"
    )
    
    args = parser.parse_args()
    
    # Load .env or --env-file (overrides .env.sample)
    load_env(env_file=Path(args.env_file).expanduser() if args.env_file else None)
    
    # Detect if stdout is being piped
    is_piped = not sys.stdout.isatty()
    # When piped, send noisy messages to stderr
    noisy_stream = sys.stderr if is_piped else sys.stdout
    
    # Load trie from completion file(s)
    # Re-check defaults after loading .env (in case user wants to override via .env)
    default_completion_file = get_env("AMC_COMPLETIONLIST_FILE")
    completion_files = args.completion_files if args.completion_files else ([default_completion_file] if default_completion_file else [])
    
    # Check env var for --noisy if flag not set
    if not args.noisy:
        args.noisy = get_env_bool("AMC_RUN_NOISY", False)
    
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
    interactive_demo(trie, noisy=args.noisy)



if __name__ == "__main__":
    main()
