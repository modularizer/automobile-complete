from typing import Any

from automobile_complete.utils.typehints import Word, Prefix, Completion, Freq, Prob, Index, Sort, Words

from automobile_complete.utils.terminal import GREEN_HIGHLIGHT, RESET


class Node:
    """
    Represents a node in a trie (prefix tree) data structure for autocomplete.

    Each node corresponds to a prefix string and stores:
    - The prefix string itself
    - Child nodes for each possible next character
    - Word completion information if this prefix is a complete word
    - Frequency statistics for autocomplete ranking
    - Auto-completion suggestions based on frequency analysis

    The trie enables efficient prefix-based word lookup and completion suggestions
    by organizing words in a tree structure where each path from root to leaf
    represents a word, and shared prefixes share common nodes.

    Attributes:
        words: The complete wordlist as (word, frequency) tuples
        prefix: The prefix string represented by this node
        children: Dictionary mapping next characters to child Node objects
        word_id: Index of this word in the wordlist if prefix is a complete word, else None
        word_freq: Frequency of this word (if prefix is a word), else 0.0
        sum_freq: Total frequency of this node plus all descendants (subtree frequency)
        best_word_id: Index of the highest-frequency word in this node's subtree
        best_word_freq: Frequency of the best word in this subtree
        best_word_subtree_id: Index of the word with best sum_freq in subtree
        best_word_subtree_freq: Word frequency of the best subtree word
        best_word_subtree_sum_freq: Subtree frequency of the best subtree word
        best_child_char: Character leading to the child with highest sum_freq
        best_child_sum_freq: Highest sum_freq among all children
        auto_word_id: Index of the word selected for auto-completion at this prefix
        auto_suffix: Suffix to append to prefix to complete the auto-selected word
        has_auto: Whether this node has an auto-completion suggestion
        anchor_freq: Reference frequency used for normalization
    """
    @classmethod
    def build(
            cls,
            words: Words,
            anchor_freq: Freq = 1,
    ) -> "Node":
        """
        Build a trie (prefix tree) data structure from a list of words and frequencies.

        Constructs a trie where each node represents a prefix, and paths from root to
        leaf nodes represent complete words. Shared prefixes share common nodes for
        efficient storage and lookup.

        Args:
            words: List of (word, frequency) tuples to build the trie from.
            anchor_freq: Reference frequency used for normalization. Defaults to 1.

        Returns:
            Root node of the constructed trie.
        """
        word_list: list[Word] = [w for (w, f) in words]  # Extract word strings
        freq_list: list[Freq] = [f for (w, f) in words]  # Extract frequency values
        root: "Node" = cls(words=words, prefix="", anchor_freq=anchor_freq)  # Root node with empty prefix

        for i, w in enumerate(word_list):
            f: Freq = freq_list[i]  # Frequency for current word
            node: "Node" = root  # Start from root for each word
            # Build the path down to the node, character by character
            for char in w:
                # Get existing child node or create new one if it doesn't exist
                # This is equivalent to: get node.children[char] if exists, otherwise
                # set node.children[char] = Node() then return node.children[char]
                node = node.children.setdefault(char, cls(words=words, prefix=node.prefix + char, anchor_freq=anchor_freq))
            # Mark this node as a complete word and store its frequency
            node.word_id = i
            node.word_freq = f
        return root

    def __init__(self, words: Words, prefix: Prefix, anchor_freq: Freq = 1,):
        """Initialize a trie node with the given prefix and wordlist."""
        self.words = words  # Complete wordlist: list of (word, frequency) tuples
        self.prefix: Prefix = prefix  # The prefix string this node represents
        self.children: dict[str, "Node"] = {}  # Child nodes keyed by next character


        # Word completion information (if this prefix is a complete word)
        self.word_id: Index | None = None  # Index of this word in the wordlist
        self.word_freq: Freq = 0.0  # Frequency of this word (if prefix is a word)

        # Subtree frequency: sum of this node's frequency plus all descendants
        # This represents the total probability mass in this subtree
        self.sum_freq: Freq = 0.0

        # Best word tracking: find the highest-frequency word in this subtree
        # This may be the word at this node or a word in a child subtree
        self.best_word_id: Index | None = None  # Index of best word in subtree
        self.best_word_freq: Freq = 0.0  # Frequency of best word

        # Best subtree word: find the word with the best sum_freq (subtree frequency)
        # This considers not just the word itself but all words that extend from it
        self.best_word_subtree_id: Index | None = None  # Index of word with best subtree
        self.best_word_subtree_freq: Freq = 0.0  # Word frequency of best subtree word
        self.best_word_subtree_sum_freq: Freq = 0.0  # Subtree frequency of best word

        # Best child tracking: find which next character leads to the best subtree
        self.best_child_char: str | None = None  # Character leading to best child
        self.best_child_sum_freq: Freq = 0.0  # Sum frequency of best child subtree

        # Auto-completion selection: the word and suffix chosen for auto-complete
        # These are computed during DFS traversal based on frequency thresholds
        self.auto_word_id: Index | None = None  # Index of auto-completed word
        self.auto_suffix: Completion | None = None  # Suffix to append for auto-completion
        self.has_auto: bool | None = None  # Whether auto-completion is available

        self.anchor_freq: Freq = anchor_freq  # Reference frequency for normalization

    @property
    def is_word(self) -> bool:
        """
        Check if this node represents a complete word.

        Returns:
            True if this prefix is a complete word in the wordlist, False otherwise.
        """
        return self.word_id is not None

    @property
    def auto_word(self) -> Word | None:
        """
        Get the auto-completed word for this prefix.

        Returns:
            The full word selected for auto-completion, or None if no auto-completion
            is available at this prefix.
        """
        return self.words[self.auto_word_id][0] if self.auto_word_id is not None else None

    @property
    def best_word_subtree(self) -> Word | None:
        """
        Get the word with the best subtree frequency in this node's subtree.

        Returns:
            The word with the highest subtree frequency, or None if no such word exists.
        """
        return self.words[self.best_word_subtree_id][0] if self.best_word_subtree_id is not None else None

    @property
    def best_word(self) -> Word | None:
        """
        Get the highest-frequency word in this node's subtree.

        Returns:
            The word with the highest individual frequency, or None if no words exist.
        """
        return self.words[self.best_word_id][0] if self.best_word_id is not None else None

    def get_all_words(self, words: list | None = None) -> list[tuple[Prefix, Freq, Freq]]:
        """
        Recursively collect all words in this node's subtree.

        Args:
            words: Accumulator list for collecting words. If None, creates a new list.

        Returns:
            List of tuples (prefix, word_freq, sum_freq) for all words in the subtree.
        """
        words = words or []
        if self.is_word:
            words.append((self.prefix, self.word_freq, self.sum_freq))
        for ch in self.children:
            self.children[ch].get_all_words(words)
        return words

    def sorted_next_char(self) -> list[str]:
        """
        Get next characters sorted by their word frequency (descending).

        Returns:
            List of characters that can follow this prefix, sorted by the frequency
            of the word at each child node (highest first).
        """
        return [k for k, v in sorted(self.children.items(), key=lambda x: x[1].word_freq, reverse=True)]

    def sorted_next_char_str(self, j: str = "") -> str:
        """
        Get next characters as a joined string, sorted by frequency.

        Args:
            j: Joiner string to use between characters. Defaults to "" (no separator).

        Returns:
            String of next characters joined together, sorted by frequency.
        """
        return j.join(self.sorted_next_char())

    def __repr__(self) -> str:
        """
        String representation of the node showing autocomplete options.

        Returns:
            Formatted string showing top autocomplete suggestions with frequencies.
        """
        return self.build_show_str(10, word_threshold=0.01, sum_threshold=0.1, sum_ratio_threshold=10)

    def __getattr__(self, name: str):
        """
        Enable attribute-style access to child nodes by character sequence.

        Allows accessing nodes like node.abc instead of node.children['a'].children['b'].children['c']

        Args:
            name: String of characters representing the path to a child node.

        Returns:
            The Node at the end of the path, or None if the path doesn't exist.
        """
        node = self
        for char in name:
            node = node.children.get(char)
            if node is None:
                return None
        return node

    def __getitem__(self, item):
        """
        Enable dictionary-style access to child nodes.

        Args:
            item: Character or string path to a child node.

        Returns:
            The Node at the specified path, or None if it doesn't exist.
        """
        return getattr(self, item)

    def __dir__(self) -> list[str]:
        """
        Return list of available attributes including child node characters.

        This enables tab completion in interactive environments to show available
        next characters for navigation.

        Returns:
            List of attribute names including standard attributes plus child characters.
        """
        return super().__dir__() + self.sorted_next_char()

    def list_options(self,
                     n: Index | None = None,
                     word_freq_threshold: Freq = 0.0,
                     sum_freq_threshold: Freq = 0.0,
                     word_ratio_threshold: float = 1000,
                     sum_ratio_threshold: float = 1000,
                     sort_by: Sort | None = None) -> list[tuple[Word, "Node"]]:
        """
        Return top-n words in this node's subtree as (word, node) tuples.

        Collects all words in the subtree that meet the specified frequency thresholds
        and returns them sorted by the requested criteria. This is used to generate
        autocomplete suggestions for a given prefix.

        Args:
            n: Maximum number of words to return. If None, returns all matching words.
            word_freq_threshold: Minimum word frequency (absolute) to include a word.
                Words with frequency below this are filtered out.
            sum_freq_threshold: Minimum subtree frequency (absolute) to include a word.
                Words with subtree frequency below this are filtered out.
            word_ratio_threshold: Ratio threshold for word frequency. Words must have
                frequency at least (best_word_freq / word_ratio_threshold) to be included.
                Higher values allow more words through.
            sum_ratio_threshold: Ratio threshold for subtree frequency. Words must have
                subtree frequency at least (best_subtree_freq / sum_ratio_threshold).
                Higher values allow more words through.
            sort_by: How to sort the results. Options:
                - "prefix": Alphabetical by word
                - "freq": By word frequency (descending)
                - "sum_freq": By subtree frequency (descending)
                - None: No sorting (keeps DFS traversal order)

        Returns:
            List of (word, node) tuples for words meeting the criteria, sorted as
            specified. Each node contains frequency information for the word.

        Note:
            Assumes dfs(...) has already been run to populate sum_freq and other
            frequency statistics in the subtree.
        """
        # Early return if no words exist in this subtree
        if self.sum_freq <= 0 or not self.children:
            return []

        words: list[tuple[str, Node]] = []
        # Track best frequencies for ratio-based filtering
        stats = {
            "bwf": 0.0,  # Best word frequency
            "bwsf": 0.0,  # Best word subtree frequency
        }

        def collect(node: "Node", skip_first=True):
            """
            Recursively collect words from the subtree.

            Args:
                node: Current node being processed
                skip_first: If True, skip the root node (to avoid double-counting)
            """
            # Any node with a word_id is a valid completion, even if it has children
            # (a word can be a prefix of other words)
            if not skip_first and node.word_id is not None and (node.word_freq or 0) >= word_freq_threshold and (node.sum_freq or 0) >= sum_freq_threshold:
                w = node.words[node.word_id][0]  # Get the actual word string
                words.append((w, node))
                # Update best frequencies for ratio calculations
                if (node.word_freq or 0) > stats["bwf"]:
                    stats["bwf"] = node.word_freq
                if (node.sum_freq or 0) > stats["bwsf"]:
                    stats["bwsf"] = node.sum_freq
            # Recursively process all children
            for child in node.children.values():
                collect(child, False)

        # Collect all words in the subtree
        collect(self)
        # Apply ratio-based filtering: words must be within ratio_threshold of the best
        words = [(w, n) for w, n in words if (n.word_freq or 0) >= (stats["bwf"]/word_ratio_threshold) and (n.sum_freq or 0) >= (stats["bwsf"]/sum_ratio_threshold)]

        # Sort by the specified criteria
        if sort_by:
            # Sort by the requested attribute (freq, sum_freq, or prefix)
            if sort_by == "prefix":
                words.sort(key=lambda x: x[0])  # Alphabetical by word
            else:
                # Sort by node attribute (freq or sum_freq), descending
                words.sort(key=lambda x: getattr(x[1], sort_by), reverse=True)

        # Return top n words
        return words[:n]

    def list_options_normalized(self, n: Index | None = None, word_threshold: Prob = 0.0, sum_threshold: Prob = 0.0,  word_ratio_threshold: float = 1000,
                                sum_ratio_threshold: float = 1000, sort_by: Sort = "sum_freq"):
        """
        List autocomplete options with normalized thresholds.

        This is a convenience wrapper around list_options that normalizes thresholds
        relative to this node's subtree frequency. This makes it easier to specify
        thresholds as percentages of the total subtree frequency.

        Args:
            n: Maximum number of words to return.
            word_threshold: Minimum word frequency as a fraction of subtree frequency.
            sum_threshold: Minimum subtree frequency as a fraction of this node's sum_freq.
            word_ratio_threshold: Ratio threshold for word frequency filtering.
            sum_ratio_threshold: Ratio threshold for subtree frequency filtering.
            sort_by: How to sort results ("prefix", "freq", or "sum_freq").

        Returns:
            List of (word, node) tuples meeting the criteria.
        """
        # Normalize thresholds by multiplying by subtree frequency
        return self.list_options(n, word_freq_threshold=word_threshold*self.sum_freq, sum_freq_threshold=sum_threshold*self.sum_freq, word_ratio_threshold=word_ratio_threshold, sum_ratio_threshold=sum_ratio_threshold, sort_by=sort_by)

    def list_words(self, n: Index | None = None, word_threshold: Prob = 0.0, sum_threshold: Prob = 0.0,  word_ratio_threshold: float = 1000,
                   sum_ratio_threshold: float = 1000, sort_by: Sort = "sum_freq"):
        """
        Get list of word strings (without node objects) for autocomplete options.

        Convenience method that extracts just the word strings from list_options_normalized.

        Args:
            n: Maximum number of words to return.
            word_threshold: Minimum word frequency as a fraction of subtree frequency.
            sum_threshold: Minimum subtree frequency as a fraction of this node's sum_freq.
            word_ratio_threshold: Ratio threshold for word frequency filtering.
            sum_ratio_threshold: Ratio threshold for subtree frequency filtering.
            sort_by: How to sort results ("prefix", "freq", or "sum_freq").

        Returns:
            List of word strings (not tuples) meeting the criteria.
        """
        return [w for (w, _) in self.list_options_normalized(n, word_threshold=word_threshold, sum_threshold=sum_threshold, word_ratio_threshold=word_ratio_threshold, sum_ratio_threshold=sum_ratio_threshold, sort_by=sort_by)]

    def build_show_str(self, n: Index | None = 5, word_threshold: Prob = 0.0, sum_threshold: Prob = 0.0,  word_ratio_threshold: float = 1000,
                       sum_ratio_threshold: float = 1000, sort_by: Sort = "sum_freq"):
        """
        Build a formatted string showing autocomplete options with frequencies.

        Creates a human-readable string showing the top autocomplete suggestions,
        with percentages and highlighting for the auto-selected word.

        Args:
            n: Maximum number of words to show.
            word_threshold: Minimum word frequency as a fraction of subtree frequency.
            sum_threshold: Minimum subtree frequency as a fraction of this node's sum_freq.
            word_ratio_threshold: Ratio threshold for word frequency filtering.
            sum_ratio_threshold: Ratio threshold for subtree frequency filtering.
            sort_by: How to sort results ("prefix", "freq", or "sum_freq").

        Returns:
            Formatted string with one word per line, showing:
            - Word text
            - Word frequency as percentage of subtree
            - Subtree frequency as percentage (if word is not the only word in subtree)
            - Green highlighting for auto-selected word
        """
        options: list[tuple[Word, "Node"]] = self.list_options_normalized(n, word_threshold=word_threshold, sum_threshold=sum_threshold, word_ratio_threshold=word_ratio_threshold, sum_ratio_threshold=sum_ratio_threshold, sort_by=sort_by)
        a: Word | None = self.auto_word  # Auto-selected word
        t: Freq = self.sum_freq  # Total subtree frequency
        s: str = ""  # Formatted output string
        for w, n in options:
            # Highlight auto-selected word with green background
            s += GREEN_HIGHLIGHT if w == a else ""
            s += w
            # Show word frequency as percentage of total subtree frequency
            s += f" {round(100*n.word_freq/t,1)}%"
            # If word has children (subtree frequency > word frequency), show subtree percentage
            if (n.word_freq/n.sum_freq) < 0.99:
                s += f" {round(100*n.sum_freq/t,1)}%"
            # Reset color if we highlighted
            s += RESET if w == a else ""
            s += "\n"
        return s

    def show(self, n: Index | None = 5, word_threshold: Prob = 0.0, sum_threshold: Prob = 0.0,  word_ratio_threshold: float = 1000,
             sum_ratio_threshold: float = 1000, sort_by: Sort = "sum_freq"):
        """
        Print formatted autocomplete options to stdout.

        Convenience method that prints the output of build_show_str.

        Args:
            n: Maximum number of words to show.
            word_threshold: Minimum word frequency as a fraction of subtree frequency.
            sum_threshold: Minimum subtree frequency as a fraction of this node's sum_freq.
            word_ratio_threshold: Ratio threshold for word frequency filtering.
            sum_ratio_threshold: Ratio threshold for subtree frequency filtering.
            sort_by: How to sort results ("prefix", "freq", or "sum_freq").
        """
        print(self.build_show_str(n, word_threshold=word_threshold, sum_threshold=sum_threshold, word_ratio_threshold=word_ratio_threshold, sum_ratio_threshold=sum_ratio_threshold, sort_by=sort_by))

    def disable(self, pre: str, post: str):
        # disable completions for a word
        node = self[pre]
        if node is None:
            return
        if node.auto_suffix:
            node.auto_suffix = None
        for ch in post:
            node = node[ch]
            if node is None:
                break
            if node.auto_suffix:
                node.auto_suffix = None

    def prune(self):
        """
        Recursively prune the trie to remove nodes without auto-completion.

        Removes all branches that don't lead to any auto-completion suggestions,
        reducing the tree size while preserving all valid completion paths.

        Args:
            node: Root node of the subtree to prune.
        """
        for ch, child in list(self.children.items()):
            if child.has_auto:
                child.prune()
            else:
                del self.children[ch]


    def json(self) -> dict[str, Any] | Completion | None:
        """
        Convert trie node to JSON-serializable dictionary structure.

        Recursively builds a nested dictionary where keys are characters and values
        are either child dictionaries or completion suffixes. The empty string key
        ('') stores the auto-completion suffix if present.


        Returns:
            Dictionary representation of the trie, completion string, or None if empty.
        """
        d: dict[str, Any] = {ch: child.json() for ch, child in self.children.items()}
        d = {k: v for k, v in d.items() if v is not None}  # Remove None values
        if self.auto_suffix:
            if not d:
                return self.auto_suffix  # Return just the suffix if no children
            d[''] = self.auto_suffix  # Store suffix under empty string key
        if not d:
            return None
        return d

    def build_map(self, map: dict[Word, list[Prefix, Completion]] | None = None, calc: bool = True) -> dict[Word, list[Prefix, Completion]] | None:
        """
        Build a mapping from complete words to [prefix, completion] pairs.

        Creates a dictionary mapping each complete word to its prefix and completion
        suffix, which can be used for efficient word lookup and completion.

        Args:
            map: Accumulator dictionary. If None, creates a new one.
            calc: If True, returns sorted dictionary. If False, returns None (for recursion).

        Returns:
            Dictionary mapping words to [prefix, completion] lists, or None if calc=False.
        """
        map = map if map is not None else {}
        if self.auto_suffix:
            w: Word = self.prefix + self.auto_suffix  # Complete word
            if w not in map:
                map[w] = [self.prefix, self.auto_suffix]
        elif self.has_auto:
            for child in self.children.values():
                child.build_map(map, False)
        return map if calc else None




def dfs(
        word_list: list[Word],
        node: Node,
        prefix_len: Index,
        *,
        word_threshold: Prob | None,
        subtree_threshold: Prob | None,
        word_ratio_threshold: float = 1,
        subtree_ratio_threshold: float = 1,
        min_suffix_len: Index = 1,
        min_prefix_len: Index = 1,
) -> bool:
    """
    Perform depth-first search to compute frequency statistics and auto-completion.

    Recursively traverses the trie to compute subtree frequencies, identify best
    words, and determine auto-completion suggestions based on frequency thresholds.
    This function populates the node attributes used for autocomplete ranking.

    Args:
        word_list: Complete list of words in the trie.
        node: Current node being processed.
        prefix_len: Length of the prefix represented by this node.
        word_threshold: Minimum probability threshold for a word to be considered.
            If None, uses subtree_threshold.
        subtree_threshold: Minimum probability threshold for a subtree to be considered.
            If None, uses word_threshold.
        word_ratio_threshold: Ratio threshold for comparing word frequencies.
        subtree_ratio_threshold: Ratio threshold for comparing subtree frequencies.
        min_suffix_len: Minimum length of completion suffix.
        min_prefix_len: Minimum length of prefix before auto-completion.

    Returns:
        True if this node or any descendant has auto-completion, False otherwise.

    Raises:
        ValueError: If both word_threshold and subtree_threshold are None.
        RuntimeError: If word_threshold > subtree_threshold.
    """
    if word_threshold is None and subtree_threshold is None:
        raise ValueError("atleast one of word_threshold or subtree_threshold is required")
    elif word_threshold is None:
        word_threshold = subtree_threshold
    elif subtree_threshold is None:
        subtree_threshold = word_threshold

    if word_threshold > subtree_threshold:
        raise RuntimeError("word_threshold must be less or equal to subtree_threshold")
    # Start by counting the frequency of a word ending at this node
    total: Freq = node.word_freq  # Total subtree frequency (starts with this node's frequency)

    best_subtree_freq: Freq = node.word_freq  # Best subtree frequency found so far
    best_subtree_char: str | None = None  # Character leading to best subtree (None means this node itself)

    best_word_freq: Freq = node.word_freq  # Best individual word frequency in subtree
    best_word_id: Index | None = node.word_id  # Index of best word

    for ch, child in list(node.children.items()):
        dfs(
            word_list, child, prefix_len + 1,
            word_threshold=word_threshold, subtree_threshold=subtree_threshold,
            word_ratio_threshold=word_ratio_threshold,
            subtree_ratio_threshold=subtree_ratio_threshold,
            min_suffix_len=min_suffix_len,
                              )
        total += child.sum_freq

    # Now total subtree freq for this prefix
    node.sum_freq = total

    best_word_subtree_id: Index | None = node.word_id  # Word with best subtree frequency
    best_word_subtree_freq: Freq = node.word_freq  # Word frequency of best subtree word
    # Subtree frequency of best word (only if it meets word_threshold)
    best_word_subtree_sum_freq: Freq = node.sum_freq if (node.word_freq/total) >= word_threshold else 0.0
    second_best_word_subtree_sum_freq: Freq = 0.0  # Second-best subtree frequency (for ratio comparison)
    second_best_word_subtree_freq: Freq = 0.0  # Second-best word frequency (for ratio comparison)

    has_auto: bool = node.auto_word_id is not None  # Whether this node has auto-completion


    # Visit children first
    for ch, child in list(node.children.items()):
        # Best by subtree sum
        if child.sum_freq > best_subtree_freq:
            best_subtree_freq = child.sum_freq
            best_subtree_char = ch

        # Best single word
        if child.best_word_id is not None and child.best_word_freq > best_word_freq:
            best_word_freq = child.best_word_freq
            best_word_id = child.best_word_id

        if (child.best_word_subtree_id is not None) and (child.best_word_subtree_sum_freq > best_word_subtree_sum_freq) and (child.best_word_subtree_sum_freq / total) >= subtree_threshold and ((child.best_word_subtree_freq/total) >= word_threshold):
            best_word_subtree_sum_freq = child.best_word_subtree_sum_freq
            best_word_subtree_freq = child.best_word_subtree_freq
            best_word_subtree_id = child.best_word_subtree_id
        else:
            if child.best_word_subtree_sum_freq > second_best_word_subtree_sum_freq:
                second_best_word_subtree_sum_freq = child.best_word_subtree_sum_freq
            if child.best_word_subtree_freq > second_best_word_subtree_freq:
                second_best_word_subtree_freq = child.best_word_subtree_freq


        if child.has_auto:
            has_auto = True


    # best subtree
    node.best_child_sum_freq = best_subtree_freq
    node.best_child_char = best_subtree_char

    # best word anywhere in node's tree
    node.best_word_freq = best_word_freq
    node.best_word_id = best_word_id

    # find the word in the subtree with the best sum freq
    node.best_word_subtree_sum_freq = best_word_subtree_sum_freq
    node.best_word_subtree_freq = best_word_subtree_freq
    # Check if best word meets all thresholds for auto-completion
    valid: bool = (best_word_subtree_sum_freq >= subtree_threshold and
                   best_word_subtree_freq >= word_threshold and
                   best_word_subtree_freq >= (second_best_word_subtree_freq * word_ratio_threshold) and
                   best_word_subtree_sum_freq >= (second_best_word_subtree_sum_freq * subtree_ratio_threshold)
                   )
    node.best_word_subtree_id = best_word_subtree_id if valid else None


    # select not the best sub-word, but the best sub-tree which is a word
    if valid:
        w: Word = word_list[best_word_subtree_id]  # Best word for auto-completion
        suffix_len: Index = len(w) - (prefix_len - 1)  # Length of completion suffix
        if suffix_len >= min_suffix_len and (prefix_len - 1) >= min_prefix_len:
            node.auto_word_id = best_word_subtree_id
            node.auto_suffix = w[prefix_len - 1:]  # Suffix to append for completion
            has_auto = True

    node.has_auto = has_auto
    return has_auto
