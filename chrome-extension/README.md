# Automobile Complete Chrome Extension

A Chrome extension that adds universal autocomplete to any input field on any website.

## Features

- ✨ **Works on any website** - Automatically adds autocomplete to input fields
- 🎯 **Configurable targeting** - Use CSS selectors to target specific inputs
- 💾 **Dual storage support** - Personal dictionary can be per-domain or shared across all sites
- ⚡ **Instant updates** - Changes apply immediately without page reload
- 🔧 **Multiple modes** - Support for paste events and typing simulation

## Installation

### Quick Setup (Recommended)

From the project root, run:
```bash
cd react-native-engine
npm run build:extension
```

Or with a baked-in completion list:
```bash
npm run build:extension:bake ../assets/completionlist.txt
```

This bakes the completion list directly into the extension, so it works immediately without needing to configure it in the popup. The baked-in list will be used as a fallback if no completion list is set in storage.

Then load the extension in Chrome:
- Open Chrome and navigate to `chrome://extensions/`
- Enable "Developer mode" (toggle in top right)
- Click "Load unpacked"
- Select the `chrome-extension` folder

### Manual Setup

1. Build the library:
   ```bash
   cd ../react-native-engine
   npm run build
   ```

2. Copy the built library:
   ```bash
   cp dist/automobile-complete.js ../chrome-extension/
   ```

3. Create icons (optional):
   ```bash
   cd ../chrome-extension
   python3 create_icons.py
   ```

4. Load the extension in Chrome (same as above)

## Usage

### Basic Setup

1. Click the extension icon in the Chrome toolbar
2. Enter your completion list in the popup (format: `prefix|completion`, one per line)
3. Optionally customize the CSS selector (default: `input[type="text"], input[type="search"], textarea`)
4. Click "Save & Apply"
5. Reload any page you want to use autocomplete on

### Completion List Format

```
prefix|completion
hello|world
test|ing
app|le
```

Each line should be in the format `prefix|completion` where:
- `prefix` is what the user types
- `completion` is the suggested text that appears

### Personal Dictionary

The extension supports a personal dictionary that persists across sessions. You can manage it using the browser console:

#### Save Words

```javascript
// Save to both local (per-domain) and shared (all pages) storage (default)
amc.saveWord("test|ing");

// Save only to this domain's localStorage
amc.saveWord("local|word", "local");

// Save only to shared storage (available on all pages)
amc.saveWord("shared|word", "shared");

// Save multiple words at once
amc.saveWord(["word1|completion1", "word2|completion2"]);
```

#### Remove Words

```javascript
// Remove from both storages (default)
amc.removeWord("test");

// Remove only from local storage
amc.removeWord("test", "local");

// Remove only from shared storage
amc.removeWord("test", "shared");
```

#### Clear Dictionary

```javascript
// Clear both storages (default)
amc.resetCompletions();

// Clear only local storage
amc.resetCompletions("local");

// Clear only shared storage
amc.resetCompletions("shared");
```

#### View Dictionary

```javascript
// View local dictionary (per-domain)
localStorage.getItem('personalDictionary');

// View shared dictionary (requires Chrome extension API)
// Use the extension's storage viewer or check chrome.storage.local
```

### Storage Types

- **`local`** - Per-domain localStorage. Each website has its own personal dictionary.
- **`shared`** - chrome.storage. Shared across all pages when using the Chrome extension.
- **`both`** - Both storages (default). Saves to both, loads and merges on page load.

### Advanced Options

#### CSS Selector

Customize which inputs get autocomplete:

- Default: `input[type="text"], input[type="search"], textarea`
- Example: `input.autocomplete-enabled` (only inputs with this class)
- Example: `#myInput` (specific input by ID)

#### Modes

- **Paste Events Mode**: Simulates a paste event when accepting suggestions
- **Typing Simulation Mode**: Simulates typing character-by-character

Enable these in the extension popup by checking the respective checkboxes.

## Console API

Once the extension is loaded, you can access the controller via `window.amc`:

```javascript
// Get help
amc.help();

// View current suggestion
amc.suggestion;

// View available completions
amc.availableCompletions;

// Save a word
amc.saveWord("hello|world");

// Remove a word
amc.removeWord("hello");

// Clear dictionary
amc.resetCompletions();
```

## Limitations

### Chrome Internal Pages

**The extension cannot run on Chrome internal pages** such as:
- `chrome://newtab` (Chrome's new tab page)
- `chrome://settings`
- `chrome://extensions`
- Any other `chrome://` pages

This is a **Chrome security restriction** that applies to all extensions. Chrome prevents content scripts from running on internal pages for security reasons.

**Workaround**: If you want autocomplete on your new tab page, you can:
1. Use a custom new tab page (a website) instead of Chrome's default
2. Set a website as your homepage/new tab page in Chrome settings

The extension works on all regular websites (http:// and https://).

## Troubleshooting

### Autocomplete not appearing

1. Check that the completion list is not empty in the extension popup
2. Verify the CSS selector matches your input elements
3. Reload the page after saving settings
4. Check the browser console for errors
5. **If on a chrome:// page**: This is expected - extensions cannot run on Chrome internal pages (see Limitations above)

### Personal dictionary not saving

1. Ensure you're using the correct storage type for your use case
2. Check browser console for storage errors
3. Verify Chrome extension permissions include "storage"

### Words not appearing across pages

- If using `local` storage, each domain has its own dictionary
- Use `shared` storage (Chrome extension only) for cross-domain words
- Use `both` to save to both storages

## Development

See [SETUP.md](./SETUP.md) for development setup, local testing, and publishing instructions.
