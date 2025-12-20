"""
Backward compatibility wrapper for polyurethane_calculator

This module has been moved to src/app/calculator.py
This file is kept for backward compatibility.

Import from app.calculator instead:
    from app.calculator import calculate_all_parameters
"""

# Re-export everything from the new location
from app.calculator import *  # noqa: F401, F403

__all__ = [
    'calculate_all_parameters',
    'get_material_list',
    'get_machine_types',
    'CalculationError',
]
