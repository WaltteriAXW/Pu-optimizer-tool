"""
Unit tests for pressure module.
Tests Darcy-Weisbach equation, friction factor, and machine compatibility.
"""

import pytest
import math
from . import pressure
from .pressure import (
    calculate_pressure_drop,
    swamee_jain_friction_factor,
    calculate_pressure_with_fittings,
    calculate_machine_compatibility,
)


class TestPressureDrop:
    """Test pressure drop calculations."""

    def test_laminar_flow_pressure_drop(self):
        """Test pressure drop in laminar flow regime."""
        result = calculate_pressure_drop(
            diameter_mm=12,
            length_mm=500,
            flow_rate_lpm=0.5,
            viscosity_cp=350,
            density_kg_m3=1120,
        )

        assert result['pressure_drop_pa'] > 0
        assert result['pressure_drop_bar'] > 0
        assert result['flow_regime'] == 'laminar'
        assert result['reynolds_number'] < 2300

    def test_turbulent_flow_pressure_drop(self):
        """Test pressure drop in turbulent flow regime.

        A polyurethane system at a few hundred cP is laminar in these line sizes, so a
        low viscosity is used to reach the Swamee-Jain branch.
        """
        result = calculate_pressure_drop(
            diameter_mm=12,
            length_mm=500,
            flow_rate_lpm=5.0,
            viscosity_cp=1.0,
            density_kg_m3=1120,
        )

        assert result['pressure_drop_pa'] > 0
        assert result['flow_regime'] == 'turbulent'
        assert result['reynolds_number'] > 4000

    def test_pressure_increases_with_length(self):
        """Longer pipes should have higher pressure drop."""
        result_short = calculate_pressure_drop(
            diameter_mm=12,
            length_mm=500,
            flow_rate_lpm=1.0,
            viscosity_cp=350,
        )

        result_long = calculate_pressure_drop(
            diameter_mm=12,
            length_mm=1000,
            flow_rate_lpm=1.0,
            viscosity_cp=350,
        )

        assert result_long['pressure_drop_pa'] > result_short['pressure_drop_pa']

    def test_pressure_decreases_with_diameter(self):
        """Larger diameter pipes should have lower pressure drop."""
        result_small = calculate_pressure_drop(
            diameter_mm=6,
            length_mm=500,
            flow_rate_lpm=1.0,
            viscosity_cp=350,
        )

        result_large = calculate_pressure_drop(
            diameter_mm=20,
            length_mm=500,
            flow_rate_lpm=1.0,
            viscosity_cp=350,
        )

        assert result_large['pressure_drop_pa'] < result_small['pressure_drop_pa']

    def test_zero_diameter_returns_valid(self):
        """Should handle edge case of zero diameter."""
        result = calculate_pressure_drop(
            diameter_mm=0,
            length_mm=500,
            flow_rate_lpm=1.0,
            viscosity_cp=350,
        )

        assert 'error' in result or result['pressure_drop_pa'] == 0

    def test_pressure_units_conversion(self):
        """Test pressure unit conversions."""
        result = calculate_pressure_drop(
            diameter_mm=12,
            length_mm=500,
            flow_rate_lpm=1.0,
            viscosity_cp=350,
        )

        # 1 bar = 100,000 Pa
        expected_bar = result['pressure_drop_pa'] / 100000
        assert abs(result['pressure_drop_bar'] - expected_bar) < 0.001


class TestFrictionFactor:
    """Test Swamee-Jain friction factor calculation."""

    def test_laminar_flow_friction_factor(self):
        """For laminar flow, f = 64/Re."""
        result = calculate_pressure_drop(
            diameter_mm=12,
            length_mm=100,
            flow_rate_lpm=0.1,
            viscosity_cp=350,
        )

        re = result['reynolds_number']
        expected_f = 64 / re if re > 0 else 0
        assert abs(result['friction_factor'] - expected_f) < 0.01

    def test_turbulent_friction_factor_positive(self):
        """Friction factor should be positive and bounded in turbulent flow.

        The 0.1 ceiling is the Swamee-Jain clamp, which only applies to the turbulent
        branch — in laminar flow f = 64/Re legitimately exceeds 1 at low Reynolds numbers.
        """
        result = calculate_pressure_drop(
            diameter_mm=12,
            length_mm=500,
            flow_rate_lpm=5.0,
            viscosity_cp=1.0,
        )

        assert result['flow_regime'] == 'turbulent'
        assert result['friction_factor'] > 0
        assert result['friction_factor'] < 0.1

    def test_swamee_jain_bounds(self):
        """Test friction factor bounds."""
        # Test typical turbulent Reynolds number
        f = swamee_jain_friction_factor(reynolds=10000, relative_roughness=0.0001)

        assert f >= 0.008
        assert f <= 0.1


class TestFittingLosses:
    """Test fitting loss calculations."""

    def test_fitting_losses_percentage(self):
        """Typical fitting losses are 15% of base pressure."""
        result = calculate_pressure_with_fittings(
            base_pressure_bar=10.0,
            fitting_loss_multiplier=0.15,
        )

        assert result['fitting_loss_bar'] == pytest.approx(1.5, abs=0.01)
        assert result['total_pressure_bar'] == pytest.approx(11.5, abs=0.01)

    def test_total_pressure_equals_sum(self):
        """Total pressure should equal base + fitting losses."""
        base = 12.0
        result = calculate_pressure_with_fittings(
            base_pressure_bar=base,
            fitting_loss_multiplier=0.20,
        )

        expected_total = base + (base * 0.20)
        assert result['total_pressure_bar'] == pytest.approx(expected_total, abs=0.001)


class TestMachineCompatibility:
    """Test machine compatibility checking."""

    def test_compatible_high_pressure(self):
        """Test compatibility with high-pressure machine."""
        machine_specs = {
            'max_pressure': 200,
            'min_operating_pressure': 100,
            'process_loss': {'total': 25},
        }

        result = calculate_machine_compatibility(
            total_pressure_bar=120,
            machine_specs=machine_specs,
        )

        assert result['is_compatible'] is True
        assert result['status'] == 'compatible'

    def test_incompatible_pressure_too_high(self):
        """Test incompatibility when pressure exceeds maximum."""
        machine_specs = {
            'max_pressure': 150,
            'min_operating_pressure': 100,
            'process_loss': {'total': 25},
        }

        result = calculate_machine_compatibility(
            total_pressure_bar=200,
            machine_specs=machine_specs,
        )

        assert result['is_compatible'] is False
        assert result['status'] == 'incompatible_high'

    def test_below_minimum_is_compatible_with_note(self):
        """A demand below the machine minimum is normal, not an incompatibility."""
        machine_specs = {
            'max_pressure': 200,
            'min_operating_pressure': 100,
            'process_loss': {'total': 25},
        }

        result = calculate_machine_compatibility(
            total_pressure_bar=50,
            machine_specs=machine_specs,
        )

        # The machine simply holds at its minimum; there is ample pressure available.
        assert result['is_compatible'] is True
        assert result['status'] == 'below_machine_minimum'
        assert result['warning'] is None
        assert result['note'] is not None

    def test_required_pressure_calculation(self):
        """Test required pressure includes process loss."""
        machine_specs = {
            'max_pressure': 200,
            'min_operating_pressure': 100,
            'process_loss': {'total': 25},
        }

        result = calculate_machine_compatibility(
            total_pressure_bar=100,
            machine_specs=machine_specs,
        )

        # Required = line pressure drop + machine process loss
        assert result['required_pressure_bar'] == pytest.approx(125, abs=0.1)


class TestPhysicsValidation:
    """Test physics validity of results."""

    def test_pressure_drop_non_negative(self):
        """Pressure drop should never be negative."""
        result = calculate_pressure_drop(
            diameter_mm=12,
            length_mm=500,
            flow_rate_lpm=1.0,
            viscosity_cp=350,
        )

        assert result['pressure_drop_pa'] >= 0
        assert result['pressure_drop_bar'] >= 0

    def test_reynolds_scales_with_flow_rate(self):
        """Reynolds number should increase with flow rate."""
        result_low = calculate_pressure_drop(
            diameter_mm=12,
            length_mm=500,
            flow_rate_lpm=0.5,
            viscosity_cp=350,
        )

        result_high = calculate_pressure_drop(
            diameter_mm=12,
            length_mm=500,
            flow_rate_lpm=2.0,
            viscosity_cp=350,
        )

        assert result_high['reynolds_number'] > result_low['reynolds_number']

    def test_velocity_increases_with_flow(self):
        """Velocity should increase with flow rate."""
        result_low = calculate_pressure_drop(
            diameter_mm=12,
            length_mm=500,
            flow_rate_lpm=0.5,
            viscosity_cp=350,
        )

        result_high = calculate_pressure_drop(
            diameter_mm=12,
            length_mm=500,
            flow_rate_lpm=2.0,
            viscosity_cp=350,
        )

        assert result_high['velocity_m_s'] > result_low['velocity_m_s']


class TestSetPressure:
    """
    The pressure the operator dials in, as distinct from the pressure the line demands.
    These are different numbers and the tool used to give both the same name.
    """

    HIGH_PRESSURE = {
        'max_pressure': 200.0,
        'min_operating_pressure': 100.0,
        'process_loss': {'total': 25.0},
    }

    def test_machine_minimum_governs_when_the_line_asks_for_less(self):
        """
        A 12 mm line at 5 L/min demands a fraction of a bar. The machine still holds 100 bar,
        because impingement mixing needs it — so that, not the demand, is what gets set.
        """
        result = pressure.calculate_machine_compatibility(0.25, self.HIGH_PRESSURE)

        assert result['required_pressure_bar'] == pytest.approx(25.25)
        assert result['set_pressure_bar'] == pytest.approx(100.0)
        assert result['set_pressure_governed_by'] == 'machine_minimum'

    def test_line_demand_governs_once_it_exceeds_the_minimum(self):
        result = pressure.calculate_machine_compatibility(120.0, self.HIGH_PRESSURE)

        assert result['required_pressure_bar'] == pytest.approx(145.0)
        assert result['set_pressure_bar'] == pytest.approx(145.0)
        assert result['set_pressure_governed_by'] == 'line_demand'

    def test_the_set_point_is_never_below_what_the_line_needs(self):
        """The one property that must hold whichever side governs."""
        for demand in (0.0, 1.0, 50.0, 74.9, 75.1, 150.0):
            result = pressure.calculate_machine_compatibility(demand, self.HIGH_PRESSURE)
            assert result['set_pressure_bar'] >= result['required_pressure_bar']
            assert result['set_pressure_bar'] >= self.HIGH_PRESSURE['min_operating_pressure']
