class TerminalCode(str):
    registry = {

    }
    def __new__(cls, code: str, name: str = "unknown", *groups: str, rgb: tuple(int, int, int) | None = None):
        obj = super().__new__(cls, code)  # create the string instance
        obj.name = name                     # attach custom attribute
        groups = groups or ("unknown",)
        obj.groups = groups
        obj.rpg = rgb
        for group in groups:
            if group not in cls.registry:
                cls.registry[group] = {}
            cls.registry[group] = obj
        return obj

    def __call__(self, text: str):
        return str(self) + text + RESET

    def __add__(self, other):
        if isinstance(other, TerminalCode):
            o = str(other)
            oname = getattr(other, "name", o)
            return TerminalCode(str(self) + o, name=f"{self.name}+{oname}")
        return str(self) + other

TC = TerminalCode


RESET = TC("\033[0m", "reset", "fg", "bg", "styles")


known_colors = {
    # --- Grayscale ---
    "white":        "#FFFFFF",
    "black":        "#000000",
    "gray":         "#808080",
    "grey":         "#808080",
    "lightgray":    "#D3D3D3",
    "lightgrey":    "#D3D3D3",
    "darkgray":     "#A9A9A9",
    "darkgrey":     "#A9A9A9",

    # --- Primary colors ---
    "red":          "#FF0000",
    "green":        "#00FF00",
    "blue":         "#0000FF",

    # --- Secondary colors ---
    "cyan":         "#00FFFF",
    "magenta":      "#FF00FF",
    "yellow":       "#FFFF00",

    # --- Darker variants ---
    "darkred":      "#8B0000",
    "darkgreen":    "#006400",
    "darkblue":     "#00008B",
    "darkcyan":     "#008B8B",
    "darkmagenta":  "#8B008B",
    "darkyellow":   "#8B8B00",

    # --- Light variants ---
    "lightred":     "#FFA07A",
    "lightgreen":   "#90EE90",
    "lightblue":    "#ADD8E6",
    "lightcyan":    "#E0FFFF",
    "lightmagenta": "#FF77FF",
    "lightyellow":  "#FFFFE0",

    # --- Nice functional colors (UI-friendly) ---
    "orange":       "#FFA500",
    "pink":         "#FFC0CB",
    "purple":       "#800080",
    "brown":        "#A52A2A",
    "gold":         "#FFD700",
    "lime":         "#32CD32",
    "teal":         "#008080",
    "navy":         "#000080",
    "olive":        "#808000",
    "maroon":       "#800000",
}

def to_rgba(color) -> tuple[int, int, int, float]:
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
    if not color:
        return (255, 255, 255, 1)
    if isinstance(color, str):
        color = color.lower()
    if isinstance(color, str) and color in known_colors:
        color = known_colors[color]

    if isinstance(color, str) and repr(color).startswith("'\\"):
        if repr(color).startswith("'\\033[38;"):
            rs, gs, bs = color.split('[38;')[1][:-1].split(";")
            return int(rs), int(gs), int(bs), 1
        if repr(color).startswith("'\\033[48;"):
            rs, gs, bs = color.split('[48;')[1][:-1].split(";")
            return int(rs), int(gs), int(bs), 1
        for k, v in known_foreground_colors.items():
            if color == v:
                color = ansi_rgb[k]
                return *color, 1
        for k, v in known_background_colors.items():
            if color == v:
                color = ansi_rgb[k]
                return *color, 1
        raise Exception(f"unknown color: {color}")


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


def to_rgb(color, background="white") -> tuple[int, int, int]:
    """
    fg, bg: (r,g,b) or hex
    alpha: 0.0–1.0 (fg opacity over bg)
    """
    fr, fg, fb, fa = to_rgba(color)
    if fa == 1:
        return fr, fg, fb
    br, bg, bb, ba = to_rgba(background)
    a = max(0.0, min(1.0, float(fa)))

    r = round((1 - a) * br + a * fr)
    g = round((1 - a) * bg + a * fg)
    b = round((1 - a) * bb + a * fb)
    return r, g, b





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

known_foreground_colors = {
    # Standard 8 colors
    "black":        BLACK,
    "red":          RED,
    "green":        GREEN,
    "yellow":       YELLOW,
    "blue":         BLUE,
    "magenta":      MAGENTA,
    "cyan":         CYAN,
    "white":        WHITE,

    # Aliases
    "light_gray":   LIGHT_GRAY,
    "lightgrey":    LIGHT_GRAY,
    "lightgray":    LIGHT_GRAY,

    "dark_gray":    DARK_GRAY,
    "darkgrey":     DARK_GRAY,
    "darkgray":     DARK_GRAY,

    # Bright 8 colors
    "bright_black":   BRIGHT_BLACK,
    "bright_red":     BRIGHT_RED,
    "bright_green":   BRIGHT_GREEN,
    "bright_yellow":  BRIGHT_YELLOW,
    "bright_blue":    BRIGHT_BLUE,
    "bright_magenta": BRIGHT_MAGENTA,
    "bright_cyan":    BRIGHT_CYAN,
    "bright_white":   BRIGHT_WHITE,
}



def gen_rgb(r: int, g: int, b: int) -> str:
    """Return an ANSI escape sequence for 24-bit RGB foreground color."""
    return f"\033[38;2;{r};{g};{b}m"

# === Standard Background Colors ===
BG_BLACK   = "\033[40m"
BG_RED     = "\033[41m"
BG_GREEN   = "\033[42m"
BG_YELLOW  = "\033[43m"
BG_BLUE    = "\033[44m"
BG_MAGENTA = "\033[45m"
BG_CYAN    = "\033[46m"
BG_WHITE   = "\033[47m"
BG_BRIGHT_BLACK   = "\033[100m"
BG_BRIGHT_RED     = "\033[101m"
BG_BRIGHT_GREEN   = "\033[102m"
BG_BRIGHT_YELLOW  = "\033[103m"
BG_BRIGHT_BLUE    = "\033[104m"
BG_BRIGHT_MAGENTA = "\033[105m"
BG_BRIGHT_CYAN    = "\033[106m"
BG_BRIGHT_WHITE   = "\033[107m"

known_background_colors = {
    # Standard 8 background colors
    "black":        BG_BLACK,
    "red":          BG_RED,
    "green":        BG_GREEN,
    "yellow":       BG_YELLOW,
    "blue":         BG_BLUE,
    "magenta":      BG_MAGENTA,
    "cyan":         BG_CYAN,
    "white":        BG_WHITE,

    # Aliases (light/dark grays)
    "light_gray":   BG_WHITE,
    "lightgrey":    BG_WHITE,
    "lightgray":    BG_WHITE,

    "dark_gray":    BG_BRIGHT_BLACK,   # typical dark-gray bg
    "darkgrey":     BG_BRIGHT_BLACK,
    "darkgray":     BG_BRIGHT_BLACK,

    # Bright background colors
    "bright_black":   BG_BRIGHT_BLACK,
    "bright_red":     BG_BRIGHT_RED,
    "bright_green":   BG_BRIGHT_GREEN,
    "bright_yellow":  BG_BRIGHT_YELLOW,
    "bright_blue":    BG_BRIGHT_BLUE,
    "bright_magenta": BG_BRIGHT_MAGENTA,
    "bright_cyan":    BG_BRIGHT_CYAN,
    "bright_white":   BG_BRIGHT_WHITE,
}



# === Text Attributes ===
BOLD         = "\033[1m"
DIM          = "\033[2m"
ITALIC       = "\033[3m"
UNDERLINE    = "\033[4m"
BLINK        = "\033[5m"     # rarely supported, and often disabled
REVERSE      = "\033[7m"     # swap fg/bg
HIDDEN       = "\033[8m"     # used for passwords
STRIKETHROUGH = "\033[9m"

known_styles = {
    "bold": BOLD,
    "b": BOLD,
    "dim": DIM,
    "d": DIM,
    "i": ITALIC,
    "italic": ITALIC,
    "blink": BLINK,
    "reverse": REVERSE,
    "hidden": HIDDEN,
    "strikethrough": STRIKETHROUGH,
    "-": STRIKETHROUGH,
    "underline": UNDERLINE,
    "u": UNDERLINE,
    "r": REVERSE
}

def gen_styles(style: list[str] | str = ""):
    if not style:
        return ""
    if isinstance(style, list):
        styles = style
    elif len(style) == 1:
        styles = [style]
    elif all(c in known_styles for c in style):
        styles = [c for c in style]
    else:
        styles = [style]
    s = ""
    for st in styles:
        st = st.lower()
        if st in known_styles:
            s += known_styles[st]
    return s


def gen_bg_rgb(r: int, g: int, b: int) -> str:
    """Return an ANSI escape sequence for 24-bit RGB background color."""
    return f"\033[48;2;{r};{g};{b}m"

INITIAL_DEFAULT_TERMINAL_COLOR = "white"
settings = {
    "tc": INITIAL_DEFAULT_TERMINAL_COLOR
}
def register_terminal_color(color: str, background_of_background=INITIAL_DEFAULT_TERMINAL_COLOR):
    settings["tc"] = to_rgb(color, background_of_background)

def get_color(foreground: str  | None = None, background: str | None = None, style: list[str] | str = "", terminal_color: str | None = None):
    s = gen_styles(style)

    if terminal_color is None:
        terminal_color = settings["tc"]

    terminal_color = terminal_color.lower() if isinstance(terminal_color, str) else None
    foreground = foreground.lower() if isinstance(foreground, str) else None
    background = background.lower() if isinstance(background, str) else None

    fg = known_foreground_colors.get(foreground, foreground or "")
    fg_is_resolved = repr(fg).startswith("'\\") or not fg
    bg = known_background_colors.get(background, background or "")
    bg_is_resolved = repr(bg).startswith("'\\") or not bg

    if not bg_is_resolved:
        bg_rgb = to_rgb(bg, terminal_color)
        bg = gen_bg_rgb(*bg_rgb)
    else:
        bg_rgb = None

    if not fg_is_resolved:
        fg_rgb= to_rgb(fg, bg or bg_rgb or "")
        fg= gen_rgb(*fg_rgb)
    return s + bg + fg






def demo_color(foreground: str  | None = None, background: str | None = None, style: list[str] | str = "", terminal_color: str | None = None, **kw):
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
        return list(known_foreground_colors)

    def __iter__(self):
        return iter(known_foreground_colors)

class BGColors:
    def __getattr__(self, item):
        return get_color(background=item)

    def __getitem__(self, item):
        return get_color(background=item)

    def __iter__(self):
        return iter(known_background_colors)

    def __dir__(self):
        return list(known_background_colors)

class Styles:
    def __getattr__(self, item):
        return gen_styles(item)

    def __getitem__(self, item):
        return gen_styles(item)

    def __iter__(self):
        return iter(known_styles)

    def __dir__(self):
        return list(known_styles)

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
        s = gen_styles(item)
        if s:
            return s
        if item.startswith("bg_"):
            return get_color(background=item[3:])
        return get_color(foreground=item)

    def __iter__(self):
        return iter({"styles": styles, "fg": fg, "bg": bg})

    def __dir__(self):
        return list(known_styles)

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

    for s in known_styles:
        c.demo_color(style=s)