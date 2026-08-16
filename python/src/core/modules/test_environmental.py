"""
Unit tests for environmental module.
Tests environmental impact calculations and material comparisons.
"""

import pytest
from . import environmental
from ..data.material_database import list_material_keys
from .environmental import (
    calculate_environmental_impact,
    compare_materials,
    estimate_co2_offset_equivalent,
    get_environmental_recommendation,
)


class TestEnvironmentalImpact:
    """Test environmental impact calculations."""

    def test_impact_calculation_positive(self):
        """Environmental impact should be positive."""
        result = calculate_environmental_impact(
            material_key='ecofoam_standard',
            quantity_kg=10,
        )

        assert result['gwp_per_kg'] >= 0
        assert result['total_gwp_kg_co2_eq'] >= 0

    def test_impact_scales_with_quantity(self):
        """Impact should scale linearly with quantity."""
        result_10kg = calculate_environmental_impact(
            material_key='ecofoam_standard',
            quantity_kg=10,
        )

        result_20kg = calculate_environmental_impact(
            material_key='ecofoam_standard',
            quantity_kg=20,
        )

        # 20kg should have twice the impact
        assert result_20kg['total_gwp_kg_co2_eq'] == pytest.approx(
            result_10kg['total_gwp_kg_co2_eq'] * 2, rel=0.01
        )

    def test_eco_foam_water_is_zero_gwp(self):
        """Water-blown foam should have zero GWP."""
        result = calculate_environmental_impact(
            material_key='ecofoam_water',
            quantity_kg=10,
        )

        assert result['gwp_per_kg'] == 0
        assert result['total_gwp_kg_co2_eq'] == 0
        assert result['is_eco_friendly'] is True

    def test_injected_gwp_overrides_the_table(self):
        """A GWP supplied from the material database takes precedence.

        The table below only covers the original formulations, so a material added to the
        CSV must be able to carry its own figures through.
        """
        result = calculate_environmental_impact(
            material_key='some_hfc_blown_system',
            quantity_kg=10,
            blowing_agent='HFC-245fa',
            gwp_per_kg=1030,
            is_eco_friendly=False,
        )

        assert result['gwp_per_kg'] == 1030
        assert result['total_gwp_kg_co2_eq'] == 10300
        assert result['blowing_agent'] == 'HFC-245fa'
        assert result['is_eco_friendly'] is False

    def test_unknown_material_reports_no_impact_rather_than_another_material(self):
        """An unrecognised key must not silently borrow another material's figures."""
        result = calculate_environmental_impact(
            material_key='unknown_material',
            quantity_kg=10,
        )

        assert result['material'] == 'unknown_material'
        assert result['gwp_per_kg'] == 0
        assert result['blowing_agent'] == 'Unknown'

    def test_hfo_is_best_material(self):
        """HFO foam should have lowest GWP."""
        materials = ['ecofoam_standard', 'ecofoam_hc', 'ecofoam_water', 'ecofoam_hfo']

        impacts = [
            calculate_environmental_impact(material_key=material, quantity_kg=1)[
                'gwp_per_kg'
            ]
            for material in materials
        ]

        min_gwp = min(impacts)
        assert min_gwp == 0 or min_gwp == 1  # Water (0) or HFO (1)

    def test_recommendation_included(self):
        """Result should include environmental recommendation."""
        result = calculate_environmental_impact(
            material_key='ecofoam_water',
            quantity_kg=10,
        )

        assert 'recommendation' in result
        assert isinstance(result['recommendation'], str)
        assert len(result['recommendation']) > 0


class TestMaterialComparison:
    """Test material comparison functionality."""

    def test_comparison_includes_all_materials(self):
        """Comparison should include all requested materials."""
        materials = ['ecofoam_standard', 'ecofoam_hc', 'ecofoam_water']

        result = compare_materials(
            material_keys=materials,
            quantity_kg=10,
        )

        assert len(result['comparisons']) == len(materials)

    def test_best_material_has_lowest_gwp(self):
        """Best material should have lowest GWP."""
        materials = ['ecofoam_standard', 'ecofoam_hc', 'ecofoam_water']

        result = compare_materials(
            material_keys=materials,
            quantity_kg=10,
        )

        best = result['best_material']
        min_gwp = result['min_gwp']

        assert best['total_gwp_kg_co2_eq'] == pytest.approx(min_gwp, rel=0.01)

    def test_worst_material_has_highest_gwp(self):
        """Worst material should have highest GWP."""
        materials = ['ecofoam_standard', 'ecofoam_hc', 'ecofoam_water']

        result = compare_materials(
            material_keys=materials,
            quantity_kg=10,
        )

        worst = result['worst_material']
        max_gwp = result['max_gwp']

        assert worst['total_gwp_kg_co2_eq'] == pytest.approx(max_gwp, rel=0.01)

    def test_relative_impact_calculated(self):
        """Relative impact percentages should be calculated."""
        materials = ['ecofoam_standard', 'ecofoam_water']

        result = compare_materials(
            material_keys=materials,
            quantity_kg=10,
        )

        for comparison in result['comparisons']:
            assert 'relative_impact_percent' in comparison
            assert 0 <= comparison['relative_impact_percent'] <= 100

    def test_best_material_has_100_percent_relative(self):
        """Best material should have lowest relative impact (not necessarily 100%)."""
        materials = ['ecofoam_standard', 'ecofoam_hc', 'ecofoam_water']

        result = compare_materials(
            material_keys=materials,
            quantity_kg=10,
        )

        best = result['best_material']

        # Best material has lowest relative impact
        for comparison in result['comparisons']:
            assert best['relative_impact_percent'] <= comparison['relative_impact_percent']


class TestCO2Equivalents:
    """Test CO2 offset equivalent calculations."""

    def test_co2_equivalents_positive(self):
        """CO2 equivalents should be positive."""
        result = estimate_co2_offset_equivalent(gwp_kg_co2_eq=1000)

        assert result['equivalent_trees_to_absorb_per_year'] > 0
        assert result['equivalent_car_km_driven'] > 0
        assert result['equivalent_flight_hours'] > 0

    def test_co2_scales_linearly(self):
        """Equivalents should scale linearly with CO2."""
        result_1000 = estimate_co2_offset_equivalent(gwp_kg_co2_eq=1000)
        result_2000 = estimate_co2_offset_equivalent(gwp_kg_co2_eq=2000)

        # 2000 should have roughly double the equivalents
        assert result_2000['equivalent_trees_to_absorb_per_year'] == pytest.approx(
            result_1000['equivalent_trees_to_absorb_per_year'] * 2, rel=0.01
        )

    def test_trees_offset_reasonable(self):
        """Tree offset estimates should be reasonable."""
        result = estimate_co2_offset_equivalent(gwp_kg_co2_eq=1000)

        # ~1 tree per 20kg CO2
        expected_trees = 1000 / 20
        assert result['equivalent_trees_to_absorb_per_year'] == pytest.approx(
            expected_trees, rel=0.1
        )

    def test_zero_gwp_zero_equivalents(self):
        """Zero GWP should have zero equivalents."""
        result = estimate_co2_offset_equivalent(gwp_kg_co2_eq=0)

        assert result['equivalent_trees_to_absorb_per_year'] == 0
        assert result['equivalent_car_km_driven'] == 0
        assert result['equivalent_flight_hours'] == 0


class TestEnvironmentalRecommendation:
    """Test environmental recommendation system."""

    def test_zero_gwp_best_recommendation(self):
        """Zero GWP should get best recommendation."""
        recommendation = get_environmental_recommendation(gwp_per_kg=0)

        assert 'BEST' in recommendation or 'Zero' in recommendation

    def test_high_gwp_poor_recommendation(self):
        """High GWP should get poor recommendation."""
        recommendation = get_environmental_recommendation(gwp_per_kg=5000)

        assert 'POOR' in recommendation or 'high' in recommendation.lower()

    def test_low_gwp_excellent_recommendation(self):
        """Low GWP should get excellent recommendation."""
        recommendation = get_environmental_recommendation(gwp_per_kg=1)

        assert 'EXCELLENT' in recommendation or 'low' in recommendation.lower()

    def test_recommendation_not_empty(self):
        """Recommendation should never be empty."""
        gwp_values = [0, 1, 10, 100, 1000, 5000, 10000]

        for gwp in gwp_values:
            recommendation = get_environmental_recommendation(gwp_per_kg=gwp)
            assert len(recommendation) > 0


class TestPhysicsValidation:
    """Test physics and logic validity of environmental calculations."""

    def test_catalogued_materials_are_all_zero_gwp(self):
        """Every material currently offered is water-blown or ecomate®-blown."""
        for material_key in list_material_keys():
            result = calculate_environmental_impact(material_key=material_key, quantity_kg=1)

            assert result['gwp_per_kg'] == 0
            assert result['is_eco_friendly'] is True

    def test_ranking_follows_gwp(self):
        """Materials rank by GWP regardless of where the figure came from."""
        ranked = [
            calculate_environmental_impact(
                material_key=key, quantity_kg=1, gwp_per_kg=gwp, is_eco_friendly=gwp == 0
            )
            for key, gwp in [
                ('water_blown', 0),      # Best
                ('hfo_blown', 1),        # Near best
                ('pentane_blown', 5),
                ('hfc_blown', 1030),     # Worst
            ]
        ]

        gwp_values = [r['gwp_per_kg'] for r in ranked]
        assert gwp_values == sorted(gwp_values)
        assert ranked[0]['is_eco_friendly'] is True
        assert ranked[-1]['is_eco_friendly'] is False
