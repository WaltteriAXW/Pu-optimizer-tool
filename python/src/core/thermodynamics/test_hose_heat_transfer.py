"""
Tests for the hose heat transfer model.

The checks that matter are the physical ones the previous module failed: lagging a hose
must lower the heat loss, never raise it, and a bare hose must land near the coefficient
the line model already used for one.
"""

import math

import pytest

from .hose_heat_transfer import (
    LAMINAR_NUSSELT,
    STEFAN_BOLTZMANN_W_M2_K4,
    calculate_hose_heat_transfer,
)
from ..modules.line_thermal import DEFAULT_HOSE_HEAT_TRANSFER_W_M2_K

BARE = dict(inner_diameter_mm=12, material_temperature_c=25, ambient_temperature_c=15)


class TestBareHose:
    def test_lands_near_the_line_model_default(self):
        """A bare rubber hose is what the 10 W/m²·K default stood for."""
        u = calculate_hose_heat_transfer(**BARE)['overall_coefficient_w_m2_k']

        assert u == pytest.approx(DEFAULT_HOSE_HEAT_TRANSFER_W_M2_K, rel=0.25)

    def test_outer_surface_dominates_an_unlagged_rubber_hose(self):
        shares = calculate_hose_heat_transfer(**BARE)['resistance_share']

        assert shares['outer_surface'] > 0.5
        assert shares['insulation'] == 0

    def test_shares_sum_to_one(self):
        shares = calculate_hose_heat_transfer(**BARE)['resistance_share']

        assert sum(shares.values()) == pytest.approx(1.0)

    def test_matches_a_hand_calculation(self):
        """Every layer worked out independently for a 12 mm bore, 3 mm rubber wall."""
        r_i, r_o = 0.006, 0.009
        k_liquid, k_wall = 0.17, 0.2
        h_in = LAMINAR_NUSSELT * k_liquid / 0.012
        t_m, t_a = 20 + 273.15, 15 + 273.15
        h_rad = 0.9 * STEFAN_BOLTZMANN_W_M2_K4 * (t_m ** 2 + t_a ** 2) * (t_m + t_a)
        r_total = (
            1 / (h_in * 2 * math.pi * r_i)
            + math.log(r_o / r_i) / (2 * math.pi * k_wall)
            + 1 / ((5.0 + h_rad) * 2 * math.pi * r_o)
        )
        expected = 1 / (2 * math.pi * r_i * r_total)

        result = calculate_hose_heat_transfer(**BARE)

        assert result['overall_coefficient_w_m2_k'] == pytest.approx(expected, rel=1e-9)


class TestInsulation:
    def test_lagging_lowers_the_coefficient(self):
        """The fault the old module had: lagging made the loss bigger."""
        bare = calculate_hose_heat_transfer(**BARE)['overall_coefficient_w_m2_k']
        lagged = calculate_hose_heat_transfer(
            **BARE, insulation_material='elastomeric_foam', insulation_thickness_mm=19
        )['overall_coefficient_w_m2_k']

        assert lagged < bare / 2

    @pytest.mark.parametrize('thickness', [2, 5, 10, 25, 50])
    def test_thicker_lagging_never_loses_more_than_bare(self, thickness):
        """
        Below the critical radius (k/h ≈ 4 mm for foam) a THIN layer can raise the loss of a
        small tube slightly, because it adds surface faster than resistance. For a hose with a
        3 mm wall the outer radius is already past that, so every thickness must help.
        """
        bare = calculate_hose_heat_transfer(**BARE)['overall_coefficient_w_m2_k']
        lagged = calculate_hose_heat_transfer(
            **BARE, insulation_material='pe_foam', insulation_thickness_mm=thickness
        )['overall_coefficient_w_m2_k']

        assert lagged < bare

    def test_lagging_takes_over_the_resistance(self):
        shares = calculate_hose_heat_transfer(
            **BARE, insulation_material='elastomeric_foam', insulation_thickness_mm=19
        )['resistance_share']

        assert shares['insulation'] > 0.6

    def test_zero_thickness_means_no_insulation(self):
        bare = calculate_hose_heat_transfer(**BARE)
        none = calculate_hose_heat_transfer(
            **BARE, insulation_material='pe_foam', insulation_thickness_mm=0
        )

        assert none['overall_coefficient_w_m2_k'] == bare['overall_coefficient_w_m2_k']
        assert none['insulation_material'] is None


class TestHoseMaterial:
    def test_steel_conducts_better_but_radiates_less(self):
        """
        A steel wall is nearly no resistance, but a bright metal surface radiates poorly.
        The two roughly offset, which is why the material alone changes little.
        """
        rubber = calculate_hose_heat_transfer(**BARE)
        steel = calculate_hose_heat_transfer(**BARE, hose_material='stainless_steel')

        assert steel['resistance_share']['hose_wall'] < 0.01
        assert steel['radiative_coefficient_w_m2_k'] < rubber['radiative_coefficient_w_m2_k']

    def test_thicker_rubber_wall_loses_more_below_the_critical_radius(self):
        """
        Rubber conducts well enough that its critical radius, k/h ≈ 0.2/10.7 ≈ 19 mm, is
        larger than a hose. Below it a thicker wall adds outside surface faster than it adds
        resistance, so a fatter rubber hose loses MORE heat. Real, and easy to get backwards.
        """
        thin = calculate_hose_heat_transfer(**BARE, wall_thickness_mm=2)
        thick = calculate_hose_heat_transfer(**BARE, wall_thickness_mm=8)

        assert thick['outer_diameter_mm'] / 2 < 19
        assert thick['overall_coefficient_w_m2_k'] > thin['overall_coefficient_w_m2_k']


class TestInvalidInput:
    def test_unknown_hose_material(self):
        with pytest.raises(ValueError, match='hose material'):
            calculate_hose_heat_transfer(**BARE, hose_material='cardboard')

    def test_unknown_insulation(self):
        with pytest.raises(ValueError, match='insulation'):
            calculate_hose_heat_transfer(
                **BARE, insulation_material='straw', insulation_thickness_mm=10
            )

    @pytest.mark.parametrize('field', ['inner_diameter_mm', 'wall_thickness_mm'])
    def test_non_positive_dimensions(self, field):
        params = {**BARE, 'wall_thickness_mm': 3.0, field: 0}
        with pytest.raises(ValueError):
            calculate_hose_heat_transfer(**params)
