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