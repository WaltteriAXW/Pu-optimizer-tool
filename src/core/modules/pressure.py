"""
Pressure drop calculations using Hagen-Poiseuille equation.
Handles both laminar and turbulent flow regimes.
"""

import math
from typing import Any, Dict, Optional

# The regime thresholds and their naming live in flow.py, which owns Reynolds number.
# Importing them keeps this module's reported regime identical to the one the flow block
# reports for the same line — they used to disagree across the transitional band.
from .flow import TURBULENT_REYNOLDS_LIMIT, classify_flow_regime

# Darcy friction factor constant (Swamee-Jain approximation)
SWAMEE_JAIN_COEFFICIENT = 0.25


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

    # Determine flow regime and calculate friction factor.
    # Laminar and transitional both use f = 64/Re: below the laminar limit that is exact
    # (Hagen-Poiseuille), and across the transitional band it is an approximation, since no
    # correlation is reliable there.
    if reynolds < TURBULENT_REYNOLDS_LIMIT:
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
        'flow_regime': classify_flow_regime(reynolds),
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

    friction_factor = SWAMEE_JAIN_COEFFICIENT / (log_term ** 2)

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
    mass_flow_kg_min: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Check this line and this output against what the machine can do.

    Two different quantities are reported here, and conflating them was the fault this
    function used to have:

    LINE DEMAND is hydraulic resistance — the feed-line pressure drop plus the machine's
    own internal losses. It is what the pump must overcome to move material at the set
    output.

    INJECTION PRESSURE is what the gauge reads at the mix head. On a high-pressure machine
    it is 100 bar or more not because anything resists that hard, but because impingement
    mixing needs that jet velocity to mix at all; the pressure is developed by forcing the
    metered flow through small injector orifices. The old code added the machine minimum
    into a single "required pressure" and called the result what the operator should dial
    in, which implies raising pressure pushes more material down the hose. It does not:
    both machine classes here meter with positive-displacement pumps, so the flow rate
    follows pump speed and is very nearly independent of discharge pressure. The extra
    pressure is dissipated across the mix head, downstream of the line being modelled.

    The consequence for the operator is that OUTPUT, not pressure, is the setting that
    moves the process — so it is checked against the machine's own output range here.

    Args:
        total_pressure_bar: Feed-line pressure drop including fitting losses
        machine_specs: One entry from MACHINE_SPECS
        mass_flow_kg_min: Output being run, where the caller knows the mixed density

    Returns:
        Dict describing the line demand, the expected injection pressure and whether the
        output is inside the machine's range.
    """
    max_pressure = machine_specs.get('max_pressure', 200)
    min_pressure = machine_specs.get('min_operating_pressure', 8)
    process_loss = machine_specs.get('process_loss', {}).get('total', 10)

    # What the pump must overcome to move material through the line
    line_demand = total_pressure_bar + process_loss

    # What the gauge will read. The mix head minimum governs whenever the line asks for
    # less, which for a short feed line is essentially always on a high-pressure machine.
    injection_pressure = max(line_demand, min_pressure)
    governed_by = 'mix_head_minimum' if min_pressure > line_demand else 'line_demand'

    # ── Output against the machine's range ────────────────────────────────────────────
    output_range = machine_specs.get('output_range') or {}
    output_min = output_range.get('min')
    output_max = output_range.get('max')

    output_in_range: Optional[bool] = None
    output_warning = None
    if mass_flow_kg_min is not None and output_min is not None and output_max is not None:
        output_in_range = output_min <= mass_flow_kg_min <= output_max
        if mass_flow_kg_min < output_min:
            output_warning = (
                f'Output {mass_flow_kg_min:.1f} kg/min is below the machine minimum of '
                f'{output_min} kg/min. Metering is least accurate at the bottom of the '
                f'range, and the ratio is what suffers first.'
            )
        elif mass_flow_kg_min > output_max:
            output_warning = (
                f'Output {mass_flow_kg_min:.1f} kg/min exceeds the machine maximum of '
                f'{output_max} kg/min. This machine cannot meter this shot.'
            )

    # Only the line demand exceeding the machine's ceiling makes the combination
    # unworkable on pressure; an output the machine cannot meter does too.
    pressure_ok = line_demand <= max_pressure
    is_compatible = pressure_ok and (output_in_range is not False)

    status = 'compatible'
    warning = None
    note = None

    if not pressure_ok:
        status = 'incompatible_high'
        warning = (
            f'The line demands {line_demand:.1f} bar, beyond the machine maximum of '
            f'{max_pressure} bar'
        )
    elif output_in_range is False:
        status = 'output_out_of_range'
        warning = output_warning
    elif governed_by == 'mix_head_minimum':
        status = 'mix_head_governs'
        note = (
            f'The feed line needs only {line_demand:.1f} bar, so the mix head sets the '
            f'pressure: this machine injects at {min_pressure} bar or more because '
            f'impingement mixing requires it. Raising the pressure does not increase '
            f'flow — output follows pump speed.'
        )

    return {
        'is_compatible': is_compatible,
        'status': status,

        # Hydraulic resistance of line plus machine plumbing
        'line_demand_bar': line_demand,
        'process_loss_bar': process_loss,

        # What the gauge reads at the mix head
        'injection_pressure_bar': injection_pressure,
        'injection_pressure_governed_by': governed_by,
        'min_pressure_bar': min_pressure,
        'max_pressure_bar': max_pressure,

        # The setting that actually moves the process
        'output_kg_min': mass_flow_kg_min,
        'output_min_kg_min': output_min,
        'output_max_kg_min': output_max,
        'output_in_range': output_in_range,

        # Mix head shear, which is a property of the mixing element and NOT a feed-line
        # limit — a mechanical rotor runs at 100-1500 1/s, impingement at 2000-10000
        'mix_head_shear_range': machine_specs.get('shear_rate_range'),
        'mix_head_type': machine_specs.get('mix_head_type'),

        'warning': warning,
        'note': note,
    }
