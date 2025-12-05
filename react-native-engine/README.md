# React Native Autocomplete

A React Native autocomplete component built with TypeScript, compatible with web, iOS, and Android platforms.

## Features

- **Cross-platform**: Works on web, iOS, and Android
- **TypeScript**: Fully typed implementation
- **Trie-based autocomplete**: Efficient prefix matching using a trie data structure
- **Frequency-based ranking**: Supports completion lists with frequency data
- **Tab completion**: Press Tab to accept suggestions

## Project Structure

```
src/
  engine/
    CoreTrie.ts    # Core trie data structure
    Trie.ts        # Extended trie with formatting
    constants.ts   # Control character constants
    index.ts       # Exports
  components/
    AutocompleteDemo.tsx  # Demo component with TextInput
```

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

```bash
npm install
```

### Running the App

```bash
# Start the development server
npm start

# Run on web
npm run web

# Run on iOS (requires macOS)
npm run ios

# Run on Android
npm run android
```

## Usage

The demo component accepts a completion list in the following format:

```
prefix|completion #frequency
```

Example:
```
approp|riate #46774
bost|on #46774
hopi|ng #46774
musl|im #46774
mista|ke #46774
```

The pipe character (`|`) indicates where the completion starts, and the frequency (after `#`) is optional.

## API

### CoreTrie

Core trie data structure for autocomplete functionality.

```typescript
import { CoreTrie } from './src/engine';

// Create from completion list
const trie = CoreTrie.fromWords(
  'approp|riate #46774',
  'bost|on #46774'
);

// Navigate through the trie
const node = trie.walk_to('approp');
console.log(node.completion); // 'riate'
```

### Trie

Extended trie with formatting capabilities.

```typescript
import { Trie } from './src/engine';

// Create from completion list
const trie = Trie.fromWords(
  'approp|riate #46774',
  'bost|on #46774'
);

// Get formatted string representation
const formatted = trie.as_string();
```

## Development

This project was created using Expo with TypeScript template. The trie implementation is a direct translation of the Python `CoreTrie` and `Trie` classes from the main `automobile-complete` project.

## License

Same as the parent project.

