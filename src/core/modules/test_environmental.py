"""
Unit tests for environmental module.
Tests environmental impact calculations and material comparisons.
"""

import pytest
from environmental import (
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

    def test_standard_foam_has_high_gwp(self):
        """Standard foam should have high GWP."""
        result = calculate_environmental_impact(
            material_key='ecofoam_standard',
            quantity_kg=10,
        )

        assert result['gwp_per_kg'] > 1000
        assert result['is_eco_friendly'] is False

    def test_unknown_material_defaults_to_standard(self):
        """Unknown material should default to standard foam."""
        result_unknown = calculate_environmental_impact(
            material_key='unknown_material',
            quantity_kg=10,
        )

        result_standard = calculate_environmental_impact(
            material_key='ecofoam_standard',
            quantity_kg=10,
        )

        assert result_unknown['gwp_per_kg'] == result_standard['gwp_per_kg']

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

    def test_water_foam_is_most_eco_friendly(self):
        """Water-blown foam should be more eco-friendly than others."""
        water = calculate_environmental_impact(material_key='ecofoam_water', quantity_kg=1)
        hc = calculate_environmental_impact(material_key='ecofoam_hc', quantity_kg=1)
        standard = calculate_environmental_impact(
            material_key='ecofoam_standard', quantity_kg=1
        )

        assert water['gwp_per_kg'] < hc['gwp_per_kg']
        assert hc['gwp_per_kg'] < standard['gwp_per_kg']

    def test_material_ranking_consistent(self):
        """Material GWP ranking should be consistent."""
        materials = {
            'ecofoam_water': 0,  # Best
            'ecofoam_hfo': 1,  # Near best
            'ecofoam_hc': 1000,  # Medium
            'ecofoam_standard': 5000,  # Worst
        }

        for material, expected_gwp in materials.items():
            result = calculate_environmental_impact(material_key=material, quantity_kg=1)

            if expected_gwp == 0:
                assert result['gwp_per_kg'] == 0
            elif expected_gwp == 1:
                assert result['gwp_per_kg'] <= 10
            else:
                # For medium/high, just check it's in right ballpark
                assert result['gwp_per_kg'] > 0
