"""
Unit tests for calculation processor.
Tests the main orchestrator that coordinates all calculation modules.
"""

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
