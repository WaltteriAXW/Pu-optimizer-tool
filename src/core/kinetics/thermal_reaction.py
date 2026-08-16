"""
Thermal Reaction Models for Polyurethane Processing

Implements heat generation and thermal management models:

1. Exotherm Temperature Rise (Adiabatic):
   ΔT_max = (ΔH_r × ρ) / C_p × α_max

   Where:
   - ΔH_r = heat of reaction (J/kg), typically 80-120 kJ/kg for PU
   - ρ = density (kg/m³)
   - C_p = specific heat capacity (J/kg·K), typically 1500-2000 for PU
   - α_max = maximum conversion achieved

   For thick parts (>30mm), internal temps can rise 50-100°C,
   causing scorching defects.

2. Lumped Thermal Model (Mold Heat Transfer):
   dT/dt = (1/ρC_p) × [Q̇_reaction - (hA/V)(T - T_mold)]

   Where:
   - Q̇_reaction = heat generation rate from reaction
   - h = heat transfer coefficient to mold (W/m²·K)
   - A/V = surface-to-volume ratio (m⁻¹)
   - T_mold = mold temperature

   This balances heat generation (reaction) against heat removal (mold cooling)
   to predict core temperature evolution.

3. Scorch Prediction:
   Scorching occurs when core temperature exceeds degradation threshold
   (typically 180-220°C for PU). Risk depends on:
   - Part thickness (affects A/V ratio)
   - Mold temperature
   - Reaction speed (faster = more heat in less time)

Author: Phase 4 - Kinetics Extension
"""

import math
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional
from enum import Enum

from .reaction_kinetics import (
    CureKinetics,
    CureKineticsParameters,
    CureModel,
)


# Heat of reaction used when a material's data sheet states none.
#
# ESTIMATED, NOT MEASURED. Anchored to published measurements of rigid polyurethane, which
# report peak internal temperatures of 160-164 °C during foaming. From a ~25 °C start that
# is a rise of about 135 °C, and with c_p ≈ 1800 J/kg·K implies ΔH ≈ 240 kJ/kg. Anything
# derived from this default should be presented to the user as an estimate; a material that
# states Heat_Of_Reaction_kJ_kg or Peak_Exotherm_C in the CSV overrides it.
#
# Source: measured internal temperatures of rigid PU bodies, AIP Advances 12, 125122 (2022);
# corroborated by Welte, "Calculation and Measurement of Reaction Temperatures in Rigid
# Polyurethane and Polyisocyanurate Foams", J. Cellular Plastics 20(5), 1984.
DEFAULT_HEAT_OF_REACTION_J_KG = 240_000.0

# Typical specific heat of a reacting polyurethane mix (J/kg·K)
DEFAULT_SPECIFIC_HEAT_J_KG_K = 1800.0


def heat_of_reaction_from_peak_exotherm(
    peak_exotherm_c: float,
    initial_temp_c: float = 25.0,
    specific_heat_j_kg_k: float = DEFAULT_SPECIFIC_HEAT_J_KG_K,
) -> float:
    """
    Derive the heat of reaction from a measured peak exotherm.

    ΔH = c_p · (T_peak − T_initial), treating the measured peak as approaching adiabatic,
    which is reasonable for the thick sections where peak exotherms are recorded.

    Preferring this over a default is the same principle as calibrating rate constants to
    measured gel times: where a real measurement exists, fit to it.
    """
    rise = peak_exotherm_c - initial_temp_c
    if rise <= 0:
        raise ValueError(
            f'Peak exotherm {peak_exotherm_c} °C is not above the initial temperature '
            f'{initial_temp_c} °C'
        )
    return specific_heat_j_kg_k * rise


class ScorchRisk(Enum):
    """Scorch risk classification"""
    LOW = "low"           # Peak temp < 120°C
    MODERATE = "moderate"  # Peak temp 120-160°C
    HIGH = "high"         # Peak temp 160-200°C
    CRITICAL = "critical"  # Peak temp > 200°C


@dataclass
class ThermalReactionParameters:
    """
    Parameters for thermal reaction modeling.

    Heat of reaction values are typically determined by DSC.
    """
    # Heat of reaction
    heat_of_reaction_j_kg: float = DEFAULT_HEAT_OF_REACTION_J_KG  # ΔH_r

    # Material thermal properties
    density_kg_m3: float = 1100            # ρ
    specific_heat_j_kg_k: float = DEFAULT_SPECIFIC_HEAT_J_KG_K  # C_p (1500-2000 for PU)
    thermal_conductivity_w_m_k: float = 0.2  # k (0.15-0.25 for PU)

    # Heat transfer properties
    heat_transfer_coeff_w_m2_k: float = 100  # h (50-200 typical for mold)
    mold_temperature_c: float = 40.0         # T_mold

    # Part geometry (affects A/V ratio)
    part_thickness_mm: float = 20.0

    # Degradation thresholds
    scorch_temp_c: float = 180.0            # Temperature causing visible degradation
    degradation_temp_c: float = 220.0       # Temperature causing severe degradation

    # Reference conditions
    initial_temp_c: float = 25.0            # Initial material temperature

    @property
    def thermal_diffusivity_m2_s(self) -> float:
        """Thermal diffusivity α = k / (ρ × C_p)"""
        return self.thermal_conductivity_w_m_k / \
               (self.density_kg_m3 * self.specific_heat_j_kg_k)

    @property
    def surface_to_volume_ratio_m_inv(self) -> float:
        """
        Approximate A/V ratio for slab geometry.
        For a slab: A/V ≈ 2/thickness (heat loss from both sides)
        """
        thickness_m = self.part_thickness_mm / 1000
        return 2.0 / thickness_m


@dataclass
class ExothermResult:
    """Results from exotherm calculation"""
    initial_temp_c: float
    adiabatic_temp_rise_c: float    # Maximum possible rise (no cooling)
    peak_temp_c: float               # Actual peak with cooling
    time_to_peak_s: float            # Time to reach peak
    scorch_risk: ScorchRisk
    scorch_margin_c: float           # Degrees below scorch temp
    final_temp_c: float              # Temperature after cure complete
    cooling_time_to_mold_s: float    # Time to cool to mold temp + 10°C


class ExothermModel:
    """
    Exotherm temperature rise model.

    Calculates temperature evolution during cure considering:
    - Heat generation from reaction
    - Heat removal to mold

    Can operate in:
    - Adiabatic mode (no cooling) for worst-case estimates
    - Lumped thermal mode (with cooling) for realistic predictions
    """

    def __init__(
        self,
        thermal_params: ThermalReactionParameters,
        cure_params: Optional[CureKineticsParameters] = None
    ):
        """
        Initialize exotherm model.

        Args:
            thermal_params: Thermal reaction parameters
            cure_params: Cure kinetics parameters (for time-resolved calculation)
        """
        self.thermal_params = thermal_params
        self.cure_params = cure_params

        if cure_params:
            self.cure_model = CureKinetics(cure_params, CureModel.KAMAL_SOUROUR)
        else:
            self.cure_model = None

    def adiabatic_temperature_rise(self, conversion: float = 1.0) -> float:
        """
        Calculate adiabatic (no cooling) temperature rise.

        ΔT = (ΔH_r / C_p) × α

        This is the MAXIMUM possible temperature rise if all heat
        stays in the material.

        Args:
            conversion: Degree of conversion (0 to 1)

        Returns:
            Temperature rise in °C
        """
        delta_h = self.thermal_params.heat_of_reaction_j_kg
        c_p = self.thermal_params.specific_heat_j_kg_k

        return (delta_h / c_p) * conversion

    def max_adiabatic_temperature(self) -> float:
        """Maximum temperature assuming complete adiabatic cure"""
        return self.thermal_params.initial_temp_c + self.adiabatic_temperature_rise(1.0)


class LumpedThermalModel:
    """
    Lumped thermal model for part temperature during cure.

    dT/dt = (1/ρC_p) × [Q̇_reaction - (hA/V)(T - T_mold)]

    Assumes uniform temperature throughout part (valid when Biot < 0.1).
    For thick parts, consider finite difference or FEM.
    """

    def __init__(
        self,
        thermal_params: ThermalReactionParameters,
        cure_params: CureKineticsParameters
    ):
        """
        Initialize lumped thermal model.

        Args:
            thermal_params: Thermal reaction parameters
            cure_params: Cure kinetics parameters
        """
        self.thermal_params = thermal_params
        self.cure_params = cure_params
        self.cure_model = CureKinetics(cure_params, CureModel.KAMAL_SOUROUR)

    def biot_number(self) -> float:
        """
        Calculate Biot number: Bi = h × L / k

        Lumped model valid when Bi < 0.1
        L = characteristic length = V/A = thickness/2 for slab
        """
        h = self.thermal_params.heat_transfer_coeff_w_m2_k
        k = self.thermal_params.thermal_conductivity_w_m_k
        L = (self.thermal_params.part_thickness_mm / 1000) / 2  # Half-thickness

        return h * L / k

    def is_lumped_valid(self) -> bool:
        """Check if lumped model assumption is valid"""
        return self.biot_number() < 0.1

    def heat_generation_rate(
        self,
        conversion_rate: float,
        temperature_c: float
    ) -> float:
        """
        Calculate volumetric heat generation rate.

        Q̇ = ρ × ΔH_r × (dα/dt)

        Args:
            conversion_rate: Rate of conversion dα/dt (s⁻¹)
            temperature_c: Current temperature

        Returns:
            Heat generation rate (W/m³)
        """
        rho = self.thermal_params.density_kg_m3
        delta_h = self.thermal_params.heat_of_reaction_j_kg

        return rho * delta_h * conversion_rate

    def temperature_rate(
        self,
        temperature_c: float,
        conversion: float,
        conversion_rate: float
    ) -> float:
        """
        Calculate rate of temperature change.

        dT/dt = (1/ρC_p) × [Q̇_reaction - (hA/V)(T - T_mold)]

        Args:
            temperature_c: Current temperature (°C)
            conversion: Current conversion
            conversion_rate: Current dα/dt (s⁻¹)

        Returns:
            Temperature rate (°C/s)
        """
        rho = self.thermal_params.density_kg_m3
        c_p = self.thermal_params.specific_heat_j_kg_k
        h = self.thermal_params.heat_transfer_coeff_w_m2_k
        a_v = self.thermal_params.surface_to_volume_ratio_m_inv
        t_mold = self.thermal_params.mold_temperature_c

        # Heat generation
        q_gen = self.heat_generation_rate(conversion_rate, temperature_c)

        # Heat loss to mold
        q_loss = h * a_v * (temperature_c - t_mold)

        # Net temperature rate
        dt_dt = (q_gen - q_loss) / (rho * c_p)

        return dt_dt

    def _default_timestep(self) -> float:
        """
        Integration step sized to the reaction, not to the clock.

        The exotherm peak is sharp: a step that is comfortable for a 135 s gel time steps
        clean over the peak of a 5 s one. A fixed 0.5 s step understated the peak of a
        fast system by more than 30 °C and, worse, did so unevenly — making a hotter mould
        appear to give a *lower* peak temperature, which is not physical.

        Scaling the step to the gel time keeps the resolution constant in reaction terms.
        """
        gel_time = getattr(self.cure_params, 'gel_time_ref_s', None) if self.cure_params else None
        if not gel_time or gel_time <= 0:
            return 0.05

        return max(1e-4, min(0.1, gel_time / 2000.0))

    def simulate_cure(
        self,
        total_time_s: float,
        dt: Optional[float] = None
    ) -> List[Dict[str, float]]:
        """
        Simulate temperature evolution during cure.

        Coupled integration of cure kinetics and thermal model.

        Args:
            total_time_s: Total simulation time
            dt: Time step (seconds). Defaults to a step scaled to the reaction speed —
                see _default_timestep.

        Returns:
            List of state dicts at each time step
        """
        if dt is None:
            dt = self._default_timestep()

        # Initial conditions
        t = 0.0
        temperature = self.thermal_params.initial_temp_c
        conversion = 0.0

        history = []

        while t < total_time_s and conversion < 0.999:
            # Get conversion rate at current state
            # Note: Kamal-Sourour rate depends on conversion and temperature
            conv_rate = self.cure_model._model.conversion_rate(conversion, temperature)

            # Store current state
            history.append({
                'time_s': t,
                'temperature_c': temperature,
                'conversion': conversion,
                'conversion_rate': conv_rate,
                'heat_generation_w_m3': self.heat_generation_rate(conv_rate, temperature),
            })

            # RK4 for coupled system
            # k1
            dT1 = self.temperature_rate(temperature, conversion, conv_rate)
            dA1 = conv_rate

            # k2
            T2 = temperature + 0.5 * dt * dT1
            A2 = min(1.0, conversion + 0.5 * dt * dA1)
            rate2 = self.cure_model._model.conversion_rate(A2, T2)
            dT2 = self.temperature_rate(T2, A2, rate2)
            dA2 = rate2

            # k3
            T3 = temperature + 0.5 * dt * dT2
            A3 = min(1.0, conversion + 0.5 * dt * dA2)
            rate3 = self.cure_model._model.conversion_rate(A3, T3)
            dT3 = self.temperature_rate(T3, A3, rate3)
            dA3 = rate3

            # k4
            T4 = temperature + dt * dT3
            A4 = min(1.0, conversion + dt * dA3)
            rate4 = self.cure_model._model.conversion_rate(A4, T4)
            dT4 = self.temperature_rate(T4, A4, rate4)
            dA4 = rate4

            # Update
            temperature += (dt / 6) * (dT1 + 2*dT2 + 2*dT3 + dT4)
            conversion += (dt / 6) * (dA1 + 2*dA2 + 2*dA3 + dA4)
            conversion = min(1.0, max(0.0, conversion))

            t += dt

        # Record the final state. The loop appends before stepping, so without this the
        # last step — which for a fast reaction is where the peak sits — is discarded.
        history.append({
            'time_s': t,
            'temperature_c': temperature,
            'conversion': conversion,
            'conversion_rate': self.cure_model._model.conversion_rate(conversion, temperature),
            'heat_generation_w_m3': self.heat_generation_rate(
                self.cure_model._model.conversion_rate(conversion, temperature), temperature
            ),
        })

        return history

    def calculate_exotherm(self, total_time_s: float = 600) -> ExothermResult:
        """
        Calculate complete exotherm analysis.

        Args:
            total_time_s: Maximum simulation time

        Returns:
            ExothermResult with peak temp, timing, scorch risk
        """
        history = self.simulate_cure(total_time_s)

        if not history:
            # Return defaults if simulation fails
            return ExothermResult(
                initial_temp_c=self.thermal_params.initial_temp_c,
                adiabatic_temp_rise_c=0,
                peak_temp_c=self.thermal_params.initial_temp_c,
                time_to_peak_s=0,
                scorch_risk=ScorchRisk.LOW,
                scorch_margin_c=self.thermal_params.scorch_temp_c,
                final_temp_c=self.thermal_params.initial_temp_c,
                cooling_time_to_mold_s=0,
            )

        # Find peak temperature
        peak_temp = max(h['temperature_c'] for h in history)
        peak_idx = next(i for i, h in enumerate(history) if h['temperature_c'] == peak_temp)
        time_to_peak = history[peak_idx]['time_s']

        # Final state
        final_temp = history[-1]['temperature_c']
        final_conversion = history[-1]['conversion']

        # Adiabatic rise for comparison
        exotherm = ExothermModel(self.thermal_params, self.cure_params)
        adiabatic_rise = exotherm.adiabatic_temperature_rise(final_conversion)

        # Scorch analysis
        scorch_temp = self.thermal_params.scorch_temp_c
        scorch_margin = scorch_temp - peak_temp

        if peak_temp < 120:
            scorch_risk = ScorchRisk.LOW
        elif peak_temp < 160:
            scorch_risk = ScorchRisk.MODERATE
        elif peak_temp < 200:
            scorch_risk = ScorchRisk.HIGH
        else:
            scorch_risk = ScorchRisk.CRITICAL

        # Estimate cooling time after cure
        # Simple exponential decay: T = T_mold + (T_peak - T_mold) × exp(-t/τ)
        # Time constant τ = ρ × C_p × V / (h × A) = ρ × C_p / (h × A/V)
        tau = (self.thermal_params.density_kg_m3 * self.thermal_params.specific_heat_j_kg_k) / \
              (self.thermal_params.heat_transfer_coeff_w_m2_k *
               self.thermal_params.surface_to_volume_ratio_m_inv)

        # Time to cool to mold + 10°C
        target_temp = self.thermal_params.mold_temperature_c + 10
        if peak_temp > target_temp:
            temp_diff = peak_temp - self.thermal_params.mold_temperature_c
            target_diff = target_temp - self.thermal_params.mold_temperature_c
            cooling_time = -tau * math.log(target_diff / temp_diff)
        else:
            cooling_time = 0

        return ExothermResult(
            initial_temp_c=self.thermal_params.initial_temp_c,
            adiabatic_temp_rise_c=adiabatic_rise,
            peak_temp_c=peak_temp,
            time_to_peak_s=time_to_peak,
            scorch_risk=scorch_risk,
            scorch_margin_c=scorch_margin,
            final_temp_c=final_temp,
            cooling_time_to_mold_s=cooling_time,
        )


# =============================================================================
# Convenience Functions
# =============================================================================

def calculate_exotherm_rise(
    heat_of_reaction_j_kg: float = DEFAULT_HEAT_OF_REACTION_J_KG,
    specific_heat_j_kg_k: float = DEFAULT_SPECIFIC_HEAT_J_KG_K,
    conversion: float = 1.0
) -> float:
    """
    Quick calculation of adiabatic temperature rise.

    ΔT = (ΔH_r / C_p) × α

    Args:
        heat_of_reaction_j_kg: Heat of reaction (J/kg)
        specific_heat_j_kg_k: Specific heat (J/kg·K)
        conversion: Degree of conversion (0-1)

    Returns:
        Temperature rise (°C)
    """
    return (heat_of_reaction_j_kg / specific_heat_j_kg_k) * conversion


def calculate_core_temperature(
    part_thickness_mm: float,
    mold_temp_c: float = 40.0,
    initial_temp_c: float = 25.0,
    heat_of_reaction_j_kg: float = DEFAULT_HEAT_OF_REACTION_J_KG,
    heat_transfer_coeff: float = 100.0,
    cure_time_s: float = 120.0,
    cure_params: Optional[CureKineticsParameters] = None
) -> Dict[str, float]:
    """
    Calculate peak core temperature during cure.

    Args:
        part_thickness_mm: Part thickness (mm)
        mold_temp_c: Mold temperature (°C)
        initial_temp_c: Initial material temperature (°C)
        heat_of_reaction_j_kg: Heat of reaction (J/kg)
        heat_transfer_coeff: Heat transfer coefficient (W/m²·K)
        cure_time_s: Simulation time (s)
        cure_params: Cure kinetics parameters

    Returns:
        Dict with temperature analysis
    """
    if cure_params is None:
        cure_params = CureKineticsParameters()

    thermal_params = ThermalReactionParameters(
        heat_of_reaction_j_kg=heat_of_reaction_j_kg,
        heat_transfer_coeff_w_m2_k=heat_transfer_coeff,
        mold_temperature_c=mold_temp_c,
        part_thickness_mm=part_thickness_mm,
        initial_temp_c=initial_temp_c,
    )

    model = LumpedThermalModel(thermal_params, cure_params)
    result = model.calculate_exotherm(cure_time_s)

    return {
        'peak_temperature_c': result.peak_temp_c,
        'time_to_peak_s': result.time_to_peak_s,
        'adiabatic_rise_c': result.adiabatic_temp_rise_c,
        'actual_rise_c': result.peak_temp_c - initial_temp_c,
        'scorch_risk': result.scorch_risk.value,
        'scorch_margin_c': result.scorch_margin_c,
        'biot_number': model.biot_number(),
        'lumped_model_valid': model.is_lumped_valid(),
    }


def predict_scorch_risk(
    part_thickness_mm: float,
    mold_temp_c: float = 40.0,
    heat_of_reaction_j_kg: float = DEFAULT_HEAT_OF_REACTION_J_KG,
    cure_params: Optional[CureKineticsParameters] = None
) -> Dict[str, any]:
    """
    Predict scorch risk for a given part geometry.

    Args:
        part_thickness_mm: Part thickness (mm)
        mold_temp_c: Mold temperature (°C)
        heat_of_reaction_j_kg: Heat of reaction (J/kg)
        cure_params: Cure kinetics parameters

    Returns:
        Dict with scorch risk assessment
    """
    result = calculate_core_temperature(
        part_thickness_mm=part_thickness_mm,
        mold_temp_c=mold_temp_c,
        heat_of_reaction_j_kg=heat_of_reaction_j_kg,
        cure_params=cure_params,
    )

    # Recommendations based on risk
    risk = result['scorch_risk']
    recommendations = []

    if risk == 'high' or risk == 'critical':
        recommendations.append(f"Reduce part thickness below {part_thickness_mm * 0.7:.0f}mm")
        recommendations.append("Consider staged curing or cooling cycles")
        recommendations.append(f"Lower mold temperature to {max(25, mold_temp_c - 15):.0f}°C")

    if risk == 'moderate':
        recommendations.append("Monitor core temperature during production")
        recommendations.append("Consider slightly lower mold temperature")

    result['recommendations'] = recommendations

    return result


def calculate_optimal_mold_temp(
    part_thickness_mm: float,
    target_peak_temp_c: float = 140.0,
    heat_of_reaction_j_kg: float = DEFAULT_HEAT_OF_REACTION_J_KG,
    cure_params: Optional[CureKineticsParameters] = None,
    min_mold_temp_c: float = 25.0,
    max_mold_temp_c: float = 80.0
) -> Dict[str, float]:
    """
    Find optimal mold temperature to limit peak core temperature.

    Higher mold temp = faster cure but higher peak temp.
    This finds the balance.

    Args:
        part_thickness_mm: Part thickness (mm)
        target_peak_temp_c: Maximum desired peak temperature
        heat_of_reaction_j_kg: Heat of reaction (J/kg)
        cure_params: Cure kinetics parameters
        min_mold_temp_c: Minimum mold temperature to consider
        max_mold_temp_c: Maximum mold temperature to consider

    Returns:
        Dict with optimal mold temperature and analysis
    """
    if cure_params is None:
        cure_params = CureKineticsParameters()

    # Binary search for optimal mold temp
    t_low = min_mold_temp_c
    t_high = max_mold_temp_c

    for _ in range(20):
        t_mid = (t_low + t_high) / 2

        result = calculate_core_temperature(
            part_thickness_mm=part_thickness_mm,
            mold_temp_c=t_mid,
            heat_of_reaction_j_kg=heat_of_reaction_j_kg,
            cure_params=cure_params,
        )

        if result['peak_temperature_c'] < target_peak_temp_c:
            t_low = t_mid  # Can use higher mold temp
        else:
            t_high = t_mid  # Need lower mold temp

    optimal_temp = (t_low + t_high) / 2

    # Get final analysis at optimal temp
    final_result = calculate_core_temperature(
        part_thickness_mm=part_thickness_mm,
        mold_temp_c=optimal_temp,
        heat_of_reaction_j_kg=heat_of_reaction_j_kg,
        cure_params=cure_params,
    )

    # Estimate cycle time (gel time at optimal mold temp)
    cure_model = CureKinetics(cure_params, CureModel.KAMAL_SOUROUR)
    gel_time = cure_model.gel_time(optimal_temp)
    demold_time = cure_model._model.time_to_conversion(0.9, optimal_temp)

    return {
        'optimal_mold_temp_c': optimal_temp,
        'peak_temperature_c': final_result['peak_temperature_c'],
        'scorch_margin_c': final_result['scorch_margin_c'],
        'gel_time_s': gel_time,
        'estimated_demold_time_s': demold_time,
        'scorch_risk': final_result['scorch_risk'],
    }


def calculate_minimum_safe_thickness(
    mold_temp_c: float,
    max_peak_temp_c: float = 160.0,
    heat_of_reaction_j_kg: float = DEFAULT_HEAT_OF_REACTION_J_KG,
    cure_params: Optional[CureKineticsParameters] = None,
    max_thickness_mm: float = 100.0
) -> Dict[str, float]:
    """
    Find maximum safe part thickness for given conditions.

    Args:
        mold_temp_c: Mold temperature (°C)
        max_peak_temp_c: Maximum acceptable peak temperature
        heat_of_reaction_j_kg: Heat of reaction (J/kg)
        cure_params: Cure kinetics parameters
        max_thickness_mm: Maximum thickness to consider

    Returns:
        Dict with maximum safe thickness and analysis
    """
    if cure_params is None:
        cure_params = CureKineticsParameters()

    # Binary search for max thickness
    t_low = 5.0  # 5mm minimum
    t_high = max_thickness_mm

    for _ in range(20):
        t_mid = (t_low + t_high) / 2

        result = calculate_core_temperature(
            part_thickness_mm=t_mid,
            mold_temp_c=mold_temp_c,
            heat_of_reaction_j_kg=heat_of_reaction_j_kg,
            cure_params=cure_params,
        )

        if result['peak_temperature_c'] < max_peak_temp_c:
            t_low = t_mid  # Can use thicker part
        else:
            t_high = t_mid  # Need thinner part

    max_safe_thickness = (t_low + t_high) / 2

    # Final analysis at safe thickness
    final_result = calculate_core_temperature(
        part_thickness_mm=max_safe_thickness,
        mold_temp_c=mold_temp_c,
        heat_of_reaction_j_kg=heat_of_reaction_j_kg,
        cure_params=cure_params,
    )

    return {
        'max_safe_thickness_mm': max_safe_thickness,
        'peak_temperature_c': final_result['peak_temperature_c'],
        'scorch_margin_c': final_result['scorch_margin_c'],
        'mold_temp_c': mold_temp_c,
        'recommendation': f"Parts up to {max_safe_thickness:.1f}mm thick are safe at {mold_temp_c}°C mold temperature",
    }
