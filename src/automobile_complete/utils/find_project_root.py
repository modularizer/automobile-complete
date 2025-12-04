"""
Common utilities for environment variable handling.
"""
from pathlib import Path


def find_project_root() -> Path:
    """
    Find the project root directory (containing pyproject.toml).
    
    Returns:
        Path to project root, or current directory if not found
    """
    current = Path.cwd()
    project_root = None
    
    # Walk up the directory tree to find pyproject.toml
    for path in [current] + list(current.parents):
        if (path / "pyproject.toml").exists():
            project_root = path
            break
    
    if project_root is None:
        # If no project root found, use current directory
        project_root = current
    
    return project_root

