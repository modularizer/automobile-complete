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
import termios
import tty
from trie import Trie


def get_char():
    """
    Read a single character from stdin (Unix/Linux/Mac).
    
    Returns:
        Single character string, or None on EOF.
    """
    try:
        fd = sys.stdin.fileno()
        old_settings = termios.tcgetattr(fd)
        try:
            tty.setraw(sys.stdin.fileno())
            ch = sys.stdin.read(1)
            return ch
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
    except (termios.error, OSError):
        # Fallback for non-terminal environments
        return sys.stdin.read(1) if sys.stdin.readable() else None


def format_with_completion(text: str, completion: str) -> str:
    """
    Format text with completion shown in light gray after cursor.
    
    Simple formatting: typed text + light gray completion (no cursor, no frequencies).
    
    Args:
        text: Full text that has been typed
        completion: Completion suggestion to show in gray
    
    Returns:
        Formatted string with ANSI codes
    """
    # ANSI color codes
    RESET = "\033[0m"
    GRAY = "\033[90m"  # Light gray for completion
    CLEAR_EOL = "\033[K"  # Clear from cursor to end of line
    
    # Clean text (remove control characters for display)
    display_text = text.replace("\t", "").replace("\b", "")
    
    # Format completion in gray if available
    if completion:
        formatted_completion = f"{GRAY}{completion}{RESET}"
    else:
        formatted_completion = ""
    
    # Simple: typed text + gray completion + clear to end of line
    return f"{display_text}{formatted_completion}{CLEAR_EOL}"


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
            
            # Display current state with completion (simple: text + gray completion)
            formatted = format_with_completion(full_text, completion)
            print(f"\r{formatted}", end="", flush=True)
            
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
            elif ch == '\t':  # Tab - accept completion (like .sim() does)
                if completion:
                    # Accept the completion (same as .sim())
                    current_node = current_node.accept()
                    # Get updated state and redraw
                    full_text = current_node.full_text or ""
                    completion = current_node.completion or ""
                    formatted = format_with_completion(full_text, completion)
                    print(f"\r{formatted}", end="", flush=True)
                continue
            elif ch == '\b' or ord(ch) == 127:  # Backspace
                # Use trie's built-in backspace handling via walk_to
                current_node = current_node.walk_to('\b', create_nodes=False)
                continue
            elif ch == '\r' or ch == '\n':  # Enter
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




if __name__ == "__main__":
    import sys
    noisy = True
    
    # Check if a word file was provided
    if len(sys.argv) > 1:
        word_file = sys.argv[1]
        if noisy:
            print(f"Loading trie from: {word_file}")
        try:
            trie = Trie.from_file(word_file)
            if noisy:
                print(f"Loaded trie with {len(trie.root.words)} words\n")
            interactive_demo(trie, noisy=noisy)
        except Exception as e:
            print(f"Error loading trie: {e}")
            if noisy:
                print("Falling back to demo trie...\n")
            interactive_demo(noisy=noisy)
    else:
        # Use demo trie
        interactive_demo(noisy=noisy)
