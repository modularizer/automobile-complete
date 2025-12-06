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
                          prefix: str | None = None, # Current prefix (for highlighting replacements)
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
    display_post = post
    if post.startswith(BACKSPACE):
        # Count leading backspaces
        while backspace_count < len(post) and post[backspace_count] == BACKSPACE:
            backspace_count += 1
        # Remove backspaces from completion for display
        display_post = post[backspace_count:]
    
    # For full replacements, highlight the characters that will be replaced
    if backspace_count > 0 and prefix is not None and len(prefix) >= backspace_count:
        # The prefix is what will be replaced (or part of it)
        # Split prefix into: part that stays, and part that will be replaced
        prefix_stays = prefix[:-backspace_count] if backspace_count > 0 else ""
        prefix_replaced = prefix[-backspace_count:] if backspace_count > 0 else prefix
        
        # Calculate the part of pre that's before the prefix
        prefix_start = len(pre) - len(prefix) if len(pre) >= len(prefix) else 0
        pre_before_prefix = pre[:prefix_start]
        
        # Show replaced part of prefix with gray background highlight
        replaced_highlight = colors.bg.white(prefix_replaced)
        # Show the part of prefix that stays (if any) normally
        prefix_before_replaced = prefix_stays
        # Show replacement text in gray
        replacement_text = cursor.write_ahead(colors.gray(display_post))
        
        t = f"{pre_before_prefix}{prefix_before_replaced}{replaced_highlight}{replacement_text}{end}"
    elif backspace_count > 0:
        # Fallback: if no prefix provided, just highlight last N characters
        if len(pre) >= backspace_count:
            pre_stays = pre[:-backspace_count]
            pre_replaced = pre[-backspace_count:]
            replaced_highlight = colors.bg.white(pre_replaced)
            replacement_text = cursor.write_ahead(colors.gray(display_post))
            t = f"{pre_stays}{replaced_highlight}{replacement_text}{end}"
        else:
            # Not enough characters to replace, just show completion
            completion = cursor.write_ahead(colors.gray(display_post))
            t = f"{pre}{completion}{end}"
    else:
        # Normal completion: make grey completion text
        completion = cursor.write_ahead(colors.gray(display_post))
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
    d()
    print_with_suggestion("test", "compl")
    d()
    print_with_suggestion("testcompl", "etion")