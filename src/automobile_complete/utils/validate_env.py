"""
Validator for .env.sample and .env files.

Validates that all environment variables are of the correct type and prints
the final parsed results.
"""

import sys
from pathlib import Path
from typing import Any

from automobile_complete.utils.env import env


# Define expected types and validation rules for each environment variable
# Note: Users can define additional helper variables (like ASSETS) for use in $refs,
# but only variables actually used by the application are validated here.
ENV_VAR_SPECS = {
    # File paths (strings, should be valid paths after expansion)
    "AMC_WORDLIST_DST": {"type": "path", "required": True},
    "AMC_WORDLIST_MERGE_SRC": {"type": "path", "required": True},
    "AMC_WORDLIST_MERGE_DST": {"type": "path", "required": True},
    "AMC_COMPLETIONLIST_SRC": {"type": "path", "required": True},
    "AMC_COMPLETIONLIST_DST": {"type": "path", "required": True},
    "AMC_COMPLETIONLIST_MERGE_SRC": {"type": "path", "required": True},
    "AMC_COMPLETIONLIST_MERGE_DST": {"type": "path", "required": True},
    "AMC_SRC": {"type": "path", "required": True},
    
    # Strings
    "AMC_WORDLIST_LANG": {"type": "string", "required": True},
    "AMC_WORDLIST_PATTERN": {"type": "string", "required": True},
    "AMC_WORDLIST_MERGE_GLOB": {"type": "string", "required": True},
    "AMC_COMPLETIONLIST_MERGE_GLOB": {"type": "string", "required": True},
    
    # Optional integers (empty allowed)
    "AMC_WORDLIST_MAX_WORDS": {"type": "int_optional", "required": False},
    "AMC_WORDLIST_MIN_LENGTH": {"type": "int", "required": True},
    "AMC_COMPLETIONLIST_MIN_PREFIX_LEN": {"type": "int", "required": True},
    "AMC_COMPLETIONLIST_MIN_SUFFIX_LEN": {"type": "int", "required": True},
    
    # Optional floats (empty allowed)
    "AMC_COMPLETIONLIST_WORD_THRESHOLD": {"type": "float_optional", "required": False},
    "AMC_COMPLETIONLIST_SUBTREE_THRESHOLD": {"type": "float", "required": True},
    "AMC_COMPLETIONLIST_WORD_RATIO_THRESHOLD": {"type": "float", "required": True},
    "AMC_COMPLETIONLIST_SUBTREE_RATIO_THRESHOLD": {"type": "float", "required": True},
    
    # Booleans
    "AMC_WORDLIST_NO_FREQS": {"type": "bool", "required": True},
    "AMC_WORDLIST_MERGE_NO_FREQS": {"type": "bool", "required": True},
    "AMC_COMPLETIONLIST_NO_PRESERVE_FREQS": {"type": "bool", "required": True},
    "AMC_COMPLETIONLIST_MERGE_NO_FREQS": {"type": "bool", "required": True},
    "AMC_RUN_NOISY": {"type": "bool", "required": True},
    
    # Strings (optional)
    "AMC_RUN_PLACEHOLDER": {"type": "string", "required": False},
}


def validate_env_var(key: str, spec: dict[str, Any]) -> tuple[bool, str, Any]:
    """
    Validate a single environment variable.
    
    Uses env.get_as() to parse the value, then validates the parsed value.
    
    Args:
        key: Environment variable name
        spec: Specification dict with 'type' and 'required' keys
        
    Returns:
        Tuple of (is_valid, error_message, parsed_value)
    """
    var_type = spec["type"]
    required = spec["required"]
    
    try:
        # Map spec types to env.get_as types
        type_map = {
            "path": "path_str",
            "string": str,
            "int": int,
            "int_optional": int,
            "float": float,
            "float_optional": float,
            "bool": bool,
        }
        
        get_as_type = type_map.get(var_type)
        if get_as_type is None:
            return False, f"Unknown type specification: {var_type}", None
        
        # Get raw string first to check if it's empty
        raw_value = env.get(key)
        
        # Check if required
        if required and (raw_value is None or raw_value == ""):
            return False, "Required variable is empty or missing", None
        
        # If not required and empty, that's valid
        if (raw_value is None or raw_value == "") and not required:
            return True, "", None
        
        # Parse using env.get_as()
        if var_type == "int_optional" or var_type == "float_optional":
            # For optional types, use None as default
            value = env.get_as(key, get_as_type, None)
        else:
            # For required types, get_as will use its default (which may be None)
            value = env.get_as(key, get_as_type)
        
        # Validate the parsed value
        if var_type == "path":
            # path_str already handles resolution, just check it's not empty
            if not value or value == "":
                return False, "Path cannot be empty", None
            # Check for unresolved variable references (shouldn't happen after resolution)
            if "$" in value and not value.startswith("$"):
                unresolved = [v for v in value.split() if v.startswith("$") and len(v) > 1]
                if unresolved:
                    return False, f"Unresolved variable references: {unresolved}", None
            return True, "", value
            
        elif var_type == "string":
            if not value or value == "":
                return False, "String cannot be empty", None
            return True, "", value
            
        elif var_type == "int":
            if value is None:
                return False, f"Could not parse as integer: {raw_value}", None
            if value < 0:
                return False, f"Integer must be non-negative, got {value}", None
            return True, "", value
            
        elif var_type == "int_optional":
            if value is None and raw_value and raw_value != "":
                return False, f"Could not parse as integer: {raw_value}", None
            if value is not None and value < 0:
                return False, f"Integer must be non-negative, got {value}", None
            return True, "", value
            
        elif var_type == "float":
            if value is None:
                return False, f"Could not parse as float: {raw_value}", None
            # Check range for thresholds (0.0-1.0)
            if "THRESHOLD" in key and "RATIO" not in key:
                if value < 0.0 or value > 1.0:
                    return False, f"Threshold must be between 0.0 and 1.0, got {value}", None
            # Check that ratio thresholds are positive
            if "RATIO_THRESHOLD" in key:
                if value < 0.0:
                    return False, f"Ratio threshold must be non-negative, got {value}", None
            return True, "", value
            
        elif var_type == "float_optional":
            if value is None and raw_value and raw_value != "":
                return False, f"Could not parse as float: {raw_value}", None
            if value is not None:
                # Check range for thresholds (0.0-1.0)
                if "THRESHOLD" in key and "RATIO" not in key:
                    if value < 0.0 or value > 1.0:
                        return False, f"Threshold must be between 0.0 and 1.0, got {value}", None
            return True, "", value
            
        elif var_type == "bool":
            # env.get_as with bool always returns a bool (defaults to False)
            return True, "", value
            
        else:
            return False, f"Unknown type specification: {var_type}", None
            
    except Exception as e:
        return False, f"Error validating: {e}", None


def validate_all(env_file: Path | None = None) -> tuple[bool, dict[str, Any]]:
    """
    Validate all environment variables.
    
    Args:
        env_file: Optional path to .env file to validate (ignored - env loads automatically)
        
    Returns:
        Tuple of (all_valid, results_dict)
    """
    # Environment is automatically loaded by env object
    
    results = {}
    all_valid = True
    
    for key, spec in ENV_VAR_SPECS.items():
        is_valid, error_msg, parsed_value = validate_env_var(key, spec)
        results[key] = {
            "valid": is_valid,
            "error": error_msg,
            "value": parsed_value,
            "raw": env.get(key),  # Get raw string value
        }
        if not is_valid:
            all_valid = False
    
    return all_valid, results


def print_validation_results(all_valid: bool, results: dict[str, Any]) -> None:
    """Print validation results in a readable format."""
    print("=" * 80)
    print("Environment Variable Validation Results")
    print("=" * 80)
    print()
    
    # Group by status
    valid_vars = {k: v for k, v in results.items() if v["valid"]}
    invalid_vars = {k: v for k, v in results.items() if not v["valid"]}
    
    if invalid_vars:
        print("❌ INVALID VARIABLES:")
        print("-" * 80)
        for key, result in sorted(invalid_vars.items()):
            print(f"  {key}")
            print(f"    Error: {result['error']}")
            print(f"    Raw value: {result['raw']}")
            print()
    
    if valid_vars:
        print("✅ VALID VARIABLES:")
        print("-" * 80)
        for key, result in sorted(valid_vars.items()):
            value = result["value"]
            raw = result["raw"]
            
            # Format value for display
            if value is None:
                value_str = "(empty/optional)"
            elif isinstance(value, bool):
                value_str = str(value)
            elif isinstance(value, (int, float)):
                value_str = str(value)
            else:
                value_str = value
            
            print(f"  {key} = {value_str}")
            if raw != value_str:
                print(f"    (raw: {raw})")
        print()
    
    print("=" * 80)
    if all_valid:
        print("✅ All environment variables are valid!")
    else:
        print(f"❌ Found {len(invalid_vars)} invalid variable(s)")
    print("=" * 80)


def main():
    """Main entry point for the validator."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Validate .env.sample and .env files"
    )
    parser.add_argument(
        "--env-file",
        type=Path,
        help="Path to .env file to validate (default: .env in project root)",
    )
    
    args = parser.parse_args()
    
    try:
        all_valid, results = validate_all(args.env_file)
        print_validation_results(all_valid, results)
        sys.exit(0 if all_valid else 1)
    except Exception as e:
        print(f"Error during validation: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

