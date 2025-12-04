from pathlib import Path


from automobile_complete.utils.env.coerce import coerce
from automobile_complete.utils.env.load import load_env_raw
from automobile_complete.utils.find_project_root import find_project_root






def apply_all_substitutions(env_dict: dict[str, str]) -> dict[str, str]:
    """
    Apply all substitutions to a dictionary of environment variables.

    This function applies substitutions in order:
    1. % -> project root path
    2. $VAR_NAME -> environment variable references

    This is called AFTER all files are loaded and merged, so all values are available.

    Args:
        env_dict: Dictionary of environment variables (raw strings)

    Returns:
        Dictionary with all substitutions applied
    """
    project_root = find_project_root()
    result = env_dict.copy()

    # Step 1: Substitute % with project root
    for key, value in result.items():
        if '%' in value:
            result[key] = value.replace("%", str(Path(project_root or Path.cwd()).expanduser().resolve()))
    return result




class Env:
    def __init__(self):
        project_root = find_project_root()
        # Load and merge all env files, then apply substitutions
        raw_dict = load_env_raw(".env.sample", ".env", "os.environ", cwd=project_root)
        self.raw = apply_all_substitutions(raw_dict)

    def __iter__(self):
        return iter(self.raw)

    def get(self, key, default=None):
        return self.raw.get(key, default)

    def get_as(self, key: str, type, default=None):
        s = self.raw.get(key, default)
        return coerce(s, type)



env = Env()
