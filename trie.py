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

import re
from pathlib import Path

FINALE_PART = re.compile(r"[A-Za-z0-9']+$")


class CoreTrie:
    """
    Core trie data structure for autocomplete functionality.
    
    Represents a node in a trie (prefix tree) that stores completion suggestions
    and supports navigation through character sequences. Each node can have:
    - A completion string (suffix to append for autocomplete)
    - Child nodes for each possible next character
    - Frequency information for ranking completions
    - Configuration for case sensitivity and control character handling
    
    The trie enables efficient prefix-based word lookup and completion by organizing
    words in a tree structure where shared prefixes share common nodes.
    
    Attributes:
        children: Dictionary mapping characters to child CoreTrie nodes
        completion: Suffix string to append for autocomplete at this prefix
        freq: Frequency/weight of this completion (higher = more likely)
        counter: Global counter for assigning unique indices to words
        index: Unique index of this word in the wordlist (if this is a word node)
        words: List of all word nodes in the trie (stored at root)
        root: Reference to the root node of the trie
        parent: Reference to the parent node
        prefix: The prefix string represented by this node
        config: Configuration dictionary for trie behavior
        full_text: Full text accumulated during navigation (if caching enabled)
    """
    default_settings = {
        "case_insensitive": True,  # Match characters case-insensitively
        "cache_full_text": True,  # Cache full text during navigation
        "handle_control_characters": True,  # Handle tab and backspace characters
    }

    @classmethod
    def from_file(cls, src: str | Path):
        src = Path(src)
        return cls.from_words(src.read_text())

    @classmethod
    def from_words(cls, *lines: str, root: "CoreTrie" = None, **config) -> "CoreTrie":
        """
        Create a trie instance from word lines and insert them.
        
        Convenience class method that creates a new trie instance and populates
        it with words from the provided lines. Each line should be in the format:
        "prefix|completion #frequency" or "prefix|completion".
        
        Args:
            *lines: Variable number of string lines containing word definitions.
                Lines can be separated by newlines or passed as separate arguments.
            root: Root node to use (for creating subtries). If None, creates new root.
            **config: Additional configuration options to override defaults.
        
        Returns:
            The trie instance with words inserted.
        
        Example:
            >>> trie = CoreTrie.from_words("anim|als", "enor|mous", "gir|affes")
        """
        inst = cls(root=root, **config)
        return inst.insert(*lines)


    def __init__(self, *,
                 completion: str = "",
                 children: dict[str, "CoreTrie"] = None,
                 root: "CoreTrie" = None,
                 parent: "CoreTrie" = None,
                 prefix: str = "",
                 full_text: str = "",
                 **config
                 ) -> None:
        """
        Initialize a trie node.
        
        Args:
            completion: Suffix string to append for autocomplete at this prefix.
                Empty string means no completion available at this node.
            children: Dictionary mapping characters to child nodes. If None,
                creates an empty dictionary.
            root: Root node of the trie. If None, this node becomes the root.
            parent: Parent node in the trie. If None, uses root as parent.
            prefix: The prefix string represented by this node.
            full_text: Initial full text value (used when cloning nodes).
            **config: Configuration options to override defaults.
        """
        self.children = children if children is not None else {}  # Child nodes keyed by character
        self.completion = completion  # Completion suffix for this prefix
        self.freq = 1  # Frequency/weight of this completion
        self.index = None  # Unique index in wordlist (if this is a word node)

        r = root if root is not None else self  # Reference to root node
        self.root = r
        self.parent = parent if parent is not None else r  # Parent node
        self.prefix = prefix  # Prefix string this node represents

        if root is not None:
            self.config = r.config
            self.words = r.words
        else:
            # Merge default settings with provided config
            self.config: dict = {"root": r, **self.default_settings, **config}
            self.words: list["CoreTrie"] = []  # List of all word nodes (only at root)
            self.counter = 0
        # Cache full text only if enabled in config
        self.full_text = full_text

    @property
    def cache_full_text(self) -> bool:
        """
        Check if full text caching is enabled.
        
        Returns:
            True if full text is cached during navigation, False otherwise.
        """
        return self.config["cache_full_text"]

    @property
    def case_insensitive(self) -> bool:
        """
        Check if case-insensitive matching is enabled.
        
        Returns:
            True if characters are matched case-insensitively, False otherwise.
        """
        return self.config["case_insensitive"]

    @property
    def handle_control_characters(self) -> bool:
        """
        Check if control character handling is enabled.
        
        Returns:
            True if tab and backspace characters are handled specially, False otherwise.
        """
        return self.config["handle_control_characters"]


    def is_empty(self) -> bool:
        """
        Check if this node is empty (no completion and no children).
        
        Returns:
            True if node has no completion and no children, False otherwise.
        """
        return not self.completion and not self.children


    def child(self, text: str, completion: str = "", children: dict[str, "CoreTrie"] = None) -> "CoreTrie":
        """
        Create a child node for the given text.
        
        Args:
            text: Character(s) to add to the prefix for the child node.
            completion: Completion suffix for the child node. Defaults to empty string.
            children: Dictionary of children for the child node. If None, creates empty dict.
        
        Returns:
            A new CoreTrie node that is a child of this node.
        """
        return type(self)(completion=completion, children=children, parent=self, prefix=self.prefix + text, full_text=self.full_text + text,
                          **self.config)

    def clone(self, full_text: str = None, parent=None) -> "CoreTrie":
        """
        Create a clone of this node with optional modifications.
        
        Args:
            full_text: New full text value. If None, uses current full_text.
            parent: New parent node. If None, uses current parent.
        
        Returns:
            A new CoreTrie node with the same completion and children as this node.
        """
        return type(self)(completion=self.completion, children=self.children, parent=parent if parent is not None else self, prefix=self.prefix, full_text=full_text if full_text is not None else self.full_text,
                          **self.config)

    def walk_to(self, v: str, *, handle_control_characters: bool | None = None) -> "CoreTrie":
        """
        Navigate through the trie by processing a sequence of characters.
        
        Walks through the trie character by character, handling normal characters,
        control characters (tab, backspace), and reset characters. Updates the
        node position and accumulates full text and change strings.
        
        Args:
            v: String of characters to process (can include control characters).
            handle_control_characters: Whether to handle tab and backspace specially.
                If None, uses the instance's configured value.
        
        Returns:
            The node reached after processing all characters in v.
        """
        handle_control_characters: bool = handle_control_characters if handle_control_characters is not None else self.handle_control_characters
        ci: bool = self.case_insensitive  # Case-insensitive flag
        node: "CoreTrie" = self  # Current node (starts at self)
        s: str = self.full_text  # Accumulated full text
        for ch in v:
            # Handle backspace character: delete last character and move to parent
            if handle_control_characters and ch == "\b"  and "\b" not in node.children:
                s = s[:-1]  # Remove last character from full text
                m = re.search(FINALE_PART, s)
                prefix = m.group(0) if m else ""
                node = node.root.clone(s).walk_to(prefix)
            # Handle tab character: accept completion and navigate to it
            elif handle_control_characters and ch == "\t":
                c: str = node.completion  # Get completion suffix
                s += c  # Add completion to full text
                n: int = len(c)  # Length of accepted completion
                # Recursively walk through the completion string
                node = node.walk_to(c, handle_control_characters=handle_control_characters)
            # Handle normal characters
            else:
                k = ch.lower() if ci else ch
                s += ch  # Add character to full text
                if node.completion and node.completion[0] == k:
                    nn = node.child(ch, node.completion[1:])
                else:
                    # Look up child node (case-insensitive if enabled)
                    nn = node.children.get(k)
                    if nn is None:
                        # Create new child node if it doesn't exist
                        nn = node.child(ch)
                node = nn  # Move to child node

            # Reset to root if we hit an empty node and a reset character
            # (Reset characters are non-alphabetic, non-control characters like space, punctuation)
            if node.is_empty() and self.is_reset_char(ch):
                node = node.root.clone(s, parent=node)
            # Update node's full text
        node.full_text = s
        return node

    def is_alpha(self, ch: str) -> bool:
        """
        Check if a character is alphabetic (including apostrophe).
        
        Args:
            ch: Character to check.
        
        Returns:
            True if character is a letter (a-z, A-Z) or apostrophe, False otherwise.
        """
        return ch in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'"

    def is_control_character(self, ch: str) -> bool:
        """
        Check if a character is a control character (tab or backspace).
        
        Args:
            ch: Character to check.
        
        Returns:
            True if character is tab or backspace and control character handling
            is enabled, False otherwise.
        """
        if not self.handle_control_characters:
            return False
        return ch in "\t\b"

    def is_reset_char(self, ch: str) -> bool:
        """
        Check if a character is a reset character (non-alphabetic, non-control).
        
        Reset characters (like spaces, punctuation) cause the trie to reset to root
        when encountered at an empty node.
        
        Args:
            ch: Character to check.
        
        Returns:
            True if character is neither alphabetic nor a control character, False otherwise.
        """
        return not self.is_alpha(ch) and not self.is_control_character(ch)

    def insert(self, text: str) -> "CoreTrie":
        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue

            # Split frequency: "... #123"
            freq = 1
            if " #" in line:
                line, freq_str = line.rsplit(" #", 1)
                freq = int(freq_str)

            # Split prefix|completion
            pre, post = line.split("|", 1)
            self.insert_pair(pre, post, freq)

        return self


    def insert_pair(self, pre: str, post: str, freq: int = 1) -> None:
        node = self
        root = self.root
        T = type(self)
        ci = self.case_insensitive
        pre = pre.lower() if ci else pre
        post = post.lower() if ci else post

        for ch in pre:
            child = node.children.get(ch)
            if child is None:
                # very lightweight child creation, see #2
                child = T(
                    completion="",
                    children={},
                    root=root,
                    parent=node,
                    prefix=node.prefix + ch,
                )
                node.children[ch] = child
            node = child
        node.completion = post
        node.freq = freq
        self.counter += 1
        node.index = self.counter
        self.words.append(node)

    def accept(self) -> "CoreTrie":
        """
        Accept the completion at this node.
        
        Navigates through the completion string, effectively "accepting" the
        autocomplete suggestion.
        
        Returns:
            The node reached after accepting the completion.
        """
        return self.walk_to(self.completion)


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
        start2: str = "\033[37m" if u else ""  # Color for completion text (white)
        start: str = "\033[38;5;233m" if u else ""  # Color for before-state text (dark gray)
        c: str = self.completion.replace(" ", "█")  # Replace spaces with block character
        end: str = "\033[0m" if u else ""  # Reset color code

        # Clean full text: remove tabs and backspace sequences
        full_text = full_text.replace("\t", "")
        import re
        full_text = re.sub(".?\b", "", full_text)  # Remove backspace sequences

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
        print(s, end="\r" if disappearing else "\n")
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
        t.sim("Animals can be enormo\t. For example: gira\t\b\bes are super super tall and hippos are fat", **kw)
        return t.root





if __name__ == "__main__":
    t = Trie.from_words("""
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
    t.sim("Animals can be enormo\t. For example: gira\t\b\bes are super super tall and hippos are fat",
          # disappearing=False
          )



