"""
Validation module for polyurethane injection optimizer

Provides parameter validation for calculations
"""

from typing import Dict, Any, List

try:
    from ...constants import VALIDATION_RANGES
except ImportError:
    # Fallback if constants not available
    VALIDATION_RANGES = {
        'pipe_length': {'min': 50, 'max': 10000, 'unit': 'mm', 'name': 'Pipe Length'},
        'pipe_diameter': {'min': 1, 'max': 200, 'unit': 'mm', 'name': 'Pipe Diameter'},
        'temperature': {'min': 5, 'max': 50, 'unit': '°C', 'name': 'Temperature'},
        'flow_rate': {'min': 0.1, 'max': 200, 'unit': 'L/min', 'name': 'Flow Rate'},
        'viscosity': {'min': 50, 'max': 10000, 'unit': 'cP', 'name': 'Viscosity'},
        'density': {'min': 900, 'max': 1500, 'unit': 'kg/m³', 'name': 'Density'}
    }


def validate_parameters(parameters: Dict[str, Any]) -> List[str]:
    """
    Validate calculation parameters.

    Args:
        parameters: Dictionary containing calculation parameters

    Returns:
        List of error messages (empty if valid)
    """
    errors = []

    # Check required parameters
    required_params = [
        'pipe_length_mm',
        'pipe_diameter_mm',
        'material_key',
        'temperature_c',
        'flow_rate_lpm'
    ]

    for param in required_params:
        if param not in parameters or parameters[param] is None:
            errors.append(f"Missing required parameter: {param}")

    # Validate pipe_length_mm
    if 'pipe_length_mm' in parameters:
        try:
            value = float(parameters['pipe_length_mm'])
            if value < VALIDATION_RANGES['pipe_length']['min']:
                errors.append(f"Pipe length must be at least {VALIDATION_RANGES['pipe_length']['min']} mm")
            elif value > VALIDATION_RANGES['pipe_length']['max']:
                errors.append(f"Pipe length must not exceed {VALIDATION_RANGES['pipe_length']['max']} mm")
        except (ValueError, TypeError):
            errors.append("Pipe length must be a valid number")

    # Validate pipe_diameter_mm
    if 'pipe_diameter_mm' in parameters:
        try:
            value = float(parameters['pipe_diameter_mm'])
            if value < VALIDATION_RANGES['pipe_diameter']['min']:
                errors.append(f"Pipe diameter must be at least {VALIDATION_RANGES['pipe_diameter']['min']} mm")
            elif value > VALIDATION_RANGES['pipe_diameter']['max']:
                errors.append(f"Pipe diameter must not exceed {VALIDATION_RANGES['pipe_diameter']['max']} mm")
        except (ValueError, TypeError):
            errors.append("Pipe diameter must be a valid number")

    # Validate temperature_c
    if 'temperature_c' in parameters:
        try:
            value = float(parameters['temperature_c'])
            if value < VALIDATION_RANGES['temperature']['min']:
                errors.append(f"Temperature must be at least {VALIDATION_RANGES['temperature']['min']}°C")
            elif value > VALIDATION_RANGES['temperature']['max']:
                errors.append(f"Temperature must not exceed {VALIDATION_RANGES['temperature']['max']}°C")
        except (ValueError, TypeError):
            errors.append("Temperature must be a valid number")

    # Validate flow_rate_lpm
    if 'flow_rate_lpm' in parameters:
        try:
            value = float(parameters['flow_rate_lpm'])
            if value < VALIDATION_RANGES['flow_rate']['min']:
                errors.append(f"Flow rate must be at least {VALIDATION_RANGES['flow_rate']['min']} L/min")
            elif value > VALIDATION_RANGES['flow_rate']['max']:
                errors.append(f"Flow rate must not exceed {VALIDATION_RANGES['flow_rate']['max']} L/min")
        except (ValueError, TypeError):
            errors.append("Flow rate must be a valid number")

    # Validate material_key
    if 'material_key' in parameters:
        if not isinstance(parameters['material_key'], str) or not parameters['material_key']:
            errors.append("Material key must be a non-empty string")

    return errors


__all__ = ['validate_parameters']
