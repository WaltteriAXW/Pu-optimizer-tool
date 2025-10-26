"""
Input Validation Module

Provides consistent validation across the application
Matches JavaScript validation for consistency
"""

from typing import Dict, List, Any, Optional, Tuple
from constants import VALIDATION_RANGES, Physics


class ValidationError(Exception):
    """Custom exception for validation errors"""

    def __init__(self, message: str, field: Optional[str] = None):
        super().__init__(message)
        self.field = field


def validate_field(field: str, value: float) -> Dict[str, Any]:
    """
    Validate a single field

    Args:
        field: Field name from VALIDATION_RANGES
        value: Value to validate

    Returns:
        Dictionary with 'valid' boolean and optional 'error' and 'field'

    Example:
        >>> result = validate_field('pipe_length', 500)
        >>> print(result)
        {'valid': True}

        >>> result = validate_field('pipe_length', 10)
        >>> print(result['error'])
        'Pipe Length must be at least 50 mm (current: 10.0 mm)'
    """
    range_spec = VALIDATION_RANGES.get(field)

    if not range_spec:
        return {'valid': True}

    # Check if valid number
    if not isinstance(value, (int, float)):
        return {
            'valid': False,
            'error': f"{range_spec['name']} must be a valid number",
            'field': field
        }

    if not (isinstance(value, (int, float)) and value == value):  # Check for NaN
        return {
            'valid': False,
            'error': f"{range_spec['name']} must be a valid number",
            'field': field
        }

    # Check minimum
    if value < range_spec['min']:
        return {
            'valid': False,
            'error': (
                f"{range_spec['name']} must be at least {range_spec['min']} "
                f"{range_spec['unit']} (current: {value:.1f} {range_spec['unit']})"
            ),
            'field': field
        }

    # Check maximum
    if value > range_spec['max']:
        return {
            'valid': False,
            'error': (
                f"{range_spec['name']} must not exceed {range_spec['max']} "
                f"{range_spec['unit']} (current: {value:.1f} {range_spec['unit']})"
            ),
            'field': field
        }

    return {'valid': True}


def validate_inputs(pipe_length: float, pipe_diameter: float, temperature: float,
                   flow_rate: float, viscosity: float, density: float) -> Dict[str, Any]:
    """
    Validate all calculator inputs

    Args:
        pipe_length: Pipe length in mm
        pipe_diameter: Pipe diameter in mm
        temperature: Temperature in °C
        flow_rate: Flow rate in L/min
        viscosity: Viscosity in cP
        density: Density in kg/m³

    Returns:
        Dictionary with 'valid' boolean and optional 'error' and 'errors' list

    Raises:
        ValidationError: If validation fails and strict mode is enabled
    """
    errors = []

    # Validate each field
    result = validate_field('pipe_length', pipe_length)
    if not result['valid']:
        errors.append(result['error'])

    result = validate_field('pipe_diameter', pipe_diameter)
    if not result['valid']:
        errors.append(result['error'])

    result = validate_field('temperature', temperature)
    if not result['valid']:
        errors.append(result['error'])

    result = validate_field('flow_rate', flow_rate)
    if not result['valid']:
        errors.append(result['error'])

    result = validate_field('viscosity', viscosity)
    if not result['valid']:
        errors.append(result['error'])

    result = validate_field('density', density)
    if not result['valid']:
        errors.append(result['error'])

    # Additional physical constraint checks
    if pipe_diameter > pipe_length * 0.5:
        errors.append(
            f"Pipe diameter ({pipe_diameter:.1f}mm) is unusually large "
            f"relative to length ({pipe_length:.1f}mm)"
        )

    if errors:
        return {
            'valid': False,
            'error': '\n'.join(errors),
            'errors': errors
        }

    return {'valid': True}


def validate_process_parameters(reynolds: float, shear_rate: float,
                                apparent_viscosity: float, velocity: float,
                                pressure_bar: float, temperature: float,
                                machine_max_pressure: Optional[float] = None,
                                fill_time: Optional[float] = None) -> Dict[str, Any]:
    """
    Validate process parameters (results-based validation)

    Args:
        reynolds: Reynolds number
        shear_rate: Shear rate in s⁻¹
        apparent_viscosity: Apparent viscosity in Pa·s
        velocity: Flow velocity in m/s
        pressure_bar: Required pressure in bar
        temperature: Process temperature in °C
        machine_max_pressure: Optional machine maximum pressure in bar
        fill_time: Optional mold fill time in seconds

    Returns:
        Dictionary with validation results, warnings, and recommendations
    """
    warnings = []
    recommendations = []

    # Reynolds number check
    if reynolds > Physics.REYNOLDS_TURBULENT_THRESHOLD:
        warnings.append(
            f"Flow is turbulent (Re = {reynolds:.0f} > {Physics.REYNOLDS_TURBULENT_THRESHOLD})"
        )
        recommendations.append('Reduce flow rate to achieve laminar flow for better quality')

    # Shear rate check
    if shear_rate > 1000:
        warnings.append(f"High shear rate ({shear_rate:.0f} s⁻¹) may degrade material")
        recommendations.append('Consider increasing pipe diameter or reducing flow rate')

    # Viscosity check
    if apparent_viscosity > 1.0:
        warnings.append(f"High apparent viscosity ({apparent_viscosity:.3f} Pa·s)")
        recommendations.append('Consider increasing temperature or reducing flow rate')

    # Velocity check
    if velocity > 5.0:
        warnings.append(f"Very high flow velocity ({velocity:.2f} m/s)")
        recommendations.append('Reduce flow rate or increase pipe diameter to prevent turbulence')

    # Machine pressure check
    if machine_max_pressure and pressure_bar > machine_max_pressure:
        warnings.append(
            f"Required pressure ({pressure_bar:.2f} bar) exceeds machine capacity "
            f"({machine_max_pressure} bar)"
        )
        recommendations.append(
            'Reduce flow rate, increase pipe diameter, or use higher capacity machine'
        )

    # Fill time checks
    if fill_time is not None:
        if fill_time < 2:
            warnings.append(f"Very fast fill time ({fill_time:.1f}s) may cause air entrapment")
            recommendations.append('Increase fill time above 2 seconds to prevent voids')
        elif fill_time > 30:
            warnings.append(f"Slow fill time ({fill_time:.1f}s) may cause premature gelation")
            recommendations.append('Increase flow rate or check for flow restrictions')

    # Temperature recommendations
    if temperature < 20:
        recommendations.append(
            'Consider increasing temperature to 20-25°C for better flow properties'
        )
    elif temperature > 35:
        warnings.append(f"High temperature ({temperature}°C) may accelerate reaction")
        recommendations.append('Monitor reaction time closely; consider reducing temperature')

    return {
        'valid': len(warnings) == 0,
        'warnings': warnings,
        'recommendations': recommendations,
        'has_warnings': len(warnings) > 0,
        'has_recommendations': len(recommendations) > 0
    }


def sanitize_number(value: Any, default: float = 0.0) -> float:
    """
    Sanitize numeric input

    Args:
        value: Input value
        default: Default value if invalid

    Returns:
        Sanitized number
    """
    if isinstance(value, (int, float)):
        return float(value) if value == value else default  # Check for NaN

    if isinstance(value, str):
        try:
            num = float(value)
            return num if num == num else default  # Check for NaN
        except ValueError:
            return default

    return default


def clamp(value: float, min_val: float, max_val: float) -> float:
    """
    Clamp value to range

    Args:
        value: Value to clamp
        min_val: Minimum value
        max_val: Maximum value

    Returns:
        Clamped value
    """
    return max(min_val, min(max_val, value))


def get_field_constraints(field: str) -> Dict[str, Any]:
    """
    Get field constraints for UI or validation

    Args:
        field: Field name

    Returns:
        Dictionary with min, max, step, and other constraints
    """
    range_spec = VALIDATION_RANGES.get(field)

    if not range_spec:
        return {
            'min': None,
            'max': None,
            'step': None,
            'unit': '',
            'name': field
        }

    # Calculate appropriate step based on range
    range_size = range_spec['max'] - range_spec['min']

    if range_size > 1000:
        step = 10
    elif range_size > 100:
        step = 1
    elif range_size > 10:
        step = 0.1
    else:
        step = 0.01

    return {
        'min': range_spec['min'],
        'max': range_spec['max'],
        'step': step,
        'unit': range_spec['unit'],
        'name': range_spec['name'],
        'placeholder': f"{range_spec['min']}-{range_spec['max']} {range_spec['unit']}"
    }


# Export all functions
__all__ = [
    'ValidationError',
    'validate_field',
    'validate_inputs',
    'validate_process_parameters',
    'sanitize_number',
    'clamp',
    'get_field_constraints'
]
