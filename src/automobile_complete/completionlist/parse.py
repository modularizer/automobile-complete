"""
Parse completion files.

This module provides utilities for parsing completion files in the format:
- pre|post #frequency
- pre|post
"""
from pathlib import Path


def parse_completion_file(path: Path) -> list[tuple[str, str, float]]:
    """
    Parse a completion file in pre|post #freq or pre|post format.
    
    Args:
        path: Path to completion file (supports ~ for home directory)
        
    Returns:
        List of (prefix, completion, frequency) tuples. Completions without frequency default to 1.0
    """
    # Expand ~ in path
    path = Path(path).expanduser()
    completions = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        
        # Parse "pre|post #frequency" or just "pre|post"
        if " #" in line:
            completion_str, freq_str = line.rsplit(" #", 1)
            try:
                freq = float(freq_str)
            except ValueError:
                continue
        else:
            completion_str = line
            freq = 1.0
        
        # Split prefix|completion
        if "|" not in completion_str:
            continue
        
        pre, post = completion_str.split("|", 1)
        completions.append((pre, post, freq))
    
    return completions

