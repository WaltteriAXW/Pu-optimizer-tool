"""
Environmental impact calculations for polyurethane materials.
Evaluates blowing agents and sustainability aspects.
"""

from typing import Dict


# Material environmental data
MATERIAL_ENVIRONMENTAL_DATA = {
    'ecofoam_standard': {
        'name': 'Standard Polyurethane Foam',
        'blowing_agent': 'CFC/HCFC',
        'gwp': 5000,  # Global Warming Potential (kg CO2-eq per kg material)
        'ozone_depletion_potential': 0.5,
        'toxicity': 'Low',
        'recyclability': 'Low',
        'recommendation': 'Avoid - high environmental impact'
    },
    'ecofoam_hc': {
        'name': 'Ecofoam HC - HFC-245fa Blowing',
        'blowing_agent': 'HFC-245fa',
        'gwp': 1000,
        'ozone_depletion_potential': 0,
        'toxicity': 'Low',
        'recyclability': 'Medium',
        'recommendation': 'Good alternative - moderate impact'
    },
    'ecofoam_water': {
        'name': 'Ecofoam Water-Blown',
        'blowing_agent': 'Water (H2O)',
        'gwp': 0,
        'ozone_depletion_potential': 0,
        'toxicity': 'Low',
        'recyclability': 'High',
        'recommendation': 'Preferred - lowest environmental impact'
    },
    'ecofoam_hfo': {
        'name': 'Ecofoam HFO - Next-gen',
        'blowing_agent': 'HFO-1234ze',
        'gwp': 1,
        'ozone_depletion_potential': 0,
        'toxicity': 'Low',
        'recyclability': 'High',
        'recommendation': 'Best in class - ultra-low impact'
    }
}


def calculate_environmental_impact(
    material_key: str,
    quantity_kg: float,
) -> Dict:
    """
    Calculate environmental impact for a given material and quantity.

    Args:
        material_key: Key of material from MATERIAL_ENVIRONMENTAL_DATA
        quantity_kg: Quantity of material in kilograms

    Returns:
        Dict with environmental impact metrics
    """

    # Get material data (default to standard if not found)
    material = MATERIAL_ENVIRONMENTAL_DATA.get(
        material_key,
        MATERIAL_ENVIRONMENTAL_DATA['ecofoam_standard']
    )

    gwp = material.get('gwp', 0)
    total_gwp_kg_co2_eq = gwp * quantity_kg

    return {
        'material': material.get('name', material_key),
        'material_key': material_key,
        'quantity_kg': quantity_kg,
        'blowing_agent': material.get('blowing_agent', 'Unknown'),
        'gwp_per_kg': gwp,
        'total_gwp_kg_co2_eq': total_gwp_kg_co2_eq,
        'ozone_depletion_potential': material.get('ozone_depletion_potential', 0),
        'toxicity': material.get('toxicity', 'Unknown'),
        'recyclability': material.get('recyclability', 'Unknown'),
        'recommendation': material.get('recommendation', ''),
        'is_eco_friendly': gwp == 0,
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
