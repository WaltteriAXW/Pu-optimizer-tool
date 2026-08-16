"""
Environmental impact calculations for polyurethane materials.
Evaluates blowing agents and sustainability aspects.
"""

from typing import Any, Dict, Optional

from ..data.material_database import get_material


def calculate_environmental_impact(
    material_key: str,
    quantity_kg: float,
    blowing_agent: Optional[str] = None,
    gwp_per_kg: Optional[float] = None,
    is_eco_friendly: Optional[bool] = None,
    material_name: Optional[str] = None,
) -> Dict:
    """
    Calculate environmental impact for a given material and quantity.

    Figures come from the material database CSV, so a material added there reports its own
    blowing agent and GWP with no change here. Explicitly supplied values take precedence,
    which is how user-entered custom materials pass their own data in.

    Args:
        material_key: Material_Key from the database
        quantity_kg: Quantity of material in kilograms
        blowing_agent: Overrides the database value
        gwp_per_kg: GWP in kg CO2-eq per kg, overriding the database value
        is_eco_friendly: Whether neither GWP nor ODP is declared
        material_name: Display name, overriding the database value

    Returns:
        Dict with environmental impact metrics
    """

    profile: Dict[str, Any] = {}
    database_name = None
    try:
        material = get_material(material_key)
        if material is not None:
            profile = material['environmental']
            database_name = material['name']
    except Exception:
        # A missing or malformed database must not take the whole calculation down;
        # the caller-supplied values below still apply.
        profile = {}

    if gwp_per_kg is not None:
        gwp = gwp_per_kg
    elif profile.get('gwp_per_kg') is not None:
        gwp = profile['gwp_per_kg']
    else:
        gwp = 0

    if is_eco_friendly is not None:
        eco_friendly = is_eco_friendly
    elif profile:
        eco_friendly = bool(profile.get('is_eco_friendly'))
    else:
        eco_friendly = gwp == 0

    agent = blowing_agent or profile.get('blowing_agent') or 'Unknown'

    if eco_friendly:
        recommendation = f'Preferred — {agent} with no declared GWP or ODP'
    else:
        recommendation = get_environmental_recommendation(gwp)

    return {
        'material': material_name or database_name or material_key,
        'material_key': material_key,
        'quantity_kg': quantity_kg,
        'blowing_agent': agent,
        'gwp_per_kg': gwp,
        'total_gwp_kg_co2_eq': gwp * quantity_kg,
        'ozone_depletion_potential': 0 if eco_friendly else None,
        'pfas_free': profile.get('pfas_free'),
        'recommendation': recommendation,
        'is_eco_friendly': eco_friendly,
    }


def compare_materials(
    material_keys: list,
    quantity_kg: float,
) -> Dict:
    """
    Compare environmental impact of multiple materials.

    Args:
        material_keys: List of material keys to compare
        quantity_kg: Quantity for each material

    Returns:
        Dict with comparison data
    """

    comparisons = []
    min_gwp = float('inf')
    max_gwp = 0

    for material_key in material_keys:
        impact = calculate_environmental_impact(material_key, quantity_kg)
        comparisons.append(impact)

        total_gwp = impact.get('total_gwp_kg_co2_eq', 0)
        min_gwp = min(min_gwp, total_gwp)
        max_gwp = max(max_gwp, total_gwp)

    # Calculate percentage impact relative to worst option
    for comparison in comparisons:
        total_gwp = comparison.get('total_gwp_kg_co2_eq', 0)
        if max_gwp > 0:
            relative_impact = (total_gwp / max_gwp) * 100
        else:
            relative_impact = 0

        comparison['relative_impact_percent'] = relative_impact

    return {
        'comparisons': comparisons,
        'best_material': min(comparisons, key=lambda x: x['total_gwp_kg_co2_eq']),
        'worst_material': max(comparisons, key=lambda x: x['total_gwp_kg_co2_eq']),
        'min_gwp': min_gwp,
        'max_gwp': max_gwp,
    }


def estimate_co2_offset_equivalent(
    gwp_kg_co2_eq: float,
) -> Dict:
    """
    Estimate CO2 offset requirements (for reference).

    Args:
        gwp_kg_co2_eq: Global warming potential in kg CO2 equivalent

    Returns:
        Dict with offset equivalencies
    """

    # Conversion factors
    trees_to_absorb = gwp_kg_co2_eq / 20  # ~20kg CO2 per tree per year
    car_km_equivalent = gwp_kg_co2_eq / 0.12  # ~120g CO2 per km driven
    flight_hours_equivalent = gwp_kg_co2_eq / 90  # ~90kg CO2 per hour flight

    return {
        'total_gwp_kg_co2_eq': gwp_kg_co2_eq,
        'equivalent_trees_to_absorb_per_year': trees_to_absorb,
        'equivalent_car_km_driven': car_km_equivalent,
        'equivalent_flight_hours': flight_hours_equivalent,
    }


def get_environmental_recommendation(
    gwp_per_kg: float,
) -> str:
    """
    Get environmental recommendation based on GWP.

    Args:
        gwp_per_kg: Global warming potential per kg

    Returns:
        Recommendation text
    """

    if gwp_per_kg == 0:
        return 'BEST - Zero emission material, preferred choice'
    elif gwp_per_kg < 10:
        return 'EXCELLENT - Very low environmental impact'
    elif gwp_per_kg < 100:
        return 'GOOD - Acceptable environmental impact'
    elif gwp_per_kg < 1000:
        return 'FAIR - Moderate environmental impact'
    else:
        return 'POOR - High environmental impact, consider alternatives'
