# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for automobile-complete run/cli.py
"""

import sys
import os
from pathlib import Path

# Get the project root directory (where this spec file is located)
# In PyInstaller, we can use os.getcwd() or calculate from the spec file location
try:
    # Try to get spec file location (available when running pyinstaller)
    spec_dir = os.path.dirname(os.path.abspath(SPEC))
except NameError:
    # Fallback to current working directory
    spec_dir = os.getcwd()

project_root = Path(spec_dir)

# Collect all data files that might be needed
datas = []

# Add any asset files if needed
assets_dir = project_root / 'assets'
if assets_dir.exists():
    datas.append((str(assets_dir), 'assets'))

# Block cipher for bytecode encryption (set to None to disable)
block_cipher = None

# Hidden imports - modules that PyInstaller might not detect automatically
hiddenimports = [
    'automobile_complete',
    'automobile_complete.engine',
    'automobile_complete.engine.trie',
    'automobile_complete.engine.core_trie',
    'automobile_complete.utils',
    'automobile_complete.utils.env',
    'automobile_complete.utils.terminal',
    'automobile_complete.utils.terminal.chars',
    'automobile_complete.utils.terminal.terminal',
    'automobile_complete.run',
    'automobile_complete.run.cli',
    'wordfreq',
    'wordfreq.data',
    'wordfreq.cache',
]

# Analysis - analyze the script and dependencies
# Use cli.py directly instead of __main__.py to avoid relative import issues
a = Analysis(
    [str(project_root / 'src' / 'automobile_complete' / 'run' / 'cli.py')],
    pathex=[str(project_root / 'src')],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# Remove duplicate entries
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# Create the executable
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='amc',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # Keep console for interactive terminal app
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # You can add an icon file here if you have one
)

