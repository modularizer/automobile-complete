#!/usr/bin/env node

/**
 * Build script to bundle the autocomplete engine for browser use
 */

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

const outDir = path.join(__dirname, 'dist');
// Use browser.ts entry point to avoid React Native dependencies
const entryPoint = path.join(__dirname, 'src', 'engine', 'browser.ts');

/**
 * Zip a directory to a zip file
 */
function zipDirectory(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level
    });

    output.on('close', () => {
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    
    // Add all files in the directory to the zip
    archive.directory(sourceDir, false);
    
    archive.finalize();
  });
}

// Ensure dist directory exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Build configuration
const buildOptions = {
  entryPoints: [entryPoint],
  bundle: true,
  outfile: path.join(outDir, 'automobile-complete.js'),
  format: 'iife',
  globalName: 'AutomobileComplete',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  minify: false, // Set to true for production
  // External dependencies - don't bundle these
  external: ['react', 'react-dom'],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
};

// Build
console.log('🔨 Building automobile-complete for browser...');
console.log(`   Entry: ${entryPoint}`);
console.log(`   Output: ${buildOptions.outfile}`);

esbuild
  .build(buildOptions)
  .then(async () => {
    console.log('✅ Build successful!');
    console.log(`   Output: ${buildOptions.outfile}`);
    
    // Automatically copy to chrome-extension folder
    const extensionDir = path.join(__dirname, '..', 'chrome-extension');
    const extensionDest = path.join(extensionDir, 'automobile-complete.js');
    
    if (fs.existsSync(extensionDir)) {
      try {
        fs.copyFileSync(buildOptions.outfile, extensionDest);
        console.log(`   📦 Copied to: ${extensionDest}`);
        
        // Create zip file of the chrome extension
        const zipPath = path.join(__dirname, '..', 'chrome-extension.zip');
        await zipDirectory(extensionDir, zipPath);
        console.log(`   📦 Zipped extension to: ${zipPath}`);
      } catch (error) {
        console.warn(`   ⚠️  Failed to copy/zip extension: ${error.message}`);
      }
    } else {
      console.log(`   ℹ️  Extension folder not found at ${extensionDir}, skipping copy`);
    }
  })
  .catch((error) => {
    console.error('❌ Build failed:', error);
    process.exit(1);
  });

