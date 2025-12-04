# Automobile Complete

An intelligent autocomplete system that builds frequency-based trie data structures from language wordlists and provides an interactive command-line interface for text completion.

## Overview

This project implements a complete autocomplete pipeline with four main components:

1. **Wordlist Converter** (`wordlist.py`) - Converts wordfreq wordlists to word #frequency format
2. **Preprocessor** (`preprocess.py`) - Builds optimized trie data structures from wordlists
3. **Engine** (`trie.py`) - Core trie implementation with completion logic
4. **UI** (`cli.py`) - Interactive command-line interface for real-time autocomplete

The system uses frequency-weighted word rankings to provide intelligent completion suggestions, similar to modern IDE autocomplete systems.

## Components

### 1. Wordlist Converter (`wordlist.py`)

The wordlist converter extracts words from wordfreq language wordlists and converts them to the `word #frequency` format used by the project.

**Key Features:**
- Fetches words from wordfreq language wordlists
- Filters words by pattern, length, and frequency
- Supports custom words merging
- Outputs in `word #frequency` format (one word per line)
- Can write to file or stdout

**Usage:**
```bash
# Convert English wordlist to file
automobile-wordlist --output wordlist.txt --lang en

# Convert with custom filters
automobile-wordlist --output wordlist.txt --lang en --max-words 10000 --min-length 3

# Convert Spanish wordlist
automobile-wordlist --output spanish.txt --lang es

# Write to stdout
automobile-wordlist --lang en --max-words 100

# Merge custom words
automobile-wordlist --output wordlist.txt --lang en --custom-words custom.txt
```

**Output Format:**
```
the #53703180
to #26915348
and #25703958
of #25118864
in #18620871
```

This format can be used directly with the preprocessor or as input for building custom wordlists.

### 2. Preprocessor (`preprocess.py`)

The preprocessor is responsible for building optimized autocomplete trie data structures from language wordlists.

**Key Features:**
- Fetches words from language wordlists using the `wordfreq` library
- Filters words by pattern, length, and frequency
- Builds a trie (prefix tree) data structure for efficient prefix matching
- Computes frequency statistics and auto-completion suggestions using depth-first search
- Supports custom words with configurable frequency anchoring
- Exports tries to multiple formats: JSON, JavaScript, TypeScript, Python, Dart, Swift, Kotlin, Go, Rust, or plain text

**Usage:**
```bash
# Build a basic English trie
automobile-preprocess --output out.txt

# Build with custom words and thresholds
automobile-preprocess --output out.txt --custom-words custom.txt \
    --word-threshold 0.25 --subtree-threshold 0.5

# Export as TypeScript
automobile-preprocess --output trie.ts --lang en
```

**Key Functions:**
- `get_words()` - Fetches and filters words from wordlists
- `build_trie()` - Constructs the trie structure from words
- `dfs()` - Computes frequency statistics and determines auto-completions
- `write_trie()` - Exports the trie to various file formats

The preprocessor uses sophisticated frequency analysis to determine when to suggest completions, considering both individual word frequencies and subtree frequencies (the total probability mass in a subtree).

### 3. Engine (`trie.py`)

The engine provides the core trie data structure and completion logic.

**Key Features:**
- **CoreTrie** - Base trie implementation with:
  - Character-by-character navigation through the trie
  - Completion suffix storage and retrieval
  - Case-insensitive matching support
  - Control character handling (tab for completion, backspace for deletion)
  - Full text caching during navigation

- **Trie** - Extended trie with visualization:
  - Terminal color formatting for visual feedback
  - String representation with formatted output
  - Real-time simulation of typing with delays
  - Visual display of accepted completions

**Key Methods:**
- `walk_to(text)` - Navigate through the trie by processing characters
- `accept()` - Accept the current completion suggestion
- `from_file(path)` - Load a trie from a word file
- `from_words(*lines)` - Build a trie from word definitions
- `sim(text)` - Simulate typing with autocomplete visualization

**Word Format:**
Words are stored in the format `prefix|completion #frequency`, where:
- `prefix` is the typed portion
- `completion` is the suggested suffix
- `frequency` (optional) is the word's frequency weight

### 4. UI (`cli.py`)

The command-line interface provides an interactive autocomplete experience.

**Key Features:**
- Inline gray text completions (similar to modern IDEs)
- Real-time updates as you type
- Tab key to accept completions
- Backspace to delete characters
- Works with piped output (writes final result to stdout when piped)
- Handles special keys (Ctrl+C to exit, Enter to finish)

**Usage:**
```bash
# Run with default word file (out.txt)
automobile-cli

# Run with custom word file
automobile-cli custom_words.txt

# Run with verbose output
automobile-cli --noisy
```

**How It Works:**
1. Loads a trie from a word file (created by `preprocess.py`)
2. Reads characters one at a time from stdin
3. Navigates through the trie as you type
4. Displays completion suggestions in light gray after the cursor
5. Updates in real-time as you type or accept completions

When stdout is piped, intermediate states are written to stderr or `/dev/tty`, and only the final text is written to stdout, making it suitable for shell scripting.

## Workflow

1. **Build the trie**: Use `automobile-preprocess` to create an optimized trie from wordlists
   ```bash
   automobile-preprocess --output out.txt --lang en --max-words 100000
   ```

2. **Use the autocomplete**: Run `automobile-cli` to interact with the trie
   ```bash
   automobile-cli out.txt
   ```

3. **Type and complete**: As you type, gray completion suggestions appear. Press Tab to accept.

## Custom Words

You can add custom words by creating a text file with one word per line:

```
word #frequency
prefix|completion
another_word
```

- `word #frequency` - Word with explicit frequency
- `prefix|completion` - Prefix to completion mapping
- `word` - Word with default frequency 1

Then use it with the preprocessor:
```bash
automobile-preprocess --custom-words custom.txt --output out.txt
```

## Installation

### From Source

Install the package in development mode:

```bash
# Clone the repository
git clone <repository-url>
cd automobile-complete

# Install in editable mode
pip install -e .

# Or install with development dependencies
pip install -e ".[dev]"
```

### Requirements

- Python 3.8 or higher
- `wordfreq` library (automatically installed as a dependency)

## Usage

After installation, the CLI commands are available:

```bash
# 1. Convert wordfreq wordlist to word #frequency format (optional)
automobile-wordlist --output wordlist.txt --lang en --max-words 100000

# 2. Build the trie
automobile-preprocess --output out.txt --lang en

# 3. Use interactive autocomplete
automobile-cli out.txt

# 4. Type something and see completions appear in gray
#    Press Tab to accept, Backspace to delete
```

### Alternative: Direct Python Execution

You can also run the modules directly:

```bash
# Convert wordlist
python -m automobile_complete.wordlist --output wordlist.txt --lang en

# Build the trie
python -m automobile_complete.preprocess --output out.txt --lang en

# Use interactive autocomplete
python -m automobile_complete.cli out.txt
```

## Technical Details

The system uses a **trie (prefix tree)** data structure where:
- Each node represents a prefix
- Shared prefixes share common nodes (efficient storage)
- Frequency statistics are computed via depth-first search
- Auto-completion is determined by frequency thresholds and ratios
- The trie can be pruned to remove nodes without completions

Frequency analysis considers:
- **Word frequency**: How common an individual word is
- **Subtree frequency**: Total probability mass in a subtree
- **Ratio thresholds**: Ensures selected completions are significantly better than alternatives

This approach enables intelligent, context-aware autocomplete that adapts to word usage patterns.

