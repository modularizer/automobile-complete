
class Trie:
    default_settings = {
        "use_terminal_colors": True,
        "case_insensitive": True,
    }

    @classmethod
    def from_words(cls, *words: str, case_insensitive: bool | None = None, use_terminal_colors: bool | None = None, root: "Trie" = None) -> "Trie":
        inst = cls(case_insensitive=case_insensitive, root=root, use_terminal_colors=use_terminal_colors)
        return inst.insert(*words)

    __slots__ = ("children", "case_insensitive", "completion", "root", "parent", "prefix", "use_terminal_colors")

    def __init__(self, *,
                 completion: str = "",
                 children: dict[str, "Trie"] = None,
                 root: "Trie" = None,
                 parent: "Trie" = None,
                 prefix: str = "",

                 case_insensitive: bool | None = None,
                 use_terminal_colors: bool | None = None,
                 ) -> None:
        self.children = children or {}
        self.completion = completion
        self.case_insensitive = case_insensitive if case_insensitive is not None else self.default_settings.get("case_insensitive", False)
        self.use_terminal_colors = use_terminal_colors if use_terminal_colors is not None else self.default_settings.get("use_terminal_colors", False)
        self.root = root if root is not None else self
        self.parent = parent if parent is not None else self.root
        self.prefix = prefix

    def is_empty(self) -> bool:
        return not self.completion and not self.children

    def __bool__(self) -> bool:
        return not self.is_empty()

    def __dir__(self):
        return super().__dir__() + list(self.children.keys())


    def child(self, text: str, completion: str = "", children: dict[str, "Trie"] = None) -> "Trie":
        return type(self)(completion=completion, children=children, root=self.root, parent=self, prefix=self.prefix + text,
                          case_insensitive=self.case_insensitive, use_terminal_colors=self.use_terminal_colors)

    def walk_to(self, v: str, create_nodes: bool = False):
        ci = self.case_insensitive
        node = self
        for ch in v:
            if ch == "\r":
                node = node.parent
            else:
                n = node.children.get(ch.lower() if ci else ch)
                if n is None:
                    n = node.child(ch)
                    if create_nodes:
                        node.children[ch] = n
                node = n

            if (not create_nodes) and node.is_empty() and self.is_reset_char(ch):
                node = node.root
        return node

    def is_reset_char(self, ch: str):
        return ch not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

    def insert(self, *words: str):
        for lines in words:
            for word in lines.split("\n"):
                prepost = word.strip()
                if prepost:
                    pre, post = prepost.split("|")
                    self.insert_pair(pre, post)
        return self

    def insert_pair(self, pre: str, post: str):
        node = self.walk_to(pre, create_nodes=True)
        node.completion = post
        for i, ch in enumerate(post[:-1]):
            node = node.walk_to(ch, create_nodes=True)
            node.completion = post[i+1:]

    def suggest(self, text: str) -> str:
        return self.walk_to(text).completion

    def get_completion_state(self, full_text: str = "", use_terminal_colors: bool | None = None) -> str:
        u = use_terminal_colors if use_terminal_colors is not None else self.use_terminal_colors
        start2 = "\033[37m" if u else "|"
        start = "\033[38;5;233m" if u else ""
        c = self.completion.replace(" ", "█")
        end = "\033[0m" if u else ""
        p = full_text[:-len(self.prefix)] if self.prefix else full_text
        p2 = full_text[-len(self.prefix):] if full_text and self.prefix else self.prefix
        return f"{start}{p}{end}{p2}{start2}{c}{end}"

    def __str__(self):
        return self.get_completion_state()

    def __repr__(self):
        return str(self)

    def __getitem__(self, key):
        return self.walk_to(key)

    def __getattr__(self, key):
        return self.walk_to(key)

    def sim(self,
            text: str,
            letter_by_letter: bool = True,
            disappearing: bool = True,
            letter_delay: float = 0.15,
            word_delay: float = 0.1,
            use_terminal_colors: bool | None = None
            ) -> "Trie":
        t = self
        if letter_by_letter:
            typed = ""
            for ch in text:
                typed += ch
                t = t[ch]
                print(t.get_completion_state(typed, use_terminal_colors=use_terminal_colors), end="\r" if disappearing else "\n")
                if letter_delay:
                    import time
                    time.sleep(letter_delay)
                if word_delay and ch in " \n":
                    import time
                    time.sleep(word_delay)
        else:
            t = t[text]
            print(t.get_completion_state(use_terminal_colors=use_terminal_colors))
        return t




if __name__ == "__main__":
    # t = Trie.from_words("""
    # javas|cript
    #     """)
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
    """)
    t.sim("Animals can be enormous. For example: giraffes are super super tall and hippos are fat")


