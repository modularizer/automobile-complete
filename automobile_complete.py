class CoreTrie:
    default_settings = {
        "use_terminal_colors": True,
        "case_insensitive": True,
        "cache_full_text": True,
    }

    @classmethod
    def from_words(cls, *words: str, root: "CoreTrie" = None, case_insensitive: bool | None = None, cache_full_text: bool | None = None,) -> "CoreTrie":
        inst = cls(case_insensitive=case_insensitive, root=root, cache_full_text=cache_full_text)
        return inst.insert(*words)

    __slots__ = ("children", "case_insensitive", "completion", "root", "parent", "prefix", "use_terminal_colors", "config", "full_text", "cache_full_text", "change")

    def __init__(self, *,
                 completion: str = "",
                 children: dict[str, "CoreTrie"] = None,
                 root: "CoreTrie" = None,
                 parent: "CoreTrie" = None,
                 prefix: str = "",
                 full_text: str = "",
                 case_insensitive: bool | None = None,
                 cache_full_text: bool | None = None,

                 ) -> None:
        self.children = children or {}
        self.completion = completion

        self.root = root if root is not None else self
        self.parent = parent if parent is not None else self.root
        self.prefix = prefix
        self.change = ""
        self.num_accepted = 0


        self.case_insensitive = case_insensitive if case_insensitive is not None else self.default_settings.get("case_insensitive", False)
        self.cache_full_text = cache_full_text if cache_full_text is not None else self.default_settings.get("cache_full_text", False)
        self.full_text = full_text if self.cache_full_text else ""
        self.config = {"root": self.root, "case_insensitive": self.case_insensitive, "cache_full_text": self.cache_full_text}

    def is_empty(self) -> bool:
        return not self.completion and not self.children


    def child(self, text: str, completion: str = "", children: dict[str, "CoreTrie"] = None) -> "CoreTrie":
        return type(self)(completion=completion, children=children, parent=self, prefix=self.prefix + text, full_text=self.full_text + text,
                          **self.config)

    def clone(self, full_text: str = None, parent=None) -> "CoreTrie":
        return type(self)(completion=self.completion, children = self.children, parent=parent if parent is not None else self, prefix=self.prefix, full_text=full_text if full_text is not None else self.full_text,
                          **self.config)

    def walk_to(self, v: str, *, interpret_tabs: bool = True, create_nodes: bool = False):
        ci = self.case_insensitive
        node = self
        s = self.full_text
        change = ""
        for ch in v:
            if ch == "\r" and not create_nodes and "\r" not in node.children:
                pch = node.parent.change
                normal = self.is_alpha(pch)

                s = s[:-1]
                change += "\r"
                if normal:
                    node = node.parent.clone()
                elif len(pch) > 1 and self.is_alpha(pch[-1]):
                    # FIXME, probably not quite right
                    par = node.parent.clone()
                    node = par.clone()
                    par.change = pch[:-1]
                    node.parent = node
                else:
                    # FIXME, probably not quite right
                    node = node.root.clone(s, parent=node)
            elif interpret_tabs and ch == "\t" and not create_nodes:
                c = node.completion
                s += c
                change += c
                n = len(c)
                node = node.walk_to(c, interpret_tabs=interpret_tabs, create_nodes=create_nodes)
                node.num_accepted = n
            else:
                s += ch
                change += ch
                n = node.children.get(ch.lower() if ci else ch)
                if n is None:
                    n = node.child(ch)
                    if create_nodes:
                        node.children[ch] = n
                node = n

            if (not create_nodes) and node.is_empty() and self.is_reset_char(ch):
                node = node.root.clone(s, parent=node)
            node.full_text = s
            node.change = change
        return node

    def is_alpha(self, ch: str) -> bool:
        return ch in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

    def is_reset_char(self, ch: str):
        return ch not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ\t\r"

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

    def accept(self):
        return self.walk_to(self.completion)


class Trie(CoreTrie):
    default_settings = {
        "use_terminal_colors": True,
        **CoreTrie.default_settings,
    }

    @classmethod
    def from_words(cls, *words: str, root: "Trie" = None, case_insensitive: bool | None = None, use_terminal_colors: bool | None = None, cache_full_text: bool | None = None,) -> "Trie":
        inst = cls(case_insensitive=case_insensitive, use_terminal_colors=use_terminal_colors, root=root, cache_full_text=cache_full_text)
        return inst.insert(*words)

    def __init__(self, use_terminal_colors: bool | None = None, **kw):
        super().__init__(**kw)
        self.use_terminal_colors = use_terminal_colors if use_terminal_colors is not None else self.default_settings.get("use_terminal_colors", False)
        self.config["use_terminal_colors"] = self.use_terminal_colors


    def show(self, full_text: str = None, use_terminal_colors: bool | None = None, num_accepted: int = None) -> str:
        full_text = full_text if full_text is not None else self.full_text
        num_accepted = num_accepted if num_accepted is not None else self.num_accepted
        u = use_terminal_colors if use_terminal_colors is not None else self.use_terminal_colors
        start2 = "\033[37m" if u else ""
        start = "\033[38;5;233m" if u else ""
        c = self.completion.replace(" ", "█")
        end = "\033[0m" if u else ""

        # find the best way to display what has already been typed
        full_text = full_text.replace("\t", "")
        import re
        full_text = re.sub(".\r", "", full_text)

        before_state = full_text[:-len(self.prefix)] if self.prefix and full_text else full_text
        b = f"{start}{before_state}{end}"

        p = full_text[-len(self.prefix):] if full_text and self.prefix else self.prefix

        if num_accepted and u:
            green = "\033[32m"
            p = p[:-num_accepted] + green + p[-num_accepted:]
        return f"{b}{p}│{start2}{c}{end}"

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
            for ch in text:
                t = t.walk_to(ch)
                print(t.show(use_terminal_colors=use_terminal_colors), end="\r" if disappearing else "\n")
                if disappearing and letter_delay:
                    import time
                    time.sleep(letter_delay)
                if disappearing and word_delay and ch in " \n":
                    import time
                    time.sleep(word_delay)
        else:
            t = t.walk_to(text)
            print(t.show(use_terminal_colors=use_terminal_colors), end="\r" if disappearing else "\n")
        return t

    def __bool__(self) -> bool:
        return not self.is_empty()

    def __dir__(self):
        return super().__dir__() + list(self.children.keys())

    def __str__(self):
        return self.show()

    def __repr__(self):
        return self.show(use_terminal_colors=False)

    def __getitem__(self, key):
        return self.walk_to(key)

    def __getattr__(self, key):
        return self.walk_to(key)

    @classmethod
    def demo(cls, **kw) -> "Trie":
        t = cls.from_words("""
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
        t.sim("Animals can be enormo\t. For example: gira\t\r\res are super super tall and hippos are fat", **kw)
        return t





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
    Trie.demo(
        # disappearing=False
    )


