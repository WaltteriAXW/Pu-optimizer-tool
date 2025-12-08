"""
Pressure drop calculations using Hagen-Poiseuille equation.
Handles both laminar and turbulent flow regimes.
"""

import math
from typing import Dict, Tuple

# Darcy friction factor constants (Swamee-Jain approximation)
A_COEFFICIENT = 0.25
B_COEFFICIENT = 5.74


def calculate_pressure_drop(
    diameter_mm: float,
    length_mm: float,
    flow_rate_lpm: float,
    viscosity_cp: float,
    density_kg_m3: float = 1120.0,
    pipe_roughness_mm: float = 0.05,
) -> Dict[str, float]:
    """
    Calculate pressure drop using Hagen-Poiseuille for laminar flow
    and Darcy-Weisbach for turbulent flow.

    Args:
        diameter_mm: Pipe diameter in millimeters
        length_mm: Pipe length in millimeters
        flow_rate_lpm: Volumetric flow rate in liters per minute
        viscosity_cp: Apparent viscosity in centipoise (cP)
        density_kg_m3: Material density in kg/m³
        pipe_roughness_mm: Absolute pipe roughness in mm

    Returns:
        Dict with pressure_drop_pa, pressure_drop_bar, and flow properties
    """

    # Convert units
    diameter_m = diameter_mm / 1000
    length_m = length_mm / 1000
    flow_rate_m3_s = flow_rate_lpm / 60000
    viscosity_pa_s = viscosity_cp / 1000

    # Calculate cross-sectional area
    radius_m = diameter_m / 2
    area_m2 = math.pi * (radius_m ** 2)

    # Calculate flow velocity
    velocity_m_s = flow_rate_m3_s / area_m2 if area_m2 > 0 else 0

    # Calculate Reynolds number
    reynolds = (density_kg_m3 * velocity_m_s * diameter_m) / viscosity_pa_s if viscosity_pa_s > 0 else 0

    # Determine flow regime and calculate friction factor
    if reynolds < 2300:
        # Laminar flow: f = 64 / Re
        friction_factor = 64 / reynolds if reynolds > 0 else 64
    elif reynolds < 4000:
        # Transitional - use Hagen-Poiseuille approximation
        friction_factor = 64 / reynolds if reynolds > 0 else 64
    else:
        # Turbulent flow: Swamee-Jain equation
        relative_roughness = pipe_roughness_mm / diameter_mm
        friction_factor = swamee_jain_friction_factor(reynolds, relative_roughness)

    # Calculate pressure drop using Darcy-Weisbach equation
    # ΔP = f * (L/D) * (ρ * v²) / 2
    if velocity_m_s > 0:
        pressure_drop_pa = (
            friction_factor * (length_m / diameter_m) *
            (density_kg_m3 * (velocity_m_s ** 2)) / 2
        )
    else:
        pressure_drop_pa = 0

    pressure_drop_bar = pressure_drop_pa / 100000

    return {
        'pressure_drop_pa': pressure_drop_pa,
        'pressure_drop_bar': pressure_drop_bar,
        'pressure_drop_kpa': pressure_drop_pa / 1000,
        'velocity_m_s': velocity_m_s,
        'reynolds_number': reynolds,
        'flow_regime': 'laminar' if reynolds < 2300 else 'turbulent',
        'friction_factor': friction_factor,
        'diameter_m': diameter_m,
        'length_m': length_m,
        'area_m2': area_m2,
        'flow_rate_m3_s': flow_rate_m3_s,
    }


def swamee_jain_friction_factor(reynolds: float, relative_roughness: float) -> float:
    """
    Calculate Darcy friction factor using Swamee-Jain approximation.
    Valid for 5,000 < Re < 10^8 and 10^-6 < (ε/D) < 10^-2

    f = 0.25 / [log10(ε/3.7D + 5.74/Re^0.9)]²
    """
    if reynolds <= 0:
        return 0.032

    denominator = (relative_roughness / 3.7) + (5.74 / (reynolds ** 0.9))

    if denominator <= 0:
        return 0.032

    log_term = math.log10(denominator)

    if log_term == 0:
        return 0.032

    friction_factor = A_COEFFICIENT / (log_term ** 2)

    # Clamp to reasonable values
    return max(0.008, min(0.1, friction_factor))


def calculate_pressure_with_fittings(
    base_pressure_bar: float,
    fitting_loss_multiplier: float = 0.15,
) -> Dict[str, float]:
    """
    Account for pressure losses in fittings, elbows, and valves.

    Typically adds 15-25% to base pressure drop.
    """
    fitting_loss_bar = base_pressure_bar * fitting_loss_multiplier
    total_pressure_bar = base_pressure_bar + fitting_loss_bar

    return {
        'base_pressure_bar': base_pressure_bar,
        'fitting_loss_bar': fitting_loss_bar,
        'total_pressure_bar': total_pressure_bar,
        'loss_percentage': (fitting_loss_bar / base_pressure_bar * 100) if base_pressure_bar > 0 else 0,
    }


def calculate_machine_compatibility(
    total_pressure_bar: float,
    machine_specs: Dict,
) -> Dict[str, any]:
    """
    Check if calculated pressure is compatible with machine capabilities.

    Returns compatibility status and recommendations.
    """
    max_pressure = machine_specs.get('max_pressure', 200)
    min_pressure = machine_specs.get('min_operating_pressure', 8)
    process_loss = machine_specs.get('process_loss', {}).get('total', 10)

    # Calculate available pressure after machine losses
    available_pressure = total_pressure_bar + process_loss

    is_compatible = min_pressure <= available_pressure <= max_pressure

    status = 'compatible'
    warning = None

    if available_pressure < min_pressure:
        status = 'incompatible_low'
        warning = f'Pressure {available_pressure:.1f} bar is below minimum {min_pressure} bar'
    elif available_pressure > max_pressure:
        status = 'incompatible_high'
        warning = f'Pressure {available_pressure:.1f} bar exceeds maximum {max_pressure} bar'

    return {
        'is_compatible': is_compatible,
        'status': status,
        'available_pressure_bar': available_pressure,
        'max_pressure_bar': max_pressure,
        'min_pressure_bar': min_pressure,
        'process_loss_bar': process_loss,
        'warning': warning,
    }
