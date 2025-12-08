"""
Unit tests for thermal module.
Tests Arrhenius equation, shear heating, and temperature effects.
"""

import pytest
import math
from thermal import (
    calculate_temperature_dependent_viscosity,
    calculate_shear_heating,
    calculate_viscosity_change_factor,
    estimate_final_temperature,
)


class TestArrheniusEquation:
    """Test Arrhenius equation for temperature-dependent viscosity."""

    def test_reference_temperature_same_viscosity(self):
        """At reference temperature, viscosity should match reference value."""
        result = calculate_temperature_dependent_viscosity(
            reference_temp_c=25,
            reference_viscosity_cp=350,
            activation_energy_j_mol=25000,
            current_temp_c=25,  # Same as reference
        )

        assert result['current_viscosity_cp'] == pytest.approx(350, rel=0.01)
        assert result['temperature_factor'] == pytest.approx(1.0, rel=0.01)

    def test_higher_temperature_reduces_viscosity(self):
        """Higher temperature should reduce viscosity."""
        result_cool = calculate_temperature_dependent_viscosity(
            reference_temp_c=25,
            reference_viscosity_cp=350,
            activation_energy_j_mol=25000,
            current_temp_c=25,
        )

        result_warm = calculate_temperature_dependent_viscosity(
            reference_temp_c=25,
            reference_viscosity_cp=350,
            activation_energy_j_mol=25000,
            current_temp_c=45,
        )

        assert result_warm['current_viscosity_cp'] < result_cool['current_viscosity_cp']
        assert result_warm['temperature_factor'] < 1.0

    def test_lower_temperature_increases_viscosity(self):
        """Lower temperature should increase viscosity."""
        result_warm = calculate_temperature_dependent_viscosity(
            reference_temp_c=25,
            reference_viscosity_cp=350,
            activation_energy_j_mol=25000,
            current_temp_c=25,
        )

        result_cool = calculate_temperature_dependent_viscosity(
            reference_temp_c=25,
            reference_viscosity_cp=350,
            activation_energy_j_mol=25000,
            current_temp_c=5,
        )

        assert result_cool['current_viscosity_cp'] > result_warm['current_viscosity_cp']
        assert result_cool['temperature_factor'] > 1.0

    def test_activation_energy_effect(self):
        """Higher activation energy means stronger temperature dependence."""
        result_low_ea = calculate_temperature_dependent_viscosity(
            reference_temp_c=25,
            reference_viscosity_cp=350,
            activation_energy_j_mol=10000,
            current_temp_c=35,
        )

        result_high_ea = calculate_temperature_dependent_viscosity(
            reference_temp_c=25,
            reference_viscosity_cp=350,
            activation_energy_j_mol=50000,
            current_temp_c=35,
        )

        # Higher EA means stronger temperature effect
        assert abs(result_high_ea['temperature_factor'] - 1.0) > abs(
            result_low_ea['temperature_factor'] - 1.0
        )

    def test_viscosity_ratio_calculation(self):
        """Viscosity ratio should be calculated correctly."""
        result = calculate_temperature_dependent_viscosity(
            reference_temp_c=25,
            reference_viscosity_cp=350,
            activation_energy_j_mol=25000,
            current_temp_c=35,
        )

        expected_ratio = result['current_viscosity_cp'] / 350
        assert result['viscosity_ratio'] == pytest.approx(expected_ratio, rel=0.01)

    def test_invalid_temperature_returns_reference(self):
        """Invalid temperature (< -273.15°C) should return reference viscosity."""
        result = calculate_temperature_dependent_viscosity(
            reference_temp_c=25,
            reference_viscosity_cp=350,
            activation_energy_j_mol=25000,
            current_temp_c=-300,  # Invalid
        )

        assert 'error' in result


class TestShearHeating:
    """Test shear heating calculations."""

    def test_heating_positive_with_positive_pressure(self):
        """Shear heating should be positive with positive pressure."""
        result = calculate_shear_heating(
            pressure_drop_pa=50000,
            flow_rate_lpm=1.0,
            viscosity_cp=350,
            density_kg_m3=1120,
        )

        assert result['temperature_rise_c'] > 0
        assert result['heat_generated_w'] > 0

    def test_heating_increases_with_pressure(self):
        """Higher pressure drop should increase heating."""
        result_low_p = calculate_shear_heating(
            pressure_drop_pa=10000,
            flow_rate_lpm=1.0,
            viscosity_cp=350,
            density_kg_m3=1120,
        )

        result_high_p = calculate_shear_heating(
            pressure_drop_pa=100000,
            flow_rate_lpm=1.0,
            viscosity_cp=350,
            density_kg_m3=1120,
        )

        assert result_high_p['temperature_rise_c'] > result_low_p['temperature_rise_c']

    def test_heating_increases_with_flow_rate(self):
        """Higher flow rate should increase heating."""
        result_low_q = calculate_shear_heating(
            pressure_drop_pa=50000,
            flow_rate_lpm=0.5,
            viscosity_cp=350,
            density_kg_m3=1120,
        )

        result_high_q = calculate_shear_heating(
            pressure_drop_pa=50000,
            flow_rate_lpm=2.0,
            viscosity_cp=350,
            density_kg_m3=1120,
        )

        assert result_high_q['temperature_rise_c'] > result_low_q['temperature_rise_c']

    def test_efficiency_affects_heat(self):
        """Better efficiency should reduce heat generated."""
        result_poor_eff = calculate_shear_heating(
            pressure_drop_pa=50000,
            flow_rate_lpm=1.0,
            viscosity_cp=350,
            density_kg_m3=1120,
            efficiency=0.7,  # 70% efficient = 30% loss
        )

        result_good_eff = calculate_shear_heating(
            pressure_drop_pa=50000,
            flow_rate_lpm=1.0,
            viscosity_cp=350,
            density_kg_m3=1120,
            efficiency=0.95,  # 95% efficient = 5% loss
        )

        assert result_poor_eff['heat_generated_w'] > result_good_eff['heat_generated_w']

    def test_zero_flow_no_heating(self):
        """Zero flow rate should result in no heating."""
        result = calculate_shear_heating(
            pressure_drop_pa=50000,
            flow_rate_lpm=0,
            viscosity_cp=350,
            density_kg_m3=1120,
        )

        assert result['temperature_rise_c'] == 0
        assert result['heat_generated_w'] == 0


class TestViscosityChangeFactor:
    """Test quick viscosity change factor."""

    def test_reference_temperature_factor_one(self):
        """At reference temperature, factor should be 1.0."""
        factor = calculate_viscosity_change_factor(
            temperature_c=25,
            reference_temp_c=25,
            flow_index=0.85,
        )

        assert factor == pytest.approx(1.0, rel=0.01)

    def test_higher_temp_reduces_factor(self):
        """Higher temperature should reduce viscosity factor."""
        factor_cool = calculate_viscosity_change_factor(
            temperature_c=25,
            reference_temp_c=25,
        )

        factor_warm = calculate_viscosity_change_factor(
            temperature_c=35,
            reference_temp_c=25,
        )

        assert factor_warm < factor_cool

    def test_lower_temp_increases_factor(self):
        """Lower temperature should increase viscosity factor."""
        factor_ref = calculate_viscosity_change_factor(
            temperature_c=25,
            reference_temp_c=25,
        )

        factor_cool = calculate_viscosity_change_factor(
            temperature_c=15,
            reference_temp_c=25,
        )

        assert factor_cool > factor_ref


class TestFinalTemperatureEstimate:
    """Test final temperature estimation."""

    def test_final_temp_includes_all_factors(self):
        """Final temperature should account for all factors."""
        result = estimate_final_temperature(
            initial_temp_c=25,
            shear_heating_c=10,
            ambient_loss_c=2,
        )

        expected = 25 + 10 - 2
        assert result['final_temp_c'] == pytest.approx(expected)

    def test_shear_heating_increases_temp(self):
        """Shear heating should increase final temperature."""
        result_no_heat = estimate_final_temperature(
            initial_temp_c=25,
            shear_heating_c=0,
            ambient_loss_c=1,
        )

        result_with_heat = estimate_final_temperature(
            initial_temp_c=25,
            shear_heating_c=10,
            ambient_loss_c=1,
        )

        assert result_with_heat['final_temp_c'] > result_no_heat['final_temp_c']

    def test_ambient_loss_decreases_temp(self):
        """Ambient loss should decrease final temperature."""
        result_no_loss = estimate_final_temperature(
            initial_temp_c=25,
            shear_heating_c=10,
            ambient_loss_c=0,
        )

        result_with_loss = estimate_final_temperature(
            initial_temp_c=25,
            shear_heating_c=10,
            ambient_loss_c=5,
        )

        assert result_with_loss['final_temp_c'] < result_no_loss['final_temp_c']


class TestPhysicsValidation:
    """Test physics validity of thermal calculations."""

    def test_viscosity_always_positive(self):
        """Viscosity should never be negative."""
        result = calculate_temperature_dependent_viscosity(
            reference_temp_c=25,
            reference_viscosity_cp=350,
            activation_energy_j_mol=25000,
            current_temp_c=50,
        )

        assert result['current_viscosity_cp'] > 0

    def test_temperature_rise_non_negative(self):
        """Temperature rise should not be negative."""
        result = calculate_shear_heating(
            pressure_drop_pa=50000,
            flow_rate_lpm=1.0,
            viscosity_cp=350,
            density_kg_m3=1120,
            efficiency=0.9,
        )

        assert result['temperature_rise_c'] >= 0

    def test_reasonable_viscosity_values(self):
        """Viscosity should stay within reasonable bounds."""
        result = calculate_temperature_dependent_viscosity(
            reference_temp_c=25,
            reference_viscosity_cp=350,
            activation_energy_j_mol=25000,
            current_temp_c=100,  # High temperature
        )

        # Even at high temp, viscosity shouldn't go to zero
        assert result['current_viscosity_cp'] > 0.1
        # But shouldn't exceed ridiculous values
        assert result['current_viscosity_cp'] < 100000
