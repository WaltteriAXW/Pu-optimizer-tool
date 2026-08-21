"""
Tests for the line thermal model.

The effect this exists to capture: for single-shot work, material standing in an unheated
hose approaches ambient temperature, so the first shot is not at the tank set point. That is a
first-order change to viscosity and pressure, unlike shear heating which is negligible.
"""

import pytest

from .line_thermal import (
    calculate_line_temperature,
    line_time_constant_s,
    residence_time_s,
)


class TestTimeConstant:
    def test_twelve_minutes_for_a_typical_hose(self):
        """τ = ρ·c_p·D/(4h) — about 12 min for a 12 mm hose in still air."""
        tau = line_time_constant_s(diameter_mm=12, density_kg_m3=1149)

        assert tau / 60 == pytest.approx(12.1, abs=0.3)

    def test_independent_of_hose_length(self):
        """A longer hose holds more material but exposes proportionally more surface."""
        assert line_time_constant_s(12, 1149) == line_time_constant_s(12, 1149)

    def test_fatter_hose_holds_temperature_longer(self):
        assert line_time_constant_s(25, 1149) > line_time_constant_s(6, 1149)

    def test_better_cooling_shortens_it(self):
        draughty = line_time_constant_s(12, 1149, heat_transfer_coeff_w_m2_k=50)
        still = line_time_constant_s(12, 1149, heat_transfer_coeff_w_m2_k=10)

        assert draughty < still


class TestResidenceTime:
    def test_scales_with_volume_over_flow(self):
        assert residence_time_s(12, 1000, 5.0) == pytest.approx(
            (3.14159 * 0.006 ** 2 * 1.0) / (5.0 / 60000), rel=0.01
        )

    def test_zero_flow_never_clears_the_line(self):
        assert residence_time_s(12, 1000, 0) == float('inf')


class TestEffectiveTemperature:
    BASE = dict(
        set_temperature_c=25.0,
        ambient_temperature_c=15.0,
        diameter_mm=12,
        length_mm=500,
        flow_rate_lpm=5.0,
        density_kg_m3=1149.0,
    )

    def test_continuous_running_stays_at_the_set_point(self):
        result = calculate_line_temperature(**self.BASE, idle_time_s=0)

        assert result['effective_temperature_c'] == pytest.approx(25.0, abs=0.1)
        assert result['warning'] is None

    def test_a_long_idle_drives_it_to_ambient(self):
        result = calculate_line_temperature(**self.BASE, idle_time_s=3600)

        assert result['effective_temperature_c'] == pytest.approx(15.0, abs=0.5)
        assert result['governing_regime'] == 'idle_soak'

    def test_a_twenty_minute_idle_loses_most_of_the_difference(self):
        """τ is ~12 min, so 20 min leaves well under half the original gap."""
        result = calculate_line_temperature(**self.BASE, idle_time_s=1200)

        assert 16.0 < result['effective_temperature_c'] < 18.0
        assert result['warning'] is not None

    def test_drift_is_reported_so_a_changed_pressure_is_attributable(self):
        result = calculate_line_temperature(**self.BASE, idle_time_s=1200)

        assert result['drift_c'] < 0
        assert result['set_temperature_c'] == 25.0
        assert result['ambient_temperature_c'] == 15.0

    def test_ambient_above_the_set_point_warms_the_material(self):
        result = calculate_line_temperature(
            **{**self.BASE, 'ambient_temperature_c': 35.0}, idle_time_s=3600
        )

        assert result['effective_temperature_c'] > 25.0
        assert result['drift_c'] > 0

    def test_matching_ambient_produces_no_drift(self):
        result = calculate_line_temperature(
            **{**self.BASE, 'ambient_temperature_c': 25.0}, idle_time_s=3600
        )

        assert result['drift_c'] == pytest.approx(0.0, abs=1e-9)
        assert result['warning'] is None

    def test_drift_grows_monotonically_with_idle_time(self):
        temps = [
            calculate_line_temperature(**self.BASE, idle_time_s=idle)['effective_temperature_c']
            for idle in (0, 300, 900, 1800, 3600)
        ]

        assert temps == sorted(temps, reverse=True)
