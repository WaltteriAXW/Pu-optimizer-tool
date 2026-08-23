"""
Flow properties and regime calculations.
Includes shear rate, apparent viscosity (Power Law model), and Reynolds number.
"""

import math
from typing import Dict

# Reynolds numbers bounding the flow regimes. Below the laminar limit the flow is smooth
# and predictable; above the turbulent limit it is fully turbulent; between the two it is
# transitional, where neither correlation strictly applies.
LAMINAR_REYNOLDS_LIMIT = 2300.0
TURBULENT_REYNOLDS_LIMIT = 4000.0


def classify_flow_regime(reynolds: float) -> str:
    """
    Name the flow regime for a Reynolds number.

    One function so that every caller gives the same answer. The pressure module used to
    collapse the transitional band into 'turbulent' while this module reported three
    regimes, so a line at Re 3000 came back as 'transitional' in the flow block and
    'turbulent' in the pressure block of the same result — two answers to one question,
    both written into the same exported file.
    """
    if reynolds < LAMINAR_REYNOLDS_LIMIT:
        return 'laminar'
    if reynolds < TURBULENT_REYNOLDS_LIMIT:
        return 'transitional'
    return 'turbulent'


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

    return {
        'reynolds_number': reynolds,
        'flow_regime': classify_flow_regime(reynolds),
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


# Bisection settle: 80 halvings takes any starting bracket well below float precision, so
# the answer is limited by the physics, not by the search.
_BISECTION_STEPS = 80


def _reynolds_at(
    diameter_mm: float,
    flow_rate_lpm: float,
    consistency_cp: float,
    flow_index: float,
    density_kg_m3: float,
) -> float:
    """Reynolds number from the shipped pipeline, so the envelope cannot drift from it."""
    return calculate_all_flow_properties(
        diameter_mm=diameter_mm,
        flow_rate_lpm=flow_rate_lpm,
        consistency_cp=consistency_cp,
        flow_index=flow_index,
        density_kg_m3=density_kg_m3,
    ).get('reynolds_number', 0.0)


def calculate_laminar_envelope(
    diameter_mm: float,
    flow_rate_lpm: float,
    consistency_cp: float,
    flow_index: float,
    density_kg_m3: float = 1120.0,
    max_flow_rate_lpm: float = 200.0,
    max_diameter_mm: float = 200.0,
    min_diameter_mm: float = 1.0,
) -> Dict:
    """
    How much room the current settings leave before the flow turns turbulent, and what to
    change if they leave none.

    Turbulent flow in the feed line is the thing this tool exists to avoid, so reporting
    'laminar' without saying how close to the edge that is answers only half the question.

    The threshold is found by bisecting on the shipped pipeline rather than inverting the
    equations. That matters because the fluid is shear-thinning: shear rate rises with flow
    (γ̇ = 4Q/πr³), which thins the material (η = K·γ̇^(n-1)), so Reynolds number goes as
    Q^(2-n) rather than Q — and as D^(3n-4) in diameter, which is why a WIDER pipe is the fix
    for turbulence, not a narrower one. Both exponents move with the material's flow index,
    and a closed form written out here would be one more thing to keep in step with the
    viscosity model. Bisection cannot fall out of step with a function it calls.

    Args:
        diameter_mm: Pipe diameter in millimetres
        flow_rate_lpm: Flow rate in litres per minute
        consistency_cp: Consistency coefficient K, centipoise
        flow_index: Power-law index n (0-1 for shear thinning)
        density_kg_m3: Density in kg/m³
        max_flow_rate_lpm: Upper end of the flow rate the form accepts
        max_diameter_mm: Upper end of the diameter the form accepts
        min_diameter_mm: Lower end of the diameter the form accepts

    Returns:
        Dict describing the envelope. `max_laminar_flow_lpm` is None when the flow rate
        cannot reach turbulence anywhere in the accepted range — a real and common outcome
        with a viscous polyol in a narrow line, and quite different from a tight margin.
    """

    invalid = diameter_mm <= 0 or consistency_cp <= 0 or density_kg_m3 <= 0
    if invalid or flow_rate_lpm <= 0:
        return {
            'reynolds_number': 0.0,
            'flow_regime': 'unknown',
            'is_laminar': True,
            'max_laminar_flow_lpm': None,
            'flow_headroom_ratio': None,
            'min_laminar_diameter_mm': None,
            'recommendation': None,
        }

    reynolds = _reynolds_at(
        diameter_mm, flow_rate_lpm, consistency_cp, flow_index, density_kg_m3
    )
    is_laminar = reynolds < LAMINAR_REYNOLDS_LIMIT

    # ── The flow rate at which this line turns turbulent ──────────────────────────────
    # Re rises monotonically with flow rate, so bisect between a rate known to be laminar
    # and one known not to be.
    max_laminar_flow: float | None = None
    high = max(flow_rate_lpm, max_flow_rate_lpm)
    if _reynolds_at(diameter_mm, high, consistency_cp, flow_index, density_kg_m3) \
            >= LAMINAR_REYNOLDS_LIMIT:
        low = 0.0
        for _ in range(_BISECTION_STEPS):
            mid = (low + high) / 2
            if _reynolds_at(
                diameter_mm, mid, consistency_cp, flow_index, density_kg_m3
            ) < LAMINAR_REYNOLDS_LIMIT:
                low = mid
            else:
                high = mid
        max_laminar_flow = low

    # ── The narrowest pipe that stays laminar at this flow rate ───────────────────────
    # Re FALLS as diameter grows, so the bracket runs the other way.
    min_laminar_diameter: float | None = None
    wide = max(diameter_mm, max_diameter_mm)
    if _reynolds_at(wide, flow_rate_lpm, consistency_cp, flow_index, density_kg_m3) \
            < LAMINAR_REYNOLDS_LIMIT:
        narrow = min(min_diameter_mm, diameter_mm)
        if _reynolds_at(
            narrow, flow_rate_lpm, consistency_cp, flow_index, density_kg_m3
        ) < LAMINAR_REYNOLDS_LIMIT:
            # Laminar across the whole range — the narrowest allowed pipe is already fine.
            min_laminar_diameter = narrow
        else:
            for _ in range(_BISECTION_STEPS):
                mid = (narrow + wide) / 2
                if _reynolds_at(
                    mid, flow_rate_lpm, consistency_cp, flow_index, density_kg_m3
                ) < LAMINAR_REYNOLDS_LIMIT:
                    wide = mid
                else:
                    narrow = mid
            min_laminar_diameter = wide

    headroom = (max_laminar_flow / flow_rate_lpm) if max_laminar_flow else None

    return {
        'reynolds_number': reynolds,
        'flow_regime': classify_flow_regime(reynolds),
        'is_laminar': is_laminar,
        'laminar_limit': LAMINAR_REYNOLDS_LIMIT,
        'max_laminar_flow_lpm': max_laminar_flow,
        'flow_headroom_ratio': headroom,
        'min_laminar_diameter_mm': min_laminar_diameter,
        'recommendation': _envelope_recommendation(
            is_laminar, flow_rate_lpm, diameter_mm, max_laminar_flow,
            min_laminar_diameter, headroom,
        ),
    }


def _envelope_recommendation(
    is_laminar: bool,
    flow_rate_lpm: float,
    diameter_mm: float,
    max_laminar_flow: float | None,
    min_laminar_diameter: float | None,
    headroom: float | None,
) -> str:
    """
    What the operator should actually do, in one sentence.

    A flow regime label tells someone the state they are in; it does not tell them which way
    to move a dial. Where the line is turbulent this names both levers with the figure to set.
    """

    if not is_laminar:
        moves = []
        if max_laminar_flow is not None and max_laminar_flow > 0:
            moves.append(f'drop the flow rate to {max_laminar_flow:.1f} L/min or below')
        if min_laminar_diameter is not None and min_laminar_diameter > diameter_mm:
            moves.append(f'open the line out to {min_laminar_diameter:.1f} mm or wider')
        if not moves:
            return (
                'Flow is turbulent and neither the flow rate nor the pipe diameter can bring '
                'it back within the ranges this tool accepts. A warmer, thinner material or a '
                'different line is needed.'
            )
        return f'Flow is turbulent — {" or ".join(moves)}.'

    if max_laminar_flow is None:
        return (
            'Laminar across the whole flow range this tool accepts. This material in this '
            'line cannot be driven turbulent by flow rate alone.'
        )

    if headroom is not None and headroom < 1.25:
        return (
            f'Laminar, but only just: turbulence begins at {max_laminar_flow:.1f} L/min, '
            f'{(headroom - 1) * 100:.0f}% above the present {flow_rate_lpm:.1f} L/min.'
        )

    return (
        f'Laminar with room to spare — turbulence would not begin until '
        f'{max_laminar_flow:.1f} L/min, {headroom:.1f}× the present flow rate.'
    )
