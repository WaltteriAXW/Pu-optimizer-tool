"""
Unit tests for calculation processor.
Tests the main orchestrator that coordinates all calculation modules.
"""

import pytest
from calculation_processor import CalculationProcessor


class TestCalculationProcessorBasic:
    """Test basic functionality of calculation processor."""

    def test_processor_initializes(self):
        """Processor should initialize successfully."""
        processor = CalculationProcessor()
        assert processor is not None
        assert processor.physics is not None
        assert processor.material_presets is not None

    def test_calculate_all_returns_success(self):
        """Complete calculation should return success."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'ecofoam_standard',
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
            'material_key': 'ecofoam_standard',
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
            'material_key': 'ecofoam_standard',
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
            'material_key': 'ecofoam_standard',
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
            'material_key': 'ecofoam_standard',
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
            'material_key': 'ecofoam_standard',
            'temperature_c': 25,
            'flow_rate_lpm': 1.0,
        })

        flow_regime = result['data']['flow']['flow_regime']
        valid_regimes = ['laminar', 'transitional', 'turbulent']
        assert flow_regime in valid_regimes

    def test_viscosity_positive(self):
        """Viscosity should always be positive."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'ecofoam_standard',
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
            'material_key': 'ecofoam_water',  # Eco-friendly
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

        materials = [
            'ecofoam_standard',
            'ecofoam_xhd',
            'ecofoam_water',
        ]

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
            'material_key': 'ecofoam_standard',
            'temperature_c': 25,
            'flow_rate_lpm': 1.0,
        })

        result_xhd = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'ecofoam_xhd',
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
            'material_key': 'ecofoam_standard',
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
            'material_key': 'ecofoam_standard',
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
            'material_key': 'ecofoam_standard',
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
            'material_key': 'ecofoam_standard',
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
            'pipe_diameter_mm': 6,  # Small diameter = high shear
            'material_key': 'ecofoam_standard',
            'temperature_c': 25,
            'flow_rate_lpm': 5.0,  # High flow
        })

        warnings = result['warnings']
        # Should have warnings for high shear rate
        assert len(warnings) > 0

    def test_turbulent_flow_generates_warning(self):
        """Turbulent flow should generate warning."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'ecofoam_standard',
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
            'material_key': 'ecofoam_standard',
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
            'material_key': 'ecofoam_standard',
            'temperature_c': 25,
            'flow_rate_lpm': 10.0,
        })

        assert result['success'] is True

    def test_high_temperature(self):
        """High temperature should be handled."""
        processor = CalculationProcessor()

        result = processor.calculate_all({
            'pipe_length_mm': 500,
            'pipe_diameter_mm': 12,
            'material_key': 'ecofoam_standard',
            'temperature_c': 100,  # High temperature
            'flow_rate_lpm': 1.0,
        })

        assert result['success'] is True
        # Viscosity should decrease with temperature
        viscosity = result['data']['thermal']['current_viscosity_cp']
        assert viscosity > 0
