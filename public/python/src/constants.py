"""
Application Constants for Polyurethane Optimizer

Centralized configuration and magic numbers
Mirrors constants.js for consistency between Python and JavaScript
"""

import math
from typing import Dict, Tuple, Any

# ============================================================================
# PHYSICAL CONSTANTS
# ============================================================================

class Physics:
    """Physical constants used in calculations"""
    GAS_CONSTANT = 8.314  # J/(mol·K) - Universal gas constant
    ATMOSPHERIC_PRESSURE_BAR = 1.01325  # bar
    REYNOLDS_LAMINAR_THRESHOLD = 2300
    REYNOLDS_TURBULENT_THRESHOLD = 2300
    PI = math.pi


# ============================================================================
# MATERIAL PROPERTIES
# ============================================================================

class MaterialDefaults:
    """Default material property values"""
    # Activation energy (J/mol)
    ACTIVATION_ENERGY_STANDARD = 25000.0
    ACTIVATION_ENERGY_XHD = 28000.0
    ACTIVATION_ENERGY_SPRAY = 24000.0

    # Power law index (dimensionless)
    POWER_LAW_INDEX_STANDARD = 0.85
    POWER_LAW_INDEX_XHD = 0.82
    POWER_LAW_INDEX_SPRAY = 0.88

    # Reference temperature (°C)
    REFERENCE_TEMPERATURE = 25

    # Safety factor for pressure calculations
    SAFETY_FACTOR = 1.5


# ============================================================================
# VALIDATION RANGES
# ============================================================================

VALIDATION_RANGES = {
    'pipe_length': {
        'min': 50,
        'max': 10000,
        'unit': 'mm',
        'name': 'Pipe Length'
    },
    'pipe_diameter': {
        'min': 1,
        'max': 200,
        'unit': 'mm',
        'name': 'Pipe Diameter'
    },
    'temperature': {
        'min': 5,
        'max': 50,
        'unit': '°C',
        'name': 'Temperature'
    },
    'flow_rate': {
        'min': 0.1,
        'max': 200,
        'unit': 'L/min',
        'name': 'Flow Rate'
    },
    'viscosity': {
        'min': 50,
        'max': 10000,
        'unit': 'cP',
        'name': 'Viscosity'
    },
    'density': {
        'min': 900,
        'max': 1500,
        'unit': 'kg/m³',
        'name': 'Density'
    }
}


# ============================================================================
# PROCESS THRESHOLDS
# ============================================================================

class Thresholds:
    """Threshold values for warnings and recommendations"""
    # Shear rate threshold (s⁻¹)
    SHEAR_RATE_HIGH = 1000

    # Viscosity threshold (Pa·s)
    VISCOSITY_HIGH = 1.0

    # Velocity threshold (m/s)
    VELOCITY_HIGH = 5.0

    # Mold filling time thresholds (seconds)
    FILL_TIME_TOO_FAST = 2
    FILL_TIME_TOO_SLOW = 30

    # Pressure thresholds (bar)
    PRESSURE_WARNING = 5.0
    PRESSURE_HIGH = 6.0

    # Temperature recommendations (°C)
    TEMPERATURE_LOW = 20
    TEMPERATURE_HIGH = 35

    # Machine output rate margins
    MACHINE_OUTPUT_LOW_MARGIN = 0.3
    MACHINE_OUTPUT_HIGH_MARGIN = 0.9


# ============================================================================
# UNIT CONVERSIONS
# ============================================================================

class Conversions:
    """Unit conversion factors"""
    # Length
    MM_TO_M = 1 / 1000
    M_TO_MM = 1000

    # Volume
    LITER_TO_M3 = 1 / 1000
    M3_TO_LITER = 1000
    MM3_TO_LITER = 1 / 1000000

    # Flow rate
    L_PER_MIN_TO_M3_PER_SEC = 1 / 60000
    M3_PER_SEC_TO_L_PER_MIN = 60000

    # Viscosity
    CP_TO_PA_S = 0.001
    PA_S_TO_CP = 1000

    # Pressure
    PA_TO_KPA = 1 / 1000
    KPA_TO_PA = 1000
    PA_TO_BAR = 1 / 100000
    BAR_TO_PA = 100000
    KPA_TO_BAR = 1 / 100
    BAR_TO_KPA = 100

    @staticmethod
    def celsius_to_kelvin(celsius: float) -> float:
        """Convert Celsius to Kelvin"""
        return celsius + 273.15

    @staticmethod
    def kelvin_to_celsius(kelvin: float) -> float:
        """Convert Kelvin to Celsius"""
        return kelvin - 273.15


# ============================================================================
# UI CONFIGURATION
# ============================================================================

class UIConfig:
    """UI-related configuration"""
    # Data points for charts
    PRESSURE_PROFILE_POINTS = 20
    PRESSURE_VS_LENGTH_POINTS = 10
    PRESSURE_VS_LENGTH_STEP = 100  # mm

    # Decimal places for display
    DECIMAL_PLACES = {
        'pressure': 2,
        'temperature': 1,
        'viscosity': 4,
        'volume': 3,
        'time': 3,
        'density': 0,
        'percentage': 1
    }


# ============================================================================
# DEFAULT VALUES
# ============================================================================

class Defaults:
    """Default input values"""
    PIPE_LENGTH = 500
    PIPE_DIAMETER = 12
    TEMPERATURE = 25
    FLOW_RATE = 5
    VISCOSITY = 350
    DENSITY = 1120
    SPECIFIC_GRAVITY = 1.12

    MACHINE = 'low_pressure'
    MATERIAL = 'ecofoam_standard'


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def validate_input(field: str, value: float) -> Dict[str, Any]:
    """
    Validate a numeric input against its range

    Args:
        field: Field name (e.g., 'pipe_length', 'temperature')
        value: Value to validate

    Returns:
        Dictionary with 'valid' boolean and optional 'error' message
    """
    range_spec = VALIDATION_RANGES.get(field)
    if not range_spec:
        return {'valid': True}

    if not isinstance(value, (int, float)):
        return {
            'valid': False,
            'error': f"{range_spec['name']} must be a valid number"
        }

    if value < range_spec['min']:
        return {
            'valid': False,
            'error': f"{range_spec['name']} must be at least {range_spec['min']} {range_spec['unit']}"
        }

    if value > range_spec['max']:
        return {
            'valid': False,
            'error': f"{range_spec['name']} must not exceed {range_spec['max']} {range_spec['unit']}"
        }

    return {'valid': True}


def format_value(value: float, value_type: str = 'pressure') -> str:
    """
    Format a number for display with appropriate decimal places

    Args:
        value: Number to format
        value_type: Type of value (pressure, temperature, etc.)

    Returns:
        Formatted string
    """
    decimals = UIConfig.DECIMAL_PLACES.get(value_type, 2)
    return f"{value:.{decimals}f}"


def is_turbulent(reynolds: float) -> bool:
    """Check if Reynolds number indicates turbulent flow"""
    return reynolds > Physics.REYNOLDS_TURBULENT_THRESHOLD


def exceeds_threshold(value: float, threshold_name: str) -> bool:
    """
    Check if value exceeds a named threshold

    Args:
        value: Value to check
        threshold_name: Name of threshold (e.g., 'SHEAR_RATE_HIGH')

    Returns:
        True if value exceeds threshold
    """
    threshold = getattr(Thresholds, threshold_name, float('inf'))
    return value > threshold


# ============================================================================
# EXPORT ALL
# ============================================================================

__all__ = [
    'Physics',
    'MaterialDefaults',
    'VALIDATION_RANGES',
    'Thresholds',
    'Conversions',
    'UIConfig',
    'Defaults',
    'validate_input',
    'format_value',
    'is_turbulent',
    'exceeds_threshold'
]
