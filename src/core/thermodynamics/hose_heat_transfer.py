"""
How well a feed hose holds its temperature, worked out from how it is built.

The line thermal model (modules/line_thermal.py) needs one number: the heat transfer
coefficient between the material and the surrounding air. Its default of 10 W/m²·K stands
for a bare hose in still air. Nobody can read that figure off a hose, but anyone can say
what the hose is made of and whether it is lagged — so this module turns that description
into the coefficient.

The heat leaving one metre of hose passes through four layers in series:

    material film   R'_in   = 1 / (h_in · π·D_i)          h_in = Nu·k_liquid / D_i
    hose wall       R'_wall = ln(r_o / r_i) / (2π·k_wall)
    insulation      R'_ins  = ln(r_s / r_o) / (2π·k_ins)
    outer surface   R'_out  = 1 / ((h_conv + h_rad) · 2π·r_s)

(per unit length, K·m/W), where r_s is the outer radius of whatever is outermost. The
overall coefficient the line model needs is referred to the INSIDE surface, because that is
the area its time constant τ = ρ·c_p·D/(4h) was derived with:

    U = 1 / (π·D_i · ΣR')

Two things the earlier version of this module got wrong, and which are the reason for the
rewrite:

- Radiation was charged at the pipe temperature across the outer surface of the insulation,
  so adding insulation INCREASED the heat loss. Here radiation leaves the outermost surface
  only, and is linearised (h_rad = 4·ε·σ·T_m³) so it sits in the same series network as
  everything else. Insulation can therefore only lower U, as it must.
- The laminar Nusselt correlation was fed L/D where the Graetz number needs D/L, which made
  the inside film look about seventy times better at conducting than it is. The material
  inside a feed hose is a viscous liquid in laminar flow, or standing still, so its film is
  taken as fully developed: Nu = 3.66 (Shah & London, constant wall temperature).

Natural convection to still air is taken as a constant 5 W/m²·K. That, plus radiation from a
dark surface (≈5.7 W/m²·K at room temperature), is what the line model's 10 W/m²·K default
already assumed for a bare hose, so a bare rubber hose described here lands close to the
number that was there before.
"""

import math
from typing import Any, Dict, Optional

STEFAN_BOLTZMANN_W_M2_K4 = 5.670374419e-8

# Fully developed laminar flow, constant wall temperature (Shah & London)
LAMINAR_NUSSELT = 3.66

# Thermal conductivity of liquid polyol / isocyanate. Both sit around 0.15–0.2 W/m·K.
DEFAULT_LIQUID_CONDUCTIVITY_W_M_K = 0.17

# Free convection from a hose to still indoor air
STILL_AIR_CONVECTION_W_M2_K = 5.0

# Hose wall materials: conductivity (W/m·K) and the emissivity of the bare surface.
# Rubber and PTFE hoses are usually sleeved in a dark jacket or braid that radiates
# well; bare metal does not.
HOSE_MATERIALS: Dict[str, Dict[str, Any]] = {
    'rubber': {'label': 'Rubber / elastomer hose', 'conductivity': 0.2, 'emissivity': 0.9},
    'ptfe': {'label': 'PTFE hose (braided)', 'conductivity': 0.25, 'emissivity': 0.9},
    'polyamide': {'label': 'Polyamide (nylon) tube', 'conductivity': 0.25, 'emissivity': 0.9},
    'stainless_steel': {'label': 'Stainless steel pipe', 'conductivity': 16.0, 'emissivity': 0.3},
    'steel': {'label': 'Carbon steel pipe', 'conductivity': 50.0, 'emissivity': 0.8},
}

# Insulation: conductivity (W/m·K) and the emissivity of its outer face
INSULATION_MATERIALS: Dict[str, Dict[str, Any]] = {
    'elastomeric_foam': {
        'label': 'Elastomeric foam (Armaflex type)', 'conductivity': 0.036, 'emissivity': 0.9,
    },
    'pe_foam': {'label': 'Polyethylene foam', 'conductivity': 0.040, 'emissivity': 0.9},
    'mineral_wool': {
        'label': 'Mineral wool, foil-faced', 'conductivity': 0.040, 'emissivity': 0.1,
    },
}

DEFAULT_HOSE_MATERIAL = 'rubber'
DEFAULT_WALL_THICKNESS_MM = 3.0


def _radiative_coefficient(emissivity: float, surface_c: float, ambient_c: float) -> float:
    """Linearised radiation, h_rad = ε·σ·(T_s² + T_a²)·(T_s + T_a), in W/m²·K."""
    t_s = surface_c + 273.15
    t_a = ambient_c + 273.15
    return emissivity * STEFAN_BOLTZMANN_W_M2_K4 * (t_s ** 2 + t_a ** 2) * (t_s + t_a)


def calculate_hose_heat_transfer(
    inner_diameter_mm: float,
    hose_material: str = DEFAULT_HOSE_MATERIAL,
    wall_thickness_mm: float = DEFAULT_WALL_THICKNESS_MM,
    insulation_material: Optional[str] = None,
    insulation_thickness_mm: float = 0.0,
    material_temperature_c: float = 25.0,
    ambient_temperature_c: float = 20.0,
    liquid_conductivity_w_m_k: float = DEFAULT_LIQUID_CONDUCTIVITY_W_M_K,
    air_convection_w_m2_k: float = STILL_AIR_CONVECTION_W_M2_K,
) -> Dict[str, Any]:
    """
    Overall heat transfer coefficient of a hose, referred to its inside surface.

    Args:
        inner_diameter_mm: Bore of the hose
        hose_material: Key into HOSE_MATERIALS
        wall_thickness_mm: Hose wall thickness
        insulation_material: Key into INSULATION_MATERIALS, or None for a bare hose
        insulation_thickness_mm: Thickness of the lagging; 0 means none
        material_temperature_c: Temperature of the material inside
        ambient_temperature_c: Temperature of the surrounding air
        liquid_conductivity_w_m_k: Thermal conductivity of the liquid
        air_convection_w_m2_k: Convection coefficient at the outer surface

    Returns:
        Dict with the overall coefficient and the share of the resistance each layer
        contributes — which says at a glance whether lagging would do anything.

    Raises:
        ValueError: for an unknown material or a non-physical dimension
    """
    if hose_material not in HOSE_MATERIALS:
        raise ValueError(
            f'Unknown hose material "{hose_material}" '
            f'(known: {", ".join(HOSE_MATERIALS)})'
        )
    if inner_diameter_mm <= 0:
        raise ValueError('Hose bore must be positive')
    if wall_thickness_mm <= 0:
        raise ValueError('Hose wall thickness must be positive')
    if insulation_thickness_mm < 0:
        raise ValueError('Insulation thickness cannot be negative')

    insulated = bool(insulation_material) and insulation_thickness_mm > 0
    if insulated and insulation_material not in INSULATION_MATERIALS:
        raise ValueError(
            f'Unknown insulation "{insulation_material}" '
            f'(known: {", ".join(INSULATION_MATERIALS)})'
        )

    hose = HOSE_MATERIALS[hose_material]
    r_i = inner_diameter_mm / 2000.0
    r_o = r_i + wall_thickness_mm / 1000.0
    r_s = r_o + (insulation_thickness_mm / 1000.0 if insulated else 0.0)

    # Inside film: laminar, fully developed
    h_in = LAMINAR_NUSSELT * liquid_conductivity_w_m_k / (2 * r_i)
    r_film = 1.0 / (h_in * 2 * math.pi * r_i)

    r_wall = math.log(r_o / r_i) / (2 * math.pi * hose['conductivity'])

    r_ins = 0.0
    surface_emissivity = hose['emissivity']
    if insulated:
        lagging = INSULATION_MATERIALS[insulation_material]
        r_ins = math.log(r_s / r_o) / (2 * math.pi * lagging['conductivity'])
        surface_emissivity = lagging['emissivity']

    # Radiation is linearised about the mean of the material and air temperatures. The
    # outer surface sits somewhere between the two, and the coefficient varies with the
    # cube of absolute temperature, so the error from not iterating on the true surface
    # temperature is a few percent of a term that is itself about half the outer total.
    mean_c = (material_temperature_c + ambient_temperature_c) / 2
    h_rad = _radiative_coefficient(surface_emissivity, mean_c, ambient_temperature_c)
    h_out = air_convection_w_m2_k + h_rad
    r_out = 1.0 / (h_out * 2 * math.pi * r_s)

    r_total = r_film + r_wall + r_ins + r_out
    u_inner = 1.0 / (2 * math.pi * r_i * r_total)

    def share(r: float) -> float:
        return r / r_total

    return {
        'overall_coefficient_w_m2_k': u_inner,
        'heat_loss_w_per_m_k': 1.0 / r_total,
        'hose_material': hose_material,
        'wall_thickness_mm': wall_thickness_mm,
        'insulation_material': insulation_material if insulated else None,
        'insulation_thickness_mm': insulation_thickness_mm if insulated else 0.0,
        'outer_diameter_mm': r_s * 2000.0,
        'inner_film_coefficient_w_m2_k': h_in,
        'outer_coefficient_w_m2_k': h_out,
        'radiative_coefficient_w_m2_k': h_rad,
        'resistance_share': {
            'inner_film': share(r_film),
            'hose_wall': share(r_wall),
            'insulation': share(r_ins),
            'outer_surface': share(r_out),
        },
    }


__all__ = [
    'HOSE_MATERIALS',
    'INSULATION_MATERIALS',
    'DEFAULT_HOSE_MATERIAL',
    'DEFAULT_WALL_THICKNESS_MM',
    'LAMINAR_NUSSELT',
    'calculate_hose_heat_transfer',
]
