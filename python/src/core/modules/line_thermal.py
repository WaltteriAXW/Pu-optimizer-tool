"""
Temperature of the material by the time it reaches the mix head.

The tank set point is not necessarily what arrives at the mix head. Material standing in an
unheated hose exchanges heat with the surrounding air, and for single-shot work that is a
first-order
effect rather than a rounding error: the thermal time constant of material in a hose is
about twelve minutes, so a machine idling twenty minutes delivers its first shot at ambient
temperature, not at the set point. At 15 °C instead of 25 °C that is roughly a quarter more
viscosity, and the pressure follows.

Two regimes, both from the same lumped-capacity balance:

    soak (idle)   T = T_amb + (T_set - T_amb)·exp(-t_idle/τ)
    flow          T = T_amb + (T_set - T_amb)·exp(-t_res/τ)

with the time constant

    τ = ρ·c_p·V / (h·A) = ρ·c_p·D / (4h)

for a cylinder, where A/V = 4/D. Note τ does not depend on hose length: a longer hose holds
proportionally more material and exposes proportionally more surface.

This is a lumped model, so it assumes the material in the hose is at a single temperature.
That is reasonable for a thin hose full of a poorly-conducting liquid, and it is the same
assumption the exotherm model makes.
"""

import math
from typing import Any, Dict, Optional

# Bare hose in still air. A heated or insulated hose is much lower; forced convection in a
# draughty hall is higher. Overridable per calculation.
DEFAULT_HOSE_HEAT_TRANSFER_W_M2_K = 10.0

# Drift beyond this is worth telling the user about (°C)
SIGNIFICANT_DRIFT_C = 2.0


def line_time_constant_s(
    diameter_mm: float,
    density_kg_m3: float,
    specific_heat_j_kg_k: float = 2100.0,
    heat_transfer_coeff_w_m2_k: float = DEFAULT_HOSE_HEAT_TRANSFER_W_M2_K,
) -> float:
    """
    Thermal time constant of material standing in the line (seconds).

    τ = ρ·c_p·D / (4h). Independent of hose length.
    """
    if heat_transfer_coeff_w_m2_k <= 0 or diameter_mm <= 0:
        return float('inf')

    diameter_m = diameter_mm / 1000.0
    return (density_kg_m3 * specific_heat_j_kg_k * diameter_m) / (4.0 * heat_transfer_coeff_w_m2_k)


def residence_time_s(diameter_mm: float, length_mm: float, flow_rate_lpm: float) -> float:
    """How long a parcel of material spends in the line while flowing (seconds)."""
    if flow_rate_lpm <= 0:
        return float('inf')

    radius_m = (diameter_mm / 1000.0) / 2.0
    length_m = length_mm / 1000.0
    volume_m3 = math.pi * radius_m ** 2 * length_m
    flow_rate_m3_s = flow_rate_lpm / 60000.0

    return volume_m3 / flow_rate_m3_s


def _approach(start_c: float, ambient_c: float, elapsed_s: float, tau_s: float) -> float:
    """Newtonian cooling toward ambient over an interval."""
    if tau_s <= 0 or not math.isfinite(tau_s):
        return start_c
    if elapsed_s <= 0:
        return start_c

    return ambient_c + (start_c - ambient_c) * math.exp(-elapsed_s / tau_s)


def calculate_line_temperature(
    set_temperature_c: float,
    ambient_temperature_c: float,
    diameter_mm: float,
    length_mm: float,
    flow_rate_lpm: float,
    density_kg_m3: float,
    idle_time_s: float = 0.0,
    specific_heat_j_kg_k: float = 2100.0,
    heat_transfer_coeff_w_m2_k: float = DEFAULT_HOSE_HEAT_TRANSFER_W_M2_K,
) -> Dict[str, Any]:
    """
    Effective material temperature at the mix head.

    Args:
        set_temperature_c: Tank / conditioning set point
        ambient_temperature_c: Temperature of the air around the hose
        diameter_mm: Line inside diameter
        length_mm: Line length
        flow_rate_lpm: Flow rate while shooting
        density_kg_m3: Mixed liquid density
        idle_time_s: Time the material has stood in the line since the last shot.
            0 means continuous running.
        specific_heat_j_kg_k: Specific heat of the liquid
        heat_transfer_coeff_w_m2_k: Hose-to-air heat transfer coefficient

    Returns:
        Dict with the effective temperature and the quantities behind it
    """
    tau = line_time_constant_s(
        diameter_mm, density_kg_m3, specific_heat_j_kg_k, heat_transfer_coeff_w_m2_k
    )
    t_res = residence_time_s(diameter_mm, length_mm, flow_rate_lpm)

    # What is standing in the hose when the shot starts
    soaked_c = _approach(set_temperature_c, ambient_temperature_c, idle_time_s, tau)

    # Material entering from the tank also drifts while it travels the line
    flowing_c = _approach(set_temperature_c, ambient_temperature_c, t_res, tau)

    # The first material through is what was standing there; after the line has been
    # displaced, it is the flowing figure. The soaked case is the one that bites in
    # single-shot work, so it governs when it is the colder (or hotter) departure.
    if abs(soaked_c - set_temperature_c) >= abs(flowing_c - set_temperature_c):
        effective_c = soaked_c
        governing = 'idle_soak'
    else:
        effective_c = flowing_c
        governing = 'flow_residence'

    drift_c = effective_c - set_temperature_c

    warning = None
    if abs(drift_c) >= SIGNIFICANT_DRIFT_C:
        direction = 'cooled' if drift_c < 0 else 'warmed'
        if governing == 'idle_soak':
            cause = (
                f'standing {idle_time_s / 60:.0f} min in the line against a thermal time '
                f'constant of {tau / 60:.0f} min'
            )
        else:
            cause = f'{t_res:.0f} s in the line against a time constant of {tau / 60:.0f} min'
        warning = (
            f'Material reaches the mix head at {effective_c:.1f} °C, {abs(drift_c):.1f} °C '
            f'{direction} from the {set_temperature_c:.1f} °C set point, after {cause}. '
            'The pressure below reflects the temperature at the mix head, not the set point.'
        )

    return {
        'set_temperature_c': set_temperature_c,
        'ambient_temperature_c': ambient_temperature_c,
        'effective_temperature_c': effective_c,
        'drift_c': drift_c,
        'time_constant_s': tau,
        'residence_time_s': t_res,
        'idle_time_s': idle_time_s,
        'soaked_temperature_c': soaked_c,
        'flowing_temperature_c': flowing_c,
        'governing_regime': governing,
        'heat_transfer_coeff_w_m2_k': heat_transfer_coeff_w_m2_k,
        'warning': warning,
    }


__all__ = [
    'DEFAULT_HOSE_HEAT_TRANSFER_W_M2_K',
    'SIGNIFICANT_DRIFT_C',
    'line_time_constant_s',
    'residence_time_s',
    'calculate_line_temperature',
]
