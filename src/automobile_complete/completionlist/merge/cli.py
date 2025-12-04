"""
Command-line interface for merging preprocessed completions.
"""

import argparse
import glob
from pathlib import Path

from automobile_complete.utils.env import env
from automobile_complete.completionlist.merge.merge import merge_completions


def parse_weight(weight_str: str) -> float | str:
    """
    Parse a weight string into a weight value.
    
    Supports:
    - "1.5" -> absolute weight 1.5 (multiply frequencies by 1.5)
    - "50%" -> percentile-based relative weight (scale so that freq 1 in custom list = 50th percentile freq from first list)
    - "#5" -> rank-based relative weight (scale so that freq 1 in custom list = 5th highest freq from first list)
    - "#-1" -> rank-based relative weight (scale so that freq 1 in custom list = lowest freq from first list)
    
    Args:
        weight_str: String representation of weight
        
    Returns:
        Either a float (absolute weight) or string with "%" or "#" (relative weight)
    """
    weight_str = weight_str.strip()
    
    # Check for rank format (starts with #)
    if weight_str.startswith("#"):
        try:
            rank = int(weight_str[1:])
            if rank == 0:
                raise ValueError("Rank cannot be 0. Use positive (e.g., #1) or negative (e.g., #-1) rank.")
            return weight_str  # Return as-is to indicate rank mode
        except ValueError as e:
            if "Rank" in str(e):
                raise
            raise ValueError(f"Invalid rank format: {weight_str}. Use #N (e.g., #5) or #-N (e.g., #-1)")
    
    # Check for percentile format (ends with %)
    if weight_str.endswith("%"):
        try:
            percentile = float(weight_str[:-1])
            if percentile < 0 or percentile > 100:
                raise ValueError(f"Percentile must be between 0 and 100, got {percentile}")
            return weight_str  # Return as-is to indicate percentile mode
        except ValueError as e:
            if "Percentile" in str(e):
                raise
            raise ValueError(f"Invalid percentile format: {weight_str}. Use a number followed by %, e.g., '50%'")
    
    # Try parsing as float (absolute weight)
    try:
        return float(weight_str)
    except ValueError:
        raise ValueError(
            f"Invalid weight format: {weight_str}. Use a number (e.g., '1.5'), percentile (e.g., '50%'), or rank (e.g., '#5' or '#-1')."
        )


def main():
    """
    Command-line interface for merging preprocessed completions.
    """
    # Environment variables are automatically loaded by env object
    
    parser = argparse.ArgumentParser(
        description="Merge multiple preprocessed completion files with optional weights",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Merge two completion files with equal weights
  automobile-preprocess-merge completions1.txt completions2.txt --output merged.txt

  # Merge with absolute weights
  automobile-preprocess-merge completions1.txt completions2.txt --output merged.txt \\
      --weights 1.0 2.5

  # Merge with relative weight (scale completions2 so its median matches completions1's 90th percentile)
  automobile-preprocess-merge completions1.txt completions2.txt --output merged.txt \\
      --weights 1.0 '{"percentile": 50, "reference_percentile": 90, "reference_index": 0}'

  # Merge without frequencies
  automobile-preprocess-merge completions1.txt completions2.txt --output merged.txt --no-freqs
        """
    )
    
    parser.add_argument(
        "completion_files",
        nargs="*",
        type=str,
        help="Completion files or glob patterns to merge. If not provided, merges default completionlist with files matching default glob pattern. "
             "If one file/glob provided, merges it with default completionlist. "
             "If two or more files/globs provided, merges all specified files. "
             "Glob patterns are expanded (e.g., 'custom-completions*' matches all files starting with 'custom-completions')."
    )
    
    parser.add_argument(
        "-o", "--output",
        type=str,
        default=env.get_as("AMC_COMPLETIONLIST_MERGE_DST", "path_str"),
        help=f"Output file path for merged completions. Default from .env.sample: {env.get_as('AMC_COMPLETIONLIST_MERGE_DST', 'path_str') or '(not set)'}"
    )
    
    parser.add_argument(
        "-w", "--weights",
        nargs="+",
        type=str,
        default=None,
        help="Weights for each completion file. Can be absolute (number, e.g., '1.5'), percentile-based (e.g., '50%'), or rank-based (e.g., '#5' or '#-1'). "
             "If not provided, all files get weight 1.0. "
             "Percentile: '50%' means freq 1 in custom list = 50th percentile freq from first list. "
             "Rank: '#5' means freq 1 in custom list = 5th highest freq from first list, '#-1' means lowest freq."
    )
    
    parser.add_argument(
        "--no-freqs",
        action="store_true",
        help="Omit frequency information from output (format: 'pre|post' instead of 'pre|post #freq')"
    )
    
    parser.add_argument(
        "--env-file",
        type=str,
        default=None,
        help="Path to .env file to load (overrides .env.sample). Default: .env in project root"
    )
    
    args = parser.parse_args()
    
    # Re-check defaults (env object already loaded everything)
    if not args.output:
        args.output = env.get_as("AMC_COMPLETIONLIST_MERGE_DST", "path_str")
    
    # Check env var for --no-freqs if flag not set
    if not args.no_freqs:
        args.no_freqs = env.get_as("AMC_COMPLETIONLIST_MERGE_NO_FREQS", bool, False)
    
    # Expand glob patterns in file arguments
    def expand_globs(file_patterns: list[str]) -> list[str]:
        """Expand glob patterns to actual file paths. Returns empty list if no matches."""
        expanded = []
        for pattern in file_patterns:
            # Check if pattern contains glob characters
            if '*' in str(pattern) or '?' in str(pattern) or '[' in str(pattern):
                # It's a glob pattern
                matches = glob.glob(str(pattern))
                if matches:
                    expanded.extend(sorted(matches))  # Sort for consistent ordering
                # If no matches, just skip (don't error)
            else:
                # Regular file path
                expanded.append(str(pattern))
        return expanded
    
    # Handle default workflow: if no files provided, merge default source with glob pattern
    # If one file/glob provided, merge it with default source
    default_source = env.get_as("AMC_COMPLETIONLIST_MERGE_SRC", "path_str")
    default_glob = env.get_as("AMC_COMPLETIONLIST_MERGE_GLOB", "glob")
    
    if len(args.completion_files) == 0:
        # No files provided: merge default source with files matching default glob
        if not default_source:
            parser.error("No completion files provided and AMC_COMPLETIONLIST_MERGE_SRC is not set")
        if not default_glob:
            parser.error("No completion files provided and AMC_COMPLETIONLIST_MERGE_GLOB is not set")
        # Expand glob pattern
        glob_files = expand_globs([default_glob])
        if not glob_files:
            # No files found matching glob - just use the default source (no merge needed)
            print(f"No files found matching glob pattern '{default_glob}'. Skipping merge (using source file only).", file=__import__("sys").stderr)
            args.completion_files = [default_source]
        else:
            args.completion_files = [default_source] + glob_files
    elif len(args.completion_files) == 1:
        # One file/glob provided: merge it with default source
        if not default_source:
            parser.error("Only one completion file/glob provided and AMC_COMPLETIONLIST_MERGE_SRC is not set. Provide at least two files.")
        # Expand glob pattern if needed
        expanded = expand_globs(args.completion_files)
        args.completion_files = [default_source] + expanded
    else:
        # Two or more files/globs provided: expand all globs
        args.completion_files = expand_globs(args.completion_files)
    
    # Parse weights
    weights = None
    if args.weights:
        if len(args.weights) != len(args.completion_files):
            parser.error(
                f"Number of weights ({len(args.weights)}) must match number of completion files ({len(args.completion_files)})"
            )
        try:
            weights = [parse_weight(w) for w in args.weights]
        except ValueError as e:
            parser.error(f"Error parsing weights: {e}")
    
    # Convert to Path objects (expand ~ in paths)
    completion_files = [Path(f).expanduser() for f in args.completion_files]
    output_file = Path(args.output).expanduser()
    
    # Merge completions (or copy if only one file)
    try:
        if len(completion_files) == 1:
            # Only one file - just copy it to output
            import shutil
            shutil.copy2(completion_files[0], output_file)
            # Count completions for message
            from automobile_complete.completionlist.parse import parse_completion_file
            completion_count = len(parse_completion_file(completion_files[0]))
            print(f"Copied {completion_count} completions from {completion_files[0]} to {output_file}", file=__import__("sys").stderr)
        else:
            merged = merge_completions(
                completion_files=completion_files,
                weights=weights,
                output_file=output_file,
                include_freqs=not args.no_freqs,
            )
            print(f"Merged {len(merged)} completions to {output_file}", file=__import__("sys").stderr)
    except Exception as e:
        parser.error(f"Error merging completions: {e}")


if __name__ == "__main__":
    main()

