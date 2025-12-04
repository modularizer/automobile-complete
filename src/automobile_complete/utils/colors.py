from automobile_complete.utils.chars import CARRIAGE_RETURN

ESC = "\033"
RESET = f"{ESC}[0m"
GRAY = f"{ESC}[90m"  # Light gray for completion
REPLACE_LINE = f"{CARRIAGE_RETURN}{ESC}[K"
GREEN_HIGHLIGHT = f"{ESC}[102m"
DARK_GREY = f"{ESC}[38;5;233m"
GRAY2 = f"{ESC}[37m"