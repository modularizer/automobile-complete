import sys

from automobile_complete.utils.terminal.colors import colors, BG_BRIGHT_BLACK, RESET
from automobile_complete.utils.terminal.chars import BACKSPACE
import automobile_complete.utils.terminal.cursor  as cursor


global_state = {}
def print_with_suggestion(pre: str = "", post: str="",
                          overwrite: bool = True,
                          overwrite_line_count: int | None = None,
                          file=sys.stdout, end="", # kwargs to pass to print
                          print=print, # by default, use the print builtin, but allow overriding
                          state: dict | None = global_state, # this is INTENTIONALLY mutable
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


    # Check if completion starts with backspaces (full replacement)
    backspace_count = 0
    if post.startswith(BACKSPACE):
        # Count leading backspaces
        while backspace_count < len(post) and post[backspace_count] == BACKSPACE:
            backspace_count += 1
    post = post[backspace_count:]
    backspace_count = min(len(pre), backspace_count)
    prefix_stays = pre[:-backspace_count] if backspace_count > 0 else pre
    prefix_replaced = pre[-backspace_count:] if backspace_count > 0 else ""
    replaced_highlight = colors.bg.white(prefix_replaced) if prefix_replaced else ""
    completion = cursor.write_ahead(colors.gray(post)) if post else ""

    before_cursor = f"{prefix_stays}{replaced_highlight}"
    if before_cursor:
        print(before_cursor, end="", flush=True, file=file)
    if completion:
        print(completion, end="", flush=True, file=file)
    t = before_cursor + completion
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
    d()
    print_with_suggestion("test", "compl")
    d()
    print_with_suggestion("testcompl", "etion")