import sys

from automobile_complete.utils.terminal_colors import colors

# === Reset ===
RESET = "\033[0m"


TAB = "\t"
BACKSPACE = "\b"
BACKSPACE2 = "\x7f"
CARRIAGE_RETURN = "\r"
ESC = "\033"
CLEAR_REST_OF_LINE = f"\033[K"
CLEAR_LINE = f"{CARRIAGE_RETURN}{CLEAR_REST_OF_LINE}"
ERASE_LINE="\033[2K"
UP = "\033[1A"
DOWN="\033[1B"
SAVE_CURSOR = "\0337"    # or "\033[s"
RESTORE_CURSOR = "\0338" # or "\033[u"
CLEAR_TWO_LINES = (
    "\r\033[K"   # clear current line
    "\033[1A"    # move cursor up 1 line
    "\r\033[K"   # clear line above
)

class Cursor:
    @staticmethod
    def left(n=1):
        return f"\033[{n}D"
    @staticmethod
    def right(n=1):
        return f"\033[{n}C"
    @staticmethod
    def up(n=1):
        return f"\033[{n}A"
    @staticmethod
    def down(n=1):
        return f"\033[{n}B"
    @staticmethod
    def col(n=0):
        if n == 0:
            return "\r"
        return f"\033[{n+1}G"
    @staticmethod
    def pos(row, col):
        return f"\033[{row+1};{col+1}H"
    @staticmethod
    def row(n):
        return f"\033[{n+1}d"

    @staticmethod
    def clear_line():
        return CLEAR_LINE

    @staticmethod
    def erase_line():
        return ERASE_LINE

    @staticmethod
    def backspace():
        return "\033[1D \033[1D"

    @classmethod
    def replace(cls, ch=" "):
        return ch + Cursor.left()

    @staticmethod
    def save():
        return SAVE_CURSOR

    @staticmethod
    def restore():
        return RESTORE_CURSOR

    @classmethod
    def write_ahead(cls, text: str):
        return cls.save() + text + cls.restore()


cursor = Cursor()

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



global_state = {}
def print_with_suggestion(pre: str = "", post: str="",
                          overwrite: bool = True,
                          overwrite_line_count: int | None = None,
                          file=sys.stdout, end="", # kwargs to pass to print
                          print=print, # by default, use the print builtin, but allow overriding
                          state: dict | None = global_state # this is INTENTIONALLY mutable
                          ):
    state = state if state is not None else {}
    # first, clear the old content if we are overwriting
    if overwrite and (overwrite_line_count is None or overwrite_line_count > 0):
        # if overwrite_line_count is specified we will clear that many lines
        if overwrite_line_count is None:
            # if not specified, we will detect based on cached content
            overwrite_line_count = state.get("old", "").count("\n") + 1

        # now, clear the old rows
        for _ in range(overwrite_line_count - 1):
            print(cursor.clear_line() + cursor.up(), end="", flush=True, file=file)
        print(cursor.clear_line(), end="", flush=True, file=file)


    # make grey completion text
    completion = cursor.write_ahead(colors.gray(post))
    # completion = f"{cursor.save()}{GRAY}{post}{RESET}{cursor.restore()}"

    t = f"{pre}{completion}{end}"
    print(t, end="", flush=True, file=file)
    state["old"] = t

if __name__ == "__main__":
    import time
    d = lambda: time.sleep(1)
    p = lambda x: print(x, end="", flush=True)

    # p("abc")
    # d()
    # p("\r")
    # d()
    # p(CLEAR_REST_OF_LINE)
    # d()
    # p("def")
    # d()
    # p("ghi")
    # d()
    # print_with_suggestion("abc")
    # d()
    # print_with_suggestion("abcd", "efg")
    # d()
    # print_with_suggestion("abcdefg")
    # d()
    print_with_suggestion("a\nb\nc\nd")
    d()
    print_with_suggestion("e")
    d()
    print_with_suggestion("f\n")