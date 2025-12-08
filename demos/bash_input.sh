#!/bin/bash

# Bash script demonstrating the use of amc command to prompt for input
# This script shows various ways to use amc for interactive autocomplete input

echo "=== Demo 1: Basic prompt ==="
echo "Using amc with a simple prompt..."
RESULT=$(amc "What is your favorite animal? ")
echo "You entered: $RESULT"
echo ""

echo "=== Demo 2: Prompt with completion file ==="
# If you have a completion file, uncomment and adjust the path:
 RESULT=$(amc "Pull from your completions list: " custom-completions.txt)
 echo "You entered: $RESULT"
 echo ""

echo "=== Demo 3: Prompt with inline completions ==="
echo "Using amc with inline completions..."
RESULT=$(amc "What is your favorite animal? " --completions "a|ardvark;b|ug;c|at;d|og;e|lephant;f|ox;g|iraffe")
echo "You entered: $RESULT"
echo ""

echo "=== Demo 4: Custom placeholder ==="
echo "Using amc with custom placeholder..."
RESULT=$(amc "Type a word: " --placeholder "Start typing here...")
echo "You entered: $RESULT"
echo ""

echo "All demos completed!"

