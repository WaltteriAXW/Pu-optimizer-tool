"""
Tests that the kinetics models reproduce the technical data sheets.

These are the tests that would have caught the original state of this module, where the
rate constants were invented rather than fitted: the model gelled at 3389 s for a system
whose data sheet says 135 s, and every prediction downstream inherited that error —
including a scorch model that predicted thick parts running cooler than thin ones.
"""

import pytest

from ..data.material_database import get_material, list_material_keys
from .foam_kinetics import CellNucleationModel, FoamKineticsParameters
from .reaction_kinetics import (
    CureKineticsParameters,
    KamalSourourModel,
    _normalised_gel_time,
)
from .thermal_reaction import predict_scorch_risk


class TestCureCalibration:
    """The cure model must gel when the supplier says it gels."""

    @pytest.mark.parametrize('material_key', list_material_keys())
    def test_model_gels_inside_the_stated_window(self, material_key):
        material = get_material(material_key)
        reaction = material['reaction']

        params = CureKineticsParameters.from_material(material)
        model = KamalSourourModel(params)
        gel_time = model.gel_time(material['reference_temp_c'])

        assert reaction['gel_time_min_s'] <= gel_time <= reaction['gel_time_max_s'], (
            f'{material_key} gels at {gel_time:.1f}s, outside the data sheet window '
            f"{reaction['gel_time_min_s']}-{reaction['gel_time_max_s']}s"
        )

    def test_calibration_is_exact_across_a_wide_range(self):
        """Time scales as 1/k1, so the calibration should hold at any gel time."""
        for target in (5.0, 22.0, 135.0, 600.0):
            params = CureKineticsParameters.calibrated_to_gel_time(gel_time_s=target)
            actual = KamalSourourModel(params).gel_time(25.0)

            assert actual == pytest.approx(target, rel=0.02)

    def test_faster_systems_get_larger_rate_constants(self):
        slow = CureKineticsParameters.calibrated_to_gel_time(gel_time_s=135.0)
        fast = CureKineticsParameters.calibrated_to_gel_time(gel_time_s=22.0)

        assert fast.k1_ref > slow.k1_ref

    def test_default_parameters_match_their_own_stated_gel_time(self):
        """The dataclass defaults must not contradict the gel time they claim."""
        params = CureKineticsParameters()
        actual = KamalSourourModel(params).gel_time(params.reference_temp_c)

        assert actual == pytest.approx(params.gel_time_ref_s, rel=0.02)

    def test_normalised_gel_time_is_the_scaling_constant(self):
        tau = _normalised_gel_time(0.65, 1.0, 1.5, 10.0)
        params = CureKineticsParameters.calibrated_to_gel_time(gel_time_s=100.0)

        assert params.k1_ref == pytest.approx(tau / 100.0, rel=1e-9)

    def test_material_without_a_gel_time_is_refused(self):
        material = {'key': 'no_times', 'reaction': {}}

        with pytest.raises(ValueError, match='gel time'):
            CureKineticsParameters.from_material(material)


class TestExotherm:
    """Heat leaves a thin part faster than a thick one."""

    def test_thick_parts_run_hotter_than_thin_ones(self):
        params = CureKineticsParameters.calibrated_to_gel_time(gel_time_s=135.0)

        thin = predict_scorch_risk(part_thickness_mm=10, mold_temp_c=40, cure_params=params)
        thick = predict_scorch_risk(part_thickness_mm=100, mold_temp_c=40, cure_params=params)

        assert thick['peak_temperature_c'] > thin['peak_temperature_c']

    def test_the_reaction_actually_heats_the_part(self):
        params = CureKineticsParameters.calibrated_to_gel_time(gel_time_s=135.0)
        result = predict_scorch_risk(part_thickness_mm=100, mold_temp_c=40, cure_params=params)

        # An exotherm that never exceeds the mold temperature is not an exotherm
        assert result['peak_temperature_c'] > 40


class TestCellNucleation:
    """Foam nucleates heterogeneously; the homogeneous barrier is unreachable."""

    def test_predicted_cells_are_physically_sized(self):
        model = CellNucleationModel(FoamKineticsParameters())

        assert 50 < model.predict_cell_diameter(25.0, 40.0) < 1000

    def test_nucleation_density_matches_real_foams(self):
        model = CellNucleationModel(FoamKineticsParameters())
        density = model.nucleation_density(25.0)

        assert 1e10 < density < 1e16

    def test_default_factor_matches_the_calibration(self):
        """The hardcoded default must not drift from what the calibration produces."""
        params = FoamKineticsParameters()
        model = CellNucleationModel(params)

        assert model.calibrate_heterogeneous_factor() == pytest.approx(
            params.heterogeneous_nucleation_factor, rel=0.01
        )

    def test_warmer_foam_gives_smaller_cells(self):
        """A lower barrier means more nuclei, so cells get finer as temperature rises."""
        model = CellNucleationModel(FoamKineticsParameters())

        cold = model.predict_cell_diameter(15.0, 40.0)
        warm = model.predict_cell_diameter(45.0, 40.0)

        assert warm < cold

    def test_absurd_parameters_cannot_escape_as_a_plausible_number(self):
        """A vanishing nucleation density used to yield a 79-million-metre 'cell'."""
        params = FoamKineticsParameters(heterogeneous_nucleation_factor=1.0)
        model = CellNucleationModel(params)

        diameter = model.predict_cell_diameter(25.0, 40.0)

        assert diameter <= 10_000.0
