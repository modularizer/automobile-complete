"""
Command-line interface for merging preprocessed completions.
"""

import argparse
import json
from pathlib import Path

from automobile_complete.completionlist.merge.merge import merge_completions


def parse_weight(weight_str: str) -> float | dict[str, float]:
    """
    Parse a weight string into a weight value.
    
    Supports:
    - "1.5" -> absolute weight 1.5
    - '{"percentile": 50, "reference_percentile": 90, "reference_index": 0}' -> relative weight
    
    Args:
        weight_str: String representation of weight
        
    Returns:
        Either a float (absolute weight) or dict (relative weight)
    """
    # Try parsing as JSON first (for relative weights)
    try:
        weight_dict = json.loads(weight_str)
        if isinstance(weight_dict, dict):
            return weight_dict
    except (json.JSONDecodeError, ValueError):
        pass
    
    # Try parsing as float (absolute weight)
    try:
        return float(weight_str)
    except ValueError:
        raise ValueError(f"Invalid weight format: {weight_str}. Use a number or JSON dict.")


def main():
    """
    Command-line interface for merging preprocessed completions.
    """
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
        nargs="+",
        type=str,
        help="Two or more preprocessed completion files to merge"
    )
    
    parser.add_argument(
        "-o", "--output",
        type=str,
        required=True,
        help="Output file path for merged completions"
    )
    
    parser.add_argument(
        "-w", "--weights",
        nargs="+",
        type=str,
        default=None,
        help="Weights for each completion file. Can be absolute (number) or relative (JSON dict). "
             "If not provided, all files get weight 1.0. "
             "Relative weight format: '{\"percentile\": 50, \"reference_percentile\": 90, \"reference_index\": 0}'"
    )
    
    parser.add_argument(
        "--no-freqs",
        action="store_true",
        help="Omit frequency information from output (format: 'pre|post' instead of 'pre|post #freq')"
    )
    
    args = parser.parse_args()
    
    if len(args.completion_files) < 2:
        parser.error("At least two completion files are required for merging")
    
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
    
    # Convert to Path objects
    completion_files = [Path(f) for f in args.completion_files]
    output_file = Path(args.output)
    
    # Merge completions
    try:
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

