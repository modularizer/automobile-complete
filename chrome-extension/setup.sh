#!/bin/bash
# Setup script to copy the built library to the extension and create icons

echo "🔨 Building automobile-complete..."
cd ../react-native-engine
npm run build

echo "📦 Copying to chrome-extension..."
cp dist/automobile-complete.js ../chrome-extension/

echo ""
echo "✅ Setup complete!"
echo "   Now load the chrome-extension folder in Chrome:"
echo "   1. Go to chrome://extensions/"
echo "   2. Enable Developer mode"
echo "   3. Click 'Load unpacked'"
echo "   4. Select the chrome-extension folder"

