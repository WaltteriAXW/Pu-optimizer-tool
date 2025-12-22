"""
Castro-Macosko Viscosity-Conversion Coupling Model

Implements the chemorheological model for reactive polymer systems:

Castro-Macosko Equation:
    η(α, T) = η₀(T) × (αg / (αg - α))^(A + B×α)

Where:
    - η = apparent viscosity during cure
    - η₀(T) = initial viscosity at temperature T (via Arrhenius)
    - α = degree of conversion (0 to 1)
    - αg = gel conversion (typically 0.6-0.7 for PU)
    - A, B = empirical constants (typically A=1-3, B=1-4)

This model is CRITICAL for polyurethane processing because:
1. Viscosity changes dramatically during fill as reaction proceeds
2. Near gel point, viscosity approaches infinity
3. Processing window depends on both temperature AND time
4. Pressure drop calculations using only initial viscosity UNDERESTIMATE
   the actual pressure required late in the fill

Physical interpretation:
- At α=0: η = η₀(T) (initial viscosity)
- As α→αg: η→∞ (gel point, no flow)
- The exponent (A + B×α) captures non-linear viscosity buildup

Combined with shear-rate effects (power law):
    η(α, T, γ̇) = η₀(T) × (αg/(αg-α))^(A+Bα) × K × γ̇^(n-1)

Author: Phase 4 - Kinetics Extension
"""

import math
from dataclasses import dataclass
from typing import Dict, Optional, Tuple, List

from .reaction_kinetics import (
    CureKinetics,
    CureKineticsParameters,
    CureModel,
    GAS_CONSTANT,
)


@dataclass
class ViscosityConversionParameters:
    """
    Parameters for Castro-Macosko viscosity model.

    These should be determined experimentally using parallel plate
    rheometry during isothermal cure.
    """
    # Castro-Macosko exponents
    A: float = 2.0              # Primary exponent (typically 1-3)
    B: float = 2.5              # Conversion-dependent exponent (typically 1-4)

    # Gel point
    gel_conversion: float = 0.65  # αg (typically 0.6-0.7 for PU)

    # Initial viscosity (at reference temp, before any cure)
    initial_viscosity_pa_s: float = 0.5  # η₀ at 25°C

    # Temperature dependence (Arrhenius for initial viscosity)
    activation_energy_viscosity: float = 25000  # J/mol (15-40 kJ/mol typical)
    reference_temp_c: float = 25.0

    # Power law parameters (shear rate dependence)
    consistency_coefficient: float = 0.5  # K (Pa·s^n)
    flow_index: float = 0.85              # n (0.7-0.9 for PU)

    # Processing limits
    max_processable_viscosity_pa_s: float = 100.0  # Beyond this, no flow
    critical_conversion: float = 0.50     # Practical limit for processing

    @property
    def reference_temp_k(self) -> float:
        return self.reference_temp_c + 273.15


class CastroMacoskoModel:
    """
    Castro-Macosko chemorheological model.

    Calculates viscosity as a function of:
    - Temperature (Arrhenius)
    - Degree of conversion (cure state)
    - Shear rate (power law, optional)
    """

    def __init__(
        self,
        viscosity_params: ViscosityConversionParameters,
        cure_params: Optional[CureKineticsParameters] = None
    ):
        """
        Initialize Castro-Macosko model.

        Args:
            viscosity_params: Viscosity-conversion parameters
            cure_params: Cure kinetics parameters (optional, for time-based calc)
        """
        self.visc_params = viscosity_params
        self.cure_params = cure_params

        if cure_params:
            self.cure_model = CureKinetics(cure_params, CureModel.KAMAL_SOUROUR)
        else:
            self.cure_model = None

    def _arrhenius_viscosity(self, temperature_c: float) -> float:
        """
        Calculate initial (uncured) viscosity at given temperature.

        η₀(T) = η₀_ref × exp[Ea/R × (1/T - 1/T_ref)]
        """
        temp_k = temperature_c + 273.15
        ref_temp_k = self.visc_params.reference_temp_k

        exponent = (self.visc_params.activation_energy_viscosity / GAS_CONSTANT) * \
                   (1.0 / temp_k - 1.0 / ref_temp_k)

        # Limit exponent to prevent overflow
        exponent = max(-50, min(50, exponent))

        return self.visc_params.initial_viscosity_pa_s * math.exp(exponent)

    def viscosity_from_conversion(
        self,
        conversion: float,
        temperature_c: float,
        shear_rate_s_inv: Optional[float] = None
    ) -> float:
        """
        Calculate viscosity at given conversion and temperature.

        Castro-Macosko:
        η(α, T) = η₀(T) × (αg / (αg - α))^(A + B×α)

        Args:
            conversion: Degree of conversion (0 to 1)
            temperature_c: Temperature (Celsius)
            shear_rate_s_inv: Shear rate (s⁻¹), optional for power law correction

        Returns:
            Viscosity in Pa·s
        """
        # Clamp conversion
        alpha = max(0.0, min(conversion, 0.9999))
        alpha_g = self.visc_params.gel_conversion

        # Check if at or beyond gel point
        if alpha >= alpha_g:
            return self.visc_params.max_processable_viscosity_pa_s * 1000  # Very high

        # Initial viscosity at temperature
        eta_0 = self._arrhenius_viscosity(temperature_c)

        # Castro-Macosko conversion factor
        A = self.visc_params.A
        B = self.visc_params.B

        ratio = alpha_g / (alpha_g - alpha)
        exponent = A + B * alpha

        conversion_factor = math.pow(ratio, exponent)

        # Base viscosity with conversion
        viscosity = eta_0 * conversion_factor

        # Apply shear-rate dependence if provided
        if shear_rate_s_inv is not None and shear_rate_s_inv > 0:
            n = self.visc_params.flow_index
            shear_factor = math.pow(shear_rate_s_inv, n - 1)
            viscosity *= shear_factor

        return min(viscosity, self.visc_params.max_processable_viscosity_pa_s * 1000)

    def viscosity_from_time(
        self,
        time_s: float,
        temperature_c: float,
        shear_rate_s_inv: Optional[float] = None
    ) -> float:
        """
        Calculate viscosity at given time and temperature.

        Uses cure kinetics to get conversion, then Castro-Macosko.

        Args:
            time_s: Time since mixing (seconds)
            temperature_c: Temperature (Celsius)
            shear_rate_s_inv: Shear rate (s⁻¹), optional

        Returns:
            Viscosity in Pa·s
        """
        if self.cure_model is None:
            raise ValueError("Cure model required for time-based viscosity calculation")

        # Get conversion from cure kinetics
        conversion = self.cure_model.conversion(time_s, temperature_c)

        return self.viscosity_from_conversion(conversion, temperature_c, shear_rate_s_inv)

    def viscosity_profile_vs_time(
        self,
        total_time_s: float,
        temperature_c: float,
        num_points: int = 50,
        shear_rate_s_inv: Optional[float] = None
    ) -> List[Tuple[float, float, float]]:
        """
        Generate viscosity profile over time.

        Args:
            total_time_s: Total time to simulate
            temperature_c: Temperature (isothermal)
            num_points: Number of time points
            shear_rate_s_inv: Shear rate (optional)

        Returns:
            List of (time_s, conversion, viscosity_pa_s) tuples
        """
        if self.cure_model is None:
            raise ValueError("Cure model required for time-based profile")

        dt = total_time_s / (num_points - 1) if num_points > 1 else total_time_s
        profile = []

        for i in range(num_points):
            t = i * dt
            alpha = self.cure_model.conversion(t, temperature_c)
            viscosity = self.viscosity_from_conversion(alpha, temperature_c, shear_rate_s_inv)
            profile.append((t, alpha, viscosity))

        return profile

    def viscosity_ratio(
        self,
        conversion: float,
        temperature_c: float
    ) -> float:
        """
        Calculate viscosity ratio η/η₀.

        Useful for understanding how much viscosity has increased
        from initial value.

        Returns:
            Ratio (1.0 = unchanged, 10.0 = 10x increase, etc.)
        """
        eta_0 = self._arrhenius_viscosity(temperature_c)
        eta = self.viscosity_from_conversion(conversion, temperature_c)

        return eta / eta_0

    def time_to_viscosity_limit(
        self,
        max_viscosity_pa_s: float,
        temperature_c: float,
        shear_rate_s_inv: Optional[float] = None
    ) -> float:
        """
        Calculate time until viscosity reaches specified limit.

        This is the processing window - time available before
        material becomes too viscous to flow.

        Args:
            max_viscosity_pa_s: Maximum acceptable viscosity
            temperature_c: Temperature (Celsius)
            shear_rate_s_inv: Shear rate (optional)

        Returns:
            Time in seconds until limit reached
        """
        if self.cure_model is None:
            raise ValueError("Cure model required")

        # Binary search for time
        t_low = 0.0
        t_high = 10000.0

        for _ in range(50):
            t_mid = (t_low + t_high) / 2
            visc_mid = self.viscosity_from_time(t_mid, temperature_c, shear_rate_s_inv)

            if abs(visc_mid - max_viscosity_pa_s) / max_viscosity_pa_s < 0.01:
                return t_mid

            if visc_mid < max_viscosity_pa_s:
                t_low = t_mid
            else:
                t_high = t_mid

        return (t_low + t_high) / 2

    def conversion_at_viscosity(
        self,
        target_viscosity_pa_s: float,
        temperature_c: float,
        shear_rate_s_inv: Optional[float] = None
    ) -> float:
        """
        Find conversion when viscosity reaches target value.

        Args:
            target_viscosity_pa_s: Target viscosity
            temperature_c: Temperature (Celsius)
            shear_rate_s_inv: Shear rate (optional)

        Returns:
            Conversion (0 to 1) at target viscosity
        """
        # Binary search for conversion
        alpha_low = 0.0
        alpha_high = self.visc_params.gel_conversion * 0.99

        for _ in range(50):
            alpha_mid = (alpha_low + alpha_high) / 2
            visc_mid = self.viscosity_from_conversion(alpha_mid, temperature_c, shear_rate_s_inv)

            if abs(visc_mid - target_viscosity_pa_s) / target_viscosity_pa_s < 0.01:
                return alpha_mid

            if visc_mid < target_viscosity_pa_s:
                alpha_low = alpha_mid
            else:
                alpha_high = alpha_mid

        return (alpha_low + alpha_high) / 2


@dataclass
class ProcessingWindow:
    """Results from processing window calculation"""
    initial_viscosity_pa_s: float
    gel_time_s: float
    work_time_s: float              # Time until viscosity doubles
    critical_time_s: float          # Time until critical conversion
    viscosity_at_gel_pa_s: float    # Viscosity just before gel
    max_fill_time_s: float          # Maximum time for mold filling
    temperature_c: float
    safety_factor: float = 0.8      # Recommended to use 80% of work time


def calculate_reactive_viscosity(
    time_s: float,
    temperature_c: float,
    initial_viscosity_pa_s: float = 0.5,
    gel_conversion: float = 0.65,
    A: float = 2.0,
    B: float = 2.5,
    shear_rate_s_inv: Optional[float] = None,
    cure_params: Optional[CureKineticsParameters] = None
) -> Dict[str, float]:
    """
    Convenience function to calculate reactive viscosity.

    Args:
        time_s: Time since mixing (seconds)
        temperature_c: Temperature (Celsius)
        initial_viscosity_pa_s: Initial viscosity at reference temp
        gel_conversion: Conversion at gel point
        A, B: Castro-Macosko exponents
        shear_rate_s_inv: Shear rate (optional)
        cure_params: Cure kinetics parameters (uses defaults if None)

    Returns:
        Dict with viscosity info
    """
    if cure_params is None:
        cure_params = CureKineticsParameters(gel_conversion=gel_conversion)

    visc_params = ViscosityConversionParameters(
        A=A,
        B=B,
        gel_conversion=gel_conversion,
        initial_viscosity_pa_s=initial_viscosity_pa_s,
    )

    model = CastroMacoskoModel(visc_params, cure_params)

    cure_state = model.cure_model.get_cure_state(time_s, temperature_c)
    viscosity = model.viscosity_from_conversion(
        cure_state.conversion, temperature_c, shear_rate_s_inv
    )
    ratio = model.viscosity_ratio(cure_state.conversion, temperature_c)

    return {
        'time_s': time_s,
        'temperature_c': temperature_c,
        'conversion': cure_state.conversion,
        'viscosity_pa_s': viscosity,
        'viscosity_cp': viscosity * 1000,
        'viscosity_ratio': ratio,
        'is_gelled': cure_state.is_gelled,
        'time_to_gel_s': cure_state.time_to_gel_s,
    }


def calculate_processing_window(
    temperature_c: float,
    initial_viscosity_pa_s: float = 0.5,
    max_acceptable_viscosity_pa_s: float = 10.0,
    gel_conversion: float = 0.65,
    A: float = 2.0,
    B: float = 2.5,
    cure_params: Optional[CureKineticsParameters] = None
) -> ProcessingWindow:
    """
    Calculate processing window at given temperature.

    The processing window is the time available for:
    - Mixing
    - Transferring
    - Filling the mold

    Before the material becomes too viscous or gels.

    Args:
        temperature_c: Processing temperature (Celsius)
        initial_viscosity_pa_s: Initial viscosity
        max_acceptable_viscosity_pa_s: Maximum viscosity for flow
        gel_conversion: Conversion at gel point
        A, B: Castro-Macosko exponents
        cure_params: Cure kinetics parameters

    Returns:
        ProcessingWindow with all timing info
    """
    if cure_params is None:
        cure_params = CureKineticsParameters(gel_conversion=gel_conversion)

    visc_params = ViscosityConversionParameters(
        A=A,
        B=B,
        gel_conversion=gel_conversion,
        initial_viscosity_pa_s=initial_viscosity_pa_s,
    )

    model = CastroMacoskoModel(visc_params, cure_params)

    # Get key times
    gel_time = model.cure_model.gel_time(temperature_c)

    # Time for viscosity to double
    doubled_viscosity = initial_viscosity_pa_s * 2
    work_time = model.time_to_viscosity_limit(doubled_viscosity, temperature_c)

    # Time until critical conversion (practical processing limit)
    critical_conv = visc_params.critical_conversion
    critical_state = model.cure_model.get_cure_state(0, temperature_c)  # dummy
    # Find time to critical conversion
    t_low, t_high = 0.0, gel_time
    for _ in range(50):
        t_mid = (t_low + t_high) / 2
        alpha = model.cure_model.conversion(t_mid, temperature_c)
        if alpha < critical_conv:
            t_low = t_mid
        else:
            t_high = t_mid
    critical_time = (t_low + t_high) / 2

    # Maximum fill time (to max acceptable viscosity)
    max_fill_time = model.time_to_viscosity_limit(
        max_acceptable_viscosity_pa_s, temperature_c
    )

    # Viscosity just before gel (at 95% of gel conversion)
    viscosity_near_gel = model.viscosity_from_conversion(
        gel_conversion * 0.95, temperature_c
    )

    # Initial viscosity at temperature
    eta_0 = model._arrhenius_viscosity(temperature_c)

    return ProcessingWindow(
        initial_viscosity_pa_s=eta_0,
        gel_time_s=gel_time,
        work_time_s=work_time,
        critical_time_s=critical_time,
        viscosity_at_gel_pa_s=viscosity_near_gel,
        max_fill_time_s=max_fill_time,
        temperature_c=temperature_c,
    )


def estimate_fill_time_limit(
    pipe_length_mm: float,
    pipe_diameter_mm: float,
    flow_rate_lpm: float,
    temperature_c: float,
    initial_viscosity_pa_s: float = 0.5,
    max_pressure_bar: float = 200.0,
    gel_conversion: float = 0.65,
    cure_params: Optional[CureKineticsParameters] = None
) -> Dict[str, float]:
    """
    Estimate maximum fill time before pressure exceeds limit.

    As viscosity rises during fill, pressure drop increases.
    This calculates when pressure would exceed machine limits.

    Args:
        pipe_length_mm: Feed line length
        pipe_diameter_mm: Feed line diameter
        flow_rate_lpm: Flow rate
        temperature_c: Temperature
        initial_viscosity_pa_s: Initial viscosity
        max_pressure_bar: Maximum allowable pressure
        gel_conversion: Gel point conversion
        cure_params: Cure kinetics parameters

    Returns:
        Dict with fill time analysis
    """
    if cure_params is None:
        cure_params = CureKineticsParameters(gel_conversion=gel_conversion)

    visc_params = ViscosityConversionParameters(
        gel_conversion=gel_conversion,
        initial_viscosity_pa_s=initial_viscosity_pa_s,
    )

    model = CastroMacoskoModel(visc_params, cure_params)

    # Calculate initial pressure drop (simplified Hagen-Poiseuille)
    # ΔP = 128 × μ × L × Q / (π × D⁴)
    length_m = pipe_length_mm / 1000
    diameter_m = pipe_diameter_mm / 1000
    flow_rate_m3_s = flow_rate_lpm / 60000

    eta_0 = model._arrhenius_viscosity(temperature_c)

    # Initial pressure drop
    delta_p_0_pa = (128 * eta_0 * length_m * flow_rate_m3_s) / \
                   (math.pi * math.pow(diameter_m, 4))
    delta_p_0_bar = delta_p_0_pa / 1e5

    # Find time when pressure reaches limit
    # Pressure ∝ viscosity, so we need viscosity ratio = max_pressure/initial_pressure
    max_viscosity_ratio = max_pressure_bar / delta_p_0_bar

    if max_viscosity_ratio <= 1:
        # Already over limit at start
        return {
            'initial_pressure_bar': delta_p_0_bar,
            'max_fill_time_s': 0,
            'reason': 'Initial pressure exceeds limit',
            'viscosity_at_limit_pa_s': eta_0,
        }

    # Find corresponding conversion
    target_viscosity = eta_0 * max_viscosity_ratio
    max_fill_time = model.time_to_viscosity_limit(target_viscosity, temperature_c)

    # Get conversion at that time
    final_conversion = model.cure_model.conversion(max_fill_time, temperature_c)

    return {
        'initial_pressure_bar': delta_p_0_bar,
        'max_fill_time_s': max_fill_time,
        'conversion_at_limit': final_conversion,
        'viscosity_at_limit_pa_s': target_viscosity,
        'viscosity_ratio_at_limit': max_viscosity_ratio,
        'gel_time_s': model.cure_model.gel_time(temperature_c),
        'is_fill_limited_by_gel': max_fill_time >= model.cure_model.gel_time(temperature_c),
    }


def calculate_average_viscosity_during_fill(
    fill_time_s: float,
    temperature_c: float,
    initial_viscosity_pa_s: float = 0.5,
    gel_conversion: float = 0.65,
    A: float = 2.0,
    B: float = 2.5,
    cure_params: Optional[CureKineticsParameters] = None,
    num_samples: int = 20
) -> Dict[str, float]:
    """
    Calculate average viscosity during fill operation.

    Since viscosity increases during fill, using initial viscosity
    underestimates pressure requirements. This calculates a
    representative average.

    Args:
        fill_time_s: Total fill time (seconds)
        temperature_c: Temperature (Celsius)
        initial_viscosity_pa_s: Initial viscosity
        gel_conversion: Gel point conversion
        A, B: Castro-Macosko exponents
        cure_params: Cure kinetics parameters
        num_samples: Number of time points to average

    Returns:
        Dict with average viscosity info
    """
    if cure_params is None:
        cure_params = CureKineticsParameters(gel_conversion=gel_conversion)

    visc_params = ViscosityConversionParameters(
        A=A,
        B=B,
        gel_conversion=gel_conversion,
        initial_viscosity_pa_s=initial_viscosity_pa_s,
    )

    model = CastroMacoskoModel(visc_params, cure_params)

    # Sample viscosity over fill time
    viscosities = []
    conversions = []
    dt = fill_time_s / num_samples

    for i in range(num_samples + 1):
        t = i * dt
        alpha = model.cure_model.conversion(t, temperature_c)
        visc = model.viscosity_from_conversion(alpha, temperature_c)
        viscosities.append(visc)
        conversions.append(alpha)

    avg_viscosity = sum(viscosities) / len(viscosities)
    final_viscosity = viscosities[-1]
    initial_visc = viscosities[0]

    return {
        'initial_viscosity_pa_s': initial_visc,
        'average_viscosity_pa_s': avg_viscosity,
        'final_viscosity_pa_s': final_viscosity,
        'viscosity_increase_factor': final_viscosity / initial_visc,
        'average_increase_factor': avg_viscosity / initial_visc,
        'initial_conversion': conversions[0],
        'final_conversion': conversions[-1],
        'fill_time_s': fill_time_s,
        'temperature_c': temperature_c,
    }
