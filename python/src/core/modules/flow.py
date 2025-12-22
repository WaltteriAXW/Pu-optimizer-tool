"""
Flow properties and regime calculations.
Includes shear rate, apparent viscosity (Power Law model), and Reynolds number.
"""

import math
from typing import Dict


def calculate_shear_rate(
    diameter_mm: float,
    flow_rate_lpm: float,
) -> Dict[str, float]:
    """
    Calculate shear rate for non-Newtonian fluids.

    γ̇ = (4 * Q) / (π * r³)

    Args:
        diameter_mm: Pipe diameter in millimeters
        flow_rate_lpm: Flow rate in liters per minute

    Returns:
        Dict with shear rate and related parameters
    """

    diameter_m = diameter_mm / 1000
    radius_m = diameter_m / 2
    flow_rate_m3_s = flow_rate_lpm / 60000

    if radius_m <= 0 or radius_m ** 3 == 0:
        return {
            'shear_rate_s_inv': 0,
            'error': 'Invalid diameter'
        }

    # γ̇ = (4 * Q) / (π * r³)
    shear_rate_s_inv = (4 * flow_rate_m3_s) / (math.pi * (radius_m ** 3))

    return {
        'shear_rate_s_inv': shear_rate_s_inv,
        'shear_rate_1_s': shear_rate_s_inv,  # Alternative naming
        'diameter_m': diameter_m,
        'radius_m': radius_m,
        'flow_rate_m3_s': flow_rate_m3_s,
    }


def calculate_apparent_viscosity_power_law(
    shear_rate_s_inv: float,
    consistency_cp: float,
    flow_index: float,
) -> Dict[str, float]:
    """
    Calculate apparent viscosity using Power Law model (Ostwald model).

    η = K * γ̇^(n-1)

    Where:
    - K: Consistency coefficient
    - γ̇: Shear rate
    - n: Flow index (0.85 typical for polyurethane)

    Args:
        shear_rate_s_inv: Shear rate in 1/s
        consistency_cp: Consistency coefficient (reference viscosity at 1 s⁻¹)
        flow_index: Flow index n (0-1 for shear-thinning, 1 for Newtonian)

    Returns:
        Dict with apparent viscosity
    """

    if shear_rate_s_inv <= 0:
        return {
            'apparent_viscosity_cp': consistency_cp,
            'viscosity_change_factor': 1.0,
        }

    # η = K * γ̇^(n-1)
    exponent = flow_index - 1

    # Limit exponent to prevent numerical issues
    exponent = max(-10, min(10, exponent))

    viscosity_change_factor = (shear_rate_s_inv ** exponent)
    apparent_viscosity_cp = consistency_cp * viscosity_change_factor

    # Clamp viscosity to reasonable range
    apparent_viscosity_cp = max(0.01, min(10000, apparent_viscosity_cp))

    return {
        'apparent_viscosity_cp': apparent_viscosity_cp,
        'consistency_cp': consistency_cp,
        'flow_index': flow_index,
        'shear_rate_s_inv': shear_rate_s_inv,
        'viscosity_change_factor': viscosity_change_factor,
        'is_shear_thinning': flow_index < 1.0,
    }


def calculate_reynolds_number(
    flow_rate_lpm: float,
    diameter_mm: float,
    density_kg_m3: float,
    viscosity_cp: float,
) -> Dict[str, float]:
    """
    Calculate Reynolds number (dimensionless).

    Re = (ρ * v * D) / η

    Args:
        flow_rate_lpm: Flow rate in liters per minute
        diameter_mm: Pipe diameter in millimeters
        density_kg_m3: Density in kg/m³
        viscosity_cp: Dynamic viscosity in centipoise

    Returns:
        Dict with Reynolds number and flow regime
    """

    if viscosity_cp <= 0 or diameter_mm <= 0:
        return {
            'reynolds_number': 0,
            'flow_regime': 'unknown',
        }

    # Convert units
    diameter_m = diameter_mm / 1000
    flow_rate_m3_s = flow_rate_lpm / 60000
    viscosity_pa_s = viscosity_cp / 1000

    # Calculate velocity
    area_m2 = math.pi * (diameter_m / 2) ** 2
    velocity_m_s = flow_rate_m3_s / area_m2 if area_m2 > 0 else 0

    # Re = (ρ * v * D) / η
    reynolds = (density_kg_m3 * velocity_m_s * diameter_m) / viscosity_pa_s

    # Determine flow regime
    if reynolds < 2300:
        flow_regime = 'laminar'
    elif reynolds < 4000:
        flow_regime = 'transitional'
    else:
        flow_regime = 'turbulent'

    return {
        'reynolds_number': reynolds,
        'flow_regime': flow_regime,
        'velocity_m_s': velocity_m_s,
        'diameter_m': diameter_m,
        'density_kg_m3': density_kg_m3,
        'viscosity_cp': viscosity_cp,
    }


def calculate_all_flow_properties(
    diameter_mm: float,
    flow_rate_lpm: float,
    consistency_cp: float,
    flow_index: float,
    density_kg_m3: float = 1120.0,
) -> Dict:
    """
    Calculate all flow properties in one call.

    Convenience function that combines:
    - Shear rate
    - Apparent viscosity
    - Reynolds number
    """

    # Shear rate
    shear_data = calculate_shear_rate(diameter_mm, flow_rate_lpm)
    shear_rate = shear_data.get('shear_rate_s_inv', 0)

    # Apparent viscosity
    viscosity_data = calculate_apparent_viscosity_power_law(
        shear_rate, consistency_cp, flow_index
    )
    apparent_viscosity = viscosity_data.get('apparent_viscosity_cp', consistency_cp)

    # Reynolds number
    reynolds_data = calculate_reynolds_number(
        flow_rate_lpm, diameter_mm, density_kg_m3, apparent_viscosity
    )

    return {
        'shear_rate_s_inv': shear_rate,
        'apparent_viscosity_cp': apparent_viscosity,
        'reynolds_number': reynolds_data.get('reynolds_number', 0),
        'flow_regime': reynolds_data.get('flow_regime', 'unknown'),
        'velocity_m_s': reynolds_data.get('velocity_m_s', 0),
        'is_shear_thinning': viscosity_data.get('is_shear_thinning', True),
    }
