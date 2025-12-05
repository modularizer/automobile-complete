TAB = "\t"
BACKSPACE = "\b"
BACKSPACE2 = "\x7f"
CARRIAGE_RETURN = "\r"
ESC = "\033"

class Control:
    def __getitem__(self, item):
        return self.get(item)

    def __getattr__(self, item):
        return self.get(item)

    def __add__(self, other):
        return self.get(other)

    def get(self, ch: str, join: str | None = ""):
        """
       Map a character (or string of characters) to its Ctrl+<char> control code.

       Examples:
           CTRL["a"]  -> '\x01'  (SOH)
           CTRL["z"]  -> '\x1a'  (SUB)
           CTRL["@"]  -> '\x00'  (NUL)
           CTRL[" "]  -> '\x00'  (NUL)
           CTRL["["]  -> '\x1b'  (ESC)
           CTRL["\\"] -> '\x1c'  (FS)
           CTRL["]"]  -> '\x1d'  (GS)
           CTRL["^"]  -> '\x1e'  (RS)
           CTRL["_"]  -> '\x1f'  (US)
           CTRL["?"]  -> '\x7f'  (DEL)
           CTRL["abc"] -> '\x01\x02\x03'
       """
        if len(ch)>1:
            chars = (self.get(c) for c in ch)
            if join is None:
                return chars
            return join.join(chars)
        c = ch  # single character

        # Special cases first
        if c == " " or c == "@":
            code = 0  # NUL
        elif c == "?":
            # Many terminals map Ctrl+? to DEL
            return chr(0x7f)
        else:
            # Punctuation-based control chars
            punct_map = {
                "[": 0x1b,  # ESC
                "\\": 0x1c, # FS
                "]": 0x1d,  # GS
                "^": 0x1e,  # RS
                "_": 0x1f,  # US
            }
            if c in punct_map:
                code = punct_map[c]
            else:
                # Letters: Ctrl+A..Z -> 1..26
                k = c.lower()
                if "a" <= k <= "z":
                    code = ord(k) - ord("a") + 1
                else:
                    raise ValueError(f"unknown char for Ctrl mapping: '{c}'")

        return chr(code)


CTRL = Control()