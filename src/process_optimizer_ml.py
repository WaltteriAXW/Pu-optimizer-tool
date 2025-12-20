"""
Backward compatibility wrapper for process_optimizer_ml

This module has been moved to src/app/optimizer.py
This file is kept for backward compatibility.

Import from app.optimizer instead:
    from app.optimizer import ProcessOptimizerML
"""

# Re-export everything from the new location
from app.optimizer import *  # noqa: F401, F403

__all__ = [
    'ProcessOptimizerML',
    'get_ml_predictions',
]
