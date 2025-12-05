
CARRIAGE_RETURN = "\r"
CLEAR_REST_OF_LINE = f"\033[K"
CLEAR_LINE = f"{CARRIAGE_RETURN}{CLEAR_REST_OF_LINE}"
ERASE_LINE="\033[2K"
SAVE_CURSOR = "\0337"    # or "\033[s"
RESTORE_CURSOR = "\0338" # or "\033[u"
    

def left(n=1):
    return f"\033[{n}D"

def right(n=1):
    return f"\033[{n}C"

def up(n=1):
    return f"\033[{n}A"

def down(n=1):
    return f"\033[{n}B"

def col(n=0):
    if n == 0:
        return "\r"
    return f"\033[{n+1}G"

def pos(row, col):
    return f"\033[{row+1};{col+1}H"

def row(n):
    return f"\033[{n+1}d"


def clear_line():
    return CLEAR_LINE


def erase_line():
    return ERASE_LINE


def backspace():
    return "\033[1D \033[1D"


def replace(ch=" "):
    return ch + left()


def save():
    return SAVE_CURSOR


def restore():
    return RESTORE_CURSOR


def write_ahead(text: str):
    return save() + text + restore()

