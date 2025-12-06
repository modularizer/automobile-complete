#!/usr/bin/env python3
"""
Create Chrome extension icons from logo.png
Generates icon16.png, icon48.png, and icon128.png
"""

import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Error: PIL (Pillow) is required. Install it with:")
    print("  pip install Pillow")
    sys.exit(1)

# Get the script directory and project root
script_dir = Path(__file__).parent
project_root = script_dir.parent
logo_path = project_root / "logo.png"
extension_dir = script_dir

# Check if logo exists
if not logo_path.exists():
    print(f"Error: logo.png not found at {logo_path}")
    print("Please ensure logo.png exists in the project root.")
    sys.exit(1)

# Icon sizes needed
icon_sizes = [
    (16, "icon16.png"),
    (48, "icon48.png"),
    (128, "icon128.png"),
]

def create_icons():
    """Create resized icons from logo.png"""
    try:
        # Open the logo
        print(f"Opening logo: {logo_path}")
        logo = Image.open(logo_path)
        
        # Convert to RGBA if needed (for transparency support)
        if logo.mode != 'RGBA':
            logo = logo.convert('RGBA')
        
        print(f"Original logo size: {logo.size}")
        
        # Create each icon size
        for size, filename in icon_sizes:
            output_path = extension_dir / filename
            
            # Resize with high-quality resampling
            icon = logo.resize((size, size), Image.Resampling.LANCZOS)
            
            # Save the icon
            icon.save(output_path, 'PNG', optimize=True)
            print(f"✓ Created {filename} ({size}x{size})")
        
        print("\n✅ All icons created successfully!")
        print(f"   Location: {extension_dir}")
        
    except Exception as e:
        print(f"Error creating icons: {e}")
        sys.exit(1)

if __name__ == "__main__":
    create_icons()

