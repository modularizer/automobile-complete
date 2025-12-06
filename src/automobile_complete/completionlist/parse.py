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
    lines = path.read_text().splitlines()
    
    # Check first line for WEIGHT= directive (skip it if present)
    first_line_processed = False
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Check first non-empty line for WEIGHT= directive
        if not first_line_processed:
            first_line_processed = True
            if line.upper().startswith("WEIGHT="):
                # Skip this line - weight will be extracted by parse_completion_file_with_weight
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
        
        # Check for full replacement separator ||
        if "||" in completion_str:
            # Full replacement: prefix||completion means delete prefix and insert completion
            pre, post = completion_str.split("||", 1)
            # Convert to backspaces + completion
            from automobile_complete.utils.terminal.chars import BACKSPACE
            backspaces = BACKSPACE * len(pre)
            post = backspaces + post
            completions.append((pre, post, freq))
        elif "|" in completion_str:
            # Normal completion: prefix|completion
            pre, post = completion_str.split("|", 1)
            completions.append((pre, post, freq))
    
    return completions


def parse_completion_file_with_weight(path: Path) -> tuple[list[tuple[str, str, float]], str | None]:
    """
    Parse a completion file in pre|post #freq or pre|post format and extract WEIGHT= from first line.
    
    Args:
        path: Path to completion file (supports ~ for home directory)
        
    Returns:
        Tuple of (list of (prefix, completion, frequency) tuples, weight string or None)
        Weight string can be absolute (e.g., "1.5"), percentile (e.g., "50%"), or rank (e.g., "#5")
    """
    # Expand ~ in path
    path = Path(path).expanduser()
    completions = []
    weight = None
    lines = path.read_text().splitlines()
    
    # Check first line for WEIGHT= directive
    first_line_processed = False
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Check first non-empty line for WEIGHT= directive
        if not first_line_processed:
            first_line_processed = True
            if line.upper().startswith("WEIGHT="):
                # Extract weight value
                weight_str = line[7:].strip()  # Remove "WEIGHT=" prefix
                if weight_str:
                    weight = weight_str
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
        
        # Check for full replacement separator ||
        if "||" in completion_str:
            # Full replacement: prefix||completion means delete prefix and insert completion
            pre, post = completion_str.split("||", 1)
            # Convert to backspaces + completion
            from automobile_complete.utils.terminal.chars import BACKSPACE
            backspaces = BACKSPACE * len(pre)
            post = backspaces + post
            completions.append((pre, post, freq))
        elif "|" in completion_str:
            # Normal completion: prefix|completion
            pre, post = completion_str.split("|", 1)
            completions.append((pre, post, freq))
    
    return completions, weight

