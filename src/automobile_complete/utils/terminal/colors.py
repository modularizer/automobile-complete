import automobile_complete.utils.terminal.raw_colors as r
raw_colors = r

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
            if r.startswith(raw_colors.FG_RGB_HEADER) or r.startswith(raw_colors.BG_RGB_HEADER):
                rs, gs, bs = r[:-1].split(",")[2:]
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


RESET = TC(r.RESET, "reset", "fg", "bg", "styles")



# === Standard Foreground Colors ===
b=0
blu = 238
v=205
w=229
f=255
h =127
t = 92
BLACK = TC(r.BLACK, "black", "fg", rgb=(b,b,b))
RED   = TC(r.RED  , "red", "fg", rgb=(v, b, b))
GREEN = TC(r.GREEN, "green", "fg", rgb=(b, v, b))
YELLOW  = TC(r.YELLOW, "yellow", "fg", rgb=(v, v, b))
BLUE  = TC(r.BLUE , "blue", "fg", rgb=(b, b, blu))
MAGENTA = TC(r.MAGENTA, "magenta", "fg", rgb=(v, b, v))
CYAN  = TC(r.CYAN , "cyan", "fg", rgb=(b, v, v))
WHITE = TC(r.WHITE, "white", "fg", rgb=(w,w,w))
LIGHT_GRAY  = TC(r.LIGHT_GRAY, "lightgray", "fg", rgb=(w,w,w))
LIGHT_GREY  = TC(r.LIGHT_GREY, "lightgrey", "fg", rgb=(w,w,w))
BRIGHT_BLACK = TC(r.BRIGHT_BLACK, "brightblack", "fg", rgb=(h, h, h))
GRAY = TC(r.GRAY, "gray", "fg", rgb=(h, h, h))
GREY  = TC(r.GREY, "grey", "fg", rgb=(h, h, h))
BRIGHT_RED   = TC(r.BRIGHT_RED  , "brightred", "fg", rgb = (f, b, b))
BRIGHT_GREEN = TC(r.BRIGHT_GREEN, "brightgreen", "fg", rgb = (b, f, b))
BRIGHT_YELLOW  = TC(r.BRIGHT_YELLOW, "brightyellow", "fg", rgb = (f, f, b))
BRIGHT_BLUE  = TC(r.BRIGHT_BLUE , "brightblue", "fg", rgb=(t, t, f))
BRIGHT_MAGENTA = TC(r.BRIGHT_MAGENTA, "brightmagenta", "fg", rgb=(f, b, f))
BRIGHT_CYAN  = TC(r.BRIGHT_CYAN , "brightcyan", "fg", rgb=(b, f, f))
BRIGHT_WHITE = TC(r.BRIGHT_WHITE, "brightwhite", "fg", rgb=(f,f, f))


class FGRGBTerminalCode(TerminalCode):
    def __new__(cls, rgb: BaseColor, name: str = "unknown", *groups: str):
        rgb: BaseColor = to_rgba(rgb)[:3]
        c = r.build_fg_rgb(*rgb)
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


DARKRED = FGRGBTerminalCode(r.DARKRED_HEX, "darkred")
DARKGREEN = FGRGBTerminalCode(r.DARKGREEN_HEX, "darkgreen")
DARKBLUE = FGRGBTerminalCode(r.DARKBLUE_HEX, "darkblue")
DARKCYAN = FGRGBTerminalCode(r.DARKCYAN_HEX, "darkcyan")
DARKMAGENTA = FGRGBTerminalCode(r.DARKMAGENTA_HEX, "darkmagenta")
DARKYELLOW = FGRGBTerminalCode(r.DARKYELLOW_HEX, "darkyellow")
LIGHTRED = FGRGBTerminalCode(r.LIGHTRED_HEX, "lightred")
LIGHTGREEN = FGRGBTerminalCode(r.LIGHTGREEN_HEX, "lightgreen")
LIGHTBLUE = FGRGBTerminalCode(r.LIGHTBLUE_HEX, "lightblue")
LIGHTCYAN = FGRGBTerminalCode(r.LIGHTCYAN_HEX, "lightcyan")
LIGHTMAGENTA = FGRGBTerminalCode(r.LIGHTMAGENTA_HEX, "lightmagenta")
LIGHTYELLOW = FGRGBTerminalCode(r.LIGHTYELLOW_HEX, "lightyellow")
ORANGE = FGRGBTerminalCode(r.ORANGE_HEX, "orange")
PINK = FGRGBTerminalCode(r.PINK_HEX, "pink")
PURPLE = FGRGBTerminalCode(r.PURPLE_HEX, "purple")
BROWN = FGRGBTerminalCode(r.BROWN_HEX, "brown")
GOLD = FGRGBTerminalCode(r.GOLD_HEX, "gold")
LIME = FGRGBTerminalCode(r.LIME_HEX, "lime")
TEAL = FGRGBTerminalCode(r.TEAL_HEX, "teal")
NAVY = FGRGBTerminalCode(r.NAVY_HEX, "navy")
OLIVE = FGRGBTerminalCode(r.OLIVE_HEX, "olive")
MAROON = FGRGBTerminalCode(r.MAROON_HEX, "maroon")



# === Standard Background Colors ===
BG_BLACK = TC(r.BLACK, "black", "bg", rgb=(b,b,b))
BG_RED   = TC(r.RED  , "red", "bg", rgb=(v, b, b))
BG_GREEN = TC(r.GREEN, "green", "bg", rgb=(b, v, b))
BG_YELLOW  = TC(r.BG_YELLOW, "yellow", "bg", rgb=(v, v, b))
BG_BLUE  = TC(r.BLUE , "blue", "bg", rgb=(b, b, blu))
BG_MAGENTA = TC(r.BG_MAGENTA, "magenta", "bg", rgb=(v, b, v))
BG_CYAN  = TC(r.CYAN , "cyan", "bg", rgb=(b, v, v))
BG_WHITE = TC(r.WHITE, "white", "bg", rgb=(w,w,w))
BG_BRIGHT_BLACK = TC(r.BRIGHT_BLACK, "brightblack", "bg", rgb=(h, h, h))
BG_BRIGHT_RED   = TC(r.BRIGHT_RED  , "brightred", "bg", rgb=(f, b, b))
BG_BRIGHT_GREEN = TC(r.BRIGHT_GREEN, "brightgreen", "bg", rgb=(b, f, b))
BG_BRIGHT_YELLOW  = TC(r.BG_BRIGHT_YELLOW, "brightyellow", "bg", rgb=(f, f, b))
BG_BRIGHT_BLUE  = TC(r.BRIGHT_BLUE , "brightblue", "bg", rgb=(t, t, f))
BG_BRIGHT_MAGENTA = TC(r.BG_BRIGHT_MAGENTA, "brightmagenta", "bg", rgb=(f, b, f))
BG_BRIGHT_CYAN  = TC(r.BRIGHT_CYAN , "brightcyan", "bg", rgb=(b, f, f))
BG_BRIGHT_WHITE = TC(r.BRIGHT_WHITE, "brightwhite", "bg", rgb=(f, f, f))


class BGRGBTerminalCode(TerminalCode):
    def __new__(cls, rgb: BaseColor, name: str = "unknown", *groups: str):
        rgb: BaseColor = to_rgba(rgb)[:3]
        c = r.build_bg_rgb(*rgb)
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
BG_DARKRED = BGRGBTerminalCode(r.DARKRED_HEX, "darkred")
BG_DARKGREEN = BGRGBTerminalCode(r.DARKGREEN_HEX, "darkgreen")
BG_DARKBLUE = BGRGBTerminalCode(r.DARKBLUE_HEX, "darkblue")
BG_DARKCYAN = BGRGBTerminalCode(r.DARKCYAN_HEX, "darkcyan")
BG_DARKMAGENTA = BGRGBTerminalCode(r.DARKMAGENTA_HEX, "darkmagenta")
BG_DARKYELLOW = BGRGBTerminalCode(r.DARKYELLOW_HEX, "darkyellow")
BG_LIGHTRED = BGRGBTerminalCode(r.LIGHTRED_HEX, "lightred")
BG_LIGHTGREEN = BGRGBTerminalCode(r.LIGHTGREEN_HEX, "lightgreen")
BG_LIGHTBLUE = BGRGBTerminalCode(r.LIGHTBLUE_HEX, "lightblue")
BG_LIGHTCYAN = BGRGBTerminalCode(r.LIGHTCYAN_HEX, "lightcyan")
BG_LIGHTMAGENTA = BGRGBTerminalCode(r.LIGHTMAGENTA_HEX, "lightmagenta")
BG_LIGHTYELLOW = BGRGBTerminalCode(r.LIGHTYELLOW_HEX, "lightyellow")
BG_ORANGE = BGRGBTerminalCode(r.ORANGE_HEX, "orange")
BG_PINK = BGRGBTerminalCode(r.PINK_HEX, "pink")
BG_PURPLE = BGRGBTerminalCode(r.PURPLE_HEX, "purple")
BG_BROWN = BGRGBTerminalCode(r.BROWN_HEX, "brown")
BG_GOLD = BGRGBTerminalCode(r.GOLD_HEX, "gold")
BG_LIME = BGRGBTerminalCode(r.LIME_HEX, "lime")
BG_TEAL = BGRGBTerminalCode(r.TEAL_HEX, "teal")
BG_NAVY = BGRGBTerminalCode(r.NAVY_HEX, "navy")
BG_OLIVE = BGRGBTerminalCode(r.OLIVE_HEX, "olive")
BG_MAROON = BGRGBTerminalCode(r.MAROON_HEX, "maroon")

# === Text Attributes ===
BOLD       = TC(r.BOLD      , "bold", "styles")
B      = TC(r.BOLD      , "b", "styles")
DIM        = TC(r.DIM       , "dim", "styles")
D      = TC(r.DIM       , "d", "styles")
ITALIC     = TC(r.ITALIC    , "italic", "styles")
I     = TC(r.ITALIC    , "i", "styles")
UNDERLINE  = TC(r.UNDERLINE , "underline", "styles")
U  = TC(r.UNDERLINE , "u", "styles")
BLINK      = TC(r.BLINK     , "blink", "styles")     # rarely supported, and often disabled
REVERSE    = TC(r.REVERSE   , "reverse", "styles")     # swap fg/bg
R    = TC(r.REVERSE   , "r", "styles")     # swap fg/bg
HIDDEN     = TC(r.HIDDEN    , "hidden", "styles")     # used for passwords
PASSWORD     = TC(r.HIDDEN    , "password", "styles")     # used for passwords
H    = TC(r.HIDDEN    , "h", "styles")     # used for passwords
STRIKETHROUGH = TC(r.STRIKETHROUGH, "strikethrough", "styles")
S = TC(r.STRIKETHROUGH, "s", "styles")
DASH = TC(r.STRIKETHROUGH, "-", "styles")


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