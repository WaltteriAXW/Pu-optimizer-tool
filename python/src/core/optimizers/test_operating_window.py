"""
Tests for the operating window solver.

Two kinds: the solver against simple functions with known answers, and — the test that
matters — every boundary it reports fed back into the normal calculation, which must land
on the pressure limit. A solver that agrees with itself but not with the calculation the
operator sees would be worse than none.
"""

import pytest

from .operating_window import (
    STATUS_INFEASIBLE,
    STATUS_LIMIT,
    STATUS_UNCONSTRAINED,
    solve_operating_window,
)
from ..processors.calculation_processor import CalculationProcessor

RANGES = {
    'flow_rate_lpm': (0.1, 200.0),
    'temperature_c': (5.0, 50.0),
    'pipe_diameter_mm': (1.0, 200.0),
}
CURRENT = {'flow_rate_lpm': 10.0, 'temperature_c': 25.0, 'pipe_diameter_mm': 12.0}


def linear_line(overrides):
    """Pressure = flow, falling 0.1 bar per °C and 0.5 bar per mm — answers by hand."""
    s = {**CURRENT, **overrides}
    return s['flow_rate_lpm'] - 0.1 * (s['temperature_c'] - 25) - 0.5 * (s['pipe_diameter_mm'] - 12)


class TestSolver:
    def test_finds_known_boundaries(self):
        window = solve_operating_window(linear_line, CURRENT, RANGES, 20, 5)

        assert window['pressure_limit_bar'] == 15
        # 15 = flow  → 15 L/min
        assert window['max_flow_rate']['value_lpm'] == pytest.approx(15, abs=1e-6)
        # 15 = 10 - 0.1·(T-25) → T = -25 °C, below the range: any temperature works
        assert window['min_temperature']['status'] == STATUS_UNCONSTRAINED
        # 15 = 10 - 0.5·(D-12) → D = 2 mm
        assert window['min_diameter']['value_mm'] == pytest.approx(2, abs=1e-6)

    def test_user_limit_applies_only_when_tighter(self):
        tighter = solve_operating_window(linear_line, CURRENT, RANGES, 20, 5, user_limit_bar=12)
        looser = solve_operating_window(linear_line, CURRENT, RANGES, 20, 5, user_limit_bar=50)

        assert tighter['limit_source'] == 'user_limit'
        assert tighter['max_flow_rate']['value_lpm'] == pytest.approx(12, abs=1e-6)
        assert looser['limit_source'] == 'machine_max'
        assert looser['pressure_limit_bar'] == 15

    def test_no_setting_can_meet_an_impossible_limit(self):
        window = solve_operating_window(lambda o: 1000.0, CURRENT, RANGES, 20, 5)

        assert window['max_flow_rate']['status'] == STATUS_INFEASIBLE
        assert window['min_temperature']['status'] == STATUS_INFEASIBLE
        assert window['flow_window']['is_empty'] is True
        assert window['flow_window']['current_inside'] is False

    def test_a_line_that_never_reaches_the_limit_is_unconstrained(self):
        window = solve_operating_window(lambda o: 0.0, CURRENT, RANGES, 20, 5)

        assert window['max_flow_rate'] == {'status': STATUS_UNCONSTRAINED, 'value_lpm': None}


class TestFlowWindow:
    def test_turbulence_can_set_the_top(self):
        window = solve_operating_window(
            linear_line, CURRENT, RANGES, 20, 5, max_laminar_flow_lpm=11
        )['flow_window']

        assert window['max_lpm'] == 11
        assert window['max_governed_by'] == 'turbulence'
        assert window['current_inside'] is True

    def test_machine_output_sets_both_ends_when_tightest(self):
        window = solve_operating_window(
            lambda o: 0.0, CURRENT, RANGES, 20, 5, output_range_lpm=(2.0, 8.0)
        )['flow_window']

        assert (window['min_lpm'], window['max_lpm']) == (2.0, 8.0)
        assert window['min_governed_by'] == window['max_governed_by'] == 'machine_output'
        # 10 L/min is above what this machine meters
        assert window['current_inside'] is False

    def test_window_can_be_empty_when_limits_cross(self):
        """The machine cannot meter slowly enough for this line to stay within pressure."""
        window = solve_operating_window(
            linear_line, CURRENT, RANGES, 20, 5, output_range_lpm=(16.0, 100.0)
        )['flow_window']

        assert window['is_empty'] is True


class TestAgainstTheRealCalculation:
    """Every reported boundary, run forward, sits on the limit."""

    # A long narrow line on a low-pressure machine, so all three limits bind in range
    TIGHT = {
        'pipe_length_mm': 5000,
        'pipe_diameter_mm': 8,
        'material_key': 'genfoam_hd12',
        'temperature_c': 25,
        'flow_rate_lpm': 10,
        'machine_type': 'low_pressure',
    }

    def feed_pressure(self, params):
        result = CalculationProcessor().calculate_all(params)
        assert result['success'] is True
        return result['data']['pressure']['pressure_with_fittings_bar']

    @pytest.fixture
    def window(self):
        return CalculationProcessor().calculate_all(dict(self.TIGHT))['data']['operating_window']

    def test_limit_is_the_machine_maximum_less_its_own_losses(self, window):
        # Low-pressure machine: 20 bar max, 4 bar lost in its own plumbing
        assert window['pressure_limit_bar'] == pytest.approx(16.0)

    @pytest.mark.parametrize('key,field,value_key', [
        ('max_flow_rate', 'flow_rate_lpm', 'value_lpm'),
        ('min_temperature', 'temperature_c', 'value_c'),
        ('min_diameter', 'pipe_diameter_mm', 'value_mm'),
    ])
    def test_boundary_lands_on_the_limit(self, window, key, field, value_key):
        assert window[key]['status'] == STATUS_LIMIT
        boundary = window[key][value_key]

        pressure = self.feed_pressure({**self.TIGHT, field: boundary})

        assert pressure == pytest.approx(window['pressure_limit_bar'], rel=1e-6)

    def test_boundaries_hold_with_the_line_thermal_model_on(self):
        """The solver must see the same mix-head temperature the result does."""
        params = {**self.TIGHT, 'ambient_temperature_c': 12, 'idle_time_s': 900}
        window = CalculationProcessor().calculate_all(params)['data']['operating_window']

        boundary = window['max_flow_rate']['value_lpm']
        pressure = self.feed_pressure({**params, 'flow_rate_lpm': boundary})

        assert pressure == pytest.approx(window['pressure_limit_bar'], rel=1e-6)

    def test_user_limit_is_honoured(self):
        params = {**self.TIGHT, 'max_line_pressure_bar': 5}
        window = CalculationProcessor().calculate_all(params)['data']['operating_window']

        assert window['limit_source'] == 'user_limit'
        pressure = self.feed_pressure(
            {**self.TIGHT, 'flow_rate_lpm': window['max_flow_rate']['value_lpm']}
        )
        assert pressure == pytest.approx(5, rel=1e-6)

    def test_window_does_not_change_the_main_result(self):
        """Asking about the limits must not move the answer to the question asked."""
        result = CalculationProcessor().calculate_all(dict(self.TIGHT))['data']
        again = CalculationProcessor().calculate_all({**self.TIGHT, 'max_line_pressure_bar': 3})['data']

        assert (
            result['pressure']['pressure_with_fittings_bar']
            == again['pressure']['pressure_with_fittings_bar']
        )

    @pytest.mark.parametrize('bad', [0, -1, 'lots'])
    def test_bad_user_limit_is_refused(self, bad):
        result = CalculationProcessor().calculate_all({**self.TIGHT, 'max_line_pressure_bar': bad})

        assert result['success'] is False
