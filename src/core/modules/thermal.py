"""
Temperature and viscosity calculations.
Uses Arrhenius equation for temperature-dependent viscosity.
"""

import math
from typing import Dict

# Gas constant
GAS_CONSTANT_J_MOL_K = 8.314


def calculate_temperature_dependent_viscosity(
    reference_temp_c: float,
    reference_viscosity_cp: float,
    activation_energy_j_mol: float,
    current_temp_c: float,
) -> Dict[str, float]:
    """
    Calculate apparent viscosity at current temperature using Arrhenius equation.

    η(T) = η₀ * exp[E_a / R * (1/T - 1/T₀)]

    Args:
        reference_temp_c: Reference temperature in Celsius
        reference_viscosity_cp: Reference viscosity in centipoise
        activation_energy_j_mol: Activation energy in J/mol
        current_temp_c: Current temperature in Celsius

    Returns:
        Dict with viscosity at current temperature and temperature factor
    """

    # Convert to Kelvin
    reference_temp_k = reference_temp_c + 273.15
    current_temp_k = current_temp_c + 273.15

    if reference_temp_k <= 0 or current_temp_k <= 0:
        return {
            'temperature_dependent_viscosity': reference_viscosity_cp,
            'temperature_factor': 1.0,
            'error': 'Invalid temperature (must be > -273.15°C)'
        }

    # Calculate exponent
    if activation_energy_j_mol == 0:
        exponent = 0
    else:
        exponent = (activation_energy_j_mol / GAS_CONSTANT_J_MOL_K) * (
            (1 / current_temp_k) - (1 / reference_temp_k)
        )

    # Limit exponent to prevent overflow
    exponent = max(-50, min(50, exponent))

    # Calculate viscosity at current temperature
    temperature_factor = math.exp(exponent)
    current_viscosity = reference_viscosity_cp * temperature_factor

    return {
        'reference_viscosity_cp': reference_viscosity_cp,
        'reference_temp_c': reference_temp_c,
        'current_temp_c': current_temp_c,
        'current_viscosity_cp': current_viscosity,
        'temperature_factor': temperature_factor,
        'activation_energy_j_mol': activation_energy_j_mol,
        'viscosity_ratio': current_viscosity / reference_viscosity_cp if reference_viscosity_cp > 0 else 1,
    }


def calculate_shear_heating(
    pressure_drop_pa: float,
    flow_rate_lpm: float,
    viscosity_cp: float,
    density_kg_m3: float = 1120.0,
    specific_heat_j_kg_k: float = 2100.0,
    efficiency: float = 0.8,
) -> Dict[str, float]:
    """
    Calculate temperature rise due to shear heating.

    Heat generated = (ΔP * Q) / η * (1 - efficiency)
    ΔT = Heat / (ṁ * c_p)

    Args:
        pressure_drop_pa: Pressure drop in Pascals
        flow_rate_lpm: Flow rate in liters per minute
        viscosity_cp: Apparent viscosity in cP
        density_kg_m3: Material density in kg/m³
        specific_heat_j_kg_k: Specific heat capacity
        efficiency: Pump/system efficiency (0-1)

    Returns:
        Dict with temperature rise and heating details
    """

    # Convert flow rate to m³/s
    flow_rate_m3_s = flow_rate_lpm / 60000

    # Mass flow rate
    mass_flow_kg_s = flow_rate_m3_s * density_kg_m3

    if mass_flow_kg_s <= 0 or specific_heat_j_kg_k <= 0:
        return {
            'temperature_rise_c': 0,
            'heat_generated_w': 0,
            'mass_flow_kg_s': mass_flow_kg_s,
        }

    # Hydraulic power
    hydraulic_power_w = (pressure_drop_pa * flow_rate_m3_s)

    # Heat generated due to inefficiency
    heat_generated_w = hydraulic_power_w * (1 - efficiency)

    # Temperature rise
    temperature_rise_c = heat_generated_w / (mass_flow_kg_s * specific_heat_j_kg_k)

    return {
        'temperature_rise_c': temperature_rise_c,
        'heat_generated_w': heat_generated_w,
        'hydraulic_power_w': hydraulic_power_w,
        'mass_flow_kg_s': mass_flow_kg_s,
        'efficiency': efficiency,
        'lost_heat_percentage': (1 - efficiency) * 100,
    }


def calculate_viscosity_change_factor(
    temperature_c: float,
    reference_temp_c: float = 25.0,
    flow_index: float = 0.85,
) -> float:
    """
    Quick viscosity change estimate based on temperature.
    Simplified version for UI display.

    Each 10°C increase typically reduces viscosity by ~10-15%.
    """
    temp_diff = temperature_c - reference_temp_c
    # For each 5°C, multiply by 0.95 (5% reduction)
    factor = 0.95 ** (abs(temp_diff) / 5)

    if temperature_c < reference_temp_c:
        # Temperature decrease increases viscosity
        return 1 / factor
    else:
        # Temperature increase decreases viscosity
        return factor


def estimate_final_temperature(
    initial_temp_c: float,
    shear_heating_c: float,
    ambient_loss_c: float = 1.0,
) -> Dict[str, float]:
    """
    Estimate final material temperature accounting for heating and losses.

    Args:
        initial_temp_c: Initial material temperature
        shear_heating_c: Temperature rise from shear
        ambient_loss_c: Temperature loss to environment

    Returns:
        Estimated final temperature
    """
    final_temp_c = initial_temp_c + shear_heating_c - ambient_loss_c

    return {
        'initial_temp_c': initial_temp_c,
        'shear_heating_c': shear_heating_c,
        'ambient_loss_c': ambient_loss_c,
        'final_temp_c': final_temp_c,
    }
