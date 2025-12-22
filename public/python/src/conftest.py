"""
Pytest Configuration for Polyurethane Injection Optimizer

Configures pytest to properly discover and run all tests with correct Python paths.
Enables imports from the src directory in both test and non-test code.
"""

import sys
from pathlib import Path

# Add src directory to Python path for imports
SRC_DIR = Path(__file__).parent
sys.path.insert(0, str(SRC_DIR))

# Pytest plugins configuration
pytest_plugins = []

# Test discovery patterns
python_files = ["test_*.py", "*_test.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]

# Markers for test categorization
def pytest_configure(config):
    """Register custom pytest markers"""
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
