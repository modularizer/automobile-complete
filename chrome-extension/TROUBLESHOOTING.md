# Troubleshooting Chrome Extension

## Console Logs Not Appearing

### Where to Look
1. **Open the webpage** where the extension should work (e.g., google.com)
2. **Press F12** to open DevTools
3. **Go to the Console tab**
4. **Reload the page** (F5)

The logs should appear in the **page's console**, NOT:
- ❌ Extension popup console (right-click extension icon → Inspect popup)
- ❌ chrome://extensions console
- ❌ Background page console

### Check Console Filters
Make sure these are enabled in the console:
- ✅ Info
- ✅ Logs
- ✅ Errors
- ✅ Warnings

Click the filter icon (funnel) in the console to check.

### Logs Disappearing After Page Load

If you see logs briefly then they disappear:

1. **Check "Preserve log" checkbox:**
   - In DevTools Console, look for "Preserve log" checkbox (top of console)
   - ✅ **Enable it** - this prevents logs from being cleared on page navigation/reload

2. **Filter by extension name:**
   - In the console filter box, type: `Automobile Complete`
   - This will show only extension logs

3. **Check if page clears console:**
   - Some pages clear the console on load
   - Enable "Preserve log" to prevent this

4. **Verify extension loaded:**
   - In console, type: `window.__AUTOMOBILE_COMPLETE_LOADED`
   - Should return `true` if extension loaded
   - Type: `window.__AUTOMOBILE_COMPLETE_INITIALIZED`
   - Should return `true` if initialization succeeded

## Extension Works on Some Pages But Not Others

### Common Causes

1. **Content Security Policy (CSP)**
   - Some sites (like GitHub, Google) have strict CSP
   - The extension should still work, but check for CSP errors in console

2. **Missing `baked-completions.js`**
   - If manifest references `baked-completions.js` but it doesn't exist, the script fails silently
   - **Fix**: Remove `baked-completions.js` from manifest.json if you didn't use the bake option

3. **Script Loading Order**
   - `automobile-complete.js` must load before `content-script.js`
   - Check the manifest.json order

4. **No Completion List Configured**
   - Extension won't do anything without a completion list
   - Open extension popup → Enter completion list → Save & Apply

### Debugging Steps

1. **Check if content script is running:**
   ```javascript
   // In page console (F12)
   console.log('[Automobile Complete] Content script loaded');
   ```
   If you see this, the script is running.

2. **Check if library is loaded:**
   ```javascript
   // In page console
   console.log(window.AutomobileComplete);
   ```
   Should show an object with `attachAutocomplete` method.

3. **Check for errors:**
   - Look for red error messages in console
   - Check the "Errors" filter in console

4. **Check extension errors:**
   - Go to `chrome://extensions/`
   - Find "Automobile Complete"
   - Click "Errors" or "Inspect views: service worker" if available
   - Look for any error messages

5. **Verify files exist:**
   ```bash
   cd chrome-extension
   ls -la *.js
   ```
   Should show:
   - `automobile-complete.js` (required)
   - `content-script.js` (required)
   - `baked-completions.js` (optional, only if you used bake option)

6. **Check manifest.json:**
   - Make sure `automobile-complete.js` is listed before `content-script.js`
   - If you have `baked-completions.js`, it should be first
   - If you don't have `baked-completions.js`, remove it from manifest

## After Making Changes

**IMPORTANT: After modifying extension files, you MUST reload the extension:**

1. **Reload the extension:**
   - Go to `chrome://extensions/`
   - Find "Automobile Complete"
   - Click the **reload icon** (circular arrow) on the extension card
   - OR toggle the extension off and on

2. **Reload the webpage:**
   - After reloading the extension, reload any webpage where you want to test (F5)
   - The new code will only run on pages loaded AFTER the extension reload

**Note:** You do NOT need to increment the version number for development/testing. Version numbers are only important when publishing to the Chrome Web Store.

## Still Not Working?

1. **Reload the extension:**
   - Go to `chrome://extensions/`
   - Click the reload icon on "Automobile Complete"

2. **Reload the page:**
   - After reloading extension, reload the webpage (F5)

3. **Check browser console for errors:**
   - Open DevTools (F12)
   - Check Console tab for errors
   - Check Network tab to see if scripts are loading

4. **Try a simple test page:**
   - Create a simple HTML file:
   ```html
   <!DOCTYPE html>
   <html>
   <body>
     <input type="text" id="test" />
   </body>
   </html>
   ```
   - Open it in Chrome
   - Check console for logs

5. **Verify completion list format:**
   - Format should be: `prefix|completion` (one per line)
   - Example:
     ```
     test|ing
     hello|world
     ```

## Getting Help

If still not working, check:
1. Browser console errors (F12 → Console)
2. Extension errors (`chrome://extensions/` → Errors)
3. Network tab (F12 → Network) - are scripts loading?
4. Content script is running (should see log: "Content script loaded")

