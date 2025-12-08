"""
Main calculation processor - orchestrates all calculation modules.
This is the PRIMARY interface for all calculations.
Called from JavaScript via Pyodide.

Single Source of Truth for polyurethane process calculations.
"""

import sys
from typing import Dict, Any, Optional, List
from datetime import datetime

# Import calculation modules
try:
    from ..modules import pressure, thermal, flow, environmental
    from ..constants import PHYSICS, VALIDATION_RANGES, MATERIAL_PRESETS, MACHINE_SPECS
    from ..validation import validate_parameters
except ImportError as e:
    # Fallback for different import paths
    import pressure
    import thermal
    import flow
    import environmental
    from constants import PHYSICS, VALIDATION_RANGES, MATERIAL_PRESETS, MACHINE_SPECS
    from validation import validate_parameters


class CalculationProcessor:
    """
    Main orchestrator for all polyurethane calculations.

    This is the ONLY calculation entry point that JavaScript should call.
    All complex calculations are coordinated here.
    """

    def __init__(self):
        self.physics = PHYSICS
        self.validation_ranges = VALIDATION_RANGES
        self.material_presets = MATERIAL_PRESETS
        self.machine_specs = MACHINE_SPECS
        self.last_calculation = None
        self.calculation_cache = {}

    def calculate_all(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Complete calculation pipeline for polyurethane injection.

        Main entry point. This is the ONLY function JavaScript calls.

        Input: Raw user parameters
        Output: All calculated values with complete detail

        Args:
            parameters: Dict with keys:
                - pipe_length_mm
                - pipe_diameter_mm
                - material_key
                - temperature_c
                - flow_rate_lpm
                - machine_type (optional)
                - pressure_override (optional)

        Returns:
            Dict with structure:
            {
                'success': bool,
                'errors': List[str],
                'warnings': List[str],
                'data': {
                    'input': {...},
                    'flow': {...},
                    'pressure': {...},
                    'thermal': {...},
                    'environmental': {...},
                    'machine_compatibility': {...},
                    'timestamp': str
                }
            }
        """

        try:
            # Step 1: Validate inputs
            validation_errors = validate_parameters(parameters)
            if validation_errors:
                return {
                    'success': False,
                    'errors': validation_errors,
                    'warnings': [],
                    'data': None
                }

            # Step 2: Extract and normalize parameters
            pipe_length_mm = float(parameters.get('pipe_length_mm', 500))
            pipe_diameter_mm = float(parameters.get('pipe_diameter_mm', 12))
            material_key = parameters.get('material_key', 'ecofoam_standard')
            temperature_c = float(parameters.get('temperature_c', 25))
            flow_rate_lpm = float(parameters.get('flow_rate_lpm', 1.0))
            machine_type = parameters.get('machine_type', 'high_pressure')

            # Step 3: Get material properties
            material = self._get_material_properties(material_key)
            if material is None:
                return {
                    'success': False,
                    'errors': [f'Material "{material_key}" not found'],
                    'warnings': [],
                    'data': None
                }

            # Step 4: Get machine specifications
            machine = self.machine_specs.get(machine_type, self.machine_specs['high_pressure'])

            # Step 5: Calculate all flow properties
            flow_result = flow.calculate_all_flow_properties(
                diameter_mm=pipe_diameter_mm,
                flow_rate_lpm=flow_rate_lpm,
                consistency_cp=material['viscosity'],
                flow_index=material['flow_index'],
                density_kg_m3=material['density'],
            )

            # Step 6: Calculate pressure drop
            pressure_result = pressure.calculate_pressure_drop(
                diameter_mm=pipe_diameter_mm,
                length_mm=pipe_length_mm,
                flow_rate_lpm=flow_rate_lpm,
                viscosity_cp=flow_result['apparent_viscosity_cp'],
                density_kg_m3=material['density'],
            )

            # Step 7: Account for fitting losses
            pressure_with_fittings = pressure.calculate_pressure_with_fittings(
                base_pressure_bar=pressure_result['pressure_drop_bar'],
                fitting_loss_multiplier=0.15,
            )

            # Step 8: Calculate thermal effects
            thermal_result = thermal.calculate_temperature_dependent_viscosity(
                reference_temp_c=25.0,
                reference_viscosity_cp=material['viscosity'],
                activation_energy_j_mol=material['activation_energy'],
                current_temp_c=temperature_c,
            )

            # Step 9: Calculate shear heating
            shear_heating = thermal.calculate_shear_heating(
                pressure_drop_pa=pressure_result['pressure_drop_pa'],
                flow_rate_lpm=flow_rate_lpm,
                viscosity_cp=flow_result['apparent_viscosity_cp'],
                density_kg_m3=material['density'],
            )

            # Step 10: Calculate environmental impact
            env_result = environmental.calculate_environmental_impact(
                material_key=material_key,
                quantity_kg=1.0,  # Per unit
            )

            # Step 11: Check machine compatibility
            machine_compat = pressure.calculate_machine_compatibility(
                total_pressure_bar=pressure_with_fittings['total_pressure_bar'],
                machine_specs=machine,
            )

            # Step 12: Generate warnings
            warnings = self._generate_warnings(
                flow_result, pressure_result, thermal_result, machine_compat
            )

            # Step 13: Compile complete results
            result_data = {
                'input': {
                    'pipe_length_mm': pipe_length_mm,
                    'pipe_diameter_mm': pipe_diameter_mm,
                    'material_key': material_key,
                    'material_name': material.get('name', material_key),
                    'temperature_c': temperature_c,
                    'flow_rate_lpm': flow_rate_lpm,
                    'machine_type': machine_type,
                },
                'flow': flow_result,
                'pressure': {
                    'base_pressure_drop_bar': pressure_result['pressure_drop_bar'],
                    'pressure_drop_pa': pressure_result['pressure_drop_pa'],
                    'pressure_with_fittings_bar': pressure_with_fittings['total_pressure_bar'],
                    'fitting_loss_bar': pressure_with_fittings['fitting_loss_bar'],
                    'reynolds_number': pressure_result['reynolds_number'],
                    'flow_regime': pressure_result['flow_regime'],
                },
                'thermal': {
                    'temperature_c': temperature_c,
                    'reference_viscosity_cp': thermal_result['reference_viscosity_cp'],
                    'current_viscosity_cp': thermal_result['current_viscosity_cp'],
                    'temperature_factor': thermal_result['temperature_factor'],
                    'shear_heating_c': shear_heating['temperature_rise_c'],
                    'heat_generated_w': shear_heating['heat_generated_w'],
                },
                'environmental': {
                    'material': env_result['material'],
                    'blowing_agent': env_result['blowing_agent'],
                    'gwp_per_kg': env_result['gwp_per_kg'],
                    'recommendation': env_result['recommendation'],
                    'is_eco_friendly': env_result['is_eco_friendly'],
                },
                'machine_compatibility': {
                    'is_compatible': machine_compat['is_compatible'],
                    'status': machine_compat['status'],
                    'available_pressure_bar': machine_compat['available_pressure_bar'],
                    'max_pressure_bar': machine_compat['max_pressure_bar'],
                    'warning': machine_compat['warning'],
                },
                'timestamp': datetime.now().isoformat(),
            }

            # Step 14: Validate results sanity
            if not self._validate_results(result_data):
                return {
                    'success': False,
                    'errors': ['Calculation produced invalid results'],
                    'warnings': warnings,
                    'data': result_data,
                }

            # Step 15: Cache and return
            self.last_calculation = result_data

            return {
                'success': True,
                'errors': [],
                'warnings': warnings,
                'data': result_data,
            }

        except Exception as e:
            error_msg = f'Calculation error: {str(e)}'
            return {
                'success': False,
                'errors': [error_msg],
                'warnings': [],
                'data': None,
            }

    def _get_material_properties(self, material_key: str) -> Optional[Dict]:
        """Get material properties from presets."""
        return self.material_presets.get(material_key)

    def _generate_warnings(
        self,
        flow_result: Dict,
        pressure_result: Dict,
        thermal_result: Dict,
        machine_compat: Dict,
    ) -> List[str]:
        """Generate user-friendly warnings based on calculations."""

        warnings = []

        # Flow regime warning
        if flow_result.get('flow_regime') == 'turbulent':
            warnings.append(
                f"Turbulent flow detected (Re={flow_result.get('reynolds_number', 0):.0f}). "
                "Consider larger diameter or lower flow rate for better mix."
            )

        # Shear rate warning
        shear_rate = flow_result.get('shear_rate_s_inv', 0)
        if shear_rate > 5000:
            warnings.append(
                f"High shear rate ({shear_rate:.0f} 1/s). "
                "Material may degrade or generate excessive heat."
            )

        # Pressure warning
        pressure_bar = pressure_result.get('pressure_drop_bar', 0)
        if pressure_bar > 150:
            warnings.append(
                f"High pressure drop ({pressure_bar:.1f} bar). "
                "Verify pipe diameter and system capacity."
            )

        # Temperature warning
        viscosity_ratio = thermal_result.get('temperature_factor', 1.0)
        if viscosity_ratio > 2.0:
            warnings.append(
                f"Viscosity increases {viscosity_ratio:.1f}x at this temperature. "
                "Flow rates may be affected."
            )

        # Machine compatibility warning
        if not machine_compat.get('is_compatible'):
            warnings.append(f"⚠️ {machine_compat.get('warning', 'Not compatible with machine.')}")

        return warnings

    def _validate_results(self, result_data: Dict) -> bool:
        """Sanity check on calculated results."""

        try:
            pressure_bar = result_data['pressure']['pressure_with_fittings_bar']
            reynolds = result_data['pressure']['reynolds_number']
            viscosity = result_data['thermal']['current_viscosity_cp']

            # Basic sanity checks
            return (
                pressure_bar >= 0 and
                pressure_bar < 500 and
                reynolds >= 0 and
                viscosity > 0 and
                viscosity < 50000
            )
        except (KeyError, TypeError):
            return False


# Convenience function for direct Python use
def calculate_all(parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience function for direct Python imports."""
    processor = CalculationProcessor()
    return processor.calculate_all(parameters)
