# Chrome Extension Setup, Testing, and Publishing Guide

## Prerequisites

- Node.js and npm installed
- Chrome browser
- Git (for version control)

## Initial Setup

### 1. Build the Extension

**Recommended: Use the npm script (from react-native-engine directory):**

```bash
cd react-native-engine
npm run build:extension
```

This will:
- Build the library
- Copy it to the extension
- Set up everything ready to load

**With baked-in completion list:**

```bash
npm run build:extension:bake ../assets/completionlist.txt
```

This bakes the completion list directly into the extension, so it works immediately without needing to configure it in the popup.

**Alternative: Manual setup**

```bash
# Build the library
cd ../react-native-engine
npm run build

# Copy library
cp dist/automobile-complete.js ../chrome-extension/
```

Or use the provided setup script:

```bash
cd chrome-extension
./setup.sh
```

### 3. Extension Icons

The extension icons (`icon16.png`, `icon48.png`, `icon128.png`) should already be present in the `chrome-extension` directory.

If you need to regenerate them, you can use:
```bash
python3 create_icons.py
```
(Requires Pillow: `pip install Pillow`)

## Local Testing

### 1. Load Unpacked Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right corner)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. The extension should appear in your extensions list

### 2. Test Basic Functionality

1. Click the extension icon in the toolbar
2. Enter a completion list in the popup:
   ```
   test|ing
   hello|world
   app|le
   ```
3. Click "Save & Apply"
4. Open any website (e.g., Google search, GitHub, etc.)
5. Start typing in an input field - you should see autocomplete suggestions

### 3. Test Personal Dictionary

1. Open any website with an input field
2. Open the browser console (F12)
3. Test saving words:
   ```javascript
   amc.saveWord("demo|word");
   ```
4. Type "demo" in an input - you should see "word" as a suggestion
5. Test removing words:
   ```javascript
   amc.removeWord("demo");
   ```

### 4. Test Storage Types

1. **Test local storage** (per-domain):
   ```javascript
   amc.saveWord("local|test", "local");
   ```
   - This word should only appear on the current domain

2. **Test shared storage** (cross-domain):
   ```javascript
   amc.saveWord("shared|test", "shared");
   ```
   - Navigate to a different website
   - Type "shared" - the suggestion should appear

3. **Test both storages**:
   ```javascript
   amc.saveWord("both|test", "both");
   ```
   - Word should be saved to both storages

### 5. Test CSS Selector

1. Open the extension popup
2. Change the selector to something specific, e.g., `input.my-custom-input`
3. Save and reload a page
4. Only inputs matching that selector should get autocomplete

### 6. Debugging

- Check the browser console for errors
- Use `amc.help()` to see available methods
- Inspect `window.amc` to access the controller
- Check `localStorage.getItem('personalDictionary')` for local storage
- Use Chrome DevTools → Application → Storage → Extension Storage for shared storage

## Publishing to Chrome Web Store

### 1. Prepare for Publishing

#### Create a ZIP file

```bash
# From the chrome-extension directory
zip -r automobile-complete-extension.zip . \
  -x "*.git*" \
  -x "*.md" \
  -x "setup.sh" \
  -x ".gitignore"
```

Or manually create a ZIP containing:
- `manifest.json`
- `automobile-complete.js`
- `content-script.js`
- `popup.html`
- `popup.js`
- `icon16.png`
- `icon48.png`
- `icon128.png`

**Do NOT include:**
- `README.md` or `SETUP.md` (these are for development)
- `.git` folder
- Source files from `react-native-engine`

#### Verify Manifest

Ensure `manifest.json` is correct:
- Version number is updated
- Description is clear
- Icons are present
- Permissions are minimal and justified

### 2. Create Chrome Web Store Developer Account

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Sign in with your Google account
3. Pay the one-time $5 registration fee (if not already done)
4. Accept the Developer Agreement

### 3. Upload Extension

1. In the Developer Dashboard, click "New Item"
2. Upload your ZIP file
3. Fill out the store listing:

   **Required Information:**
   - **Name**: Automobile Complete (or your preferred name)
   - **Summary**: Brief description (132 characters max)
   - **Description**: Full description of features and usage
   - **Category**: Productivity or Developer Tools
   - **Language**: English (and others if you have translations)
   - **Icon**: 128x128 PNG (use your icon128.png)
   - **Screenshots**: At least 1, up to 5 (1280x800 or 640x400 recommended)
   - **Small tile**: 440x280 PNG
   - **Promotional images**: Optional but recommended

   **Privacy:**
   - **Single purpose**: Yes (adds autocomplete to inputs)
   - **Permission justification**: Explain why you need `storage` and `<all_urls>`
   - **Data handling**: Describe how personal dictionary data is stored locally

### 4. Privacy Policy

If your extension collects any data, you need a privacy policy URL. For this extension:
- Data is stored locally (localStorage and chrome.storage)
- No data is sent to external servers
- You can host a simple privacy policy page or use a service

Example privacy policy points:
- Extension stores completion lists and personal dictionary locally
- No data is transmitted to external servers
- Users can clear data at any time via `amc.resetCompletions()`

### 5. Submit for Review

1. Review all information carefully
2. Click "Submit for Review"
3. Wait for review (typically 1-3 business days)
4. Google will email you with the result

### 6. After Approval

- Your extension will be live on the Chrome Web Store
- Users can install it directly
- You can update it by uploading a new ZIP with a higher version number

## Updating the Extension

### 1. Update Version Number (Only for Publishing)

**For local development/testing:** You do NOT need to increment the version. Just reload the extension in `chrome://extensions/`.

**For publishing to Chrome Web Store:** Increment the version in `manifest.json`:
```json
{
  "version": "1.0.1"  // Increment this
}
```

### 2. Rebuild Library

If you made changes to the library:
```bash
cd ../react-native-engine
npm run build
cp dist/automobile-complete.js ../chrome-extension/
```

### 3. Test Changes

Follow the local testing steps above to verify everything works.

### 4. Create New ZIP

Create a new ZIP file with the updated version.

### 5. Upload Update

1. Go to Chrome Web Store Developer Dashboard
2. Find your extension
3. Click "Package" → "Upload new package"
4. Upload the new ZIP
5. Submit for review (updates are usually faster)

## Version Management

Follow semantic versioning:
- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features, backward compatible
- **Patch** (1.0.0 → 1.0.1): Bug fixes

## Common Issues

### Extension won't load

- Check `manifest.json` for syntax errors
- Verify all required files are present
- Check browser console for errors

### Autocomplete not working

- Ensure `automobile-complete.js` is copied correctly
- Check that content script is running (Chrome DevTools → Sources → Content scripts)
- Verify completion list is not empty

### Storage not working

- Check that "storage" permission is in manifest.json
- Verify chrome.storage API is available (extension context only)
- Check browser console for storage errors

## Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Chrome Web Store Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)

