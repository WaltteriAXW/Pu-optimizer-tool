"""
Tests for the flow curves and the exact laminar pipe solution.

The pipe solution is checked against the closed-form results that exist for special cases —
Newtonian (Hagen-Poiseuille), power law, and Bingham (Buckingham-Reiner) — and against a
brute-force integral for Herschel-Bulkley, which has none.
"""

import math

import pytest

from .models import RheologyModel, build_model
from .pipe_flow import flow_rate_at_wall_shear_rate, solve_pipe_flow

D_MM, Q_LPM = 12.0, 5.0
R_M = D_MM / 2000
Q_M3S = Q_LPM / 60000
APPARENT = 4 * Q_M3S / (math.pi * R_M ** 3)


def carreau(n=0.7, eta_0=2.0, lam=0.1):
    return RheologyModel('carreau', n, zero_shear_viscosity_pa_s=eta_0, time_constant_s=lam)


def herschel_bulkley(tau_0=20.0, k=2.0, n=0.5):
    return RheologyModel('herschel_bulkley', n, yield_stress_pa=tau_0, consistency_pa_sn=k)


class TestFlowCurves:
    def test_carreau_plateaus_at_zero_shear(self):
        assert carreau().viscosity(1e-9) == pytest.approx(2.0)

    def test_carreau_thins_like_a_power_law_at_high_shear(self):
        m = carreau(n=0.6, lam=10.0)
        ratio = m.viscosity(1e4) / m.viscosity(1e3)
        assert ratio == pytest.approx(10 ** (0.6 - 1), rel=1e-3)

    def test_cross_plateaus_at_both_ends(self):
        m = RheologyModel(
            'cross', 0.8, zero_shear_viscosity_pa_s=5.0,
            infinite_shear_viscosity_pa_s=0.1, time_constant_s=1.0,
        )
        assert m.viscosity(1e-9) == pytest.approx(5.0)
        assert m.viscosity(1e12) == pytest.approx(0.1, rel=1e-3)

    def test_yield_stress_fluid_does_not_flow_at_zero_shear(self):
        """The old module returned a made-up 10 000 Pa·s here and called it 10."""
        assert herschel_bulkley().viscosity(0) == float('inf')

    @pytest.mark.parametrize('model', [
        carreau(),
        RheologyModel('cross', 0.7, zero_shear_viscosity_pa_s=3.0,
                      infinite_shear_viscosity_pa_s=0.05, time_constant_s=0.5),
        herschel_bulkley(),
    ])
    @pytest.mark.parametrize('shift', [0.6, 1.0, 1.8])
    def test_slope_matches_a_finite_difference(self, model, shift):
        for g in (0.3, 7.0, 450.0):
            h = g * 1e-6
            numeric = (model.stress(g + h, shift) - model.stress(g - h, shift)) / (2 * h)
            assert model.stress_slope(g, shift) == pytest.approx(numeric, rel=1e-5)


class TestTemperatureShift:
    def test_colder_is_more_viscous(self):
        m = carreau()
        assert m.viscosity(100, shift=2.0) > m.viscosity(100, shift=1.0)

    def test_colder_starts_thinning_sooner(self):
        """
        Time-temperature superposition moves the whole curve: at twice the shift, the
        viscosity at shear rate γ̇ is twice what it was at 2γ̇. Scaling η₀ alone, as the old
        module did, would leave the knee where it was.
        """
        m = carreau(lam=0.1)
        assert m.viscosity(50, shift=2.0) == pytest.approx(2 * m.viscosity(100, shift=1.0))

    def test_yield_stress_scales_with_the_shift(self):
        m = herschel_bulkley()
        assert m.stress(1e-12, shift=1.5) == pytest.approx(1.5 * 20.0, rel=1e-6)


class TestPipeSolution:
    def test_newtonian_is_hagen_poiseuille(self):
        m = carreau(n=1.0, eta_0=0.5)
        result = solve_pipe_flow(m, D_MM, Q_LPM)

        assert result['wall_shear_stress_pa'] == pytest.approx(0.5 * APPARENT, rel=1e-9)
        assert result['wall_shear_rate_s_inv'] == pytest.approx(APPARENT, rel=1e-9)
        assert result['effective_viscosity_cp'] == pytest.approx(500, rel=1e-9)

    @pytest.mark.parametrize('n', [0.3, 0.6, 0.85])
    def test_power_law_limit_matches_the_closed_form(self, n):
        """Carreau far above 1/λ is a power law, τ_w = K·((3n+1)/4n · 8V/D)^n."""
        lam, eta_0 = 1e6, 1e6
        k = eta_0 * lam ** (n - 1)
        result = solve_pipe_flow(carreau(n=n, eta_0=eta_0, lam=lam), D_MM, Q_LPM)

        exact = k * ((3 * n + 1) / (4 * n) * APPARENT) ** n
        assert result['wall_shear_stress_pa'] == pytest.approx(exact, rel=1e-8)
        # And the true wall shear rate carries the Rabinowitsch correction
        assert result['wall_shear_rate_s_inv'] == pytest.approx(
            (3 * n + 1) / (4 * n) * APPARENT, rel=1e-6
        )

    def test_bingham_matches_buckingham_reiner(self):
        tau_0, k = 50.0, 0.5
        result = solve_pipe_flow(herschel_bulkley(tau_0, k, 1.0), D_MM, Q_LPM)
        tau_w = result['wall_shear_stress_pa']
        phi = tau_0 / tau_w

        q = math.pi * R_M ** 3 * tau_w / (4 * k) * (1 - 4 / 3 * phi + phi ** 4 / 3)

        assert q == pytest.approx(Q_M3S, rel=1e-9)
        assert result['plug_radius_fraction'] == pytest.approx(phi)

    def test_herschel_bulkley_matches_a_brute_force_integral(self):
        """Rabinowitsch-Mooney integrated over stress directly, with 200 000 strips."""
        tau_0, k, n = 20.0, 2.0, 0.5
        tau_w = solve_pipe_flow(herschel_bulkley(tau_0, k, n), D_MM, Q_LPM)['wall_shear_stress_pa']

        strips = 200_000
        width = (tau_w - tau_0) / strips
        total = 0.0
        for i in range(strips):
            tau = tau_0 + (i + 0.5) * width
            total += tau * tau * ((tau - tau_0) / k) ** (1 / n) * width
        q = math.pi * R_M ** 3 * total / tau_w ** 3

        assert q == pytest.approx(Q_M3S, rel=1e-5)

    def test_flow_rises_with_wall_shear_rate(self):
        m = herschel_bulkley()
        rates = [flow_rate_at_wall_shear_rate(m, g, R_M) for g in (1, 10, 100, 1000)]
        assert rates == sorted(rates)

    def test_rejects_no_flow(self):
        with pytest.raises(ValueError):
            solve_pipe_flow(carreau(), D_MM, 0)


class TestBuildModel:
    def test_power_law_needs_no_model(self):
        assert build_model({}) is None
        assert build_model({'rheology_model': 'power_law'}) is None

    def test_viscosities_arrive_in_centipoise(self):
        m = build_model({
            'rheology_model': 'carreau', 'zero_shear_viscosity_cp': 2000,
            'time_constant_s': 0.1, 'rheology_index': 0.7,
        })
        assert m.zero_shear_viscosity_pa_s == pytest.approx(2.0)

    @pytest.mark.parametrize('params,message', [
        ({'rheology_model': 'carreau', 'time_constant_s': 0.1, 'rheology_index': 0.7},
         'Zero-shear viscosity is required'),
        ({'rheology_model': 'carreau', 'zero_shear_viscosity_cp': 100,
          'time_constant_s': 0.1, 'rheology_index': 1.4}, 'at most 1'),
        ({'rheology_model': 'cross', 'zero_shear_viscosity_cp': 100,
          'infinite_shear_viscosity_cp': 200, 'time_constant_s': 1, 'rheology_index': 0.7},
         'below the zero-shear'),
        ({'rheology_model': 'herschel_bulkley', 'yield_stress_pa': -1,
          'consistency_pa_sn': 1, 'rheology_index': 0.5}, 'negative'),
        ({'rheology_model': 'bingham'}, 'Unknown rheology model'),
    ])
    def test_refuses_what_it_cannot_solve(self, params, message):
        with pytest.raises(ValueError, match=message):
            build_model(params)
