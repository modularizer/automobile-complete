# Terminal Utilities

This module provides comprehensive terminal manipulation utilities for Python applications, including ANSI color codes, cursor control, text styling, and interactive output formatting.

## Overview

The `terminal` module consists of several submodules that work together to provide a complete terminal interface:

- **`terminal.py`** - High-level printing utilities with suggestion support
- **`colors.py`** - Rich color and styling API
- **`raw_colors.py`** - Low-level ANSI escape codes
- **`cursor.py`** - Cursor movement and positioning
- **`chars.py`** - Control character mappings

## Quick Start

```python
from automobile_complete.utils.terminal import colors, cursor, print_with_suggestion

# Print colored text
print(colors.red("Error: Something went wrong"))
print(colors.bg.blue("Background color"))
print(colors.bold("Bold text"))

# Move cursor
print(cursor.up(3))  # Move up 3 lines
print(cursor.clear_line())  # Clear current line

# Print with overwritable suggestions
print_with_suggestion("User input: ", "suggestion text")
```

## Color System

### Basic Colors

The module provides a rich color API through the `colors` object:

```python
from automobile_complete.utils.terminal import colors

# Foreground colors
colors.red("text")
colors.green("text")
colors.blue("text")
colors.yellow("text")
colors.cyan("text")
colors.magenta("text")
colors.black("text")
colors.white("text")
colors.gray("text")

# Bright variants
colors.bright_red("text")
colors.bright_green("text")
# ... etc
```

### Background Colors

```python
# Background colors
colors.bg.red("text")
colors.bg.blue("text")
colors.bg.green("text")
# ... etc
```

### RGB Colors

You can use custom RGB colors in multiple formats:

```python
# Hex strings
colors("#FF5733")("text")
colors("#RGB")("text")  # Shorthand
colors("FF5733")("text")  # Without #

# RGB tuples
colors((255, 87, 51))("text")
colors((255, 87, 51, 0.5))("text")  # With alpha

# Named colors
colors.darkred("text")
colors.lightblue("text")
colors.orange("text")
colors.purple("text")
# ... and many more
```

### Text Styles

```python
from automobile_complete.utils.terminal import colors

colors.bold("text")
colors.italic("text")
colors.underline("text")
colors.dim("text")
colors.strikethrough("text")
colors.reverse("text")  # Swap foreground/background
colors.hidden("text")  # Useful for passwords
```

### Combining Colors and Styles

```python
# Method chaining
colors.bold + colors.red("text")

# Using get_color function
from automobile_complete.utils.terminal.colors import get_color
style = get_color(foreground="red", background="blue", style="bold")
print(style("Hello, World!"))
```

### Color API Reference

The `colors` object provides several ways to access colors:

```python
# Direct attribute access
colors.red
colors.bg.blue
colors.styles.bold

# Dictionary-style access
colors["red"]
colors.bg["blue"]

# Function call for full control
colors(foreground="red", background="blue", style=["bold", "underline"])
```

## Cursor Control

The `cursor` module provides functions for cursor movement and line manipulation:

```python
from automobile_complete.utils.terminal import cursor

# Movement
cursor.up(n=1)      # Move up n lines
cursor.down(n=1)    # Move down n lines
cursor.left(n=1)    # Move left n characters
cursor.right(n=1)   # Move right n characters

# Positioning
cursor.col(n=0)     # Move to column n (0 = start of line)
cursor.row(n)       # Move to row n
cursor.pos(row, col) # Move to specific position

# Line manipulation
cursor.clear_line()  # Clear from cursor to end of line
cursor.erase_line()  # Erase entire line
cursor.save()        # Save cursor position
cursor.restore()     # Restore cursor position

# Utility functions
cursor.write_ahead(text)  # Write text without moving cursor
cursor.backspace()        # Backspace character
cursor.replace(ch=" ")    # Replace character at cursor
```

### Example: Overwriting Output

```python
import time
from automobile_complete.utils.terminal import cursor

print("Processing...", end="", flush=True)
time.sleep(1)
print(cursor.clear_line() + "Done!", flush=True)
```

## Control Characters

The `chars` module provides mappings for control characters (Ctrl+key combinations):

```python
from automobile_complete.utils.terminal.chars import CTRL

# Get control character codes
CTRL["a"]  # '\x01' (SOH)
CTRL["z"]  # '\x1a' (SUB)
CTRL["c"]  # '\x03' (ETX)
CTRL["d"]  # '\x04' (EOT)

# Special cases
CTRL[" "]  # '\x00' (NUL)
CTRL["?"]  # '\x7f' (DEL)
CTRL["["]  # '\x1b' (ESC)

# Multiple characters
CTRL["abc"]  # '\x01\x02\x03'
```

## Print with Suggestions

The `print_with_suggestion` function is designed for interactive applications that show completion suggestions:

```python
from automobile_complete.utils.terminal import print_with_suggestion

# Print text with a suggestion that appears in gray
print_with_suggestion("User typed: ", "completion text")

# The suggestion can be overwritten on the next call
print_with_suggestion("User typed: abc", "def")  # Updates previous output
```

### Parameters

- `pre` - Text to print before the suggestion
- `post` - Suggestion text (displayed in gray)
- `overwrite` - Whether to overwrite previous output (default: `True`)
- `overwrite_line_count` - Number of lines to clear (auto-detected if `None`)
- `file` - Output file (default: `sys.stdout`)
- `end` - String to append after output (default: `""`)
- `state` - State dictionary for tracking previous output

### Example: Interactive Completion

```python
from automobile_complete.utils.terminal import print_with_suggestion

# Simulate typing with suggestions
print_with_suggestion("", "hello")
time.sleep(0.5)
print_with_suggestion("h", "ello")
time.sleep(0.5)
print_with_suggestion("he", "llo")
time.sleep(0.5)
print_with_suggestion("hel", "lo")
time.sleep(0.5)
print_with_suggestion("hello", "")
```

## Low-Level ANSI Codes

For direct access to ANSI escape codes, use the `raw_colors` module:

```python
from automobile_complete.utils.terminal import raw_colors

print(raw_colors.RED + "Red text" + raw_colors.RESET)
print(raw_colors.BG_BLUE + "Blue background" + raw_colors.RESET)
print(raw_colors.BOLD + "Bold text" + raw_colors.RESET)

# RGB colors
from automobile_complete.utils.terminal.raw_colors import build_fg_rgb, build_bg_rgb
rgb_code = build_fg_rgb(255, 100, 50)  # Orange foreground
print(rgb_code + "Custom color" + raw_colors.RESET)
```

## Advanced Usage

### Custom Terminal Colors

Register a custom terminal background color for alpha blending:

```python
from automobile_complete.utils.terminal.colors import register_terminal_color

register_terminal_color("#1e1e1e")  # Dark background
```

### Color Conversion

Convert between different color formats:

```python
from automobile_complete.utils.terminal.colors import to_rgba, to_rgb

# Convert to RGBA tuple
rgba = to_rgba("#FF5733")  # (255, 87, 51, 1.0)
rgba = to_rgba((255, 87, 51))  # (255, 87, 51, 1.0)

# Convert with alpha blending
rgb = to_rgb("#FF5733AA", background="#000000")  # Blended RGB
```

### Terminal Code Registry

The module maintains a registry of terminal codes that can be retrieved by name:

```python
from automobile_complete.utils.terminal.colors import TerminalCode

# Retrieve by name
code = TerminalCode.retrieve("red", "fg")
code = TerminalCode.retrieve("bold", "styles")

# Create custom terminal codes
custom = TerminalCode("\033[38;2;255;100;50m", "orange", "fg", rgb=(255, 100, 50))
```

## TerminalCode Type

The `TerminalCode` class is the foundation of the color system. It's a subclass of `str` that represents ANSI escape codes while providing rich functionality through special methods.

### Overview

`TerminalCode` extends Python's `str` type, meaning it behaves like a string in all string operations while adding terminal-specific capabilities. Each instance stores:
- The ANSI escape code (as the string value)
- A normalized name for lookup
- Group categories (e.g., "fg", "bg", "styles")
- Optional RGB color information

### String Behavior

Since `TerminalCode` is a subclass of `str`, it can be used anywhere a string is expected:

```python
from automobile_complete.utils.terminal.colors import TerminalCode, RED

# It's a string
code = RED
print(type(code))  # <class 'TerminalCode'>
print(isinstance(code, str))  # True
print(len(code))  # Length of the ANSI code
print(repr(code))  # Shows the escape sequence

# Can be concatenated with strings
message = RED + "Error" + "\033[0m"
print(message)

# Can be used in f-strings
print(f"{RED}Colored text\033[0m")

# All string methods work
code.startswith("\033")
code.upper()  # Returns a regular str
```

### Special Methods

#### `__call__` - Callable Interface

`TerminalCode` instances are callable, automatically wrapping text with the code and a reset:

```python
from automobile_complete.utils.terminal import colors

# These are equivalent:
colors.red("Hello")  # Returns: "\033[31mHello\033[0m"
colors.red + "Hello" + colors.RESET  # Same result

# Can be called with empty string to get just the code
code = colors.red("")  # Returns: "\033[31m\033[0m"
```

#### `__add__` - Combining Codes

Adding two `TerminalCode` instances combines their escape sequences and creates a new `TerminalCode`:

```python
from automobile_complete.utils.terminal import colors

# Combine colors and styles
bold_red = colors.bold + colors.red
print(bold_red("Bold red text"))

# The combination creates a new TerminalCode
combined = colors.bold + colors.underline + colors.blue
print(combined("Bold, underlined, blue text"))

# Can also add regular strings
result = colors.red + "text"  # Concatenates normally
```

#### `__getitem__` - Dictionary-Style Access

Indexing a `TerminalCode` concatenates the index with the code:

```python
from automobile_complete.utils.terminal import colors

# These are equivalent:
colors.red["text"]  # Returns: colors.red + "text"
colors.red + "text"  # Same result

# Useful for chaining
colors.bold[colors.red["Hello"]]  # Bold + red + "Hello"
```

#### `__getattr__` - Dynamic Attribute Access

Accessing attributes on a `TerminalCode` concatenates the attribute name as a string:

```python
from automobile_complete.utils.terminal import colors

# These are equivalent:
colors.red.text  # Returns: colors.red + "text"
colors.red + "text"  # Same result

# Enables fluent API
colors.bold.red.underline("Styled text")
# Equivalent to: colors.bold + "red" + "underline" + "(" + "Styled text" + ")"
# (Note: This is mainly for string concatenation, not method chaining)
```

### Properties and Attributes

Each `TerminalCode` instance has several attributes:

```python
from automobile_complete.utils.terminal.colors import TerminalCode, RED

# Instance attributes
code = RED
code.name        # Normalized name (e.g., "red")
code.groups      # List of groups (e.g., ["fg"])
code.rgb         # Optional RGB tuple (r, g, b) or None

# Property
code.aliases     # List of other TerminalCodes with the same escape sequence
```

### Registry System

`TerminalCode` maintains class-level registries for lookup:

```python
from automobile_complete.utils.terminal.colors import TerminalCode

# Class-level registries
TerminalCode.registry  # Dict mapping groups -> names -> TerminalCode instances
TerminalCode.reverse_registry  # Dict mapping escape codes -> TerminalCode instances

# Retrieve by name
red_code = TerminalCode.retrieve("red", "fg")
bold_code = TerminalCode.retrieve("bold", "styles")

# Normalize names (handles spaces, dashes, underscores)
TerminalCode.normname("Bright Red")  # "brightred"
TerminalCode.normname("bg-blue")     # "bgblue"
```

### Creating Custom TerminalCodes

You can create custom `TerminalCode` instances:

```python
from automobile_complete.utils.terminal.colors import TerminalCode

# Create a custom color
custom_orange = TerminalCode(
    "\033[38;2;255;165;0m",  # ANSI escape code
    "orange",                 # Name
    "fg",                     # Group
    rgb=(255, 165, 0)         # RGB values
)

# Now you can use it
print(custom_orange("Orange text"))

# It's registered automatically
retrieved = TerminalCode.retrieve("orange", "fg")
```

### Practical Examples

```python
from automobile_complete.utils.terminal import colors

# Example 1: String operations
red = colors.red
print(str(red))  # The ANSI code
print(repr(red))  # Representation
print(red in "\033[31mtext")  # True

# Example 2: Combining codes
style = colors.bold + colors.underline + colors.cyan
print(style("Fancy text"))

# Example 3: Callable interface
print(colors.red("Error message"))
print(colors.green("Success message"))

# Example 4: Chaining (via __getitem__ and __getattr__)
# Note: This concatenates strings, useful for building complex sequences
result = colors.bold["important"]  # colors.bold + "important"

# Example 5: Using with print
colors.red.print("This prints in red")

# Example 6: Checking properties
code = colors.red
print(f"Name: {code.name}")      # "red"
print(f"Groups: {code.groups}")  # ["fg"]
print(f"RGB: {code.rgb}")        # (205, 0, 0) or similar
```

### Type Behavior Summary

| Operation | Behavior | Example |
|-----------|----------|---------|
| `str(code)` | Returns ANSI escape sequence | `str(colors.red)` → `"\033[31m"` |
| `code(text)` | Wraps text with code + reset | `colors.red("hi")` → `"\033[31mhi\033[0m"` |
| `code1 + code2` | Combines escape sequences | `colors.bold + colors.red` → new `TerminalCode` |
| `code + str` | String concatenation | `colors.red + "text"` → `"\033[31mtext"` |
| `code[key]` | Concatenates key as string | `colors.red["text"]` → `colors.red + "text"` |
| `code.attr` | Concatenates attr as string | `colors.red.text` → `colors.red + "text"` |
| `code.name` | Returns normalized name | `colors.red.name` → `"red"` |
| `code.rgb` | Returns RGB tuple or None | `colors.red.rgb` → `(205, 0, 0)` |

## Module Structure

```
terminal/
├── __init__.py          # Module exports
├── terminal.py          # High-level printing utilities
├── colors.py            # Color and styling API
├── raw_colors.py        # Low-level ANSI codes
├── cursor.py           # Cursor control
└── chars.py            # Control character mappings
```

## Notes

- All color codes automatically reset when using the high-level API
- The module uses ANSI escape codes, which work on most modern terminals
- Some features (like `BLINK`) may not be supported by all terminals
- The `print_with_suggestion` function maintains state to track previous output for overwriting
- RGB colors require terminal support for 24-bit color (truecolor)

## Examples

### Progress Indicator

```python
import time
from automobile_complete.utils.terminal import cursor, colors

for i in range(10):
    print(cursor.clear_line() + f"Progress: {i+1}/10", end="", flush=True)
    time.sleep(0.1)
print()  # New line
```

### Colored Status Messages

```python
from automobile_complete.utils.terminal import colors

def log_info(msg):
    print(colors.cyan("INFO: ") + msg)

def log_error(msg):
    print(colors.red("ERROR: ") + msg)

def log_success(msg):
    print(colors.green("SUCCESS: ") + msg)

log_info("Application started")
log_error("Failed to connect")
log_success("Operation completed")
```

### Interactive Prompt with Suggestions

```python
from automobile_complete.utils.terminal import print_with_suggestion

def interactive_prompt():
    user_input = ""
    suggestions = ["hello", "help", "history"]
    
    while True:
        # Find matching suggestion
        suggestion = next((s for s in suggestions if s.startswith(user_input)), "")
        remaining = suggestion[len(user_input):] if suggestion else ""
        
        print_with_suggestion(user_input, remaining)
        
        # Get user input (simplified - in real app, use keyboard input)
        char = input()
        if char == "\n":
            break
        user_input += char
```

