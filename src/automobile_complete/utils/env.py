"""
Environment variable loading utility.

Loads environment variables with priority (lowest to highest):
1. .env.sample (defaults)
2. .env or --env-file (user overrides)
3. System environment variables (already in os.environ)
4. Command-line arguments (highest priority, handled by argparse)

Note: System environment variables are checked first, so they override file-based values.
Command-line arguments are parsed after env loading, so they have highest priority.
"""
import os
from pathlib import Path


def load_env_sample():
    """
    Load .env.sample file (LOWEST priority - defaults only).
    
    This should be called first, before any argument parsing, to establish defaults.
    """
    project_root = _find_project_root()
    
    # Load .env.sample (LOWEST priority - defaults)
    env_sample = project_root / ".env.sample"
    if env_sample.exists():
        _load_env_file(env_sample, override_existing=False)


def load_env(env_file: Path | None = None):
    """
    Load environment variables from .env or --env-file.
    
    Priority order (lowest to highest):
    1. .env.sample (defaults) - loaded by load_env_sample()
    2. .env or env_file (user overrides) - loaded by this function
    3. System environment variables (already set, not overridden)
    4. Command-line arguments (highest, handled separately)
    
    Args:
        env_file: Optional path to .env file. If None, uses .env in project root.
    """
    project_root = _find_project_root()
    
    # Load .env or env_file (NEXT priority - user overrides)
    if env_file:
        env_file = Path(str(env_file)).expanduser()
        if env_file.exists():
            _load_env_file(env_file, override_existing=True)
    else:
        env_file_path = project_root / ".env"
        if env_file_path.exists():
            _load_env_file(env_file_path, override_existing=True)
    
    # System environment variables are already in os.environ
    # They have HIGHER priority and won't be overridden by files
    
    # Command-line arguments have HIGHEST priority
    # They are handled by argparse after env loading


# Track which keys were set by .env.sample (so .env can override them)
_env_sample_keys = set()


def _find_project_root() -> Path:
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


def _normalize_none_value(value: str) -> str:
    """
    Normalize various representations of None/null to empty string.
    
    Args:
        value: String value to normalize
        
    Returns:
        Empty string if value represents None/null, otherwise original value
    """
    normalized = value.strip().lower()
    if normalized in ("none", "null", "none", ""):
        return ""
    return value


def _substitute_variables(value: str, project_root: Path) -> str:
    """
    Substitute variables in environment variable values.
    
    Currently supports:
    - %AMC% -> project root path
    
    Args:
        value: String value that may contain variables
        project_root: Path to project root
        
    Returns:
        String with variables substituted
    """
    # Replace %AMC% with project root path
    value = value.replace("%AMC%", str(project_root))
    return value


def _load_env_file(env_path: Path, override_existing: bool = False):
    """
    Load environment variables from a .env file.
    
    Args:
        env_path: Path to the .env file
        override_existing: If True, override existing env vars that came from .env.sample.
                          If False, only set if not already in environment (for .env.sample).
    """
    project_root = _find_project_root()
    
    for line in env_path.read_text().splitlines():
        line = line.strip()
        # Skip empty lines and comments
        if not line or line.startswith("#"):
            continue
        
        # Parse KEY=VALUE
        if "=" in line:
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()
            
            # Remove quotes if present
            if value.startswith('"') and value.endswith('"'):
                value = value[1:-1]
            elif value.startswith("'") and value.endswith("'"):
                value = value[1:-1]
            
            # Normalize None/null values
            value = _normalize_none_value(value)
            
            # Substitute variables (e.g., %AMC% -> project root)
            value = _substitute_variables(value, project_root)
            
            # Set based on override_existing flag
            if key:
                if override_existing:
                    # .env can override .env.sample, but not system env vars
                    # System env vars are already set and have higher priority
                    # We can only override if the key was set by .env.sample
                    if key in _env_sample_keys:
                        os.environ[key] = value
                    elif key not in os.environ:
                        # Key doesn't exist yet, set it
                        os.environ[key] = value
                else:
                    # .env.sample only sets if not already in environment
                    if key not in os.environ:
                        os.environ[key] = value
                        _env_sample_keys.add(key)


def get_env(key: str) -> str:
    """
    Get an environment variable value.
    
    Defaults come from .env.sample (loaded by load_env_sample()).
    No hardcoded defaults - .env.sample is the single source of truth.
    
    Args:
        key: Environment variable name
        
    Returns:
        Environment variable value or empty string if not found
    """
    return os.environ.get(key, "")


def get_env_bool(key: str, default: bool = False) -> bool:
    """
    Get a boolean environment variable value.
    
    Lenient parsing:
    - True values: "true", "True", "TRUE", "1", "yes", "Yes", "YES", "on", "On", "ON"
    - False values: "false", "False", "FALSE", "0", "no", "No", "NO", "off", "Off", "OFF"
    - Empty/None values: returns default
    
    Args:
        key: Environment variable name
        default: Default value if not found or invalid
        
    Returns:
        Boolean value (True/False based on lenient parsing, or default if empty/invalid)
    """
    value = get_env(key).strip()
    if not value:
        return default
    
    # Case-insensitive comparison
    value_lower = value.lower()
    
    # True values
    if value_lower in ("true", "1", "yes", "on", "y"):
        return True
    
    # False values
    if value_lower in ("false", "0", "no", "off", "n"):
        return False
    
    # If not recognized, return default
    return default


def get_env_int(key: str, default: int | None = None) -> int | None:
    """
    Get an integer environment variable value.
    
    Args:
        key: Environment variable name
        default: Default value if not found or invalid
        
    Returns:
        Integer value or default if not found/invalid
    """
    value = get_env(key).strip()
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def get_env_float(key: str, default: float | None = None) -> float | None:
    """
    Get a float environment variable value.
    
    Args:
        key: Environment variable name
        default: Default value if not found or invalid
        
    Returns:
        Float value or default if not found/invalid
    """
    value = get_env(key).strip()
    if not value:
        return default
    try:
        return float(value)
    except ValueError:
        return default

