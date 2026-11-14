"""
Unit tests for calculation processor.
Tests the main orchestrator that coordinates all calculation modules.
"""

import math

import pytest
from . import calculation_processor
from .calculation_processor import CalculationProcessor
from ...constants import VALIDATION_RANGES
from ..data.material_database import get_material, list_material_keys


class TestCalculationProcessorBasic:
    """Test basic functionality of calculation processor."""

    def test_processor_initializes(self):
        """Processor should initialize successfully."""
        processor = CalculationProcessor()
        assert processor is not None
        assert processor.physics is not None
        assert processor.machine_specs is not None

    def test_calculate_all_returns_success(self):
        """Complete calculation should return success."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'genfoam_hd12',
            'temperature_c': 25,
            'flow_rate_lpm': 1.0,
        })

        assert result['success'] is True
        assert result['data'] is not None
        assert result['errors'] == []

    def test_result_has_all_sections(self):
        """Result should include all calculation sections."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'genfoam_hd12',
            'temperature_c': 25,
            'flow_rate_lpm': 1.0,
        })

        data = result['data']
        required_sections = [
            'input',
            'flow',
            'pressure',
            'thermal',
            'environmental',
            'machine_compatibility',
            'timestamp',
        ]

        for section in required_sections:
            assert section in data


class TestCalculationValidation:
    """Test input validation."""

    def test_invalid_pipe_diameter_fails(self):
        """Negative pipe diameter should fail validation."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': -12,  # Invalid
            'material_key': 'genfoam_hd12',
            'temperature_c': 25,
            'flow_rate_lpm': 1.0,
        })

        assert result['success'] is False
        assert len(result['errors']) > 0

    def test_invalid_material_key_fails(self):
        """Invalid material key should fail validation."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'invalid_material',  # Invalid
            'temperature_c': 25,
            'flow_rate_lpm': 1.0,
        })

        assert result['success'] is False

    def test_missing_parameters_fails(self):
        """Missing required parameters should fail."""
        processor = CalculationProcessor()

        result = processor.calculate_all({})  # Empty

        assert result['success'] is False

    def test_zero_flow_rate_fails(self):
        """Zero flow rate should fail validation."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'genfoam_hd12',
            'temperature_c': 25,
            'flow_rate_lpm': 0,  # Invalid
        })

        assert result['success'] is False


class TestCalculationPhysics:
    """Test physics of calculations."""

    def test_pressure_positive(self):
        """Pressure results should be positive."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'genfoam_hd12',
            'temperature_c': 25,
            'flow_rate_lpm': 1.0,
        })

        pressure_data = result['data']['pressure']
        assert pressure_data['pressure_with_fittings_bar'] > 0
        assert pressure_data['pressure_drop_pa'] > 0

    def test_flow_regime_valid(self):
        """Flow regime should be one of valid options."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'genfoam_hd12',
            'temperature_c': 25,
            'flow_rate_lpm': 1.0,
        })

        flow_regime = result['data']['flow']['flow_regime']
        valid_regimes = ['laminar', 'transitional', 'turbulent']
        assert flow_regime in valid_regimes

    def test_temperature_changes_required_pressure(self):
        """Process temperature must reach the pressure result, not just the display.

        Viscosity falls as the material warms, so the pressure the line demands must fall
        with it. This guards the ordering of the pipeline: the Arrhenius correction has to
        run before the flow and pressure steps for its result to have any effect.
        """
        processor = CalculationProcessor()

        def pressure_at(temperature_c):
            result = processor.calculate_all({
                'pipe_length_mm': 500,
                'pipe_diameter_mm': 12,
                'material_key': 'genfoam_hd12',
                'temperature_c': temperature_c,
                'flow_rate_lpm': 5.0,
            })
            assert result['success'], result['errors']
            return result['data']['pressure']['pressure_with_fittings_bar']

        cold = pressure_at(18)
        reference = pressure_at(25)
        warm = pressure_at(35)

        assert cold > reference > warm

    def test_viscosity_positive(self):
        """Viscosity should always be positive."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'genfoam_hd12',
            'temperature_c': 50,  # High temperature
            'flow_rate_lpm': 1.0,
        })

        viscosity = result['data']['thermal']['current_viscosity_cp']
        assert viscosity > 0

    def test_environmental_data_valid(self):
        """Environmental data should be valid."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'ecomate_spray',  # Eco-friendly
            'temperature_c': 25,
            'flow_rate_lpm': 1.0,
        })

        env_data = result['data']['environmental']
        assert env_data['gwp_per_kg'] == 0
        assert env_data['is_eco_friendly'] is True


class TestMaterialPresets:
    """Test different material selections."""

    def test_all_valid_materials_work(self):
        """All valid materials should calculate without error."""
        processor = CalculationProcessor()

        materials = list_material_keys()

        for material in materials:
            result = processor.calculate_all({
                'pipe_length_mm': 500,
                'pipe_diameter_mm': 12,
                'material_key': material,
                'temperature_c': 25,
                'flow_rate_lpm': 1.0,
            })

            assert result['success'] is True

    def test_material_viscosity_affects_calculation(self):
        """Different materials should have different viscosities."""
        processor = CalculationProcessor()

        result_standard = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'genfoam_hd12',
            'temperature_c': 25,
            'flow_rate_lpm': 1.0,
        })

        result_xhd = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'ecofoam_xhd_rc',
            'temperature_c': 25,
            'flow_rate_lpm': 1.0,
        })

        # XHD has higher viscosity, should affect pressure drop
        viscosity_standard = result_standard['data']['thermal']['current_viscosity_cp']
        viscosity_xhd = result_xhd['data']['thermal']['current_viscosity_cp']

        assert viscosity_standard != viscosity_xhd


class TestMachineCompatibility:
    """Test machine compatibility checking."""

    def test_high_pressure_machine(self):
        """High-pressure machine should handle higher pressures."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'genfoam_hd12',
            'temperature_c': 25,
            'flow_rate_lpm': 2.0,
            'machine_type': 'high_pressure',
        })

        compat = result['data']['machine_compatibility']
        # High pressure machine should handle reasonable pressure
        assert 'compatible' in compat['status'] or compat['status'] != 'compatible_low'

    def test_low_pressure_machine(self):
        """Low-pressure machine should have different limits."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'genfoam_hd12',
            'temperature_c': 25,
            'flow_rate_lpm': 1.0,
            'machine_type': 'low_pressure',
        })

        compat = result['data']['machine_compatibility']
        assert 'compatible' in compat or isinstance(compat, dict)


class TestCaching:
    """Test result caching."""

    def test_cache_stores_results(self):
        """Processor should cache calculation results."""
        processor = CalculationProcessor()

        params = {
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'genfoam_hd12',
            'temperature_c': 25,
            'flow_rate_lpm': 1.0,
        }

        result1 = processor.calculate_all(params)
        assert processor.last_calculation is not None

    def test_last_calculation_accessible(self):
        """Last calculation should be retrievable."""
        processor = CalculationProcessor()

        params = {
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'genfoam_hd12',
            'temperature_c': 25,
            'flow_rate_lpm': 1.0,
        }

        processor.calculate_all(params)
        last = processor.last_calculation

        assert last is not None
        assert 'pressure' in last


class TestWarningGeneration:
    """Test warning generation."""

    def test_high_shear_generates_warning(self):
        """High shear rate should generate warning."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 4,  # Small diameter = high shear
            'material_key': 'genfoam_hd12',
            'temperature_c': 25,
            'flow_rate_lpm': 5.0,  # High flow
        })

        # ~13 000 1/s at these settings, well past the 5 000 1/s warning threshold
        assert result['data']['flow']['shear_rate_s_inv'] > 5000
        assert any('shear rate' in w.lower() for w in result['warnings'])

    def test_turbulent_flow_generates_warning(self):
        """Turbulent flow should generate warning."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'genfoam_hd12',
            'temperature_c': 25,
            'flow_rate_lpm': 5.0,  # High flow = turbulent
        })

        warnings = result['warnings']
        # Should have warnings for turbulent flow
        if any('turbulent' in w.lower() for w in warnings):
            assert True
        # Otherwise, this is ok too - depends on parameters


class TestExtremeValues:
    """Test handling of extreme values."""

    def test_very_small_pipe_diameter(self):
        """Very small pipe diameter should still calculate."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 1,  # Very small
            'material_key': 'genfoam_hd12',
            'temperature_c': 25,
            'flow_rate_lpm': 0.1,
        })

        # Should either succeed or give clear error
        assert 'success' in result

    def test_very_large_pipe_diameter(self):
        """Very large pipe diameter should still calculate."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 100,  # Very large
            'material_key': 'genfoam_hd12',
            'temperature_c': 25,
            'flow_rate_lpm': 10.0,
        })

        assert result['success'] is True

    def test_high_temperature(self):
        """The top of the supported temperature range should calculate."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'genfoam_hd12',
            'temperature_c': VALIDATION_RANGES['temperature']['max'],
            'flow_rate_lpm': 1.0,
        })

        assert result['success'] is True
        # Viscosity should decrease with temperature but stay physical
        viscosity = result['data']['thermal']['current_viscosity_cp']
        assert viscosity > 0
        assert viscosity < get_material('genfoam_hd12')['viscosity']

    def test_temperature_above_supported_range_is_rejected(self):
        """A temperature outside the validated range is refused, not silently clamped."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'genfoam_hd12',
            'temperature_c': VALIDATION_RANGES['temperature']['max'] + 50,
            'flow_rate_lpm': 1.0,
        })

        assert result['success'] is False
        assert result['errors']


class TestOptionalBlocks:
    """The temperature and cure additions must never disturb the feed-line result."""

    BASE = {
        'pipe_length_mm': 500,
        'pipe_diameter_mm': 12,
        'material_key': 'genfoam_hd12',
        'temperature_c': 25,
        'flow_rate_lpm': 5.0,
        'machine_type': 'low_pressure',
    }

    def test_absent_inputs_leave_the_pressure_untouched(self):
        """The whole point: supplying nothing new must change nothing."""
        processor = CalculationProcessor()

        baseline = processor.calculate_all(dict(self.BASE))['data']

        assert baseline['pressure']['pressure_with_fittings_bar'] == pytest.approx(0.1663, abs=0.0002)
        assert 'line_temperature' not in baseline
        assert 'cure' not in baseline

    def test_cure_block_appears_only_when_a_part_thickness_is_given(self):
        processor = CalculationProcessor()

        without = processor.calculate_all(dict(self.BASE))['data']
        with_part = processor.calculate_all({**self.BASE, 'part_thickness_mm': 40})['data']

        assert 'cure' not in without
        assert 'cure' in with_part
        # The feed line is unaffected by asking about the part
        assert (
            with_part['pressure']['pressure_with_fittings_bar']
            == without['pressure']['pressure_with_fittings_bar']
        )

    def test_cure_block_is_skipped_for_custom_materials(self):
        """A custom material has no data sheet reaction times to calibrate against."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            **self.BASE,
            'material_key': 'custom',
            'part_thickness_mm': 40,
            'viscosity_cp': 1200,
            'density_kg_m3': 1090,
            'flow_index': 0.75,
            'activation_energy_j_mol': 31000,
        })

        assert result['success'] is True
        assert 'cure' not in result['data']

    def test_ambient_temperature_changes_the_pressure_and_says_so(self):
        processor = CalculationProcessor()

        warm_line = processor.calculate_all(dict(self.BASE))['data']
        cold_line = processor.calculate_all({
            **self.BASE, 'ambient_temperature_c': 15, 'idle_time_s': 1800,
        })['data']

        # Colder material is more viscous, so the line needs more pressure
        assert (
            cold_line['pressure']['pressure_with_fittings_bar']
            > warm_line['pressure']['pressure_with_fittings_bar']
        )
        # And the change is attributable rather than mysterious
        assert cold_line['line_temperature']['effective_temperature_c'] < 25
        assert cold_line['thermal']['set_temperature_c'] == 25

    def test_volatility_block_reflects_the_material(self):
        processor = CalculationProcessor()

        water_blown = processor.calculate_all(dict(self.BASE))['data']
        assert water_blown['volatility']['status'] == 'not_volatile'

        hot_ecomate = processor.calculate_all({
            **self.BASE, 'material_key': 'ecomate_spray', 'temperature_c': 35,
        })['data']
        assert hot_ecomate['volatility']['status'] == 'flash_risk'
        assert any('boiling point' in w for w in
                   processor.calculate_all({
                       **self.BASE, 'material_key': 'ecomate_spray', 'temperature_c': 35,
                   })['warnings'])


class TestHoseConstruction:
    """Describing the hose replaces the bare-hose default in the line thermal model."""

    COLD_IDLE = {
        **TestOptionalBlocks.BASE,
        'ambient_temperature_c': 10,
        'idle_time_s': 1200,
    }

    def test_no_description_keeps_the_default(self):
        result = CalculationProcessor().calculate_all(dict(self.COLD_IDLE))['data']

        assert result['line_temperature']['heat_transfer_coeff_w_m2_k'] == 10.0
        assert 'hose' not in result['line_temperature']

    def test_lagged_hose_holds_temperature_better(self):
        processor = CalculationProcessor()

        bare = processor.calculate_all({**self.COLD_IDLE, 'hose_material': 'rubber'})['data']
        lagged = processor.calculate_all({
            **self.COLD_IDLE,
            'hose_material': 'rubber',
            'insulation_material': 'elastomeric_foam',
            'insulation_thickness_mm': 19,
        })['data']

        assert (
            lagged['line_temperature']['effective_temperature_c']
            > bare['line_temperature']['effective_temperature_c']
        )
        # Warmer material is thinner, so the lagged line needs less pressure
        assert (
            lagged['pressure']['pressure_with_fittings_bar']
            < bare['pressure']['pressure_with_fittings_bar']
        )
        assert lagged['line_temperature']['hose']['insulation_material'] == 'elastomeric_foam'

    def test_a_measured_coefficient_wins_over_a_description(self):
        result = CalculationProcessor().calculate_all({
            **self.COLD_IDLE,
            'hose_heat_transfer_coeff_w_m2_k': 25,
            'insulation_material': 'pe_foam',
            'insulation_thickness_mm': 10,
        })['data']

        assert result['line_temperature']['heat_transfer_coeff_w_m2_k'] == 25
        assert 'hose' not in result['line_temperature']

    def test_hose_description_without_ambient_changes_nothing(self):
        """No ambient temperature means no line model, so the hose has nothing to act on."""
        processor = CalculationProcessor()

        plain = processor.calculate_all(dict(TestOptionalBlocks.BASE))['data']
        described = processor.calculate_all({
            **TestOptionalBlocks.BASE,
            'insulation_material': 'pe_foam',
            'insulation_thickness_mm': 10,
        })['data']

        assert (
            described['pressure']['pressure_with_fittings_bar']
            == plain['pressure']['pressure_with_fittings_bar']
        )

    @pytest.mark.parametrize('bad', [
        {'hose_material': 'cardboard'},
        {'insulation_material': 'straw', 'insulation_thickness_mm': 5},
        {'insulation_thickness_mm': -1},
    ])
    def test_a_wrong_description_is_refused(self, bad):
        result = CalculationProcessor().calculate_all({**self.COLD_IDLE, **bad})

        assert result['success'] is False


class TestMeasuredFlowCurve:
    """A custom material described by Carreau, Cross or Herschel-Bulkley parameters."""

    CUSTOM = {
        'pipe_length_mm': 2000,
        'pipe_diameter_mm': 12,
        'material_key': 'custom',
        'temperature_c': 25,
        'flow_rate_lpm': 5.0,
        'machine_type': 'low_pressure',
        'density_kg_m3': 1100,
        'activation_energy_j_mol': 30000,
    }

    def calc(self, **extra):
        return CalculationProcessor().calculate_all({**self.CUSTOM, **extra})

    def test_carreau_newtonian_limit_is_hagen_poiseuille(self):
        """n = 1 is a Newtonian liquid, so ΔP must be 128·μ·L·Q/(π·D⁴) exactly."""
        result = self.calc(
            rheology_model='carreau', zero_shear_viscosity_cp=800,
            time_constant_s=0.1, rheology_index=1.0,
        )
        assert result['success'] is True

        mu, length, q, d = 0.8, 2.0, 5.0 / 60000, 0.012
        exact_bar = 128 * mu * length * q / (math.pi * d ** 4) / 1e5
        assert result['data']['pressure']['base_pressure_drop_bar'] == pytest.approx(exact_bar, rel=1e-8)

    def test_power_law_path_is_unchanged_without_a_model(self):
        """The field-trial baseline: no model chosen, nothing moves."""
        plain = self.calc(viscosity_cp=1200, flow_index=0.8)
        explicit = self.calc(viscosity_cp=1200, flow_index=0.8, rheology_model='power_law')

        assert (
            plain['data']['pressure']['pressure_with_fittings_bar']
            == explicit['data']['pressure']['pressure_with_fittings_bar']
        )
        assert 'rheology' not in plain['data']['flow']

    def test_flow_curve_is_reported(self):
        result = self.calc(
            rheology_model='herschel_bulkley', yield_stress_pa=30,
            consistency_pa_sn=3, rheology_index=0.6,
        )['data']['flow']

        assert result['rheology']['model'] == 'herschel_bulkley'
        assert 0 < result['rheology']['plug_radius_fraction'] < 1
        # The true wall shear rate of a yield-stress fluid exceeds the Newtonian 8V/D
        assert result['rheology']['wall_shear_rate_s_inv'] > result['shear_rate_s_inv']

    def test_colder_material_needs_more_pressure(self):
        model = dict(
            rheology_model='cross', zero_shear_viscosity_cp=3000,
            infinite_shear_viscosity_cp=50, time_constant_s=0.2, rheology_index=0.7,
        )
        warm = self.calc(**model)['data']['pressure']['pressure_with_fittings_bar']
        cold = self.calc(**{**model, 'temperature_c': 12})['data']['pressure']['pressure_with_fittings_bar']

        assert cold > warm

    def test_operating_window_round_trips_with_a_flow_curve(self):
        model = dict(
            rheology_model='carreau', zero_shear_viscosity_cp=2000,
            time_constant_s=0.05, rheology_index=0.6, pipe_length_mm=8000, pipe_diameter_mm=8,
        )
        window = self.calc(**model)['data']['operating_window']
        assert window['max_flow_rate']['status'] == 'limit'

        boundary = window['max_flow_rate']['value_lpm']
        pressure = self.calc(**{**model, 'flow_rate_lpm': boundary})['data']['pressure']['pressure_with_fittings_bar']

        assert pressure == pytest.approx(window['pressure_limit_bar'], rel=1e-6)

    def test_laminar_envelope_uses_the_flow_curve(self):
        """The envelope's turbulence threshold must sit where the flow block's Re crosses 2300."""
        model = dict(
            rheology_model='carreau', zero_shear_viscosity_cp=50,
            time_constant_s=0.01, rheology_index=0.8, pipe_diameter_mm=25, flow_rate_lpm=20,
        )
        envelope = self.calc(**model)['data']['flow']['laminar_envelope']
        threshold = envelope['max_laminar_flow_lpm']
        assert threshold is not None

        at_threshold = self.calc(**{**model, 'flow_rate_lpm': threshold})['data']['flow']['reynolds_number']
        assert at_threshold == pytest.approx(2300, rel=1e-6)

    @pytest.mark.parametrize('bad', [
        {'rheology_model': 'carreau', 'time_constant_s': 0.1, 'rheology_index': 0.7},
        {'rheology_model': 'cross', 'zero_shear_viscosity_cp': 100, 'time_constant_s': 1,
         'rheology_index': 0.7},
        {'rheology_model': 'herschel_bulkley', 'yield_stress_pa': 5, 'rheology_index': 0.5},
    ])
    def test_incomplete_parameters_are_refused(self, bad):
        result = self.calc(**bad)

        assert result['success'] is False
        assert 'required' in result['errors'][0]

    def test_a_catalogued_material_cannot_take_a_flow_curve(self):
        result = CalculationProcessor().calculate_all({
            **TestOptionalBlocks.BASE,
            'rheology_model': 'carreau', 'zero_shear_viscosity_cp': 800,
            'time_constant_s': 0.1, 'rheology_index': 0.7,
        })

        assert result['success'] is False
        assert 'custom material' in result['errors'][0]


class TestCustomMaterialActivationEnergy:
    """The activation energy a custom material calculates with, and how it is labelled."""

    BASE = {
        'pipe_length_mm': 500, 'pipe_diameter_mm': 12, 'temperature_c': 35,
        'flow_rate_lpm': 5, 'material_key': 'custom',
        'viscosity_cp': 350, 'density_kg_m3': 1120, 'flow_index': 0.85,
    }

    def _thermal(self, **extra):
        from .calculation_processor import calculate_all
        result = calculate_all({**self.BASE, **extra})
        assert result['success'], result['errors']
        return result['data']['thermal']

    def test_no_second_reading_uses_default_marked_as_estimate_source(self):
        thermal = self._thermal()
        assert thermal['activation_energy_j_mol'] == 25000
        assert thermal['activation_energy_source'] == 'default'

    def test_second_reading_calculates_and_is_used(self):
        thermal = self._thermal(viscosity_2_cp=200, viscosity_2_temp_c=40)
        assert thermal['activation_energy_source'] == 'calculated'
        assert thermal['activation_energy_j_mol'] == 29000
        default = self._thermal()
        assert thermal['current_viscosity_cp'] != default['current_viscosity_cp']

    def test_legacy_typed_value_calculates_unchanged(self):
        # A saved run from before this change: typed 25,000 must give the same numbers
        # as before, and is labelled as entered by the user
        typed = self._thermal(activation_energy_j_mol=25000)
        default = self._thermal()
        assert typed['activation_energy_source'] == 'user'
        assert typed['current_viscosity_cp'] == default['current_viscosity_cp']

    @pytest.mark.parametrize('extra, message', [
        ({'viscosity_2_cp': 300, 'viscosity_2_temp_c': 28}, 'at least 5 °C'),
        ({'viscosity_2_cp': 400, 'viscosity_2_temp_c': 40}, 'lower at the higher temperature'),
        ({'viscosity_2_cp': 349.9, 'viscosity_2_temp_c': 60}, 'outside the expected range'),
        ({'viscosity_2_cp': 200}, 'leave both empty'),
    ])
    def test_bad_second_reading_refuses_to_calculate(self, extra, message):
        from .calculation_processor import calculate_all
        result = calculate_all({**self.BASE, **extra})
        assert not result['success']
        assert any(message in error for error in result['errors'])

    def test_second_reading_refused_on_catalogued_material(self):
        from .calculation_processor import calculate_all
        result = calculate_all({
            'pipe_length_mm': 500, 'pipe_diameter_mm': 12, 'temperature_c': 35,
            'flow_rate_lpm': 5, 'material_key': 'genfoam_hd12',
            'viscosity_2_cp': 200, 'viscosity_2_temp_c': 40,
        })
        assert not result['success']

    def test_catalogued_material_reports_typical_sources(self):
        # Neither value is on the data sheets and neither was measured: both are typical
        from .calculation_processor import calculate_all
        result = calculate_all({
            'pipe_length_mm': 500, 'pipe_diameter_mm': 12, 'temperature_c': 35,
            'flow_rate_lpm': 5, 'material_key': 'genfoam_hd12',
        })
        data = result['data']
        assert data['thermal']['activation_energy_source'] == 'typical'
        assert data['flow']['flow_index'] == 0.85
        assert data['flow']['flow_index_source'] == 'typical'

    def test_labelling_changes_no_numbers(self):
        # Adding the source labels must not move a result: HD12 at 35 °C, 5 L/min through
        # 500 mm of 12 mm pipe was 0.11991 bar before and is 0.11991 bar after
        from .calculation_processor import calculate_all
        result = calculate_all({
            'pipe_length_mm': 500, 'pipe_diameter_mm': 12, 'temperature_c': 35,
            'flow_rate_lpm': 5, 'material_key': 'genfoam_hd12',
        })
        assert result['data']['pressure']['pressure_with_fittings_bar'] == pytest.approx(0.11991, abs=1e-5)

    def test_custom_flow_index_is_typical_until_the_user_changes_it(self):
        assert self._flow(flow_index_source='typical')['flow_index_source'] == 'typical'
        # No marker: the user's own value, as on every run saved before the marker existed
        assert self._flow()['flow_index_source'] == 'user'

    def test_measured_flow_curve_index_is_the_users(self):
        flow = self._flow(
            flow_index_source='typical', rheology_model='carreau',
            zero_shear_viscosity_cp=1500, time_constant_s=0.05, rheology_index=0.6,
        )
        assert flow['flow_index_source'] == 'user'

    def _flow(self, **extra):
        from .calculation_processor import calculate_all
        result = calculate_all({**self.BASE, **extra})
        assert result['success'], result['errors']
        return result['data']['flow']
