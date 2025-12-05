"""
Autocomplete trie implementation for interactive text completion.

This module provides a trie-based autocomplete system that supports:
- Interactive text completion with prefix matching
- Control character handling (tab for completion, backspace for deletion)
- Terminal color formatting for visual feedback
- Real-time simulation of typing with autocomplete suggestions
- Case-insensitive matching
- Frequency-based word ranking

The trie structure enables efficient prefix-based word lookup and completion,
with support for displaying completion suggestions in a user-friendly format.
"""
from automobile_complete.engine.core_trie import CoreTrie
from automobile_complete.utils.terminal.chars import BACKSPACE, CARRIAGE_RETURN, TAB
from automobile_complete.utils.terminal.terminal_colors import RESET, GREY, WHITE


class Trie(CoreTrie):
    """
    Extended trie with terminal formatting and visualization capabilities.
    
    Extends CoreTrie with features for displaying autocomplete suggestions
    in a user-friendly format with terminal colors and visual indicators.
    Supports real-time simulation of typing with autocomplete.
    
    Additional features over CoreTrie:
    - Terminal color formatting for visual feedback
    - String representation with formatting
    - Simulation of typing with delays
    - Visual display of accepted completions
    """
    default_settings = {
        "use_terminal_colors": True,  # Enable ANSI color codes in output
        "repr_terminal_colors": False,  # Use colors in __repr__ (default: False)
        **CoreTrie.default_settings,
    }

    @property
    def use_terminal_colors(self) -> bool:
        """
        Check if terminal colors are enabled for display.
        
        Returns:
            True if ANSI color codes should be used in string output, False otherwise.
        """
        return self.config["use_terminal_colors"]

    @property
    def repr_terminal_colors(self) -> bool:
        """
        Check if terminal colors should be used in __repr__.
        
        Returns:
            True if __repr__ should include color codes, False otherwise.
        """
        return self.config["repr_terminal_colors"]


    def as_string(self, full_text: str = None, use_terminal_colors: bool | None = None) -> str:
        """
        Format the trie state as a string with visual indicators.
        
        Creates a formatted string showing:
        - Text before the current prefix (dimmed)
        - Current prefix (with accepted portion highlighted in green if applicable)
        - A separator (│)
        - Completion suggestion (with spaces replaced by █)
        
        Args:
            full_text: Full text to display. If None, uses self.full_text.
            use_terminal_colors: Whether to use ANSI color codes. If None, uses configured value.
        
        Returns:
            Formatted string representation of the trie state.
        """
        full_text: str = full_text if full_text is not None else self.full_text
        u: bool = use_terminal_colors if use_terminal_colors is not None else self.use_terminal_colors
        start2: str = WHITE if u else ""  # Color for completion text (white)
        start: str = GREY if u else ""  # Color for before-state text (dark gray)
        c: str = self.completion.replace(" ", "█")  # Replace spaces with block character
        end: str = RESET if u else ""  # Reset color code

        # Clean full text: remove tabs and backspace sequences
        full_text = full_text.replace("\t", "")
        import re
        full_text = re.sub(f".?{BACKSPACE}", "", full_text)  # Remove backspace sequences

        # Text before the current prefix (dimmed)
        before_state: str = full_text[:-len(self.prefix)] if self.prefix and full_text else full_text
        b: str = f"{start}{before_state}{end}"

        # Current prefix (may be highlighted if partially accepted)
        p: str = full_text[-len(self.prefix):] if full_text and self.prefix else self.prefix
        s: str = f"{b}{p}│{start2}{c}{end}"  # Format: before|prefix│completion
        return s


    def show(self, disappearing: bool = False, full_text: str = None, use_terminal_colors: bool | None = None) -> str:
        """
        Display the trie state to stdout.
        
        Prints the formatted string representation. If disappearing is True,
        uses carriage return (\r) to overwrite the line; otherwise uses newline.
        
        Args:
            disappearing: If True, use \r to overwrite (for animations).
                If False, use \n for permanent display.
            full_text: Full text to display. If None, uses self.full_text.
            use_terminal_colors: Whether to use ANSI color codes. If None, uses configured value.
        
        Returns:
            The formatted string that was printed.
        """
        s: str = self.as_string(full_text=full_text, use_terminal_colors=use_terminal_colors)
        print(s, end=CARRIAGE_RETURN if disappearing else "\n")
        return s

    def sim(self,
            text: str,
            letter_by_letter: bool = True,
            disappearing: bool = True,
            letter_delay: float = 0.15,
            word_delay: float = 0.1,
            use_terminal_colors: bool | None = None
            ) -> "Trie":
        """
        Simulate typing text with autocomplete suggestions.
        
        Processes text character by character (or all at once), displaying
        the trie state after each character with optional delays for animation.
        Useful for demonstrating autocomplete functionality.
        
        Args:
            text: Text to simulate typing.
            letter_by_letter: If True, process one character at a time with delays.
                If False, process entire text at once.
            disappearing: If True, use disappearing display (overwrites line).
                If False, print each state on a new line.
            letter_delay: Delay in seconds between characters when letter_by_letter=True.
            word_delay: Additional delay in seconds after spaces/newlines.
            use_terminal_colors: Whether to use ANSI color codes. If None, uses configured value.
        
        Returns:
            The final trie node after processing all text.
        """
        t: "Trie" = self
        if letter_by_letter:
            # Process text character by character with delays
            for ch in text:
                t = t.walk_to(ch)  # Navigate to next character
                t.show(disappearing=disappearing, use_terminal_colors=use_terminal_colors)
                if disappearing and letter_delay:
                    import time
                    time.sleep(letter_delay)  # Delay between characters
                if disappearing and word_delay and ch in " \n":
                    import time
                    time.sleep(word_delay)  # Additional delay after spaces/newlines
            print(t.full_text)  # Print final full text
        else:
            # Process entire text at once
            t = t.walk_to(text)
            t.show(disappearing=disappearing, use_terminal_colors=use_terminal_colors)
        return t

    def __bool__(self) -> bool:
        """
        Check if this node is non-empty (has completion or children).
        
        Returns:
            True if node has completion or children, False otherwise.
        """
        return not self.is_empty()

    def __dir__(self):
        """
        Return list of available attributes including child node characters.
        
        Enables tab completion in interactive environments to show available
        next characters for navigation.
        
        Returns:
            List of attribute names including standard attributes plus child characters.
        """
        return super().__dir__() + list(self.children.keys())

    def __str__(self) -> str:
        """
        String representation of the trie state.
        
        Returns:
            Formatted string showing current state with autocomplete suggestion.
        """
        return self.as_string()

    def __repr__(self) -> str:
        """
        Developer representation of the trie state.
        
        Returns:
            Formatted string with colors based on repr_terminal_colors setting.
        """
        return self.as_string(use_terminal_colors=self.repr_terminal_colors)

    def __getitem__(self, key: str) -> "Trie":
        """
        Enable dictionary-style access to navigate the trie.
        
        Args:
            key: Character or string to navigate to.
        
        Returns:
            The node reached after navigating through key.
        """
        return self.walk_to(key)

    def __getattr__(self, key: str) -> "Trie":
        """
        Enable attribute-style access to navigate the trie.
        
        Allows accessing nodes like trie.abc instead of trie.walk_to("abc").
        
        Args:
            key: Character or string to navigate to.
        
        Returns:
            The node reached after navigating through key.
        """
        return self.walk_to(key)

    @classmethod
    def demo(cls, **kw) -> "Trie":
        """
        Create a demo trie and simulate typing with autocomplete.
        
        Creates a pre-populated trie with example words and demonstrates
        autocomplete functionality by simulating typing a sentence that
        uses various completions, including tab acceptance and backspace.
        
        Args:
            **kw: Keyword arguments to pass to sim() method.
        
        Returns:
            Root node of the demo trie.
        """
        t: "Trie" = cls.from_words("""
        anim|als
        enor|mous
        for e|xample:
        gir|affes
        giraffes a|re super tall
        hip|po
        hippo|potamuses
        hippos a|re fat
        hippopotamuses a|re fat
            """, cache_full_text=True)
        # Simulate typing with tab completions and backspace corrections
        t.sim(f"Animals can be enormo{TAB}. For example: gira{TAB}{BACKSPACE}{BACKSPACE}es are super super tall and hippos are fat", **kw)
        return t.root





if __name__ == "__main__":
#     t = Trie.from_words("""
# anim|als
# enor|mous
# for e|xample:
# gir|affes
# giraffes a|re super tall
# hip|po
# hippo|potamuses
# hippos a|re fat
# hippopotamuses a|re fat
#     """, cache_full_text=True)
#     t.sim("Animals can be enormo\t. For example: gira\t\b\bes are super super tall and hippos are fat",
#           # disappearing=False
#           )
    t = Trie.from_file("out.txt")



