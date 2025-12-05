BaseColor = int | str | tuple[int, int, int] | tuple[int, int, int, float] | tuple[int, int, int, int]

def to_rgba(color: BaseColor) -> tuple[int, int, int, float] | None:
    """
    Accepts:
      - some common colors from known_colors
      - (r, g, b) tuple with values 0–255
      - (r, g, b, a) tuple with values 0–255
      - '#RRGGBB' or 'RRGGBB'
      - '#RGB' or 'RGB' shorthand
    Returns:
      (r, g, b, a) tuple
    """
    if color is None:
        return None
    if color == "":
        return (255, 255, 255, 1)
    if isinstance(color, int):
        color = hex(color)
    if hasattr(color, "rgba"):
        return color.rgba
    if hasattr(color, "rgb"):
        return *color.rgb, 1
    if isinstance(color, str):
        color = TerminalCode.normname(color)
        r = repr(color)
        if r.startswith("'\\"):
            if r.startswith("'\\033[38;") or r.startswith("'\\033[48;"):
                rs, gs, bs = r[:-1].split(",")[1:]
                return int(rs), int(gs), int(bs)
            tc = TerminalCode.retrieve(color)
            if tc and tc.rgb:
                return *tc.rgb, 1
            raise Exception("invalid string")
    if not color:
        return (255, 255, 255, 1)
    if isinstance(color, str):
        color = color.lower()

    if isinstance(color, tuple) and len(color) == 3:
        r, g, b = color
        return int(r), int(g), int(b), 1.0

    if isinstance(color, tuple) and len(color) == 4:
        r, g, b, a = color
        if a > 1:
            a = a/255
        return int(r), int(g), int(b), float(a)

    if not isinstance(color, str):
        raise TypeError(f"color must be an (r,g,b) or (r,g,b,a) tuple or a hex string, not {color}")

    s = color.strip().lower()
    if s.startswith("#"):
        s = s[1:]
    if s.startswith("0x"):
        s = s[2:]

    if len(s) == 3:
        # #RGB → #RRGGBBAA
        s = "".join(ch * 2 for ch in s) + "FF"
    if len(s) == 4:
        # #RGBA → #RRGGBBAA
        s = "".join(ch * 2 for ch in s)

    if len(s) == 6:
        s += "FF"
    if len(s) != 8:
        raise ValueError(f"Invalid hex color: {color!r}")

    r = int(s[0:2], 16)
    g = int(s[2:4], 16)
    b = int(s[4:6], 16)
    a = int(s[6: 8], 16) / 255
    return r, g, b, a



class TerminalCode(str):
    registry = {

    }
    reverse_registry: dict[str, list["TerminalCode"]] = {

    }

    @staticmethod
    def normname(s: str):
        return s.lower().replace(" ","").replace("-","").replace("_","") if isinstance(s, str) else s

    @classmethod
    def retrieve(cls, name: str, group: str | None = None):
        if name is None:
            return None
        if not isinstance(name, str):
            return None
        if isinstance(name, TerminalCode):
            return name
        if (repr(name).startswith("'\\")):
            rr = cls.reverse_registry.get(name)
            if rr:
                return rr[0]
            return cls(name)
        name = cls.normname(name)
        if group is not None:
            group = cls.normname(group)
            return cls.registry.get(group, {}).get(name)

        if name in cls.registry.get("unknown", {}):
            return cls.registry["unknown"][name]
        for g in cls.registry:
            if name in cls.registry[g]:
                return cls.registry[g][name]

    def __new__(cls, code: str, name: str = "unknown", *groups: str, rgb: BaseColor | None = None):
        obj = super().__new__(cls, code)  # create the string instance
        rgb = to_rgba(rgb)[:3] if rgb is not None else None
        name = cls.normname(name)
        obj.name = name                     # attach custom attribute
        if name not in cls.reverse_registry:
            cls.reverse_registry[name] = []
        cls.reverse_registry[name].append(obj)
        groups = groups or ("unknown",)
        groups = [cls.normname(n) for n in groups]
        obj.groups = groups
        obj.rgb = rgb
        for group in groups:
            if group not in cls.registry:
                cls.registry[group] = {}
            cls.registry[group][name] = obj
        return obj

    @property
    def aliases(self):
        return [x.name for x in self.reverse_registry[str(self)] if x.name != self.name]

    def __call__(self, text: str = ""):
        return self + text + RESET

    def __add__(self, other):
        o = str(other)
        oname = getattr(other, "name", o)
        return TerminalCode(str(self) + o, name=f"{self.name}+{oname}")

    def __getitem__(self, item):
        return self + item

    def __getattr__(self, item):
        return self + item

    def print(self, m="", print=print, **kw):
        print(self(m), **kw)


TC = TerminalCode


RESET = TC("\033[0m", "reset", "fg", "bg", "styles")



# === Standard Foreground Colors ===
b=0
blu = 238
v=205
w=229
f=255
h =127
t = 92
BLACK   = TC("\033[30m", "black", "fg", rgb=(b,b,b))
RED     = TC("\033[31m", "red", "fg", rgb=(v, b, b))
GREEN   = TC("\033[32m", "green", "fg", rgb=(b, v, b))
YELLOW  = TC("\033[33m", "yellow", "fg", rgb=(v, v, b))
BLUE    = TC("\033[34m", "blue", "fg", rgb=(b, b, blu))
MAGENTA = TC("\033[35m", "magenta", "fg", rgb=(v, b, v))
CYAN    = TC("\033[36m", "cyan", "fg", rgb=(b, v, v))
WHITE   = TC("\033[37m", "white", "fg", rgb=(w,w,w))
LIGHT_GRAY  = TC("\033[37m", "lightgray", "fg", rgb=(w,w,w))
LIGHT_GREY  = TC("\033[37m", "lightgrey", "fg", rgb=(w,w,w))
BRIGHT_BLACK   = TC("\033[90m", "brightblack", "fg", rgb=(h, h, h))
DARK_GRAY   = TC("\033[90m", "darkgray", "fg", rgb=(h, h, h))
DARK_GREY  = TC("\033[90m", "darkgrey", "fg", rgb=(h, h, h))
BRIGHT_RED     = TC("\033[91m", "brightred", "fg", rgb = (f, b, b))
BRIGHT_GREEN   = TC("\033[92m", "brightgreen", "fg", rgb = (b, f, b))
BRIGHT_YELLOW  = TC("\033[93m", "brightyellow", "fg", rgb = (f, f, b))
BRIGHT_BLUE    = TC("\033[94m", "brightblue", "fg", rgb=(t, t, f))
BRIGHT_MAGENTA = TC("\033[95m", "brightmagenta", "fg", rgb=(f, b, f))
BRIGHT_CYAN    = TC("\033[96m", "brightcyan", "fg", rgb=(b, f, f))
BRIGHT_WHITE   = TC("\033[97m", "brightwhite", "fg", rgb=(f,f, f))


class FGRGBTerminalCode(TerminalCode):
    def __new__(cls, rgb: BaseColor, name: str = "unknown", *groups: str):
        rgb: BaseColor = to_rgba(rgb)[:3]
        r, g, b = rgb
        c = f"\033[38;2;{r};{g};{b}m"
        # print("foreground", rgb, name, repr(c)[1:-1])
        groups = groups or ("unknown",)
        groups = [cls.normname(n) for n in groups]
        for g in ("rgb", "fg"):
            if g not in groups:
                groups.append(g)
        return super().__new__(cls,
                               c,
                               name,
                               *groups,
                               rgb=rgb)


DARKRED = FGRGBTerminalCode("#8B0000", "darkred")
DARKGREEN = FGRGBTerminalCode("#006400", "darkgreen")
DARKBLUE = FGRGBTerminalCode("#00008B", "darkblue")
DARKCYAN = FGRGBTerminalCode("#008B8B", "darkcyan")
DARKMAGENTA = FGRGBTerminalCode("#8B008B", "darkmagenta")
DARKYELLOW = FGRGBTerminalCode("#8B8B00", "darkyellow")
LIGHTRED = FGRGBTerminalCode("#FFA07A", "lightred")
LIGHTGREEN = FGRGBTerminalCode("#90EE90", "lightgreen")
LIGHTBLUE = FGRGBTerminalCode("#ADD8E6", "lightblue")
LIGHTCYAN = FGRGBTerminalCode("#E0FFFF", "lightcyan")
LIGHTMAGENTA = FGRGBTerminalCode("#FF77FF", "lightmagenta")
LIGHTYELLOW = FGRGBTerminalCode("#FFFFE0", "lightyellow")
ORANGE = FGRGBTerminalCode("#FFA500", "orange")
PINK = FGRGBTerminalCode("#FFC0CB", "pink")
PURPLE = FGRGBTerminalCode("#800080", "purple")
BROWN = FGRGBTerminalCode("#A52A2A", "brown")
GOLD = FGRGBTerminalCode("#FFD700", "gold")
LIME = FGRGBTerminalCode("#32CD32", "lime")
TEAL = FGRGBTerminalCode("#008080", "teal")
NAVY = FGRGBTerminalCode("#000080", "navy")
OLIVE = FGRGBTerminalCode("#808000", "olive")
MAROON = FGRGBTerminalCode("#800000", "maroon")



# === Standard Background Colors ===
BG_BLACK   = TC("\033[40m", "black", "bg", rgb=(b,b,b))
BG_RED     = TC("\033[41m", "red", "bg", rgb=(v, b, b))
BG_GREEN   = TC("\033[42m", "green", "bg", rgb=(b, v, b))
BG_YELLOW  = TC("\033[43m", "yellow", "bg", rgb=(v, v, b))
BG_BLUE    = TC("\033[44m", "blue", "bg", rgb=(b, b, blu))
BG_MAGENTA = TC("\033[45m", "magenta", "bg", rgb=(v, b, v))
BG_CYAN    = TC("\033[46m", "cyan", "bg", rgb=(b, v, v))
BG_WHITE   = TC("\033[47m", "white", "bg", rgb=(w,w,w))
BG_BRIGHT_BLACK   = TC("\033[100m", "brightblack", "bg", rgb=(h, h, h))
BG_BRIGHT_RED     = TC("\033[101m", "brightred", "bg", rgb=(f, b, b))
BG_BRIGHT_GREEN   = TC("\033[102m", "brightgreen", "bg", rgb=(b, f, b))
BG_BRIGHT_YELLOW  = TC("\033[103m", "brightyellow", "bg", rgb=(f, f, b))
BG_BRIGHT_BLUE    = TC("\033[104m", "brightblue", "bg", rgb=(t, t, f))
BG_BRIGHT_MAGENTA = TC("\033[105m", "brightmagenta", "bg", rgb=(f, b, f))
BG_BRIGHT_CYAN    = TC("\033[106m", "brightcyan", "bg", rgb=(b, f, f))
BG_BRIGHT_WHITE   = TC("\033[107m", "brightwhite", "bg", rgb=(f, f, f))


class BGRGBTerminalCode(TerminalCode):
    def __new__(cls, rgb: BaseColor, name: str = "unknown", *groups: str):
        rgb: BaseColor = to_rgba(rgb)[:3]
        r, g, b = rgb
        c = f"\033[38;2;{r};{g};{b}m"
        groups = groups or ("unknown",)
        groups = [cls.normname(n) for n in groups]
        for g in ("rgb", "bg"):
            if g not in groups:
                groups.append(g)
        return super().__new__(cls,
                               c,
                               name,
                               *groups,
                               rgb=rgb)
BG_DARKRED = BGRGBTerminalCode("#8B0000", "darkred")
BG_DARKGREEN = BGRGBTerminalCode("#006400", "darkgreen")
BG_DARKBLUE = BGRGBTerminalCode("#00008B", "darkblue")
BG_DARKCYAN = BGRGBTerminalCode("#008B8B", "darkcyan")
BG_DARKMAGENTA = BGRGBTerminalCode("#8B008B", "darkmagenta")
BG_DARKYELLOW = BGRGBTerminalCode("#8B8B00", "darkyellow")
BG_LIGHTRED = BGRGBTerminalCode("#FFA07A", "lightred")
BG_LIGHTGREEN = BGRGBTerminalCode("#90EE90", "lightgreen")
BG_LIGHTBLUE = BGRGBTerminalCode("#ADD8E6", "lightblue")
BG_LIGHTCYAN = BGRGBTerminalCode("#E0FFFF", "lightcyan")
BG_LIGHTMAGENTA = BGRGBTerminalCode("#FF77FF", "lightmagenta")
BG_LIGHTYELLOW = BGRGBTerminalCode("#FFFFE0", "lightyellow")
BG_ORANGE = BGRGBTerminalCode("#FFA500", "orange")
BG_PINK = BGRGBTerminalCode("#FFC0CB", "pink")
BG_PURPLE = BGRGBTerminalCode("#800080", "purple")
BG_BROWN = BGRGBTerminalCode("#A52A2A", "brown")
BG_GOLD = BGRGBTerminalCode("#FFD700", "gold")
BG_LIME = BGRGBTerminalCode("#32CD32", "lime")
BG_TEAL = BGRGBTerminalCode("#008080", "teal")
BG_NAVY = BGRGBTerminalCode("#000080", "navy")
BG_OLIVE = BGRGBTerminalCode("#808000", "olive")
BG_MAROON = BGRGBTerminalCode("#800000", "maroon")

# === Text Attributes ===
BOLD         = TC("\033[1m", "bold", "styles")
DIM          = TC("\033[2m", "dim", "styles")
ITALIC       = TC("\033[3m", "italic", "styles")
UNDERLINE    = TC("\033[4m", "underline", "styles")
BLINK        = TC("\033[5m", "blink", "styles")     # rarely supported, and often disabled
REVERSE      = TC("\033[7m", "reverse", "styles")     # swap fg/bg
HIDDEN       = TC("\033[8m", "hidden", "styles")     # used for passwords
STRIKETHROUGH = TC("\033[9m", "strikethrough", "styles")


# _____________________________________________________________________________________________________________________
INITIAL_DEFAULT_TERMINAL_COLOR = "#fff"
settings = {

}

def to_rgb(color, background=None) -> tuple[int, int, int]:
    """
    fg, bg: (r,g,b) or hex
    alpha: 0.0–1.0 (fg opacity over bg)
    """
    fr, fg, fb, fa = to_rgba(color)
    if fa == 1:
        return fr, fg, fb
    if background is None:
        background = settings.get("tc", None)
    br, bg, bb, ba = to_rgba(background)
    a = max(0.0, min(1.0, float(fa)))

    r = round((1 - a) * br + a * fr)
    g = round((1 - a) * bg + a * fg)
    b = round((1 - a) * bb + a * fb)
    return r, g, b

settings["tc"] = to_rgb(INITIAL_DEFAULT_TERMINAL_COLOR, "#fff")

def register_terminal_color(color: str, background_of_background=INITIAL_DEFAULT_TERMINAL_COLOR):
    settings["tc"] = to_rgb(color, background_of_background)


def get_style(style: list[str] | str | None = None):
    if isinstance(style, TerminalCode):
        return style
    if not style:
        return TerminalCode("", "empty", "styles")
    known_styles = TerminalCode.registry.get("styles", "")
    style = TerminalCode.normname(style) if isinstance(style, str) else [c if isinstance(c, TerminalCode) else TerminalCode.normname(c)  for c in style]
    if isinstance(style, str) and not all(c in known_styles for c in style):
        style = [style]
    s = TerminalCode.retrieve(style[0], "styles")
    if s is None:
        return TerminalCode("", "empty", "styles")
    for c in style[1:]:
        x = TerminalCode.retrieve(c, "styles")
        if x is None:
            x = TerminalCode("", "empty", "styles")
        s += x
    return s


def get_color(
        foreground: BaseColor | TerminalCode | None = None,
        background: BaseColor | TerminalCode | None = None,
        style: list[str] | str = "",
        terminal_color: str | None = None
    ):
    s = get_style(style)
    if terminal_color is None:
        terminal_color = settings["tc"]

    tc = TerminalCode.retrieve(terminal_color, "bg") or to_rgb(terminal_color)
    bgtc = "" if background is None else (TerminalCode.retrieve(background, "bg") or BGRGBTerminalCode(to_rgb(background, tc)))
    fgtc = "" if foreground is None else (TerminalCode.retrieve(foreground, "fg") or FGRGBTerminalCode(to_rgb(foreground, background)))
    opts = [x for x in (s, bgtc, fgtc) if x]
    if len(opts) == 0:
        return TerminalCode("", "empty", "text")
    if len(opts) == 1:
        return opts[0]
    return TerminalCode("".join(opts), f"bg={background},fg={foreground},s={style}", "text")


def demo_color(
        foreground: BaseColor | TerminalCode | None = None,
        background: BaseColor | TerminalCode | None = None,
        style: list[str] | str = "",
        terminal_color: str | None = None,
        **kw
):
    if terminal_color is None:
        terminal_color = settings["tc"]
    c = get_color(foreground=foreground, background=background, style=style, terminal_color=terminal_color)
    s = f"{foreground=}, {background=}, {terminal_color=}, {style=}, {c=}"
    print(c + s + RESET, **kw)


class FGColors:
    def __getattr__(self, item):
        return get_color(item)

    def __getitem__(self, item):
        return get_color(item)

    def __dir__(self):
        return list(TerminalCode.registry.get("fg", {}))

    def __iter__(self):
        return iter(TerminalCode.registry.get("fg", {}))

class BGColors:
    def __getattr__(self, item):
        return get_color(background=item)

    def __getitem__(self, item):
        return get_color(background=item)

    def __iter__(self):
        return iter(TerminalCode.registry.get("bg", {}))

    def __dir__(self):
        return list(TerminalCode.registry.get("bg", {}))

class Styles:
    def __getattr__(self, item):
        return get_style(item)

    def __getitem__(self, item):
        return get_style(item)

    def __iter__(self):
        return iter(TerminalCode.registry.get("styles", {}))

    def __dir__(self):
        return list(TerminalCode.registry.get("styles", {}))

fg = FGColors()
bg = BGColors()
styles = Styles()

class FancyText:
    fg = fg
    bg = bg
    styles = styles
    reset = RESET
    RESET = RESET

    demo_color=staticmethod(demo_color)
    register_terminal_color = staticmethod(register_terminal_color)
    get_color = staticmethod(get_color)


    def __getattr__(self, item):
        return self.get_item(item)


    def __getitem__(self, item):
        return self.get_item(item)

    @property
    def terminal_color(self):
        return settings["tc"]

    @terminal_color.setter
    def terminal_color(self, value):
        settings["tc"] = value

    def get_item(self, item):
        if isinstance(item, TerminalCode):
            return item
        s = get_style(item)
        if s:
            return s
        if item.startswith("bg_"):
            return TerminalCode.retrieve(item[3:], "bg") or BGRGBTerminalCode(item[3:])
        return TerminalCode.retrieve(item, "fg") or FGRGBTerminalCode(item)

    def __iter__(self):
        return iter({"styles": styles, "fg": fg, "bg": bg})

    def __call__(self,
                 foreground: BaseColor | TerminalCode | None = None,
                 background: BaseColor | TerminalCode | None = None,
                 style: list[str] | str = "",
                 terminal_color: str | None = None
                 ):
        return get_color(foreground=foreground, background=background, style=style, terminal_color=terminal_color)

    def full_demo(self):
        for k in self.fg:
            self.demo_color(k)
        for k in self.bg:
            self.demo_color(background=k)
        for k in self.styles:
            self.demo_color(style=k)

colors = FancyText()
c = colors


if __name__ == "__main__":
    c.full_demo()

    others = [
        "#343",
        "#797",
        "#249823",
        "#249823AA"
    ]
    for k in others:
        c.demo_color(k)

    c.demo_color("lime", "maroon")