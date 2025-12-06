#!/usr/bin/env node
/**
 * Build script for Chrome extension
 * Optionally bakes in a completion list
 * 
 * Usage:
 *   node build-extension.js [completion-list-file]
 * 
 * Examples:
 *   node build-extension.js
 *   node build-extension.js ../assets/completionlist.txt
 *   npm run build:extension:bake ../assets/completionlist.txt
 * 
 * If completion-list-file is provided, it will be baked into the extension.
 * Otherwise, the extension will use storage-based completions (configured via popup).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const extensionDir = __dirname;
const reactNativeEngineDir = path.join(extensionDir, '..', 'react-native-engine');
const distDir = path.join(reactNativeEngineDir, 'dist');
const assetsDir = path.join(extensionDir, '..', 'assets');

// Get completion list file from command line args, or use default merged completion list
// Check for --no-bake flag to skip baking
const args = process.argv.slice(2);
const noBake = args.includes('--no-bake');
const completionListFile = noBake ? null : (args.find(arg => !arg.startsWith('--')) || path.join(assetsDir, 'merged-completionlist.txt'));

console.log('🔨 Building Chrome Extension...\n');

// Step 1: Build the library
console.log('1️⃣  Building automobile-complete library...');
try {
  execSync('npm run build', {
    cwd: reactNativeEngineDir,
    stdio: 'inherit'
  });
  console.log('   ✓ Library built successfully\n');
} catch (error) {
  console.error('   ❌ Failed to build library');
  process.exit(1);
}

// Step 2: Copy library to extension
console.log('2️⃣  Copying library to extension...');
const librarySource = path.join(distDir, 'automobile-complete.js');
const libraryDest = path.join(extensionDir, 'automobile-complete.js');

if (!fs.existsSync(librarySource)) {
  console.error(`   ❌ Library not found at ${librarySource}`);
  process.exit(1);
}

fs.copyFileSync(librarySource, libraryDest);
console.log('   ✓ Library copied\n');

// Step 3: Verify icons exist (optional - icons should already be present)
console.log('3️⃣  Verifying extension icons...');
const iconFiles = ['icon16.png', 'icon48.png', 'icon128.png'];
const missingIcons = iconFiles.filter(icon => !fs.existsSync(path.join(extensionDir, icon)));

if (missingIcons.length === 0) {
  console.log('   ✓ All icons present\n');
} else {
  console.log(`   ⚠️  Missing icons: ${missingIcons.join(', ')}`);
  console.log('   Run: python3 create_icons.py (requires Pillow)\n');
}

// Step 4: Bake in completion list (unless --no-bake flag is used)
if (completionListFile && !noBake) {
  console.log(`4️⃣  Baking in completion list from: ${completionListFile}`);
  
  const completionListPath = path.isAbsolute(completionListFile) 
    ? completionListFile 
    : path.join(extensionDir, completionListFile);
  
  if (!fs.existsSync(completionListPath)) {
    console.error(`   ❌ Completion list file not found: ${completionListPath}`);
    console.error(`   💡 Expected file at: ${completionListPath}`);
    process.exit(1);
  }
  
  try {
    const completionList = fs.readFileSync(completionListPath, 'utf-8');
    
    // Create a baked-in completions file
    const bakedCompletionsFile = path.join(extensionDir, 'baked-completions.js');
    const escapedCompletions = JSON.stringify(completionList);
    
    fs.writeFileSync(bakedCompletionsFile, `
// Baked-in completion list (auto-generated)
// This file is created by build-extension.js
window.__AUTOMOBILE_COMPLETE_BAKED_COMPLETIONS = ${escapedCompletions};
`);
    
    // Check if baked-completions.js is already in manifest
    const manifestPath = path.join(extensionDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    
    // Add baked-completions.js to content scripts if not already there
    // It must be loaded AFTER logging-setup.js but BEFORE automobile-complete.js
    if (!manifest.content_scripts[0].js.includes('baked-completions.js')) {
      // Remove it first if it exists elsewhere
      manifest.content_scripts[0].js = manifest.content_scripts[0].js.filter((f) => f !== 'baked-completions.js');
      
      // Find the index of logging-setup.js (should be first)
      const loggingSetupIndex = manifest.content_scripts[0].js.indexOf('logging-setup.js');
      if (loggingSetupIndex >= 0) {
        // Insert after logging-setup.js
        manifest.content_scripts[0].js.splice(loggingSetupIndex + 1, 0, 'baked-completions.js');
      } else {
        // If logging-setup.js not found, add at beginning
        manifest.content_scripts[0].js.unshift('baked-completions.js');
      }
      
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log('   ✓ Updated manifest.json to include baked-completions.js');
    }
    
    // Content script already supports baked-in completions (checked in storage callback)
    // No need to modify it - it will automatically use baked-in if storage is empty
    
    console.log('   ✓ Completion list baked in\n');
  } catch (error) {
    console.error(`   ❌ Failed to bake in completion list: ${error.message}`);
    process.exit(1);
  }
}

console.log('✅ Extension build complete!');
console.log('\n📦 Next steps:');
console.log('   1. Go to chrome://extensions/');
console.log('   2. Enable Developer mode (if not already enabled)');
console.log('   3. If extension is already loaded: Click the RELOAD icon (🔄) on the extension card');
console.log('   4. If extension is not loaded: Click "Load unpacked" and select the chrome-extension folder');
console.log('   5. Reload any webpage where you want to test (F5)');
console.log('');
console.log('💡 Tip: After making code changes, always reload the extension and then reload the webpage!');
console.log('');

