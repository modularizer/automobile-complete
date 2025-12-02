import json
import re
from pathlib import Path
from typing import Literal

from wordfreq import iter_wordlist, zipf_frequency


Words = list[tuple[str, float]]
Sort = Literal["alpha","freq"]

def get_words(
    lang: str = "en",
    pattern: str = r"^[a-zA-Z].+",
    max_words: int | None = None,
    min_length: int  = 2,
    sort_by: Sort = "freq",
) -> Words:
    """Get an alphabetically sorted lisit of words and their frequencies."""
    words_by_freq = [w for w in iter_wordlist(lang) if re.match(pattern, w) and len(w) >= min_length]

    if max_words:
        words_by_freq = words_by_freq[:max_words]

    # zipf_frequency returns log10(freq per million)
    word_occurences = [10 ** zipf_frequency(k, lang) for k in words_by_freq]
    z = zip(words_by_freq, word_occurences)
    if sort_by == "alpha":
        return list(sorted(z))
    return list(z)


class Node:
    def __init__(self, word_list: list[str], prefix: str):
        self.word_list = word_list
        self.prefix: str = prefix
        self.children: dict[str, Node] = {}


        # the index of this word in the wordlist if self.prefix is a word
        self.word_id: int | None = None
        self.word_freq: float = 0.0       # the frequency of this node
        self.sum_freq = 0.0 # the frequency of this node plus the sum_freqs of all its children

        # find the best individual word in this node's subtree, could be equal to self.word_id and self.word_freq
        self.best_word_id: int | None = None
        self.best_word_freq: float = 0.0

        # find the WORD with the best sum_freq
        self.best_word_subtree_id: int | None = None
        self.best_word_subtree_freq: float = 0.0 # the sumfreq
        self.best_word_subtree_sum_freq: float = 0.0 # the sumfreq

        # find the best next character
        self.best_child_char: str | None = None
        self.best_child_sum_freq: float = 0.0

        # actual auto-selection
        self.auto_word_id: int | None = None
        self.auto_suffix: str | None = None
        self.has_auto: bool | None = None

    @property
    def is_word(self) -> bool:
        return self.word_id is not None

    @property
    def auto_word(self) -> str | None:
        return  self.word_list[self.auto_word_id] if self.auto_word_id is not None else None

    @property
    def best_word_subtree(self) -> str | None:
        return self.word_list[self.best_word_subtree_id] if self.best_word_subtree_id is not None else None

    @property
    def best_word(self) -> str | None:
        return self.word_list[self.best_word_id] if self.best_word_id is not None else None

    def get_all_words(self, words: list | None = None) -> list[str]:
        words = words or []
        if self.is_word:
            words.append((self.prefix, self.word_freq, self.sum_freq))
        for ch in self.children:
            self.children[ch].get_all_words(words)
        return words

    def sorted_next_char(self) -> list[str]:
        return [k for k, v in sorted(self.children.items(), key=lambda x: x[1].word_freq, reverse=True)]

    def sorted_next_char_str(self, j: str = "") -> str:
        return j.join(self.sorted_next_char())

    def __repr__(self) -> str:
        return self.build_show_str(10, word_threshold=0.01, sum_threshold=0.1, sum_ratio_threshold=10)

    def __getattr__(self, name: str):
        node = self
        for char in name:
            node = node.children.get(char)
            if node is None:
                return None
        return node

    def __getitem__(self, item):
        return getattr(self, item)

    def __dir__(self) -> list[str]:
        return super().__dir__() + self.sorted_next_char()

    def list_options(self,
                     n: int  | None = None,
                     word_freq_threshold: float = 0.0,
                     sum_freq_threshold: float = 0.0,
                     word_ratio_threshold: float = 1000,
                     sum_ratio_threshold: float = 1000,
                     sort_by: Literal["prefix", "freq", "sum_freq"] | None = None) -> list[tuple[str, any]]:
        """
        Return top-n words in this node's subtree as
        (word, probability_given_prefix) tuples.

        Assumes dfs(...) has already been run to fill sum_freq.
        """
        if self.sum_freq <= 0 or not self.children:
            return []

        words: list[tuple[str, Node]] = []
        stats = {
            "bwf": 0.0,
            "bwsf": 0.0,
        }
        def collect(node: "Node", skip_first=True):
            # Any node with a word_id is a valid completion,
            # even if it has children
            if not skip_first and node.word_id is not None and (node.word_freq or 0) >= word_freq_threshold and (node.sum_freq or 0) >= sum_freq_threshold:
                w = node.word_list[node.word_id]
                words.append((w, node))
                if (node.word_freq or 0) > stats["bwf"]:
                    stats["bwf"] = node.word_freq
                if (node.sum_freq or 0) > stats["bwsf"]:
                    stats["bwsf"] = node.sum_freq
            for child in node.children.values():
                collect(child, False)

        collect(self)
        words = [(w, n) for w, n in words if (n.word_freq or 0) >= (stats["bwf"]/word_ratio_threshold) and (n.sum_freq or 0) >= (stats["bwsf"]/sum_ratio_threshold) ]

        if sort_by:
            # Sort by frequency within this subtree
            words.sort(key=lambda x: x[1][sort_by], reverse=True)

        return words[:n]

    def list_options_normalized(self, n: int | None = None, word_threshold: float = 0.0, sum_threshold: float = 0.0,  word_ratio_threshold: float = 1000,
                     sum_ratio_threshold: float = 1000, sort_by: Literal["prefix", "freq", "sum_freq"] = "sum_freq"):
        return self.list_options(n, word_freq_threshold=word_threshold*self.sum_freq, sum_freq_threshold=sum_threshold*self.sum_freq, word_ratio_threshold=word_ratio_threshold, sum_ratio_threshold=sum_ratio_threshold, sort_by=sort_by)

    def list_words(self, n: int | None = None, word_threshold: float = 0.0, sum_threshold: float = 0.0,  word_ratio_threshold: float = 1000,
                     sum_ratio_threshold: float = 1000,sort_by: Literal["prefix", "freq", "sum_freq"] = "sum_freq"):
        return [w for (w, _) in self.list_options_normalized(n, word_threshold=word_threshold, sum_threshold=sum_threshold, word_ratio_threshold=word_ratio_threshold, sum_ratio_threshold=sum_ratio_threshold, sort_by=sort_by)]

    def build_show_str(self, n: int | None = 5, word_threshold: float = 0.0, sum_threshold: float = 0.0,  word_ratio_threshold: float = 1000,
                     sum_ratio_threshold: float = 1000,sort_by: Literal["prefix", "freq", "sum_freq"] = "sum_freq"):
        options = self.list_options_normalized(n, word_threshold=word_threshold, sum_threshold=sum_threshold, word_ratio_threshold=word_ratio_threshold, sum_ratio_threshold=sum_ratio_threshold, sort_by=sort_by)
        a = self.auto_word
        t = self.sum_freq
        s = ""
        for w, n in options:
            s += "\033[102m" if w ==a else ""
            s += w
            s += f" {round(100*n.word_freq/t,1)}%"
            if (n.word_freq/n.sum_freq)<0.99:
                s += f" {round(100*n.sum_freq/t,1)}%"
            s += "\033[0m" if w ==a else ""
            s += "\n"
        return s

    def show(self, n: int | None = 5, word_threshold: float = 0.0, sum_threshold: float = 0.0,  word_ratio_threshold: float = 1000,
                     sum_ratio_threshold: float = 1000,sort_by: Literal["prefix", "freq", "sum_freq"] = "sum_freq"):
        print(self.build_show_str(n, word_threshold=word_threshold, sum_threshold=sum_threshold, word_ratio_threshold=word_ratio_threshold, sum_ratio_threshold=sum_ratio_threshold, sort_by=sort_by))


def build_trie(
    words: Words,
) -> Node:
    word_list = [w for (w,f) in words]
    root = Node(word_list=word_list, prefix = "")  # list of (word, freq)
    freqs_list = [f for (w,f) in words]
    for i, w in enumerate(word_list):
        f = freqs_list[i]
        node = root
        # here we build the graph/tree down to the node, letter by letter
        for char in w:
            # this basically is the same as "get node.children[char] if exists, otherwise set node.children[char] = Node() then return node.children[char]"
            node = node.children.setdefault(char, Node(word_list=word_list, prefix=node.prefix + char))
        node.word_id = i
        node.word_freq = f
    return root


def dfs(
    word_list: list[str],
    node: Node,
    prefix_len: int,
        *,
    word_threshold: float | None,
    subtree_threshold: float | None,
    word_ratio_threshold: float = 1,
    subtree_ratio_threshold: float = 1,
    min_suffix_len: int = 1,
    min_prefix_len: int = 1,
) -> bool:


    if word_threshold is None and subtree_threshold is None:
        raise ValueError("atleast one of word_threshold or subtree_threshold is required")
    elif word_threshold is None:
        word_threshold = subtree_threshold
    elif subtree_threshold is None:
        subtree_threshold = word_threshold

    if word_threshold > subtree_threshold:
        raise RuntimeError("word_threshold must be less or equal to subtree_threshold")
    # Start by counting the frequency of a word ending at this node
    total = node.word_freq

    best_subtree_freq = node.word_freq
    best_subtree_char = None # none means this node itself, not a child

    best_word_freq = node.word_freq
    best_word_id = node.word_id

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

    best_word_subtree_id = node.word_id
    best_word_subtree_freq = node.word_freq
    best_word_subtree_sum_freq = node.sum_freq if (node.word_freq/total) >= word_threshold else 0.0
    second_best_word_subtree_sum_freq = 0.0
    second_best_word_subtree_freq = 0.0

    has_auto = node.auto_word_id is not None


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
    valid = (best_word_subtree_sum_freq >= subtree_threshold and
             best_word_subtree_freq >= word_threshold and
             best_word_subtree_freq >= (second_best_word_subtree_freq * word_ratio_threshold) and
             best_word_subtree_sum_freq >= (second_best_word_subtree_sum_freq * subtree_ratio_threshold)
             )
    node.best_word_subtree_id = best_word_subtree_id if valid else None


    # select not the best sub-word, but the best sub-tree which is a word
    if valid:
        w = word_list[best_word_subtree_id]
        suffix_len = len(w) - (prefix_len - 1)
        if suffix_len >= min_suffix_len and (prefix_len - 1) >= min_prefix_len:
            node.auto_word_id = best_word_subtree_id
            node.auto_suffix = w[prefix_len - 1:]
            has_auto = True

    node.has_auto = has_auto
    return has_auto




def prune_tree(node: Node):
    for ch, child in list(node.children.items()):
        if child.has_auto:
            prune_tree(child)
        else:
            del node.children[ch]


def build_json(node: Node):
    d = {ch: build_json(child) for ch, child in node.children.items()}
    d = {k: v for k, v in d.items() if v is not None}
    if node.auto_suffix:
        if not d:
            return node.auto_suffix
        d[''] = node.auto_suffix
    if not d:
        return None
    return d


def get_autocomplete_trie(
    word_threshold: float | None = None,
    subtree_threshold: float | None = 0.5,
        subtree_ratio_threshold: float = 3,
    lang: str = "en",
    pattern: str = r"^[a-zA-Z].+",
    max_words: int | None = None,
    min_suffix_len: int = 2,
        min_prefix_len: int = 2,
    prune: bool = False,
) -> Node:
    words = get_words(lang, pattern, max_words, min_length = min_suffix_len + 1)
    tree = build_trie(words)
    word_list = [w for (w, _) in words]
    dfs(word_list, tree, 1,
        word_threshold=word_threshold,
        subtree_threshold=subtree_threshold,
        subtree_ratio_threshold=subtree_ratio_threshold,
        word_ratio_threshold=word_threshold,
        min_suffix_len = min_suffix_len,
        min_prefix_len=min_prefix_len
        )
    if prune:
        prune_tree(tree)
    j = build_json(tree)
    return tree, j


def write_trie(
    dst: str | Path | None = None,
    word_threshold: float | None = None,
    subtree_threshold: float | None = 0.5,
    subtree_ratio_threshold: float = 3,
    lang: str = "en",
    pattern: str = r"^[a-zA-Z].+",
    max_words: int | None = None,
        min_prefix_len: int = 2,
    min_suffix_len: int = 2,
):
    dst = Path(dst or f"trie.json")
    params = {
        "word_threshold": word_threshold,
        "subtree_threshold": subtree_threshold,
        "subtree_ratio_threshold": subtree_ratio_threshold,
        "lang": lang,
        "pattern": pattern,
        "max_words": max_words,
        "min_suffix_len": min_suffix_len,
        "min_prefix_len": min_prefix_len,
    }
    tree, j = get_autocomplete_trie(**params)
    if dst is not None:
        dst.parent.mkdir(parents=True, exist_ok=True)
        s = json.dumps({"params": params, "trie": j})
        print(len(s))
        dst.write_text(s)
    return tree


if __name__ == "__main__":
    t = write_trie(
        pattern=r"^[a-zA-Z]+$",
        word_threshold=0.25, # there must be atleast 10% chance this is the right word
        subtree_threshold=0.5, # there must be atleast 25% chance this OR an extension of this is the right word
        subtree_ratio_threshold=3, # this option must be atleast 1.5x as good as any other
        min_prefix_len=1,
        min_suffix_len=3,
        max_words=100_000
    )