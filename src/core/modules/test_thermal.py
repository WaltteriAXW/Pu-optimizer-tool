"""
Unit tests for thermal module.
Tests Arrhenius equation, shear heating, and temperature effects.
"""

import pytest
import math
from . import thermal
from .thermal import (
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

    def test_heat_scales_with_flow_rate_but_temperature_rise_does_not(self):
        """Heat generated scales with flow rate; the temperature rise does not.

        At a fixed pressure drop the dissipated power and the mass flow both scale
        linearly with Q, so ΔT = ΔP/(ρ·c_p) cancels out and depends only on the pressure
        drop. Expecting ΔT to climb with flow rate misreads the model.
        """
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

        assert result_high_q['heat_generated_w'] > result_low_q['heat_generated_w']
        assert result_high_q['temperature_rise_c'] == pytest.approx(
            result_low_q['temperature_rise_c'], rel=1e-9
        )

    def test_all_of_the_pressure_drop_becomes_heat(self):
        """A pipe does no useful work, so dissipation is the full hydraulic power.

        There is no efficiency term here: efficiency describes a pump converting shaft
        power into flow work, whereas everything a pipe takes out of the flow ends up as
        heat in the fluid.
        """
        pressure_drop_pa = 50000
        flow_rate_lpm = 1.0

        result = calculate_shear_heating(
            pressure_drop_pa=pressure_drop_pa,
            flow_rate_lpm=flow_rate_lpm,
            viscosity_cp=350,
            density_kg_m3=1120,
        )

        expected_w = pressure_drop_pa * (flow_rate_lpm / 60000)
        assert result['heat_generated_w'] == pytest.approx(expected_w, rel=1e-9)

    def test_temperature_rise_is_pressure_over_rho_cp(self):
        """ΔT = ΔP / (ρ·c_p) — the flow rate cancels out."""
        pressure_drop_pa = 7_500_000  # 75 bar
        density = 1149.0
        specific_heat = 2100.0

        result = calculate_shear_heating(
            pressure_drop_pa=pressure_drop_pa,
            flow_rate_lpm=5.0,
            viscosity_cp=350,
            density_kg_m3=density,
            specific_heat_j_kg_k=specific_heat,
        )

        expected_c = pressure_drop_pa / (density * specific_heat)
        assert result['temperature_rise_c'] == pytest.approx(expected_c, rel=1e-9)
        # Even at 75 bar this is only a few degrees, which is why it is not fed back
        # into the viscosity calculation
        assert 2.0 < result['temperature_rise_c'] < 4.0

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


class TestActivationEnergyFromReadings:
    """Activation energy from two viscosity readings (custom material form)."""

    def test_formula_matches_worked_example(self):
        # 1000 cP at 20 °C and 600 cP at 30 °C: R ln(1000/600) / (1/293.15 - 1/303.15)
        result = thermal.activation_energy_from_readings(1000, 20, 600, 30)
        assert result['error'] is None
        assert result['unrounded_j_mol'] == pytest.approx(37742, abs=1)
        assert result['activation_energy_j_mol'] == 37700

    def test_order_of_readings_does_not_matter(self):
        forward = thermal.activation_energy_from_readings(1000, 20, 600, 30)
        backward = thermal.activation_energy_from_readings(600, 30, 1000, 20)
        assert backward['activation_energy_j_mol'] == forward['activation_energy_j_mol']

    def test_rounds_to_nearest_100(self):
        result = thermal.activation_energy_from_readings(350, 25, 200, 40)
        assert result['activation_energy_j_mol'] % 100 == 0
        assert abs(result['activation_energy_j_mol'] - result['unrounded_j_mol']) <= 50

    def test_round_trips_through_arrhenius(self):
        # A viscosity generated with a known Ea gives that Ea back
        second = calculate_temperature_dependent_viscosity(25, 350, 30000, 45)['current_viscosity_cp']
        result = thermal.activation_energy_from_readings(350, 25, second, 45)
        assert result['unrounded_j_mol'] == pytest.approx(30000, rel=1e-9)

    @pytest.mark.parametrize('temp_2_c', [25, 21, 29.9, 20.1])
    def test_rejects_second_temperature_within_5_c(self, temp_2_c):
        result = thermal.activation_energy_from_readings(350, 25, 300, temp_2_c)
        assert result['activation_energy_j_mol'] is None
        assert result['error'] == 'The second temperature must differ from 25 °C by at least 5 °C.'

    def test_accepts_exactly_5_c_apart(self):
        assert thermal.activation_energy_from_readings(350, 25, 320, 30)['error'] is None

    @pytest.mark.parametrize('viscosity_2_cp, temp_2_c', [
        (400, 40),  # thicker when warmer
        (350, 40),  # unchanged when warmer
        (300, 10),  # thinner when cooler
    ])
    def test_rejects_viscosity_not_lower_at_higher_temperature(self, viscosity_2_cp, temp_2_c):
        result = thermal.activation_energy_from_readings(350, 25, viscosity_2_cp, temp_2_c)
        assert result['activation_energy_j_mol'] is None
        assert result['error'] == 'Viscosity must be lower at the higher temperature. Check the two readings.'

    def test_rejects_result_below_range_without_clamping(self):
        # Barely any change over 35 °C: far below 1,000 J/mol
        result = thermal.activation_energy_from_readings(350, 25, 349, 60)
        assert result['activation_energy_j_mol'] is None
        assert result['unrounded_j_mol'] < 1000
        assert 'outside the expected range of 1,000–100,000 J/mol' in result['error']

    def test_rejects_result_above_range_without_clamping(self):
        # A hundredfold drop over 10 °C: far above 100,000 J/mol
        result = thermal.activation_energy_from_readings(5000, 25, 50, 35)
        assert result['activation_energy_j_mol'] is None
        assert result['unrounded_j_mol'] > 100000
        assert 'outside the expected range of 1,000–100,000 J/mol' in result['error']

    @pytest.mark.parametrize('bad', [0, -10, None, 'abc', float('nan')])
    def test_rejects_non_positive_or_non_numeric_viscosity(self, bad):
        result = thermal.activation_energy_from_readings(350, 25, bad, 40)
        assert result['activation_energy_j_mol'] is None
        assert result['error']


class TestResolveActivationEnergy:
    """Which activation energy a custom material calculates with, and its source."""

    def test_default_when_no_second_reading(self):
        result = thermal.resolve_activation_energy({'viscosity_cp': 350})
        assert result == {'activation_energy_j_mol': 25000.0, 'source': 'default', 'error': None}

    def test_calculated_from_second_reading_at_25_c_reference(self):
        result = thermal.resolve_activation_energy(
            {'viscosity_cp': 350, 'viscosity_2_cp': 200, 'viscosity_2_temp_c': 40}
        )
        assert result['source'] == 'calculated'
        assert result['activation_energy_j_mol'] == thermal.activation_energy_from_readings(
            350, 25, 200, 40
        )['activation_energy_j_mol']

    def test_typed_value_wins_and_is_marked_user(self):
        # Saved runs and imported datasets carry a typed value: it must be used unchanged
        result = thermal.resolve_activation_energy(
            {'viscosity_cp': 350, 'activation_energy_j_mol': 31234,
             'viscosity_2_cp': 200, 'viscosity_2_temp_c': 40}
        )
        assert result == {'activation_energy_j_mol': 31234.0, 'source': 'user', 'error': None}

    @pytest.mark.parametrize('half', [{'viscosity_2_cp': 200}, {'viscosity_2_temp_c': 40}])
    def test_one_of_the_pair_alone_is_an_error(self, half):
        result = thermal.resolve_activation_energy({'viscosity_cp': 350, **half})
        assert result['activation_energy_j_mol'] is None
        assert 'leave both empty' in result['error']
