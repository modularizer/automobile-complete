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
import tty
from trie import Trie


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
            if ch == '\033':  # ESC character
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
    RESET = "\033[0m"
    GRAY = "\033[90m"  # Light gray for completion
    
    # Clean text (remove control characters for display)
    display_text = text.replace("\t", "").replace("\b", "")
    
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
    return text.replace("\t", "").replace("\b", "")


def interactive_demo(trie: Trie | None = None, noisy: bool = False):
    """
    Run an interactive autocomplete demo.
    
    Shows completions in light gray after the cursor as you type.
    Tab accepts completions, Backspace deletes, Ctrl+C exits.
    
    Args:
        trie: Optional Trie to use. If None, creates a demo trie.
    """
    # Create or use provided trie
    if trie is None:
        trie = Trie.from_words("""
        anim|als
        enor|mous
        for e|xample:
        gir|affes
        giraffes a|re super tall
        hip|po
        hippo|potamuses
        hippos a|re fat
        hippopotamuses a|re fat
        automa|tic
        automa|tion
        compu|ter
        compu|tation
        progra|mming
        progra|mmer
        """, cache_full_text=True)

    if noisy:
        print("Interactive Autocomplete Demo")
        print("=" * 50)
        print("Features:")
        print("  - Completions show in light gray after cursor")
        print("  - Press Tab to accept the completion")
        print("  - Press Backspace to delete")
        print("  - Press Ctrl+C to exit")
        print("=" * 50)
        print()
    
    # Initialize state - start at root
    current_node = trie
    full_text = current_node.full_text or ""
    
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
                print(f"\r\033[K{formatted_with}", end="", flush=True)
                # Step 2: Print without completion (don't clear - gray text stays visible)
                formatted_without = format_text_only(full_text)
                print(f"\r{formatted_without}", end="", flush=True)
            else:
                # No completion, just print the text
                formatted = format_text_only(full_text)
                print(f"\r\033[K{formatted}", end="", flush=True)
            
            # Read a character
            ch = get_char()
            
            if ch is None:
                break
            
            # Handle special characters
            if ord(ch) == 3:  # Ctrl+C
                if noisy:
                    print("\n\nExiting...")
                break
            elif ord(ch) == 4:  # Ctrl+D (EOF)
                if noisy:
                    print("\n\nExiting...")
                break
            elif ch == '\t':  # Tab - accept completion
                if completion:
                    # Accept the completion
                    current_node = current_node.accept()
                    # Show just the accepted text in normal color (no completion)
                    full_text = current_node.full_text or ""
                    formatted = format_text_only(full_text)
                    print(f"\r\033[K{formatted}", end="", flush=True)
                continue
            elif ch == '\b' or ord(ch) == 127:  # Backspace
                # Use trie's built-in backspace handling via walk_to
                current_node = current_node.walk_to('\b', create_nodes=False)
                continue
            elif ch == '\r' or ch == '\n':  # Regular Enter - exit
                # Accept current completion if any
                if completion:
                    current_node = current_node.accept()
                    full_text = current_node.full_text or ""
                # Clear line, print final text, then newline before exiting
                print(f"\r\033[K{full_text}")  # Clear to end, print text, newline
                break
            elif ch.startswith('\033') and ('13;2' in ch or 'OM' in ch):  # Shift+Enter (escape sequence)
                # Shift+Enter detected - insert newline instead of exiting
                # Note: Shift+Enter detection works on most modern terminals but may vary
                # Accept current completion if any, then newline
                if completion:
                    current_node = current_node.accept()
                    full_text = current_node.full_text or ""
                # Clear line and print final text, then newline
                print(f"\r\033[K{full_text}")  # Clear to end, print text, newline
                # Reset to root for new line
                current_node = trie
                continue
            else:
                # Regular character - use walk_to (same as .sim())
                current_node = current_node.walk_to(ch, create_nodes=False)
    except KeyboardInterrupt:
        if noisy:
            print("\n\nExiting...")
    except Exception as e:
        print(f"\n\nError: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Restore terminal and print final text
        # print(f"\r{' ' * 100}\r{full_text}", flush=True)
        # print()
        return current_node.full_text




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
  # Run with demo trie
  python interactive_demo.py

  # Run with custom word file
  python interactive_demo.py out.txt

  # Run with verbose output
  python interactive_demo.py out.txt --noisy
        """
    )
    
    parser.add_argument(
        "word_file",
        type=str,
        nargs="?",
        default=None,
        help="Path to word file to load (created by preprocess.py). If not provided, uses demo trie."
    )
    
    parser.add_argument(
        "-n", "--noisy",
        action="store_true",
        help="Enable verbose output (show loading messages, etc.)"
    )
    
    args = parser.parse_args()
    
    # Load trie from file or use demo
    if args.word_file:
        if args.noisy:
            print(f"Loading trie from: {args.word_file}")
        try:
            trie = Trie.from_file(args.word_file)
            if args.noisy:
                print(f"Loaded trie with {len(trie.root.words)} words\n")
            interactive_demo(trie, noisy=args.noisy)
        except Exception as e:
            print(f"Error loading trie: {e}")
            if args.noisy:
                print("Falling back to demo trie...\n")
            interactive_demo(noisy=args.noisy)
    else:
        # Use demo trie
        interactive_demo(noisy=args.noisy)


if __name__ == "__main__":
    main()
