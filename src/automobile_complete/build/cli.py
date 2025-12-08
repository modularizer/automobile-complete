"""
Command-line interface for building the react-native-engine.
"""
import os
import subprocess
import sys
from pathlib import Path

from automobile_complete.utils.env import env
from automobile_complete.utils.find_project_root import find_project_root


def main():
    """
    Build the react-native-engine by running npm run build.
    
    Changes to the react-native-engine directory and runs npm run build,
    passing the parsed AMC_SRC environment variable path as an argument.
    """
    # Get the project root
    project_root = find_project_root()
    if not project_root:
        print("❌ Error: Could not find project root", file=sys.stderr)
        sys.exit(1)
    
    # Get the parsed AMC_SRC path
    amc_src = env.get_as("AMC_SRC", "path_str")
    if not amc_src:
        print("❌ Error: AMC_SRC environment variable is not set", file=sys.stderr)
        sys.exit(1)
    
    # Resolve to absolute path
    amc_src_path = Path(amc_src).resolve()
    
    # Change to react-native-engine directory
    react_native_engine_dir = Path(project_root) / "react-native-engine"
    if not react_native_engine_dir.exists():
        print(f"❌ Error: react-native-engine directory not found at {react_native_engine_dir}", file=sys.stderr)
        sys.exit(1)
    
    # Change to the directory
    os.chdir(react_native_engine_dir)
    
    # Run npm run build, passing AMC_SRC as an argument
    # npm scripts receive arguments after --, so we pass it as: npm run build -- <path>
    print(f"🔨 Building react-native-engine...", file=sys.stderr)
    print(f"   Working directory: {react_native_engine_dir}", file=sys.stderr)
    print(f"   AMC_SRC: {amc_src_path}", file=sys.stderr)
    
    try:
        # Pass AMC_SRC as a CLI argument to npm run build
        # Arguments after -- are passed to the npm script
        result = subprocess.run(
            ["npm", "run", "build", "--", str(amc_src_path)],
            check=True
        )
        print("✅ Build successful!", file=sys.stderr)
        sys.exit(result.returncode)
    except subprocess.CalledProcessError as e:
        print(f"❌ Build failed with exit code {e.returncode}", file=sys.stderr)
        sys.exit(e.returncode)
    except FileNotFoundError:
        print("❌ Error: npm not found. Please install Node.js and npm.", file=sys.stderr)
        sys.exit(1)

