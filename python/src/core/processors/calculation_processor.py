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
from ..modules.line_thermal import (
    DEFAULT_HOSE_HEAT_TRANSFER_W_M2_K,
    calculate_line_temperature,
)
from ..modules.volatility import check_blowing_agent_volatility
from ...constants import PHYSICS, VALIDATION_RANGES, MACHINE_SPECS
from ..data.material_database import get_material, list_material_keys
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
        DEFAULT_HEAT_OF_REACTION_J_KG,
        DEFAULT_SPECIFIC_HEAT_J_KG_K,
        calculate_exotherm_rise,
        heat_of_reaction_from_peak_exotherm,
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
        self.machine_specs = MACHINE_SPECS
        self.last_calculation = None
        self.calculation_cache = {}

    def calculate_all(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Complete calculation pipeline for polyurethane injection.

        Main entry point. This is the ONLY function JavaScript calls.

        PHASE BETA FEATURE: Accepts injected material properties from TypeScript layer.
        This enables decoupling from hardcoded materials and CSV-based data sources.

        Input: Raw user parameters
        Output: All calculated values with complete detail

        Args:
            parameters: Dict with keys:
                - pipe_length_mm
                - pipe_diameter_mm
                - material_key (string identifier) OR injected properties (see below)
                - temperature_c
                - flow_rate_lpm
                - machine_type (optional)
                - pressure_override (optional)

                INJECTED PROPERTIES (TypeScript reads these from the material database
                CSV and provides them; they describe the MIXED LIQUID being pumped):
                - viscosity_cp (number) - overrides material lookup
                - density_kg_m3 (number)
                - reference_temp_c (number) - temperature viscosity_cp was measured at
                - flow_index (number)
                - activation_energy_j_mol (number)
                - polyol_sg (number)
                - iso_sg (number)
                - weight_ratio (list)
                - final_density_kg_m3 (number) - cured foam, not the liquid
                - material_name (str)
                - blowing_agent (str), gwp_per_kg (number), is_eco_friendly (bool)

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

        BACKWARD COMPATIBILITY:
        - If injected properties present, uses them (no material_key lookup)
        - If only material_key present, falls back to hardcoded lookup
        - If both present, injected properties take precedence
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
                material_key = parameters.get('material_key', 'genfoam_hd12')
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

            # Step 3: Resolve material properties (Phase Beta: prefers injected)
            material, material_source = self._resolve_material_properties(parameters)
            if material is None:
                return {
                    'success': False,
                    'errors': [f'No material properties available (tried: {material_source})'],
                    'warnings': [],
                    'data': None
                }

            # Step 4: Get machine specifications
            machine = self.machine_specs.get(machine_type, self.machine_specs['high_pressure'])

            # Step 4b: Work out the temperature the material actually arrives at.
            # Only when an ambient temperature is supplied — without it this is skipped
            # entirely and the set point is used, exactly as before.
            line_temperature = None
            process_temperature_c = temperature_c
            ambient_temperature_c = parameters.get('ambient_temperature_c')

            if ambient_temperature_c is not None:
                try:
                    line_temperature = calculate_line_temperature(
                        set_temperature_c=temperature_c,
                        ambient_temperature_c=float(ambient_temperature_c),
                        diameter_mm=pipe_diameter_mm,
                        length_mm=pipe_length_mm,
                        flow_rate_lpm=flow_rate_lpm,
                        density_kg_m3=material['density'],
                        idle_time_s=float(parameters.get('idle_time_s', 0) or 0),
                        heat_transfer_coeff_w_m2_k=float(
                            parameters.get('hose_heat_transfer_coeff_w_m2_k')
                            or DEFAULT_HOSE_HEAT_TRANSFER_W_M2_K
                        ),
                    )
                    process_temperature_c = line_temperature['effective_temperature_c']
                except Exception as e:
                    logger.error(f"Line temperature calculation failed: {e}")
                    line_temperature = None

            # Step 5: Correct the viscosity for process temperature.
            # This runs before flow and pressure because everything downstream depends on
            # it: the Arrhenius-corrected viscosity is the consistency the power-law model
            # thins from, and the pressure drop follows from that.
            try:
                thermal_result = thermal.calculate_temperature_dependent_viscosity(
                    reference_temp_c=material.get('reference_temp_c', 25.0),
                    reference_viscosity_cp=material['viscosity'],
                    activation_energy_j_mol=material['activation_energy'],
                    current_temp_c=process_temperature_c,
                )
            except Exception as e:
                logger.error(f"Thermal calculation failed: {e}")
                return {
                    'success': False,
                    'errors': [f'Thermal calculation error: {str(e)}'],
                    'warnings': [],
                    'data': None,
                }

            temperature_corrected_viscosity_cp = thermal_result['current_viscosity_cp']

            # Step 6: Calculate all flow properties at the process temperature
            try:
                flow_result = flow.calculate_all_flow_properties(
                    diameter_mm=pipe_diameter_mm,
                    flow_rate_lpm=flow_rate_lpm,
                    consistency_cp=temperature_corrected_viscosity_cp,
                    flow_index=material['flow_index'],
                    density_kg_m3=material['density'],
                )
                if not flow_result or 'apparent_viscosity_cp' not in flow_result:
                    raise ValueError("Flow calculation returned invalid result")

                # How much room is left before the line turns turbulent, and which dial to
                # move if there is none. Avoiding turbulence is the point of the tool, so
                # the regime label on its own only answers half the question.
                flow_result['laminar_envelope'] = flow.calculate_laminar_envelope(
                    diameter_mm=pipe_diameter_mm,
                    flow_rate_lpm=flow_rate_lpm,
                    consistency_cp=temperature_corrected_viscosity_cp,
                    flow_index=material['flow_index'],
                    density_kg_m3=material['density'],
                )
            except Exception as e:
                logger.error(f"Flow calculation failed: {e}")
                return {
                    'success': False,
                    'errors': [f'Flow calculation error: {str(e)}'],
                    'warnings': [],
                    'data': None
                }

            # Step 7: Calculate pressure drop
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

            # Step 8: Account for fitting losses
            try:
                pressure_with_fittings = pressure.calculate_pressure_with_fittings(
                    base_pressure_bar=pressure_result['pressure_drop_bar'],
                    fitting_loss_multiplier=0.15,
                )
            except Exception as e:
                logger.error(f"Fitting loss calculation failed: {e}")
                pressure_with_fittings = pressure_result  # Fallback without fittings

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
                        blowing_agent=parameters.get('blowing_agent'),
                        gwp_per_kg=parameters.get('gwp_per_kg'),
                        is_eco_friendly=parameters.get('is_eco_friendly'),
                        material_name=material.get('name'),
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

            # Step 10b: Will the blowing agent stay in solution at this temperature?
            # Uses the line pressure computed above, so it runs after the pressure steps.
            try:
                volatility_result = check_blowing_agent_volatility(
                    blowing_agent=(
                        parameters.get('blowing_agent')
                        or (material.get('environmental') or {}).get('blowing_agent')
                    ),
                    temperature_c=process_temperature_c,
                    line_pressure_bar=pressure_with_fittings.get(
                        'total_pressure_bar', pressure_result['pressure_drop_bar']
                    ),
                )
            except Exception as e:
                logger.error(f"Volatility check failed: {e}")
                volatility_result = None

            # Step 10c: Output, in the units the machine is actually set in.
            # A metering pump is set by throughput, not by pressure, so this is the number
            # the operator dials in — and the one the machine's own range is specified
            # against. 1 L = 0.001 m³, so L/min × kg/m³ ÷ 1000 = kg/min.
            mass_flow_kg_min = flow_rate_lpm * material['density'] / 1000.0

            # Step 11: Check machine compatibility
            try:
                machine_compat = pressure.calculate_machine_compatibility(
                    total_pressure_bar=pressure_with_fittings['total_pressure_bar'],
                    machine_specs=machine,
                    mass_flow_kg_min=mass_flow_kg_min,
                )
            except Exception as e:
                logger.error(f"Machine compatibility check failed: {e}")
                machine_compat = {
                    'is_compatible': False,
                    'status': 'Check failed',
                    'line_demand_bar': 0,
                    'max_pressure_bar': 0,
                    'warning': str(e),
                    'note': None,
                }  # Fallback

            # Step 11b: Cure and exotherm, when the caller asked for them.
            # This describes the part after the mix head, not the feed line, and is
            # attached only when both inputs are present and the material is catalogued.
            # Nothing here can change the feed-line result above.
            cure_result = self._calculate_cure_block(
                material_key=material_key,
                temperature_c=process_temperature_c,
                material=material,
                parameters=parameters,
            )

            # Step 12: Generate warnings
            warnings = self._generate_warnings(
                flow_result,
                pressure_result,
                thermal_result,
                machine_compat,
                shear_heating_c=shear_heating.get('temperature_rise_c', 0) or 0,
            )
            for extra in (
                (line_temperature or {}).get('warning'),
                (volatility_result or {}).get('warning'),
            ):
                if extra:
                    warnings.append(extra)

            # Step 13: Compile complete results
            result_data = {
                'input': {
                    'pipe_length_mm': pipe_length_mm,
                    'pipe_diameter_mm': pipe_diameter_mm,
                    'material_key': material_key,
                    'material_name': material.get('name') or material_key,
                    'temperature_c': temperature_c,
                    'flow_rate_lpm': flow_rate_lpm,
                    # The same output expressed as throughput, which is how a metering
                    # pump is actually set and how machine capacity is specified
                    'mass_flow_kg_min': mass_flow_kg_min,
                    'machine_type': machine_type,
                    # Density of the mixed liquid actually being pumped, blended from the
                    # two components. Reported because the exports quote it: the PDF used
                    # to print a hardcoded 1000 kg/m³ for every material.
                    'material_density_kg_m3': material['density'],
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
                    'temperature_c': process_temperature_c,
                    'set_temperature_c': temperature_c,
                    'reference_temp_c': thermal_result['reference_temp_c'],
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
                    'line_demand_bar': machine_compat.get('line_demand_bar'),
                    'injection_pressure_bar': machine_compat.get('injection_pressure_bar'),
                    'injection_pressure_governed_by': machine_compat.get(
                        'injection_pressure_governed_by'
                    ),
                    'min_pressure_bar': machine_compat.get('min_pressure_bar'),
                    'max_pressure_bar': machine_compat.get('max_pressure_bar'),
                    'output_kg_min': machine_compat.get('output_kg_min'),
                    'output_min_kg_min': machine_compat.get('output_min_kg_min'),
                    'output_max_kg_min': machine_compat.get('output_max_kg_min'),
                    'output_in_range': machine_compat.get('output_in_range'),
                    'mix_head_shear_range': machine_compat.get('mix_head_shear_range'),
                    'mix_head_type': machine_compat.get('mix_head_type'),
                    'warning': machine_compat['warning'],
                    'note': machine_compat.get('note'),
                },
                'timestamp': datetime.now().isoformat(),
            }

            # Optional blocks. Omitted entirely rather than present-but-empty, so the UI
            # can tell "not asked for" apart from "evaluated and found nothing".
            if volatility_result is not None:
                result_data['volatility'] = volatility_result
            if line_temperature is not None:
                result_data['line_temperature'] = line_temperature
            if cure_result is not None:
                result_data['cure'] = cure_result

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

    def _calculate_cure_block(
        self,
        material_key: str,
        temperature_c: float,
        material: Dict[str, Any],
        parameters: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """
        Cure and exotherm prediction for the part, or None when not applicable.

        This describes what happens after the mix head and has no bearing on the feed-line
        pressure. It is attached only when the caller supplies a part thickness, the
        kinetics module is available, and the material is one whose data sheet states the
        reaction times the model is calibrated against. Anything else returns None so the
        UI shows nothing rather than something invented.
        """
        part_thickness_mm = parameters.get('part_thickness_mm')
        if part_thickness_mm is None or not KINETICS_AVAILABLE:
            return None

        # Custom materials have no data sheet reaction times to calibrate against
        if material_key == 'custom' or not material.get('reaction', {}).get('gel_time_s'):
            return None

        reaction = material['reaction']
        mold_temperature_c = parameters.get('mold_temperature_c')
        if mold_temperature_c is None:
            mold_temperature_c = reaction.get('mold_temp_min_c')

        try:
            result = self.calculate_kinetics(
                material_key=material_key,
                temperature_c=temperature_c,
                time_s=0.0,
                part_thickness_mm=float(part_thickness_mm),
                mold_temp_c=float(mold_temperature_c) if mold_temperature_c is not None else None,
            )
        except Exception as e:
            logger.error(f"Cure calculation failed: {e}")
            return None

        if not result.get('success'):
            logger.info(f"Cure calculation unavailable: {result.get('error')}")
            return None

        data = result['data']
        exotherm = data.get('exotherm', {})

        return {
            'part_thickness_mm': float(part_thickness_mm),
            # The mould temperature actually used, which may be the model's own fallback
            # when neither the caller nor the data sheet gives one
            'mold_temperature_c': exotherm.get('mold_temperature_c'),
            'mold_temperature_source': (
                'user' if parameters.get('mold_temperature_c') is not None
                else 'data_sheet' if reaction.get('mold_temp_min_c') is not None
                else 'default'
            ),
            'processing_window': data.get('processing_window'),
            'cream_time_s': reaction.get('cream_time_s'),
            'gel_time_s': reaction.get('gel_time_s'),
            'tack_free_time_s': reaction.get('tack_free_time_s'),
            # Total heat the reaction can release, at full conversion
            'adiabatic_rise_c': exotherm.get('adiabatic_rise_c'),
            'peak_temperature_c': exotherm.get('peak_temperature_c'),
            'scorch_risk': exotherm.get('scorch_risk'),
            'scorch_margin_c': exotherm.get('scorch_margin_c'),
            'heat_of_reaction_j_kg': exotherm.get('heat_of_reaction_j_kg'),
            # These data sheets state no heat of reaction, so the exotherm figures rest on
            # a literature-typical value. Flagged so the UI says so rather than presenting
            # them as measurements of this product.
            'heat_of_reaction_is_estimated': exotherm.get('heat_of_reaction_is_estimated', True),
        }

    def _get_material_properties(self, material_key: str) -> Optional[Dict]:
        """Look a material up in the database CSV."""
        try:
            return get_material(material_key)
        except Exception as e:
            logger.error(f"Material database unavailable: {e}")
            return None

    def _resolve_material_properties(self, parameters: Dict[str, Any]) -> tuple:
        """
        Resolve the material properties to calculate with.

        PRIORITY (highest to lowest):
        1. Properties supplied on the parameters — how a user-entered custom material
           gets its values in.
        2. Lookup by material_key in the database CSV, the source of truth for every
           catalogued material.

        Returns:
            Tuple of (material_dict, source_description)
            - material_dict: Dict with material properties, or None if not found
            - source_description: String describing where properties came from
        """

        # CHECK 1: Properties supplied directly (custom materials)
        supplied_keys = ['viscosity_cp', 'density_kg_m3', 'flow_index', 'activation_energy_j_mol']
        has_supplied = all(key in parameters and parameters[key] is not None for key in supplied_keys)

        if has_supplied:
            material = {
                'name': parameters.get('material_name'),
                'viscosity': parameters.get('viscosity_cp'),
                'density': parameters.get('density_kg_m3'),
                'reference_temp_c': parameters.get('reference_temp_c', 25.0),
                'flow_index': parameters.get('flow_index'),
                'activation_energy': parameters.get('activation_energy_j_mol'),
                'polyol_sg': parameters.get('polyol_sg'),
                'iso_sg': parameters.get('iso_sg'),
                'weight_ratio': parameters.get('weight_ratio'),
                'final_density': parameters.get('final_density_kg_m3'),
            }
            logger.info(f"Using SUPPLIED material properties (viscosity={material['viscosity']}cP)")
            return material, 'supplied_properties'

        # CHECK 2: Look the material up in the database
        material_key = parameters.get('material_key', 'genfoam_hd12')
        material = self._get_material_properties(material_key)

        if material is not None:
            logger.info(f"Using material database entry: {material_key}")
            return material, f'material_database:{material_key}'

        try:
            available = ', '.join(list_material_keys())
        except Exception:
            available = 'material database unavailable'

        return None, f'material_key "{material_key}" not in the database (available: {available})'

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

            kinetics_data = material.get('kinetics', {})
            reaction = material.get('reaction', {})

            # Calibrate the rate constants to the cream and gel times this material's
            # data sheet states, so the cure curve reproduces the reaction the supplier
            # measured rather than a set of invented constants.
            try:
                cure_params = CureKineticsParameters.from_material(
                    material,
                    m=kinetics_data.get('m', 1.0),
                    n=kinetics_data.get('n', 1.5),
                    activation_energy_k1=kinetics_data.get('activation_energy_k1', 50000),
                    activation_energy_k2=kinetics_data.get('activation_energy_k2', 45000),
                    gel_conversion=kinetics_data.get('gel_conversion', 0.65),
                )
            except ValueError as e:
                return {
                    'success': False,
                    'error': str(e),
                    'data': None,
                }

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

            # Build thermal reaction parameters.
            # Heat of reaction comes from the data sheet where stated, is derived from a
            # stated peak exotherm where that is given, and otherwise falls back to a
            # literature-typical value which the result flags as an estimate.
            effective_mold_temp = mold_temp_c or reaction.get('mold_temp_min_c') or 40
            specific_heat = (
                reaction.get('specific_heat_j_kg_k')
                or kinetics_data.get('specific_heat')
                or DEFAULT_SPECIFIC_HEAT_J_KG_K
            )

            heat_of_reaction = reaction.get('heat_of_reaction_j_kg')
            heat_of_reaction_is_estimated = heat_of_reaction is None
            if heat_of_reaction is None and reaction.get('peak_exotherm_c'):
                try:
                    heat_of_reaction = heat_of_reaction_from_peak_exotherm(
                        peak_exotherm_c=reaction['peak_exotherm_c'],
                        initial_temp_c=temperature_c,
                        specific_heat_j_kg_k=specific_heat,
                    )
                    heat_of_reaction_is_estimated = False
                except ValueError:
                    heat_of_reaction = None
            if heat_of_reaction is None:
                heat_of_reaction = DEFAULT_HEAT_OF_REACTION_J_KG

            thermal_params = ThermalReactionParameters(
                heat_of_reaction_j_kg=heat_of_reaction,
                density_kg_m3=material.get('density', 1100),
                specific_heat_j_kg_k=specific_heat,
                thermal_conductivity_w_m_k=kinetics_data.get('thermal_conductivity', 0.2),
                heat_transfer_coeff_w_m2_k=kinetics_data.get('heat_transfer_coeff', 100),
                mold_temperature_c=effective_mold_temp,
                part_thickness_mm=part_thickness_mm,
                scorch_temp_c=kinetics_data.get('scorch_temp', 180),
                initial_temp_c=temperature_c,
            )

            # Adiabatic rise at FULL conversion — the total heat the reaction can release,
            # which is what "how hot does this get" means. The rise at the current instant
            # is reported separately via cure_state.
            adiabatic_rise = calculate_exotherm_rise(
                heat_of_reaction_j_kg=thermal_params.heat_of_reaction_j_kg,
                specific_heat_j_kg_k=thermal_params.specific_heat_j_kg_k,
                conversion=1.0,
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
            free_rise_density = reaction.get('free_rise_density_kg_m3')
            if free_rise_density and free_rise_density < 500:  # Foam material
                foam_params = FoamKineticsParameters(
                    cream_time_s=reaction.get('cream_time_s') or 10,
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
                        'heat_of_reaction_j_kg': thermal_params.heat_of_reaction_j_kg,
                        'heat_of_reaction_is_estimated': heat_of_reaction_is_estimated,
                        'mold_temperature_c': effective_mold_temp,
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
        shear_heating_c: float = 0.0,
    ) -> List[str]:
        """Generate user-friendly warnings based on calculations."""

        warnings = []

        # Flow regime warning
        if flow_result.get('flow_regime') == 'turbulent':
            warnings.append(
                f"Turbulent flow detected (Re={flow_result.get('reynolds_number', 0):.0f}). "
                "Consider larger diameter or lower flow rate for better mix."
            )

        # Shear in the feed line.
        #
        # This used to warn above 5000 1/s that "material may degrade", which is the wrong
        # concern in the wrong place. What travels down the feed line is unmixed polyol or
        # isocyanate: low-molecular-weight liquids, not shear-degradable polymer melts. The
        # mix head, meanwhile, runs at far higher shear on purpose — that is how impingement
        # mixing works — so a bare "high shear" warning also reads as though the machine
        # itself were misconfigured.
        #
        # What high feed-line shear actually does is heat the material, which shifts
        # viscosity and eats into the processing window. That is already computed, so the
        # warning is raised on the consequence rather than on a number standing in for it.
        if shear_heating_c >= 2.0:
            warnings.append(
                f"Shear heating raises the material {shear_heating_c:.1f} °C in the line. "
                "That shifts viscosity and shortens the working time — widen the line or "
                "lower the output if the window is tight."
            )

        # A very high shear rate is still worth naming for filled systems, where it is the
        # filler rather than the resin that suffers.
        shear_rate = flow_result.get('shear_rate_s_inv', 0)
        if shear_rate > 10000:
            warnings.append(
                f"Very high shear rate in the line ({shear_rate:.0f} 1/s). "
                "Harmless for a neat resin, but glass or mineral fillers can be broken up "
                "at this level — widen the line if the system is filled."
            )

        # An output the machine cannot meter is an incompatibility, so it arrives through
        # the machine check at the end of this function rather than being repeated here.

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

        # Machine compatibility warning. A pressure below the machine's minimum is normal
        # and carries a note instead, so only a genuine incompatibility warns here.
        if not machine_compat.get('is_compatible'):
            warnings.append(f"⚠️ {machine_compat.get('warning') or 'Not compatible with machine.'}")

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
