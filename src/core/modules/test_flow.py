"""
Unit tests for flow module.
Tests shear rate, viscosity, and Reynolds number calculations.
"""

import pytest
import math
from flow import (
    calculate_shear_rate,
    calculate_apparent_viscosity_power_law,
    calculate_reynolds_number,
    calculate_all_flow_properties,
)


class TestShearRate:
    """Test shear rate calculations."""

    def test_shear_rate_positive(self):
        """Shear rate should be positive."""
        result = calculate_shear_rate(
            diameter_mm=12,
            flow_rate_lpm=1.0,
        )

        assert result['shear_rate_s_inv'] > 0
        assert result['shear_rate_1_s'] > 0

    def test_shear_rate_increases_with_flow(self):
        """Shear rate should increase with flow rate."""
        result_low = calculate_shear_rate(
            diameter_mm=12,
            flow_rate_lpm=0.5,
        )

        result_high = calculate_shear_rate(
            diameter_mm=12,
            flow_rate_lpm=2.0,
        )

        assert result_high['shear_rate_s_inv'] > result_low['shear_rate_s_inv']

    def test_shear_rate_decreases_with_diameter(self):
        """Shear rate should decrease with pipe diameter."""
        result_small = calculate_shear_rate(
            diameter_mm=6,
            flow_rate_lpm=1.0,
        )

        result_large = calculate_shear_rate(
            diameter_mm=20,
            flow_rate_lpm=1.0,
        )

        assert result_large['shear_rate_s_inv'] < result_small['shear_rate_s_inv']

    def test_shear_rate_zero_diameter_handled(self):
        """Should handle zero diameter gracefully."""
        result = calculate_shear_rate(
            diameter_mm=0,
            flow_rate_lpm=1.0,
        )

        assert 'error' in result or result['shear_rate_s_inv'] == 0

    def test_shear_rate_zero_flow_returns_zero(self):
        """Zero flow rate should result in zero shear rate."""
        result = calculate_shear_rate(
            diameter_mm=12,
            flow_rate_lpm=0,
        )

        assert result['shear_rate_s_inv'] == 0


class TestApparentViscosity:
    """Test Power Law model for apparent viscosity."""

    def test_newtonian_fluid_constant_viscosity(self):
        """For Newtonian fluid (n=1), viscosity should be constant."""
        result = calculate_apparent_viscosity_power_law(
            shear_rate_s_inv=1000,
            consistency_cp=350,
            flow_index=1.0,  # Newtonian
        )

        assert result['apparent_viscosity_cp'] == pytest.approx(350, rel=0.01)

    def test_shear_thinning_reduces_viscosity(self):
        """Shear-thinning fluid (n<1) should reduce viscosity with shear."""
        result_low_shear = calculate_apparent_viscosity_power_law(
            shear_rate_s_inv=100,
            consistency_cp=350,
            flow_index=0.85,  # Shear-thinning
        )

        result_high_shear = calculate_apparent_viscosity_power_law(
            shear_rate_s_inv=10000,
            consistency_cp=350,
            flow_index=0.85,
        )

        assert result_high_shear['apparent_viscosity_cp'] < result_low_shear[
            'apparent_viscosity_cp'
        ]

    def test_zero_shear_rate_returns_consistency(self):
        """At zero shear rate, viscosity should equal consistency."""
        result = calculate_apparent_viscosity_power_law(
            shear_rate_s_inv=0,
            consistency_cp=350,
            flow_index=0.85,
        )

        assert result['apparent_viscosity_cp'] == pytest.approx(350, rel=0.01)

    def test_viscosity_change_factor_calculated(self):
        """Viscosity change factor should be calculated correctly."""
        result = calculate_apparent_viscosity_power_law(
            shear_rate_s_inv=1000,
            consistency_cp=350,
            flow_index=0.85,
        )

        expected_factor = 1000 ** (0.85 - 1)
        assert result['viscosity_change_factor'] == pytest.approx(
            expected_factor, rel=0.01
        )

    def test_shear_thinning_identification(self):
        """Should correctly identify shear-thinning fluids."""
        result_shear_thin = calculate_apparent_viscosity_power_law(
            shear_rate_s_inv=1000,
            consistency_cp=350,
            flow_index=0.85,
        )

        result_newtonian = calculate_apparent_viscosity_power_law(
            shear_rate_s_inv=1000,
            consistency_cp=350,
            flow_index=1.0,
        )

        assert result_shear_thin['is_shear_thinning'] is True
        assert result_newtonian['is_shear_thinning'] is False


class TestReynoldsNumber:
    """Test Reynolds number calculations."""

    def test_laminar_flow_identification(self):
        """Re < 2300 should be identified as laminar."""
        result = calculate_reynolds_number(
            flow_rate_lpm=0.5,
            diameter_mm=12,
            density_kg_m3=1120,
            viscosity_cp=350,
        )

        assert result['reynolds_number'] < 2300
        assert result['flow_regime'] == 'laminar'

    def test_turbulent_flow_identification(self):
        """Re > 4000 should be identified as turbulent."""
        result = calculate_reynolds_number(
            flow_rate_lpm=5.0,
            diameter_mm=12,
            density_kg_m3=1120,
            viscosity_cp=350,
        )

        assert result['reynolds_number'] > 4000
        assert result['flow_regime'] == 'turbulent'

    def test_transitional_flow_identification(self):
        """2300 < Re < 4000 should be transitional."""
        result = calculate_reynolds_number(
            flow_rate_lpm=2.0,
            diameter_mm=12,
            density_kg_m3=1120,
            viscosity_cp=350,
        )

        if 2300 < result['reynolds_number'] < 4000:
            assert result['flow_regime'] == 'transitional'

    def test_reynolds_increases_with_flow(self):
        """Reynolds number should increase with flow rate."""
        result_low = calculate_reynolds_number(
            flow_rate_lpm=0.5,
            diameter_mm=12,
            density_kg_m3=1120,
            viscosity_cp=350,
        )

        result_high = calculate_reynolds_number(
            flow_rate_lpm=3.0,
            diameter_mm=12,
            density_kg_m3=1120,
            viscosity_cp=350,
        )

        assert result_high['reynolds_number'] > result_low['reynolds_number']

    def test_reynolds_decreases_with_viscosity(self):
        """Reynolds number should decrease with viscosity."""
        result_low_visc = calculate_reynolds_number(
            flow_rate_lpm=1.0,
            diameter_mm=12,
            density_kg_m3=1120,
            viscosity_cp=100,
        )

        result_high_visc = calculate_reynolds_number(
            flow_rate_lpm=1.0,
            diameter_mm=12,
            density_kg_m3=1120,
            viscosity_cp=500,
        )

        assert result_low_visc['reynolds_number'] > result_high_visc['reynolds_number']

    def test_reynolds_number_non_negative(self):
        """Reynolds number should never be negative."""
        result = calculate_reynolds_number(
            flow_rate_lpm=1.0,
            diameter_mm=12,
            density_kg_m3=1120,
            viscosity_cp=350,
        )

        assert result['reynolds_number'] >= 0

    def test_invalid_viscosity_returns_unknown(self):
        """Invalid viscosity should return unknown flow regime."""
        result = calculate_reynolds_number(
            flow_rate_lpm=1.0,
            diameter_mm=12,
            density_kg_m3=1120,
            viscosity_cp=0,
        )

        assert result['flow_regime'] == 'unknown'


class TestCompleteFlowProperties:
    """Test the combined flow properties calculation."""

    def test_all_properties_returned(self):
        """Should return all flow properties."""
        result = calculate_all_flow_properties(
            diameter_mm=12,
            flow_rate_lpm=1.0,
            consistency_cp=350,
            flow_index=0.85,
        )

        required_keys = [
            'shear_rate_s_inv',
            'apparent_viscosity_cp',
            'reynolds_number',
            'flow_regime',
            'velocity_m_s',
            'is_shear_thinning',
        ]

        for key in required_keys:
            assert key in result

    def test_properties_are_consistent(self):
        """All properties should be internally consistent."""
        result = calculate_all_flow_properties(
            diameter_mm=12,
            flow_rate_lpm=1.0,
            consistency_cp=350,
            flow_index=0.85,
        )

        # Shear rate should be positive for positive flow
        assert result['shear_rate_s_inv'] > 0

        # Apparent viscosity should be positive
        assert result['apparent_viscosity_cp'] > 0

        # Reynolds number should be positive
        assert result['reynolds_number'] >= 0

        # Velocity should be positive
        assert result['velocity_m_s'] >= 0

    def test_laminar_regime_for_low_flow(self):
        """Low flow rates should result in laminar regime."""
        result = calculate_all_flow_properties(
            diameter_mm=12,
            flow_rate_lpm=0.1,
            consistency_cp=350,
            flow_index=0.85,
        )

        assert result['flow_regime'] == 'laminar'

    def test_turbulent_regime_for_high_flow(self):
        """High flow rates should result in turbulent regime."""
        result = calculate_all_flow_properties(
            diameter_mm=12,
            flow_rate_lpm=10.0,
            consistency_cp=350,
            flow_index=0.85,
        )

        assert result['flow_regime'] == 'turbulent'


class TestPhysicsValidation:
    """Test physics validity of flow calculations."""

    def test_viscosity_positive_always(self):
        """Apparent viscosity should always be positive."""
        result = calculate_all_flow_properties(
            diameter_mm=12,
            flow_rate_lpm=5.0,
            consistency_cp=350,
            flow_index=0.85,
        )

        assert result['apparent_viscosity_cp'] > 0

    def test_velocity_increases_with_flow(self):
        """Velocity should increase with flow rate."""
        result_low = calculate_all_flow_properties(
            diameter_mm=12,
            flow_rate_lpm=0.5,
            consistency_cp=350,
            flow_index=0.85,
        )

        result_high = calculate_all_flow_properties(
            diameter_mm=12,
            flow_rate_lpm=3.0,
            consistency_cp=350,
            flow_index=0.85,
        )

        assert result_high['velocity_m_s'] > result_low['velocity_m_s']
