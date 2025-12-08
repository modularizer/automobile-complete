#!/usr/bin/env python3

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
                     display_stream: Literal["stderr", "stdout", "/dev/tty", "default"] | Any = "default",
                     placeholder: str = "Start typing to test the auto-complete...",
                     print = print,
                     get_char = get_char,
                     prompt: str = "",
                     multiline: bool = False,
                     append_newline: bool = True
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
    placeholder = placeholder or ""
    prompt = prompt or ""

    # Detect if stdout is being piped
    is_piped = not sys.stdout.isatty()
    display_stream_opened = False
    if display_stream == "default":
        try:
            display_stream = open('/dev/tty', 'w')
            display_stream_opened = True
        except:
            display_stream= sys.stdout
    if display_stream == "/dev/tty":
        display_stream = open('/dev/tty', 'w')
        display_stream_opened = True
    elif display_stream == "stderr":
        display_stream = sys.stderr
    elif display_stream == "stdout":
        display_stream = sys.stdout
    elif isinstance(display_stream, str | Path):
        display_stream = Path(display_stream).open('w')


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
    print_with_suggestion(prompt, placeholder, end=CARRIAGE_RETURN, file=display_stream, print=print)

    recording = ""
    try:
        while True:
            # Get current state from trie (it tracks full_text internally)
            full_text = current_node.full_text or ""
            completion = current_node.completion or ""


            # print
            if full_text:
                # Pass the completion with backspaces (print_with_suggestion will handle display)
                # and pass the prefix so it can highlight the right characters
                print_with_suggestion(prompt + full_text, completion, file=display_stream, print = print)
            elif has_typed:
                print_with_suggestion(prompt, placeholder, file=display_stream, print = print)

            # Read a character
            ch = get_char()

            if ch is None:
                break

            if not has_typed:
                has_typed = True
            recording += ch


            # Handle special characters
            if (ch in [CTRL.D, CTRL.X, CTRL.Q, CTRL["["]]) or ((ch == CARRIAGE_RETURN or ch == '\n') and not multiline):  # Ctrl+D (EOF)
                if append_newline:
                    current_node.full_text += "\n"
                    full_text += "\n"
                print_with_suggestion(prompt + full_text, "", file=display_stream, print = print)
                log("\n\nExiting...")
                break
            elif ch in [CTRL.C]:
                def _silent_kb_interrupt(*args):
                    # suppress traceback entirely
                    print("KeyboardInterrupt")

                old_hook = sys.excepthook
                sys.excepthook = _silent_kb_interrupt
                print_with_suggestion("", "", file=display_stream, print = print)
                try:
                    raise KeyboardInterrupt()
                finally:
                    sys.excepthook = old_hook
            elif ch == TAB:  # Tab - accept completion
                if completion and not current_node.esc:
                    # Accept the completion
                    current_node = current_node.accept()
                else:
                    current_node = current_node.walk_to("    ")
            elif (ch == CARRIAGE_RETURN or ch == '\n') and multiline:
                current_node = current_node.walk_to("\n")
            else: # regular character
                current_node = current_node.walk_to(ch)
    # except KeyboardInterrupt:
    #     log("\n\nExiting...")
    # except BrokenPipeError:
    #     log("\n\nBroken Pipe")
    # except Exception as e:
    #     import traceback
    #     log(f"\n\nError: {e}\n{str(traceback.format_exc())}")
    finally:
        # Write final result to stdout (only when piped, otherwise it's already there)
        final_text = current_node.full_text or ""
        if append_newline and not final_text.endswith("\n"):
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



def run_input(
        prompt: str = "",
        *,
        completions: str = "",
        completion_files: list | None = None,
        noisy: bool | None = None,
        placeholder: str | None = None,
        print = print,
        multiline: bool = False,
        append_newline: bool = True
):
    if noisy is None:
        noisy = env.get_as("AMC_RUN_NOISY", bool, False)
    # Check env var for --placeholder if not set via CLI
    if placeholder is None:
        # Re-check in case .env was loaded
        placeholder = env.get_as("AMC_RUN_PLACEHOLDER", str, "Start typing to test the auto-complete...")

    # Load trie from completion file(s)
    # Re-check defaults (env object already loaded everything)
    default_completion_file = env.get_as("AMC_SRC", "path_str")
    completion_files = completion_files if completion_files is not None else ([default_completion_file] if default_completion_file else [])
    # Detect if stdout is being piped
    is_piped = not sys.stdout.isatty()
    # When piped, send noisy messages to stderr
    noisy_stream = sys.stderr if is_piped else sys.stdout

    if noisy:
        print(f"Loading trie from {len(completion_files)} file(s): {', '.join(completion_files)}", file=noisy_stream)
    t0 = time.perf_counter()
    # Load all files and concatenate their content (expand ~ in paths)
    all_lines = []
    for completion_file in (completion_files or []):
        file_path = Path(completion_file).expanduser()
        if not file_path.exists():
            continue
        all_lines.append(file_path.read_text())

    # Create trie from all concatenated content
    trie = Trie.from_words("\n".join([completions, *all_lines]))
    t1 = time.perf_counter()
    if noisy:
        print(f"Loaded trie with {len(trie.root.words)} words in {(t1 - t0):.3f}s\n", file=noisy_stream)
    return interactive_demo(trie, noisy=noisy, placeholder=placeholder, prompt=prompt, multiline=multiline, append_newline=append_newline)


def main():
    """
    Main entry point for the interactive autocomplete demo.
    
    Parses command-line arguments and runs the interactive demo with
    either a custom word file or the default demo trie.
    
    Usage:
        amc run [prompt] [completion_files...] [options]
        
    Examples:
        # Run with default settings
        amc run
        
        # Run with a prompt
        amc run "Enter your name: "
        
        # Run with prompt and completion files
        amc run "Enter command: " completions1.txt completions2.txt
        
        # Run with inline completions (semicolon-separated)
        amc run "Enter: " --completions "hel|lo;wor|ld;foo|bar"
        
        # Run with options
        amc run "Prompt: " --noisy --placeholder "Type here..."
    """
    parser = argparse.ArgumentParser(
        description="Interactive autocomplete demo with inline gray text suggestions",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run with default settings
  amc run
  
  # Run with a prompt
  amc run "Enter your name: "
  
  # Run with prompt and completion files
  amc run "Enter command: " completions1.txt completions2.txt
  
  # Run with inline completions (semicolon-separated)
  amc run "Enter: " --completions "hel|lo;wor|ld;foo|bar"
  
  # Run with options
  amc run "Prompt: " --noisy --placeholder "Type here..."
        """
    )
    
    # Environment variables are automatically loaded by env object
    
    default_completion_file = env.get_as("AMC_SRC", "path_str")
    
    # First positional: prompt (optional)
    parser.add_argument(
        "prompt",
        type=str,
        nargs="?",
        default="",
        help="Prompt string to display before input (optional). Default: empty string"
    )
    
    # Remaining positionals: completion files
    parser.add_argument(
        "completion_files",
        type=str,
        nargs="*",
        default=[default_completion_file] if default_completion_file else [],
        help=f"One or more completion files to load (pre|post #freq format). Default from .env.sample: {default_completion_file or '(not set)'}"
    )
    parser.add_argument(
        "-m", "--multiline",
        action="store_true",
        default=False,
        help=f"Accept multiple lines of input (use CTRL+D to input)"
    )
    
    parser.add_argument(
        "-n", "--noisy",
        action="store_true",
        help=f"Enable verbose output (show loading messages, etc.). Default from .env.sample: {env.get_as('AMC_RUN_NOISY', bool, False) or 'false'}"
    )
    default_placeholder = env.get_as("AMC_RUN_PLACEHOLDER", str, "")
    parser.add_argument(
        "--placeholder",
        type=str,
        default=default_placeholder,
        help=f"Placeholder text to show before typing. Default from .env.sample: {default_placeholder}"
    )
    
    parser.add_argument(
        "--completions",
        type=str,
        default="",
        help="Semicolon-separated completions to add (e.g., 'hel|lo;wor|ld'). Semicolons are converted to newlines."
    )
    
    parser.add_argument(
        "--env-file",
        type=str,
        default=None,
        help="Path to .env file to load (overrides .env.sample). Default: .env in project root"
    )

    parser.add_argument(
        "-nn", "--no-newline",
        default=False,
        action="store_true",
        help="Do not append a newline to the end of the text"
    )
    
    args = parser.parse_args()
    
    # Convert semicolon-separated completions to newline-separated
    completions = args.completions.replace(";", "\n") if args.completions else ""

    return run_input(
        prompt=args.prompt,
        noisy=args.noisy,
        placeholder=args.placeholder,
        completions=completions,
        completion_files=args.completion_files if args.completion_files else None,
        multiline=args.multiline,
        append_newline= not args.no_newline
    )



if __name__ == "__main__":
    main()
