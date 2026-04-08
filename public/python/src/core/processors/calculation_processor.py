"""
Main calculation processor - orchestrates all calculation modules.
This is the PRIMARY interface for all calculations.
Called from JavaScript via Pyodide.

Single Source of Truth for polyurethane process calculations.

Phase 4 Extension: Includes reaction kinetics calculations:
- Cure kinetics (Avrami, Kamal-Sourour)
- Viscosity-conversion coupling (Castro-Macosko)
- Thermal reaction (exotherm, scorch risk)
- Foam kinetics (rise, density, cell size)
"""

import sys
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

# Configure logging
logger = logging.getLogger(__name__)

# Import core calculation modules (required)
from ..modules import pressure, thermal, flow, environmental
from ...constants import PHYSICS, VALIDATION_RANGES, MATERIAL_PRESETS, MACHINE_SPECS
from ..validation import validate_parameters

# Import kinetics modules (optional extension - Phase 4)
KINETICS_AVAILABLE = False
try:
    from ..kinetics import (
        CureKinetics,
        CureKineticsParameters,
        CastroMacoskoModel,
        ViscosityConversionParameters,
        LumpedThermalModel,
        ThermalReactionParameters,
        FoamRiseModel,
        FoamKineticsParameters,
        calculate_processing_window,
        calculate_reactive_viscosity,
        calculate_exotherm_rise,
        predict_scorch_risk,
        calculate_foam_rise,
    )
    KINETICS_AVAILABLE = True
except ImportError:
    logger.info("Kinetics module not available - core functionality still works")


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

            # Step 2: Extract and normalize parameters with error handling
            try:
                pipe_length_mm = float(parameters.get('pipe_length_mm', 500))
                pipe_diameter_mm = float(parameters.get('pipe_diameter_mm', 12))
                material_key = parameters.get('material_key', 'ecofoam_standard')
                temperature_c = float(parameters.get('temperature_c', 25))
                flow_rate_lpm = float(parameters.get('flow_rate_lpm', 1.0))
                machine_type = parameters.get('machine_type', 'high_pressure')
            except (ValueError, TypeError) as e:
                return {
                    'success': False,
                    'errors': [f'Parameter conversion failed: {str(e)}'],
                    'warnings': [],
                    'data': None
                }

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
            try:
                flow_result = flow.calculate_all_flow_properties(
                    diameter_mm=pipe_diameter_mm,
                    flow_rate_lpm=flow_rate_lpm,
                    consistency_cp=material['viscosity'],
                    flow_index=material['flow_index'],
                    density_kg_m3=material['density'],
                )
                if not flow_result or 'apparent_viscosity_cp' not in flow_result:
                    raise ValueError("Flow calculation returned invalid result")
            except Exception as e:
                logger.error(f"Flow calculation failed: {e}")
                return {
                    'success': False,
                    'errors': [f'Flow calculation error: {str(e)}'],
                    'warnings': [],
                    'data': None
                }

            # Step 6: Calculate pressure drop
            try:
                pressure_result = pressure.calculate_pressure_drop(
                    diameter_mm=pipe_diameter_mm,
                    length_mm=pipe_length_mm,
                    flow_rate_lpm=flow_rate_lpm,
                    viscosity_cp=flow_result['apparent_viscosity_cp'],
                    density_kg_m3=material['density'],
                )
                if not pressure_result or 'pressure_drop_bar' not in pressure_result:
                    raise ValueError("Pressure calculation returned invalid result")
            except Exception as e:
                logger.error(f"Pressure calculation failed: {e}")
                return {
                    'success': False,
                    'errors': [f'Pressure calculation error: {str(e)}'],
                    'warnings': [],
                    'data': None
                }

            # Step 7: Account for fitting losses
            try:
                pressure_with_fittings = pressure.calculate_pressure_with_fittings(
                    base_pressure_bar=pressure_result['pressure_drop_bar'],
                    fitting_loss_multiplier=0.15,
                )
            except Exception as e:
                logger.error(f"Fitting loss calculation failed: {e}")
                pressure_with_fittings = pressure_result  # Fallback without fittings

            # Step 8: Calculate thermal effects
            try:
                thermal_result = thermal.calculate_temperature_dependent_viscosity(
                    reference_temp_c=25.0,
                    reference_viscosity_cp=material['viscosity'],
                    activation_energy_j_mol=material['activation_energy'],
                    current_temp_c=temperature_c,
                )
            except Exception as e:
                logger.error(f"Thermal calculation failed: {e}")
                return {
                    'success': False,
                    'errors': [f'Thermal calculation error: {str(e)}'],
                    'warnings': [],
                    'data': None
                }

            # Step 9: Calculate shear heating
            try:
                shear_heating = thermal.calculate_shear_heating(
                    pressure_drop_pa=pressure_result['pressure_drop_pa'],
                    flow_rate_lpm=flow_rate_lpm,
                    viscosity_cp=flow_result['apparent_viscosity_cp'],
                    density_kg_m3=material['density'],
                )
            except Exception as e:
                logger.error(f"Shear heating calculation failed: {e}")
                shear_heating = {'temperature_rise_c': 0, 'heat_generated_w': 0}  # Fallback

            # Step 10: Calculate environmental impact
            # Skip lookup for custom materials — the environmental database only
            # covers the four preset formulations; defaulting to a preset would be
            # misleading, so return a clear "no data" result instead.
            if material_key == 'custom':
                env_result = {
                    'material': 'Custom Material',
                    'blowing_agent': 'N/A',
                    'gwp_per_kg': 0,
                    'recommendation': 'No environmental data available for custom materials',
                    'is_eco_friendly': False,
                }
            else:
                try:
                    env_result = environmental.calculate_environmental_impact(
                        material_key=material_key,
                        quantity_kg=1.0,
                    )
                except Exception as e:
                    logger.error(f"Environmental calculation failed: {e}")
                    env_result = {
                        'material': material_key,
                        'blowing_agent': 'Unknown',
                        'gwp_per_kg': 0,
                        'recommendation': 'N/A',
                        'is_eco_friendly': False
                    }

            # Step 11: Check machine compatibility
            try:
                machine_compat = pressure.calculate_machine_compatibility(
                    total_pressure_bar=pressure_with_fittings['total_pressure_bar'],
                    machine_specs=machine,
                )
            except Exception as e:
                logger.error(f"Machine compatibility check failed: {e}")
                machine_compat = {
                    'is_compatible': False,
                    'status': 'Check failed',
                    'available_pressure_bar': 0,
                    'max_pressure_bar': 0,
                    'warning': str(e)
                }  # Fallback

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
                    'pressure_with_fittings_bar': pressure_with_fittings.get('total_pressure_bar', pressure_result['pressure_drop_bar']),
                    'fitting_loss_bar': pressure_with_fittings.get('fitting_loss_bar', 0),
                    'reynolds_number': pressure_result['reynolds_number'],
                    'flow_regime': pressure_result['flow_regime'],
                },
                'thermal': {
                    'temperature_c': temperature_c,
                    'reference_viscosity_cp': thermal_result['reference_viscosity_cp'],
                    'current_viscosity_cp': thermal_result['current_viscosity_cp'],
                    'temperature_factor': thermal_result['temperature_factor'],
                    'shear_heating_c': shear_heating.get('temperature_rise_c', 0),
                    'heat_generated_w': shear_heating.get('heat_generated_w', 0),
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
                logger.warning("Calculation produced results outside expected ranges")
                warnings.append("Warning: Some results are outside normal operating ranges")

            # Step 15: Cache and return
            self.last_calculation = result_data

            return {
                'success': True,
                'errors': [],
                'warnings': warnings,
                'data': result_data,
            }

        except Exception as e:
            error_msg = f'Unexpected calculation error: {str(e)}'
            logger.error(error_msg, exc_info=True)
            return {
                'success': False,
                'errors': [error_msg],
                'warnings': [],
                'data': None,
            }

    def _get_material_properties(self, material_key: str) -> Optional[Dict]:
        """Get material properties from presets."""
        return self.material_presets.get(material_key)

    def calculate_kinetics(
        self,
        material_key: str,
        temperature_c: float,
        time_s: float = 0.0,
        part_thickness_mm: float = 20.0,
        mold_temp_c: Optional[float] = None,
        initial_viscosity_pa_s: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Calculate reaction kinetics for polyurethane processing.

        This is the KINETICS entry point for reactive calculations.

        Args:
            material_key: Material identifier
            temperature_c: Process temperature (°C)
            time_s: Time since mixing (seconds), 0 for initial state
            part_thickness_mm: Part thickness for exotherm calculations
            mold_temp_c: Mold temperature (uses material default if None)
            initial_viscosity_pa_s: Override initial viscosity

        Returns:
            Dict with kinetics results including:
            - cure_state: Current cure state
            - processing_window: Available processing time
            - reactive_viscosity: Viscosity accounting for cure
            - exotherm: Temperature rise prediction
            - foam_rise: Foam expansion state (for foam materials)
        """
        if not KINETICS_AVAILABLE:
            return {
                'success': False,
                'error': 'Kinetics module not available',
                'data': None,
            }

        try:
            # Get material properties
            material = self._get_material_properties(material_key)
            if material is None:
                return {
                    'success': False,
                    'error': f'Material "{material_key}" not found',
                    'data': None,
                }

            # Get kinetics parameters from material or use defaults
            kinetics_data = material.get('kinetics', {})

            # Build cure kinetics parameters
            cure_params = CureKineticsParameters(
                k1_ref=kinetics_data.get('k1_ref', 0.0001),
                k2_ref=kinetics_data.get('k2_ref', 0.001),
                m=kinetics_data.get('m', 1.0),
                n=kinetics_data.get('n', 1.5),
                activation_energy_k1=kinetics_data.get('activation_energy_k1', 50000),
                activation_energy_k2=kinetics_data.get('activation_energy_k2', 45000),
                gel_conversion=kinetics_data.get('gel_conversion', 0.65),
                cream_time_ref_s=material.get('cream_time', 50),
                gel_time_ref_s=material.get('gel_time', 150),
            )

            # Initialize cure kinetics model
            cure_model = CureKinetics(cure_params)

            # Get cure state at current time
            cure_state = cure_model.get_cure_state(time_s, temperature_c)

            # Calculate processing window
            proc_window = cure_model.processing_window(temperature_c)

            # Build viscosity-conversion parameters
            visc_params = ViscosityConversionParameters(
                A=kinetics_data.get('castro_macosko_A', 2.0),
                B=kinetics_data.get('castro_macosko_B', 2.5),
                gel_conversion=kinetics_data.get('gel_conversion', 0.65),
                initial_viscosity_pa_s=initial_viscosity_pa_s or material.get('viscosity', 500) / 1000,
            )

            # Initialize Castro-Macosko model
            viscosity_model = CastroMacoskoModel(visc_params, cure_params)

            # Calculate reactive viscosity
            reactive_visc = viscosity_model.viscosity_from_time(time_s, temperature_c)
            visc_ratio = viscosity_model.viscosity_ratio(cure_state.conversion, temperature_c)

            # Build thermal reaction parameters
            effective_mold_temp = mold_temp_c or material.get('mold_temp_min', 40)
            thermal_params = ThermalReactionParameters(
                heat_of_reaction_j_kg=kinetics_data.get('heat_of_reaction', 100000),
                density_kg_m3=material.get('density', 1100),
                specific_heat_j_kg_k=kinetics_data.get('specific_heat', 1800),
                thermal_conductivity_w_m_k=kinetics_data.get('thermal_conductivity', 0.2),
                heat_transfer_coeff_w_m2_k=kinetics_data.get('heat_transfer_coeff', 100),
                mold_temperature_c=effective_mold_temp,
                part_thickness_mm=part_thickness_mm,
                scorch_temp_c=kinetics_data.get('scorch_temp', 180),
                initial_temp_c=temperature_c,
            )

            # Calculate exotherm
            adiabatic_rise = calculate_exotherm_rise(
                heat_of_reaction_j_kg=thermal_params.heat_of_reaction_j_kg,
                specific_heat_j_kg_k=thermal_params.specific_heat_j_kg_k,
                conversion=cure_state.conversion,
            )

            # Scorch risk prediction
            scorch_analysis = predict_scorch_risk(
                part_thickness_mm=part_thickness_mm,
                mold_temp_c=effective_mold_temp,
                heat_of_reaction_j_kg=thermal_params.heat_of_reaction_j_kg,
                cure_params=cure_params,
            )

            # Foam rise calculation (if foam material)
            foam_data = None
            free_rise_density = material.get('free_rise_density')
            if free_rise_density and free_rise_density < 500:  # Foam material
                foam_params = FoamKineticsParameters(
                    cream_time_s=material.get('cream_time', 10),
                    rise_time_constant_s=kinetics_data.get('rise_time_constant', 30),
                    free_rise_density_kg_m3=free_rise_density,
                    initial_density_kg_m3=material.get('density', 1100),
                )
                foam_model = FoamRiseModel(foam_params, cure_params)
                foam_state = foam_model.get_rise_state(time_s, temperature_c)
                foam_data = {
                    'height_fraction': foam_state.height_fraction,
                    'density_kg_m3': foam_state.density_kg_m3,
                    'rise_rate_mm_s': foam_state.rise_rate_mm_s,
                    'is_cream_started': foam_state.is_cream_started,
                    'is_rise_complete': foam_state.is_rise_complete,
                }

            # Compile results
            result = {
                'success': True,
                'data': {
                    'cure_state': {
                        'time_s': cure_state.time_s,
                        'conversion': cure_state.conversion,
                        'conversion_rate': cure_state.conversion_rate,
                        'is_gelled': cure_state.is_gelled,
                        'is_cream_started': cure_state.is_cream_started,
                        'time_to_gel_s': cure_state.time_to_gel_s,
                        'viscosity_factor': cure_state.viscosity_factor,
                    },
                    'processing_window': proc_window,
                    'reactive_viscosity': {
                        'viscosity_pa_s': reactive_visc,
                        'viscosity_cp': reactive_visc * 1000,
                        'viscosity_ratio': visc_ratio,
                        'initial_viscosity_pa_s': visc_params.initial_viscosity_pa_s,
                    },
                    'exotherm': {
                        'adiabatic_rise_c': adiabatic_rise,
                        'peak_temperature_c': scorch_analysis.get('peak_temperature_c'),
                        'scorch_risk': scorch_analysis.get('scorch_risk'),
                        'scorch_margin_c': scorch_analysis.get('scorch_margin_c'),
                    },
                    'foam_rise': foam_data,
                    'temperature_c': temperature_c,
                    'material_key': material_key,
                },
            }

            return result

        except Exception as e:
            return {
                'success': False,
                'error': f'Kinetics calculation error: {str(e)}',
                'data': None,
            }

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


# Convenience functions for direct Python use
def calculate_all(parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience function for direct Python imports."""
    processor = CalculationProcessor()
    return processor.calculate_all(parameters)


def calculate_kinetics(
    material_key: str,
    temperature_c: float,
    time_s: float = 0.0,
    part_thickness_mm: float = 20.0,
    mold_temp_c: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Convenience function for kinetics calculations.

    Args:
        material_key: Material identifier
        temperature_c: Process temperature (°C)
        time_s: Time since mixing (seconds)
        part_thickness_mm: Part thickness for exotherm
        mold_temp_c: Mold temperature (optional)

    Returns:
        Dict with kinetics results
    """
    processor = CalculationProcessor()
    return processor.calculate_kinetics(
        material_key=material_key,
        temperature_c=temperature_c,
        time_s=time_s,
        part_thickness_mm=part_thickness_mm,
        mold_temp_c=mold_temp_c,
    )


def is_kinetics_available() -> bool:
    """Check if kinetics module is available."""
    return KINETICS_AVAILABLE
