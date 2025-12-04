# Automobile Complete

An intelligent autocomplete system that builds frequency-based trie data structures from language wordlists and provides an interactive command-line interface for text completion.

## Overview

This project implements a complete autocomplete pipeline with four main steps:

1. **Wordlist Generation** - Create wordlist files in `word #frequency` format
2. **Completion List Generation** - Preprocess wordlists into completion files in `prefix|completion #frequency` format
3. **Trie Engine** - Load completion files into trie data structures for efficient lookup
4. **Interactive CLI** - Real-time autocomplete interface with inline gray text suggestions

The system uses frequency-weighted word rankings to provide intelligent completion suggestions, similar to modern IDE autocomplete systems.

## Project Structure

```
src/automobile_complete/
├── wordlist/          # Wordlist generation and merging
│   ├── write/         # Generate wordlists from wordfreq or corpus
│   └── merge/         # Merge multiple wordlists with weights
├── completionlist/    # Preprocess wordlists into completion lists
│   ├── node.py        # Node-based trie implementation
│   ├── completionlist.py  # Main preprocessing logic
│   └── merge/         # Merge multiple completion lists with conflict resolution
├── engine/            # Trie engine for interactive use
│   ├── core_trie.py   # Core trie implementation
│   └── trie.py        # Extended trie with visualization
└── run/               # Interactive CLI runner
```

## Installation

### From Source

Install the package in development mode:

```bash
# Clone the repository
git clone https://github.com/modularizer/automobile-complete
cd automobile-complete

# Install in editable mode
pip install -e .

# Or install with development dependencies
pip install -e ".[dev]"
```

### Requirements

- Python 3.8 or higher
- `wordfreq` library (automatically installed as a dependency)

## Workflow

The complete pipeline consists of four steps:

### Step 1: Generate Wordlist

Create a wordlist file in `word #frequency` format from wordfreq or corpus files.

**From wordfreq:**
```bash
amc w --output wordlist.txt --lang en --max-words 100000
```

**From corpus files:**
```bash
amc w --output wordlist.txt --from-corpus file1.txt file2.txt
```

**Output Format:**
```
the #53703180
to #26915348
and #25703958
of #25118864
in #18620871
```

### Step 2: (Optional) Merge Wordlists

Merge multiple wordlists with configurable weights:

```bash
# Merge with equal weights
amc mw wordlist1.txt wordlist2.txt --output merged.txt

# Merge with absolute weights
amc mw wordlist1.txt wordlist2.txt --output merged.txt \
    --weights 1.0 2.5

# Merge with relative weights (percentile-based)
amc mw wordlist1.txt wordlist2.txt --output merged.txt \
    --weights 1.0 '{"percentile": 50, "reference_percentile": 90, "reference_index": 0}'
```

### Step 3: Generate Completion List

Preprocess wordlist files into completion files in `prefix|completion #frequency` format:

```bash
# Basic preprocessing
amc c wordlist.txt --output completions.txt

# With custom thresholds
amc c wordlist.txt --output completions.txt \
    --word-threshold 0.25 --subtree-threshold 0.5

# Without frequencies
amc c wordlist.txt --output completions.txt --no-preserve-freqs
```

**Output Format:**
```
hel|lo #10
wor|ld #20
foo|bar #5
```

### Step 4: (Optional) Merge Completion Lists

Merge multiple completion lists with conflict resolution (higher-weighted completions win):

```bash
# Merge with equal weights
amc mc completions1.txt completions2.txt --output merged.txt

# Merge with absolute weights
amc mc completions1.txt completions2.txt --output merged.txt \
    --weights 1.0 2.5
```

### Step 5: Use Interactive Autocomplete

Run the interactive CLI with your completion file:

```bash
amc completions.txt
```

**Features:**
- Inline gray text completions (similar to modern IDEs)
- Real-time updates as you type
- Tab key to accept completions
- Backspace to delete characters
- Works with piped output (writes final result to stdout when piped)

## Components

### 1. Wordlist Module (`wordlist/`)

Generates wordlist files in `word #frequency` format.

**Key Features:**
- Generate from wordfreq language wordlists
- Generate from corpus files (count word frequencies)
- Filter by length, pattern, and frequency
- Merge multiple wordlists with weights (absolute or percentile-based)

**CLI Commands:**
- `automobile-wordlist` - Generate wordlists
- `automobile-wordlist-merge` - Merge wordlists

### 2. Completion List Module (`completionlist/`)

Preprocesses wordlists into completion files using trie analysis.

**Key Features:**
- Builds Node-based trie data structures
- Computes frequency statistics via depth-first search
- Determines auto-completion suggestions based on thresholds
- Handles conflicting paths when merging (disables lower-weighted completions)

**CLI Commands:**
- `automobile-preprocess` - Generate completion lists
- `automobile-preprocess-merge` - Merge completion lists

**Key Functions:**
- `build_completionlist()` - Main preprocessing function
- `build_trie()` - Constructs Node trie from words
- `dfs()` - Computes frequency statistics and determines completions
- `Node.disable()` - Disables conflicting completion paths

### 3. Engine Module (`engine/`)

Core trie implementation for interactive autocomplete.

**Key Features:**
- **CoreTrie** - Base trie with:
  - Character-by-character navigation
  - Completion suffix storage
  - Case-insensitive matching
  - Control character handling (tab, backspace)
  
- **Trie** - Extended trie with:
  - Terminal color formatting
  - Real-time simulation
  - Visual display of completions

**Key Methods:**
- `walk_to(text)` - Navigate through trie
- `accept()` - Accept current completion
- `from_file(path)` - Load from completion file
- `from_words(*lines)` - Build from completion definitions

### 4. Run Module (`run/`)

Interactive command-line interface for real-time autocomplete.

**Key Features:**
- Inline gray text completions
- Tab to accept, Backspace to delete
- Real-time updates
- Piped output support (writes to stdout when piped)

**CLI Command:**
- `automobile-cli` - Interactive autocomplete

## File Formats

### Wordlist Format

```
word #frequency
another_word #12345
word_without_freq
```

- `word #frequency` - Word with explicit frequency
- `word` - Word with default frequency 1.0

### Completion Format

```
prefix|completion #frequency
pre|post #12345
prefix|completion
```

- `prefix|completion #frequency` - Prefix, completion, and frequency
- `prefix|completion` - Prefix and completion (default frequency 1.0)

## Technical Details

### Trie Data Structure

The system uses a **trie (prefix tree)** where:
- Each node represents a prefix
- Shared prefixes share common nodes (efficient storage)
- Frequency statistics computed via depth-first search
- Auto-completion determined by frequency thresholds and ratios
- Nodes can be pruned to remove paths without completions

### Frequency Analysis

Completion selection considers:
- **Word frequency**: How common an individual word is
- **Subtree frequency**: Total probability mass in a subtree
- **Ratio thresholds**: Ensures selected completions are significantly better than alternatives

### Conflict Resolution

When merging completion lists with conflicting paths (same prefix, different completions):
- Higher-weighted completion is kept
- Lower-weighted completion is disabled using `Node.disable()`
- Disabled completions are cleared along the entire completion path

This approach enables intelligent, context-aware autocomplete that adapts to word usage patterns.

## Examples

### Complete Workflow

```bash
# 1. Generate wordlist from wordfreq
automobile-wordlist --output en.txt --lang en --max-words 100000

# 2. Generate wordlist from corpus
automobile-wordlist --output custom.txt --from-corpus documents/*.txt

# 3. Merge wordlists
automobile-wordlist-merge en.txt custom.txt --output merged.txt --weights 1.0 2.0

# 4. Generate completion list
automobile-preprocess merged.txt --output completions.txt

# 5. Use interactive autocomplete
automobile-cli completions.txt
```

### Advanced: Multiple Completion Lists

```bash
# Generate completions from different sources
automobile-preprocess technical.txt --output tech_completions.txt
automobile-preprocess general.txt --output gen_completions.txt

# Merge with weights (technical completions get higher weight)
automobile-preprocess-merge tech_completions.txt gen_completions.txt \
    --output final.txt --weights 2.0 1.0

# Use merged completions
automobile-cli final.txt
```

## Development

### Project Structure

- `wordlist/` - Wordlist generation and merging (no dependencies on other modules)
- `completionlist/` - Completion list generation (uses `wordlist.read`, uses `Node` not `CoreTrie`)
- `engine/` - Trie engine for interactive use (independent module)
- `run/` - CLI runner (uses `engine`)

### Module Dependencies

```
wordlist (independent)
  └── completionlist (uses wordlist.read)
        └── engine (independent)
              └── run (uses engine)
```

## License

MIT License - see LICENSE file for details.
