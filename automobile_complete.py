import re



class CoreTrie:
    default_settings = {
        "case_insensitive": True,
        "cache_full_text": True,
        "handle_control_characters": True,
    }

    @classmethod
    def from_words(cls, *lines: str, root: "CoreTrie" = None, **config) -> "CoreTrie":
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
        self.children = children or {}
        self.completion = completion
        self.freq = 1
        self.counter = 0
        self.index = None
        self.words: list["CoreTrie"] = []

        self.root = root if root is not None else self
        self.parent = parent if parent is not None else self.root
        self.prefix = prefix
        self.change = ""
        self.num_accepted = 0
        self.config: dict = {"root": self.root, **self.default_settings, **config}
        self.full_text = full_text if self.cache_full_text else ""

    @property
    def cache_full_text(self):
        return self.config["cache_full_text"]

    @property
    def case_insensitive(self):
        return self.config["case_insensitive"]

    @property
    def handle_control_characters(self):
        return self.config["handle_control_characters"]


    def is_empty(self) -> bool:
        return not self.completion and not self.children


    def child(self, text: str, completion: str = "", children: dict[str, "CoreTrie"] = None) -> "CoreTrie":
        return type(self)(completion=completion, children=children, parent=self, prefix=self.prefix + text, full_text=self.full_text + text,
                          **self.config)

    def clone(self, full_text: str = None, parent=None) -> "CoreTrie":
        return type(self)(completion=self.completion, children = self.children, parent=parent if parent is not None else self, prefix=self.prefix, full_text=full_text if full_text is not None else self.full_text,
                          **self.config)

    def walk_to(self, v: str, *, handle_control_characters: bool | None = None, create_nodes: bool = False):
        handle_control_characters = handle_control_characters if handle_control_characters is not None else self.handle_control_characters
        ci = self.case_insensitive
        node = self
        s = self.full_text
        change = ""
        for ch in v:
            if handle_control_characters and ch == "\b" and not create_nodes and "\b" not in node.children:
                pch = node.parent.change
                normal = self.is_alpha(pch)

                s = s[:-1]
                change += "\b"
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
            elif handle_control_characters and ch == "\t" and not create_nodes:
                c = node.completion
                s += c
                change += c
                n = len(c)
                node = node.walk_to(c, handle_control_characters=handle_control_characters, create_nodes=create_nodes)
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
        return ch in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'"

    def is_control_character(self, ch: str) -> bool:
        if not self.handle_control_characters:
            return False
        return ch in "\t\b"

    def is_reset_char(self, ch: str) -> bool:
        return not self.is_alpha(ch) and not self.is_control_character(ch)

    def insert(self, *lines: str):
        lines = [line for line in [line.strip() for line in "\n".join(lines).split("\n")] if line]
        for line in lines:
            [pre, post, _, freq] = re.match(r"^(.+)\|(.+)( #(\d+))?", line).groups()
            self.insert_pair(pre, post, int(freq) if freq else 1)
        return self

    def insert_pair(self, pre: str, post: str, freq: int = 1):
        node = self.walk_to(pre, create_nodes=True)
        node.completion = post
        node.freq = freq
        self.root.counter += 1
        node.index = self.root.counter
        self.root.words.append(node)
        for i, ch in enumerate(post[:-1]):
            node = node.walk_to(ch, create_nodes=True)
            node.completion = post[i+1:]

    def accept(self):
        return self.walk_to(self.completion)


class Trie(CoreTrie):
    default_settings = {
        "use_terminal_colors": True,
        "repr_terminal_colors": False,
        **CoreTrie.default_settings,
    }

    @property
    def use_terminal_colors(self):
        return self.config["use_terminal_colors"]

    @property
    def repr_terminal_colors(self) -> bool:
        return self.config["repr_terminal_colors"]


    def as_string(self, full_text: str = None, use_terminal_colors: bool | None = None, num_accepted: int = None) -> str:
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
        full_text = re.sub(".?\b", "", full_text)

        before_state = full_text[:-len(self.prefix)] if self.prefix and full_text else full_text
        b = f"{start}{before_state}{end}"

        p = full_text[-len(self.prefix):] if full_text and self.prefix else self.prefix

        if num_accepted and u:
            green = "\033[32m"
            p = p[:-num_accepted] + green + p[-num_accepted:]
        s = f"{b}{p}│{start2}{c}{end}"
        return s


    def show(self, disappearing: bool = False, full_text: str = None, use_terminal_colors: bool | None = None, num_accepted: int = None) -> str:
        s = self.as_string(full_text=full_text, use_terminal_colors=use_terminal_colors, num_accepted=num_accepted)
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
        t = self
        if letter_by_letter:
            for ch in text:
                t = t.walk_to(ch)
                t.show(disappearing=disappearing, use_terminal_colors=use_terminal_colors)
                if disappearing and letter_delay:
                    import time
                    time.sleep(letter_delay)
                if disappearing and word_delay and ch in " \n":
                    import time
                    time.sleep(word_delay)
            print(t.full_text)
        else:
            t = t.walk_to(text)
            t.show(disappearing=disappearing, use_terminal_colors=use_terminal_colors)
        return t

    def __bool__(self) -> bool:
        return not self.is_empty()

    def __dir__(self):
        return super().__dir__() + list(self.children.keys())

    def __str__(self):
        return self.as_string()

    def __repr__(self):
        return self.as_string(use_terminal_colors=self.repr_terminal_colors)

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


    t = Trie.demo(
        # disappearing=False
    )


