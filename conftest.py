"""
Root pytest configuration for Polyurethane Injection Optimizer.

Ensures pytest can discover and run all tests from the project root by
adding the src directory to the Python path.
"""

import sys
from pathlib import Path

# Add src to path so absolute imports like 'from src.core...' resolve correctly
ROOT_DIR = Path(__file__).parent
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(ROOT_DIR / "src"))
