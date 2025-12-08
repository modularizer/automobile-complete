#!/bin/bash
# Build script for Ubuntu/Linux

set -e

echo "Building automobile-complete for Ubuntu/Linux..."

# Check if PyInstaller is installed
if ! command -v pyinstaller &> /dev/null; then
    echo "PyInstaller is not installed. Installing..."
    pip install pyinstaller
fi

# Ensure we're in the project root
cd "$(dirname "$0")"

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf build/ dist/ *.spec.bak

# Build the executable
echo "Building executable..."
pyinstaller automobile-complete.spec --clean

# Check if build was successful
if [ -f "dist/amc" ]; then
    echo "✓ Build successful!"
    echo "Executable location: $(pwd)/dist/amc"
    # Use ls -lh for accurate file size display
    echo "File size: $(ls -lh dist/amc | awk '{print $5}')"
else
    echo "✗ Build failed - executable not found"
    exit 1
fi

