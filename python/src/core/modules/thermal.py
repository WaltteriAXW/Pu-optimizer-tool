"""
Temperature and viscosity calculations.
Uses Arrhenius equation for temperature-dependent viscosity.
"""

import math
from typing import Any, Dict, Optional

# Gas constant
GAS_CONSTANT_J_MOL_K = 8.314

# Activation energy for a custom material: the typical value used when the user gives no
# second viscosity reading, the range a calculated value must fall in, and how it is shown
DEFAULT_ACTIVATION_ENERGY_J_MOL = 25000.0
ACTIVATION_ENERGY_MIN_J_MOL = 1000.0
ACTIVATION_ENERGY_MAX_J_MOL = 100000.0
ACTIVATION_ENERGY_ROUNDING_J_MOL = 100.0
# Two readings closer together than this give too little change to fit a slope to
MIN_READING_GAP_C = 5.0


def activation_energy_from_readings(
    viscosity_1_cp: float,
    temp_1_c: float,
    viscosity_2_cp: float,
    temp_2_c: float,
) -> Dict[str, Any]:
    """
    Activation energy from two viscosity readings, the Arrhenius equation solved for E_a:

        E_a = R * ln(η₁ / η₂) / (1/T₁ - 1/T₂),  T in kelvin, R = 8.314 J/(mol·K)

    Args:
        viscosity_1_cp: First viscosity reading in cP (the material's reference viscosity)
        temp_1_c: Temperature of the first reading in °C
        viscosity_2_cp: Second viscosity reading in cP
        temp_2_c: Temperature of the second reading in °C

    Returns:
        Dict with 'activation_energy_j_mol' (rounded to the nearest 100 J/mol, or None) and
        'error' (a plain-language message, or None). A value outside 1,000–100,000 J/mol is
        reported as an error with the value it came to, never clamped into range.
    """
    def failed(message: str, value: Optional[float] = None) -> Dict[str, Any]:
        return {'activation_energy_j_mol': None, 'unrounded_j_mol': value, 'error': message}

    try:
        v1, t1, v2, t2 = (float(x) for x in (viscosity_1_cp, temp_1_c, viscosity_2_cp, temp_2_c))
    except (TypeError, ValueError):
        return failed('Both viscosity readings and the temperature must be numbers.')
    if not all(math.isfinite(x) for x in (v1, t1, v2, t2)):
        return failed('Both viscosity readings and the temperature must be numbers.')
    if v1 <= 0 or v2 <= 0:
        return failed('Viscosity readings must be greater than zero.')

    t1_k, t2_k = t1 + 273.15, t2 + 273.15
    if t1_k <= 0 or t2_k <= 0:
        return failed('The temperature must be above absolute zero (−273.15 °C).')

    if abs(t2 - t1) < MIN_READING_GAP_C:
        return failed(
            f'The second temperature must differ from {_fmt_c(t1)} °C by at least '
            f'{_fmt_c(MIN_READING_GAP_C)} °C.'
        )

    warmer_is_thinner = (v2 < v1) if t2 > t1 else (v1 < v2)
    if not warmer_is_thinner:
        return failed(
            'Viscosity must be lower at the higher temperature. Check the two readings.'
        )

    value = GAS_CONSTANT_J_MOL_K * math.log(v1 / v2) / ((1 / t1_k) - (1 / t2_k))
    if not ACTIVATION_ENERGY_MIN_J_MOL <= value <= ACTIVATION_ENERGY_MAX_J_MOL:
        return failed(
            f'These readings give {value:,.0f} J/mol, outside the expected range of '
            f'{ACTIVATION_ENERGY_MIN_J_MOL:,.0f}–{ACTIVATION_ENERGY_MAX_J_MOL:,.0f} J/mol. '
            'Check the two readings.',
            value,
        )

    step = ACTIVATION_ENERGY_ROUNDING_J_MOL
    rounded = math.floor(value / step + 0.5) * step
    return {'activation_energy_j_mol': rounded, 'unrounded_j_mol': value, 'error': None}


def resolve_activation_energy(parameters: Dict[str, Any]) -> Dict[str, Any]:
    """
    The activation energy a custom material calculates with, and where it came from.

    In order of precedence:
    - 'user': a value typed in (``activation_energy_j_mol``). Saved runs and imported
      datasets from before the second reading existed carry one, so they calculate
      exactly as they did.
    - 'calculated': from the reference viscosity (``viscosity_cp`` at ``reference_temp_c``,
      25 °C unless given) and a second reading (``viscosity_2_cp`` at ``viscosity_2_temp_c``).
      'data_sheet' instead when ``activation_energy_from`` says the two readings were read
      from a data sheet.
    - 'default': neither given, so the typical 25,000 J/mol, an estimate.

    Returns:
        Dict with 'activation_energy_j_mol', 'source' and 'error' (None when usable).
    """
    typed = parameters.get('activation_energy_j_mol')
    if typed is not None:
        return {'activation_energy_j_mol': float(typed), 'source': 'user', 'error': None}

    v2 = parameters.get('viscosity_2_cp')
    t2 = parameters.get('viscosity_2_temp_c')
    if v2 is None and t2 is None:
        return {
            'activation_energy_j_mol': DEFAULT_ACTIVATION_ENERGY_J_MOL,
            'source': 'default',
            'error': None,
        }
    if v2 is None or t2 is None:
        return {
            'activation_energy_j_mol': None,
            'source': 'calculated',
            'error': 'Enter both the second viscosity reading and its temperature, or leave both empty.',
        }

    result = activation_energy_from_readings(
        parameters.get('viscosity_cp'), parameters.get('reference_temp_c', 25.0), v2, t2
    )
    # The two readings may be a data sheet's, filled in by the form and confirmed by the user
    from_data_sheet = parameters.get('activation_energy_from') == 'data_sheet'
    return {
        'activation_energy_j_mol': result['activation_energy_j_mol'],
        'source': 'data_sheet' if from_data_sheet else 'calculated',
        'error': result['error'],
    }


def _fmt_c(value: float) -> str:
    """A temperature for a message: 25, not 25.0; 22.5 stays 22.5."""
    return f'{value:g}'


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
) -> Dict[str, float]:
    """
    Calculate the temperature rise from viscous dissipation in the line.

    Flow through a pipe has no useful work output: every bit of mechanical energy lost to
    friction ends up as heat in the fluid. So the heat generated is the full hydraulic
    power, and the rise reduces to a result that depends only on the pressure drop:

        Q̇ = ΔP · Q
        ΔT = Q̇ / (ṁ · c_p) = ΔP / (ρ · c_p)

    (An earlier version applied a pump efficiency here, keeping only 20% of the dissipation
    as heat. Efficiency is a pump concept — a pump converts some shaft power into flow work
    and wastes the rest — but a pipe does no work, so the factor understated the rise 5x.)

    Note how small this is: even 75 bar gives only about 3 °C, and typical line pressures of
    a fraction of a bar give thousandths of a degree. That is why the result is reported
    rather than fed back into the viscosity calculation — the feedback would be far below
    the uncertainty in the material data.

    Args:
        pressure_drop_pa: Pressure drop in Pascals
        flow_rate_lpm: Flow rate in liters per minute
        viscosity_cp: Apparent viscosity in cP (reported for reference)
        density_kg_m3: Material density in kg/m³
        specific_heat_j_kg_k: Specific heat capacity

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

    # All of the hydraulic power is dissipated as heat in the fluid
    hydraulic_power_w = pressure_drop_pa * flow_rate_m3_s
    heat_generated_w = hydraulic_power_w

    # ΔT = ΔP / (ρ · c_p); the flow rate cancels
    temperature_rise_c = heat_generated_w / (mass_flow_kg_s * specific_heat_j_kg_k)

    return {
        'temperature_rise_c': temperature_rise_c,
        'heat_generated_w': heat_generated_w,
        'hydraulic_power_w': hydraulic_power_w,
        'mass_flow_kg_s': mass_flow_kg_s,
        'viscosity_cp': viscosity_cp,
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
