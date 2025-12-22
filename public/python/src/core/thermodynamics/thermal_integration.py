"""
Integration layer for Advanced Heat Transfer Model with calculation pipeline.

Enhances the basic thermal calculations with:
- Detailed convection analysis (Nusselt correlations)
- Radiative heat transfer
- Pipe thermal conductivity effects
- Insulation modeling
- Temperature profile along pipe

Can be optionally used in CalculationProcessor for enhanced accuracy.

Author: Phase 4 Tier 2
"""

from typing import Dict, Any, Optional
from dataclasses import asdict

from .advanced_heat_transfer import (
    PipeProperties,
    FluidProperties,
    InsulationProperties,
    EnvironmentProperties,
    HeatTransferCalculator,
)


class AdvancedThermalCalculator:
    """
    Enhanced thermal calculator for polyurethane injection molding.

    Integrates advanced heat transfer model with standard calculation pipeline.
    """

    def __init__(self):
        """Initialize calculator"""
        pass

    def calculate_advanced_thermal_profile(
        self,
        pipe_length_mm: float,
        pipe_diameter_mm: float,
        flow_rate_lpm: float,
        inlet_temperature_c: float,
        material_density_kg_m3: float = 1100,
        material_specific_heat_j_kg_k: float = 2100,
        material_thermal_conductivity_w_m_k: float = 0.18,
        material_viscosity_pa_s: float = 0.5,
        pipe_material: str = 'steel',
        insulation_thickness_mm: float = 0,
        insulation_material: str = 'foam',
        ambient_temperature_c: float = 25.0,
        pipe_outer_diameter_mm: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Calculate detailed thermal profile for polyurethane injection.

        Args:
            pipe_length_mm: Pipe length in mm
            pipe_diameter_mm: Inner pipe diameter in mm
            flow_rate_lpm: Flow rate in L/min
            inlet_temperature_c: Inlet temperature in °C
            material_density_kg_m3: Material density in kg/m³
            material_specific_heat_j_kg_k: Specific heat in J/(kg·K)
            material_thermal_conductivity_w_m_k: Thermal conductivity in W/(m·K)
            material_viscosity_pa_s: Viscosity in Pa·s
            pipe_material: Pipe material ('steel', 'copper', 'aluminum')
            insulation_thickness_mm: Insulation thickness in mm
            insulation_material: Insulation type ('foam', 'glass_wool', 'mineral_wool')
            ambient_temperature_c: Ambient temperature in °C
            pipe_outer_diameter_mm: Outer diameter (calculated if not provided)

        Returns:
            Dict with detailed thermal analysis
        """
        try:
            # Material properties for common pipe materials (W/m·K)
            pipe_conductivities = {
                'steel': 50,
                'copper': 400,
                'aluminum': 237,
            }

            # Calculate outer diameter if not provided
            if pipe_outer_diameter_mm is None:
                # Assume 1mm wall thickness for standard tubes
                pipe_outer_diameter_mm = pipe_diameter_mm + 2

            # Create pipe properties
            pipe = PipeProperties(
                inner_diameter_mm=pipe_diameter_mm,
                outer_diameter_mm=pipe_outer_diameter_mm,
                length_mm=pipe_length_mm,
                material_conductivity_w_m_k=pipe_conductivities.get(pipe_material, 50)
            )

            # Create fluid properties
            fluid = FluidProperties(
                density_kg_m3=material_density_kg_m3,
                specific_heat_j_kg_k=material_specific_heat_j_kg_k,
                thermal_conductivity_w_m_k=material_thermal_conductivity_w_m_k,
                viscosity_pa_s=material_viscosity_pa_s,
                viscosity_cp=material_viscosity_pa_s * 1000  # Convert Pa·s to cP
            )

            # Create environment
            environment = EnvironmentProperties(
                ambient_temp_c=ambient_temperature_c,
                convection_coefficient_ambient_w_m2_k=10.0  # Natural/forced convection
            )

            # Create insulation if specified
            insulation = None
            if insulation_thickness_mm > 0:
                insulation_props = {
                    'foam': {'k': 0.04, 'emissivity': 0.9},
                    'glass_wool': {'k': 0.05, 'emissivity': 0.85},
                    'mineral_wool': {'k': 0.06, 'emissivity': 0.88},
                }
                props = insulation_props.get(insulation_material, {'k': 0.04, 'emissivity': 0.9})
                insulation = InsulationProperties(
                    thickness_mm=insulation_thickness_mm,
                    conductivity_w_m_k=props['k'],
                    emissivity=props['emissivity']
                )

            # Create calculator
            calc = HeatTransferCalculator(pipe, fluid, environment, insulation)

            # Calculate heat loss
            heat_loss_result = calc.calculate_heat_loss(
                flow_rate_lpm=flow_rate_lpm,
                inlet_temp_c=inlet_temperature_c
            )

            # Calculate outlet temperature
            outlet_temperature = calc.calculate_outlet_temperature(
                flow_rate_lpm=flow_rate_lpm,
                inlet_temp_c=inlet_temperature_c
            )

            # Calculate temperature profile
            profile = calc.calculate_temperature_profile(
                flow_rate_lpm=flow_rate_lpm,
                inlet_temp_c=inlet_temperature_c,
                num_points=10
            )

            # Compile results
            return {
                'success': True,
                'inlet_temperature_c': inlet_temperature_c,
                'outlet_temperature_c': outlet_temperature,
                'temperature_drop_c': heat_loss_result.temperature_drop_c,
                'average_pipe_temperature_c': heat_loss_result.average_pipe_temperature_c,
                'flow': {
                    'reynolds_number': heat_loss_result.convection.reynolds_number,
                    'prandtl_number': heat_loss_result.convection.prandtl_number,
                    'regime': heat_loss_result.convection.flow_regime.value,
                    'friction_factor': heat_loss_result.convection.friction_factor,
                },
                'convection': {
                    'nusselt_number': heat_loss_result.convection.nusselt_number,
                    'convection_coefficient_w_m2_k': heat_loss_result.convection.convection_coefficient_w_m2_k,
                    'hydraulic_diameter_m': heat_loss_result.convection.hydraulic_diameter_m,
                },
                'radiation': {
                    'radiation_heat_transfer_w': heat_loss_result.radiation.radiation_heat_transfer_w if heat_loss_result.radiation else 0,
                    'has_insulation': insulation is not None,
                } if heat_loss_result.radiation else None,
                'thermal_resistance': {
                    'pipe_resistance_k_w': heat_loss_result.pipe_conduction_resistance_k_w,
                    'insulation_resistance_k_w': heat_loss_result.insulation_resistance_k_w,
                    'total_resistance_k_w': heat_loss_result.total_resistance_k_w,
                },
                'heat_transfer': {
                    'total_heat_loss_w': heat_loss_result.heat_loss_w,
                },
                'temperature_profile': [
                    {
                        'position_fraction': pos,
                        'position_mm': pos * pipe_length_mm,
                        'temperature_c': temp
                    }
                    for pos, temp in profile
                ],
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
            }

    def compare_thermal_models(
        self,
        pipe_length_mm: float,
        pipe_diameter_mm: float,
        flow_rate_lpm: float,
        inlet_temperature_c: float,
        material_density_kg_m3: float = 1100,
        material_specific_heat_j_kg_k: float = 2100,
        material_thermal_conductivity_w_m_k: float = 0.18,
        material_viscosity_pa_s: float = 0.5,
        simple_ambient_loss_c: float = 1.0,
    ) -> Dict[str, Any]:
        """
        Compare advanced heat transfer model with simple model.

        Args:
            Simple model parameters (from Phase 1-3)
            Advanced model parameters

        Returns:
            Comparison of both approaches
        """
        # Simple model: constant temperature loss (from thermal.py)
        simple_final_temp = inlet_temperature_c - simple_ambient_loss_c

        # Advanced model
        advanced = self.calculate_advanced_thermal_profile(
            pipe_length_mm=pipe_length_mm,
            pipe_diameter_mm=pipe_diameter_mm,
            flow_rate_lpm=flow_rate_lpm,
            inlet_temperature_c=inlet_temperature_c,
            material_density_kg_m3=material_density_kg_m3,
            material_specific_heat_j_kg_k=material_specific_heat_j_kg_k,
            material_thermal_conductivity_w_m_k=material_thermal_conductivity_w_m_k,
            material_viscosity_pa_s=material_viscosity_pa_s,
        )

        if advanced['success']:
            return {
                'simple_model': {
                    'outlet_temperature_c': simple_final_temp,
                    'temperature_drop_c': simple_ambient_loss_c,
                    'method': 'Constant loss (Phase 1-3)',
                },
                'advanced_model': {
                    'outlet_temperature_c': advanced['outlet_temperature_c'],
                    'temperature_drop_c': advanced['temperature_drop_c'],
                    'average_pipe_temperature_c': advanced['average_pipe_temperature_c'],
                    'reynolds_number': advanced['flow']['reynolds_number'],
                    'nusselt_number': advanced['convection']['nusselt_number'],
                    'method': 'Advanced heat transfer with convection/radiation (Phase 4 Tier 2)',
                },
                'improvement': {
                    'temperature_difference_c': abs(advanced['outlet_temperature_c'] - simple_final_temp),
                    'accuracy_increase_percent': 'More detailed flow/thermal regime analysis',
                    'physics_enhancement': 'Full Nusselt correlation + radiation + thermal resistance',
                },
            }
        else:
            return {
                'error': advanced.get('error', 'Unknown error'),
                'simple_model': {
                    'outlet_temperature_c': simple_final_temp,
                    'temperature_drop_c': simple_ambient_loss_c,
                },
            }

    def get_thermal_recommendations(
        self,
        pipe_length_mm: float,
        pipe_diameter_mm: float,
        flow_rate_lpm: float,
        inlet_temperature_c: float,
        target_outlet_temperature_c: Optional[float] = None,
        material_density_kg_m3: float = 1100,
        material_viscosity_pa_s: float = 0.5,
    ) -> Dict[str, Any]:
        """
        Provide recommendations for thermal management.

        Args:
            Current process parameters
            Target outlet temperature (optional)

        Returns:
            List of recommendations to improve thermal performance
        """
        advanced = self.calculate_advanced_thermal_profile(
            pipe_length_mm=pipe_length_mm,
            pipe_diameter_mm=pipe_diameter_mm,
            flow_rate_lpm=flow_rate_lpm,
            inlet_temperature_c=inlet_temperature_c,
            material_viscosity_pa_s=material_viscosity_pa_s,
            material_density_kg_m3=material_density_kg_m3,
        )

        if not advanced['success']:
            return {'error': advanced.get('error', 'Calculation failed')}

        recommendations = []
        outlet_temp = advanced['outlet_temperature_c']
        temp_drop = advanced['temperature_drop_c']
        reynolds = advanced['flow']['reynolds_number']

        # Recommendation 1: Heat loss
        if temp_drop > 5:
            recommendations.append({
                'priority': 'HIGH',
                'issue': 'Significant temperature drop',
                'drop_c': temp_drop,
                'suggestion': 'Add insulation to reduce heat loss',
                'expected_improvement': 'Reduce temperature drop by 50-80%',
            })

        # Recommendation 2: Flow regime
        if reynolds < 100:
            recommendations.append({
                'priority': 'MEDIUM',
                'issue': 'Very low Reynolds number (laminar flow)',
                're': reynolds,
                'suggestion': 'Consider increasing flow rate or reducing viscosity',
                'expected_improvement': 'Better mixing and heat transfer',
            })
        elif reynolds > 10000:
            recommendations.append({
                'priority': 'LOW',
                'issue': 'High turbulent flow',
                're': reynolds,
                'suggestion': 'Monitor for potential erosion or noise',
                'expected_improvement': 'Good heat transfer but monitor flow pressure',
            })

        # Recommendation 3: Target temperature
        if target_outlet_temperature_c is not None:
            if outlet_temp < target_outlet_temperature_c - 2:
                recommendations.append({
                    'priority': 'HIGH',
                    'issue': f'Outlet temperature {outlet_temp:.1f}°C is below target {target_outlet_temperature_c}°C',
                    'suggestion': 'Increase inlet temperature or reduce pipe insulation',
                    'expected_improvement': 'Achieve target outlet temperature',
                })
            elif outlet_temp > target_outlet_temperature_c + 2:
                recommendations.append({
                    'priority': 'HIGH',
                    'issue': f'Outlet temperature {outlet_temp:.1f}°C is above target {target_outlet_temperature_c}°C',
                    'suggestion': 'Add insulation or reduce inlet temperature',
                    'expected_improvement': 'Achieve target outlet temperature',
                })

        return {
            'current_conditions': {
                'outlet_temperature_c': outlet_temp,
                'temperature_drop_c': temp_drop,
                'reynolds_number': reynolds,
            },
            'recommendations': recommendations if recommendations else [
                {
                    'priority': 'INFO',
                    'issue': 'Process appears well-optimized',
                    'suggestion': 'Current thermal conditions are favorable',
                }
            ],
        }
