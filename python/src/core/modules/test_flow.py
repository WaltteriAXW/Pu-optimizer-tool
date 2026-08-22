"""
Unit tests for flow module.
Tests shear rate, viscosity, and Reynolds number calculations.
"""

import pytest
import math
from . import flow
from .flow import (
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
        """Re > 4000 should be identified as turbulent.

        Reaching turbulence needs a thin fluid: at a polyurethane's few-hundred cP the
        flow in these line sizes is laminar by a wide margin, so a low viscosity is used
        here to exercise the turbulent branch of the classifier.
        """
        result = calculate_reynolds_number(
            flow_rate_lpm=5.0,
            diameter_mm=12,
            density_kg_m3=1120,
            viscosity_cp=1.0,
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

    def test_laminar_regime_for_realistic_polyurethane(self):
        """A polyurethane system in a typical line stays laminar.

        This is worth pinning down: shear-thinning brings the apparent viscosity well
        below the reference value, and it is still nowhere near turbulent. Any change that
        reports turbulence at these settings is wrong.
        """
        result = calculate_all_flow_properties(
            diameter_mm=12,
            flow_rate_lpm=10.0,
            consistency_cp=350,
            flow_index=0.85,
        )

        assert result['flow_regime'] == 'laminar'
        assert result['reynolds_number'] < 2300

    def test_turbulent_regime_for_thin_fluid(self):
        """A low-viscosity fluid at high flow reaches the turbulent regime."""
        result = calculate_all_flow_properties(
            diameter_mm=12,
            flow_rate_lpm=10.0,
            consistency_cp=1.0,
            flow_index=1.0,
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


class TestLaminarEnvelope:
    """
    The envelope is what turns 'your flow is laminar' into 'and here is how much room you
    have, and here is which dial to move'. Turbulence in the feed line is the thing this
    tool exists to prevent, so the boundary itself needs pinning down.
    """

    # Genfoam HD12 as derived from the material database, in a 12 mm line
    DEFAULTS = dict(
        diameter_mm=12.0,
        flow_rate_lpm=5.0,
        consistency_cp=447.6,
        flow_index=0.85,
        density_kg_m3=1148.6,
    )

    def test_the_returned_flow_rate_actually_sits_on_the_boundary(self):
        """The whole claim is that Re reaches 2300 there — so check it does."""
        envelope = flow.calculate_laminar_envelope(**self.DEFAULTS)
        critical = envelope['max_laminar_flow_lpm']
        assert critical is not None

        at_boundary = flow.calculate_all_flow_properties(
            diameter_mm=self.DEFAULTS['diameter_mm'],
            flow_rate_lpm=critical,
            consistency_cp=self.DEFAULTS['consistency_cp'],
            flow_index=self.DEFAULTS['flow_index'],
            density_kg_m3=self.DEFAULTS['density_kg_m3'],
        )
        assert at_boundary['reynolds_number'] == pytest.approx(2300.0, rel=1e-6)

    def test_just_under_is_laminar_and_just_over_is_not(self):
        envelope = flow.calculate_laminar_envelope(**self.DEFAULTS)
        critical = envelope['max_laminar_flow_lpm']

        def regime(rate):
            return flow.calculate_all_flow_properties(
                diameter_mm=self.DEFAULTS['diameter_mm'],
                flow_rate_lpm=rate,
                consistency_cp=self.DEFAULTS['consistency_cp'],
                flow_index=self.DEFAULTS['flow_index'],
                density_kg_m3=self.DEFAULTS['density_kg_m3'],
            )['flow_regime']

        assert regime(critical * 0.99) == 'laminar'
        assert regime(critical * 1.01) != 'laminar'

    def test_newtonian_case_matches_the_closed_form(self):
        """
        With n = 1 the material stops shear-thinning, viscosity is constant, and the
        boundary can be solved by hand: Q = Re·π·D·η / 4ρ. Agreement is what says the
        bisection is finding the real root rather than some fixed point of its own.
        """
        envelope = flow.calculate_laminar_envelope(
            diameter_mm=12.0,
            flow_rate_lpm=5.0,
            consistency_cp=447.6,
            flow_index=1.0,
            density_kg_m3=1148.6,
            max_flow_rate_lpm=2000.0,
        )

        expected_m3_s = (2300.0 * math.pi * 0.012 * 0.4476) / (4 * 1148.6)
        expected_lpm = expected_m3_s * 60000

        assert envelope['max_laminar_flow_lpm'] == pytest.approx(expected_lpm, rel=1e-6)

    def test_shear_thinning_turns_turbulent_sooner_than_newtonian(self):
        """
        Re goes as Q^(2-n), so a shear-thinning material reaches 2300 at a LOWER flow rate
        than the same material would if it kept its viscosity. Getting this backwards would
        tell an operator they had headroom they do not have.
        """
        thinning = flow.calculate_laminar_envelope(
            **{**self.DEFAULTS, 'flow_index': 0.85}, max_flow_rate_lpm=2000.0
        )
        newtonian = flow.calculate_laminar_envelope(
            **{**self.DEFAULTS, 'flow_index': 1.0}, max_flow_rate_lpm=2000.0
        )

        assert thinning['max_laminar_flow_lpm'] < newtonian['max_laminar_flow_lpm']

    # A thin material pushed hard down a narrow line: Re ≈ 9500
    TURBULENT = dict(
        diameter_mm=12.0,
        flow_rate_lpm=180.0,
        consistency_cp=60.0,
        flow_index=0.95,
        density_kg_m3=1100.0,
    )

    def test_a_turbulent_line_is_told_to_slow_down(self):
        envelope = flow.calculate_laminar_envelope(**self.TURBULENT)

        assert envelope['is_laminar'] is False
        assert envelope['max_laminar_flow_lpm'] < 180.0
        assert 'turbulent' in envelope['recommendation'].lower()
        assert 'flow rate' in envelope['recommendation']

    def test_a_wider_pipe_is_the_other_way_out(self):
        """
        At a fixed volumetric flow rate, Re goes as D^(3n-4) — negative for any material
        this tool handles — so opening the line out reduces Reynolds number. Narrowing it,
        the intuitive move because it raises velocity, makes turbulence worse. The
        recommendation has to name the correct direction.
        """
        envelope = flow.calculate_laminar_envelope(**self.TURBULENT)
        wider = envelope['min_laminar_diameter_mm']
        assert wider is not None and wider > self.TURBULENT['diameter_mm']
        assert 'open the line out' in envelope['recommendation']

        just_above = flow.calculate_all_flow_properties(
            **{**self.TURBULENT, 'diameter_mm': wider * 1.01}
        )
        just_below = flow.calculate_all_flow_properties(
            **{**self.TURBULENT, 'diameter_mm': wider * 0.99}
        )
        assert just_above['flow_regime'] == 'laminar'
        assert just_below['flow_regime'] != 'laminar'

    def test_a_line_that_cannot_be_driven_turbulent_says_so(self):
        """
        A viscous polyol in a narrow line stays laminar however hard it is pushed. Reporting
        that as an ordinary margin would invent a limit that does not exist.
        """
        envelope = flow.calculate_laminar_envelope(
            diameter_mm=6.0,
            flow_rate_lpm=5.0,
            consistency_cp=3000.0,
            flow_index=0.9,
            density_kg_m3=1150.0,
            max_flow_rate_lpm=200.0,
        )

        assert envelope['max_laminar_flow_lpm'] is None
        assert envelope['flow_headroom_ratio'] is None
        assert 'cannot be driven turbulent' in envelope['recommendation']

    def test_a_narrow_margin_reads_differently_from_a_wide_one(self):
        wide = flow.calculate_laminar_envelope(**self.DEFAULTS)
        assert 'room to spare' in wide['recommendation']

        narrow = flow.calculate_laminar_envelope(
            **{**self.DEFAULTS, 'flow_rate_lpm': wide['max_laminar_flow_lpm'] * 0.9}
        )
        assert 'only just' in narrow['recommendation']

    def test_invalid_input_does_not_invent_an_envelope(self):
        envelope = flow.calculate_laminar_envelope(
            diameter_mm=0.0, flow_rate_lpm=5.0, consistency_cp=447.6,
            flow_index=0.85, density_kg_m3=1148.6,
        )
        assert envelope['max_laminar_flow_lpm'] is None
        assert envelope['recommendation'] is None
