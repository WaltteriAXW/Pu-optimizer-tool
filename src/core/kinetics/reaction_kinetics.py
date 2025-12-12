"""
Reaction Kinetics Models for Polyurethane Curing

Implements cure kinetics equations for polyurethane systems:

1. Avrami Equation (General Cure Kinetics):
   α(t) = 1 - exp(-k * t^n)

   Where:
   - α = degree of conversion (0 to 1)
   - k = rate constant (temperature dependent via Arrhenius)
   - n = Avrami exponent (typically 1.5-3 for PU)
   - t = time (s)

2. Kamal-Sourour Model (Autocatalytic Cure):
   dα/dt = (k1 + k2 * α^m) * (1 - α)^n

   Where:
   - k1 = rate constant for uncatalyzed reaction
   - k2 = rate constant for autocatalyzed reaction
   - m = autocatalytic exponent (typically 0.5-1.5)
   - n = reaction order (typically 1-2)

   This is more accurate for PU because urethane groups catalyze
   further reaction (autocatalytic behavior).

Temperature dependence uses Arrhenius:
   k(T) = A * exp(-Ea / (R * T))

   Where:
   - A = pre-exponential factor
   - Ea = activation energy (J/mol)
   - R = gas constant (8.314 J/mol·K)
   - T = temperature (K)

Author: Phase 4 - Kinetics Extension
"""

import math
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional, Literal
from enum import Enum


# Physical constants
GAS_CONSTANT = 8.314  # J/(mol·K)


class CureModel(Enum):
    """Available cure kinetics models"""
    AVRAMI = "avrami"
    KAMAL_SOUROUR = "kamal_sourour"


@dataclass
class CureKineticsParameters:
    """
    Parameters for cure kinetics models.

    These are material-specific and should be determined experimentally
    (typically via DSC - Differential Scanning Calorimetry).
    """
    # Avrami model parameters
    avrami_k: float = 0.001  # Rate constant at reference temp (s^-n)
    avrami_n: float = 2.0    # Avrami exponent (1.5-3 for PU)

    # Kamal-Sourour model parameters
    k1_ref: float = 0.0001   # Uncatalyzed rate constant at ref temp (s^-1)
    k2_ref: float = 0.001    # Autocatalyzed rate constant at ref temp (s^-1)
    m: float = 1.0           # Autocatalytic exponent
    n: float = 1.5           # Reaction order

    # Temperature dependence (Arrhenius)
    activation_energy_k1: float = 50000  # Ea for k1 (J/mol), typically 40-60 kJ/mol
    activation_energy_k2: float = 45000  # Ea for k2 (J/mol), typically 35-55 kJ/mol
    activation_energy_avrami: float = 50000  # Ea for Avrami k (J/mol)

    # Reference conditions
    reference_temp_c: float = 25.0  # Temperature at which k values measured

    # Gel point
    gel_conversion: float = 0.65  # Conversion at gel point (typically 0.6-0.7 for PU)

    # Experimental reference times (for calibration)
    cream_time_ref_s: float = 50.0   # Cream time at reference temp
    gel_time_ref_s: float = 150.0    # Gel time at reference temp

    @property
    def reference_temp_k(self) -> float:
        """Reference temperature in Kelvin"""
        return self.reference_temp_c + 273.15


@dataclass
class CureState:
    """Current state of cure reaction"""
    time_s: float                    # Elapsed time
    conversion: float                # Degree of conversion (0-1)
    conversion_rate: float           # Rate of conversion (s^-1)
    is_gelled: bool                  # Whether gel point reached
    is_cream_started: bool           # Whether cream time passed
    time_to_gel_s: Optional[float]   # Remaining time to gel point
    viscosity_factor: float          # Multiplicative factor for viscosity increase
    temperature_c: float             # Current temperature


class AvramiModel:
    """
    Avrami equation for cure kinetics.

    α(t) = 1 - exp(-k * t^n)

    Simple model suitable for isothermal curing with constant rate.
    Good for quick estimates but less accurate for autocatalytic PU.
    """

    def __init__(self, params: CureKineticsParameters):
        self.params = params

    def _arrhenius_k(self, temperature_c: float) -> float:
        """
        Calculate temperature-dependent rate constant using Arrhenius.

        k(T) = k_ref * exp[Ea/R * (1/T_ref - 1/T)]
        """
        temp_k = temperature_c + 273.15
        ref_temp_k = self.params.reference_temp_k

        exponent = (self.params.activation_energy_avrami / GAS_CONSTANT) * \
                   (1.0 / ref_temp_k - 1.0 / temp_k)

        # Limit exponent to prevent overflow
        exponent = max(-50, min(50, exponent))

        return self.params.avrami_k * math.exp(exponent)

    def conversion(self, time_s: float, temperature_c: float) -> float:
        """
        Calculate degree of conversion at given time and temperature.

        α(t) = 1 - exp(-k * t^n)

        Args:
            time_s: Time since mixing (seconds)
            temperature_c: Temperature (Celsius)

        Returns:
            Degree of conversion (0 to 1)
        """
        if time_s <= 0:
            return 0.0

        k = self._arrhenius_k(temperature_c)
        n = self.params.avrami_n

        # Avrami equation
        alpha = 1.0 - math.exp(-k * math.pow(time_s, n))

        return max(0.0, min(1.0, alpha))

    def conversion_rate(self, time_s: float, temperature_c: float) -> float:
        """
        Calculate rate of conversion dα/dt.

        dα/dt = k * n * t^(n-1) * exp(-k * t^n)

        Args:
            time_s: Time since mixing (seconds)
            temperature_c: Temperature (Celsius)

        Returns:
            Rate of conversion (s^-1)
        """
        if time_s <= 0:
            return 0.0

        k = self._arrhenius_k(temperature_c)
        n = self.params.avrami_n

        # Derivative of Avrami equation
        rate = k * n * math.pow(time_s, n - 1) * math.exp(-k * math.pow(time_s, n))

        return max(0.0, rate)

    def time_to_conversion(self, target_alpha: float, temperature_c: float) -> float:
        """
        Calculate time to reach target conversion.

        t = [ln(1/(1-α)) / k]^(1/n)

        Args:
            target_alpha: Target conversion (0 to 1)
            temperature_c: Temperature (Celsius)

        Returns:
            Time to reach target conversion (seconds)
        """
        if target_alpha <= 0:
            return 0.0
        if target_alpha >= 1.0:
            return float('inf')

        k = self._arrhenius_k(temperature_c)
        n = self.params.avrami_n

        # Solve for t: α = 1 - exp(-k*t^n)
        # t = [ln(1/(1-α)) / k]^(1/n)
        ln_term = math.log(1.0 / (1.0 - target_alpha))
        time = math.pow(ln_term / k, 1.0 / n)

        return time

    def gel_time(self, temperature_c: float) -> float:
        """Calculate time to reach gel point"""
        return self.time_to_conversion(self.params.gel_conversion, temperature_c)


class KamalSourourModel:
    """
    Kamal-Sourour autocatalytic cure model.

    dα/dt = (k1 + k2 * α^m) * (1 - α)^n

    More accurate for polyurethane because:
    - Urethane groups formed catalyze further reaction
    - Captures the characteristic S-shaped cure curve
    - Better prediction of reaction acceleration phase

    The model has two terms:
    - k1 * (1-α)^n: Uncatalyzed (n-th order) reaction
    - k2 * α^m * (1-α)^n: Autocatalyzed reaction
    """

    def __init__(self, params: CureKineticsParameters):
        self.params = params

    def _arrhenius_k1(self, temperature_c: float) -> float:
        """Temperature-dependent k1 (uncatalyzed)"""
        temp_k = temperature_c + 273.15
        ref_temp_k = self.params.reference_temp_k

        exponent = (self.params.activation_energy_k1 / GAS_CONSTANT) * \
                   (1.0 / ref_temp_k - 1.0 / temp_k)
        exponent = max(-50, min(50, exponent))

        return self.params.k1_ref * math.exp(exponent)

    def _arrhenius_k2(self, temperature_c: float) -> float:
        """Temperature-dependent k2 (autocatalyzed)"""
        temp_k = temperature_c + 273.15
        ref_temp_k = self.params.reference_temp_k

        exponent = (self.params.activation_energy_k2 / GAS_CONSTANT) * \
                   (1.0 / ref_temp_k - 1.0 / temp_k)
        exponent = max(-50, min(50, exponent))

        return self.params.k2_ref * math.exp(exponent)

    def conversion_rate(
        self,
        alpha: float,
        temperature_c: float
    ) -> float:
        """
        Calculate rate of conversion at current state.

        dα/dt = (k1 + k2 * α^m) * (1 - α)^n

        Args:
            alpha: Current degree of conversion (0 to 1)
            temperature_c: Temperature (Celsius)

        Returns:
            Rate of conversion (s^-1)
        """
        if alpha >= 1.0:
            return 0.0
        if alpha < 0:
            alpha = 0.0

        k1 = self._arrhenius_k1(temperature_c)
        k2 = self._arrhenius_k2(temperature_c)
        m = self.params.m
        n = self.params.n

        # Kamal-Sourour equation
        # Handle α=0 case for α^m term
        autocatalytic_term = k2 * math.pow(max(alpha, 1e-10), m)
        rate = (k1 + autocatalytic_term) * math.pow(1.0 - alpha, n)

        return max(0.0, rate)

    def integrate_cure(
        self,
        time_s: float,
        temperature_c: float,
        dt: float = 0.1,
        initial_alpha: float = 0.0
    ) -> Tuple[float, List[Tuple[float, float]]]:
        """
        Integrate cure kinetics over time using RK4 method.

        Args:
            time_s: Total time to integrate (seconds)
            temperature_c: Temperature (Celsius) - assumed isothermal
            dt: Time step for integration (seconds)
            initial_alpha: Starting conversion

        Returns:
            Tuple of (final_conversion, history)
            where history is list of (time, conversion) tuples
        """
        alpha = initial_alpha
        t = 0.0
        history = [(t, alpha)]

        while t < time_s and alpha < 0.999:
            # RK4 integration
            k1 = self.conversion_rate(alpha, temperature_c)
            k2 = self.conversion_rate(alpha + 0.5 * dt * k1, temperature_c)
            k3 = self.conversion_rate(alpha + 0.5 * dt * k2, temperature_c)
            k4 = self.conversion_rate(alpha + dt * k3, temperature_c)

            d_alpha = (dt / 6.0) * (k1 + 2*k2 + 2*k3 + k4)
            alpha = min(1.0, alpha + d_alpha)
            t += dt

            history.append((t, alpha))

        return alpha, history

    def conversion(self, time_s: float, temperature_c: float) -> float:
        """
        Calculate conversion at given time (integrates from 0).

        Args:
            time_s: Time since mixing (seconds)
            temperature_c: Temperature (Celsius)

        Returns:
            Degree of conversion (0 to 1)
        """
        if time_s <= 0:
            return 0.0

        # Adaptive time step based on reaction speed
        dt = min(0.5, time_s / 100)
        alpha, _ = self.integrate_cure(time_s, temperature_c, dt=dt)

        return alpha

    def time_to_conversion(
        self,
        target_alpha: float,
        temperature_c: float,
        max_time_s: float = 10000
    ) -> float:
        """
        Find time to reach target conversion using bisection.

        Args:
            target_alpha: Target conversion (0 to 1)
            temperature_c: Temperature (Celsius)
            max_time_s: Maximum search time

        Returns:
            Time to reach target (seconds), or max_time_s if not reached
        """
        if target_alpha <= 0:
            return 0.0
        if target_alpha >= 1.0:
            return max_time_s

        # Binary search for time
        t_low = 0.0
        t_high = max_time_s

        # First check if target is reachable
        alpha_max = self.conversion(max_time_s, temperature_c)
        if alpha_max < target_alpha:
            return max_time_s

        # Binary search
        for _ in range(50):  # Max iterations
            t_mid = (t_low + t_high) / 2
            alpha_mid = self.conversion(t_mid, temperature_c)

            if abs(alpha_mid - target_alpha) < 0.001:
                return t_mid

            if alpha_mid < target_alpha:
                t_low = t_mid
            else:
                t_high = t_mid

        return (t_low + t_high) / 2

    def gel_time(self, temperature_c: float) -> float:
        """Calculate time to reach gel point"""
        return self.time_to_conversion(self.params.gel_conversion, temperature_c)

    def cream_time(self, temperature_c: float) -> float:
        """
        Estimate cream time (visible reaction start).

        Cream time typically corresponds to ~5-10% conversion
        when bubbles first become visible.
        """
        return self.time_to_conversion(0.08, temperature_c)

    def peak_rate_time(self, temperature_c: float) -> Tuple[float, float]:
        """
        Find time of maximum reaction rate.

        For autocatalytic reactions, rate peaks before gel point.

        Returns:
            Tuple of (time_at_peak, peak_rate)
        """
        # Scan for peak
        dt = 0.5
        t = 0.0
        max_rate = 0.0
        peak_time = 0.0
        alpha = 0.0

        while alpha < 0.95 and t < 10000:
            rate = self.conversion_rate(alpha, temperature_c)
            if rate > max_rate:
                max_rate = rate
                peak_time = t

            # Simple Euler step for scanning
            alpha += rate * dt
            t += dt

        return peak_time, max_rate


class CureKinetics:
    """
    Unified interface for cure kinetics calculations.

    Wraps both Avrami and Kamal-Sourour models with a common API.
    Kamal-Sourour is recommended for polyurethane systems.
    """

    def __init__(
        self,
        params: CureKineticsParameters,
        model: CureModel = CureModel.KAMAL_SOUROUR
    ):
        """
        Initialize cure kinetics calculator.

        Args:
            params: Kinetics parameters for the material
            model: Which model to use (KAMAL_SOUROUR recommended for PU)
        """
        self.params = params
        self.model_type = model

        if model == CureModel.AVRAMI:
            self._model = AvramiModel(params)
        else:
            self._model = KamalSourourModel(params)

    def get_cure_state(
        self,
        time_s: float,
        temperature_c: float
    ) -> CureState:
        """
        Get complete cure state at given time and temperature.

        Args:
            time_s: Time since mixing (seconds)
            temperature_c: Temperature (Celsius)

        Returns:
            CureState with all relevant information
        """
        conversion = self._model.conversion(time_s, temperature_c)

        if isinstance(self._model, KamalSourourModel):
            rate = self._model.conversion_rate(conversion, temperature_c)
        else:
            rate = self._model.conversion_rate(time_s, temperature_c)

        gel_time = self._model.gel_time(temperature_c)

        # Cream time approximation (visible reaction start)
        cream_time = self.cream_time(temperature_c)

        # Time remaining to gel
        if conversion < self.params.gel_conversion:
            time_to_gel = gel_time - time_s
        else:
            time_to_gel = 0.0

        # Viscosity factor (simplified - full model in viscosity_conversion.py)
        # As conversion approaches gel point, viscosity increases dramatically
        alpha_g = self.params.gel_conversion
        if conversion < alpha_g:
            viscosity_factor = 1.0 / (1.0 - conversion / alpha_g)
        else:
            viscosity_factor = float('inf')

        return CureState(
            time_s=time_s,
            conversion=conversion,
            conversion_rate=rate,
            is_gelled=conversion >= self.params.gel_conversion,
            is_cream_started=time_s >= cream_time,
            time_to_gel_s=max(0, time_to_gel) if time_to_gel else None,
            viscosity_factor=min(viscosity_factor, 1e6),
            temperature_c=temperature_c
        )

    def conversion(self, time_s: float, temperature_c: float) -> float:
        """Get degree of conversion"""
        return self._model.conversion(time_s, temperature_c)

    def gel_time(self, temperature_c: float) -> float:
        """Get time to gel point at given temperature"""
        return self._model.gel_time(temperature_c)

    def cream_time(self, temperature_c: float) -> float:
        """Get cream time (visible reaction start) at given temperature"""
        if isinstance(self._model, KamalSourourModel):
            return self._model.cream_time(temperature_c)
        else:
            # For Avrami, estimate cream at ~8% conversion
            return self._model.time_to_conversion(0.08, temperature_c)

    def cure_profile(
        self,
        total_time_s: float,
        temperature_c: float,
        num_points: int = 100
    ) -> List[CureState]:
        """
        Generate cure profile over time.

        Args:
            total_time_s: Total time to simulate
            temperature_c: Temperature (isothermal)
            num_points: Number of time points

        Returns:
            List of CureState at each time point
        """
        dt = total_time_s / (num_points - 1) if num_points > 1 else total_time_s
        profile = []

        for i in range(num_points):
            t = i * dt
            state = self.get_cure_state(t, temperature_c)
            profile.append(state)

        return profile

    def processing_window(self, temperature_c: float) -> Dict[str, float]:
        """
        Calculate processing window at given temperature.

        Returns dict with:
        - cream_time_s: When reaction becomes visible
        - work_time_s: Time before viscosity doubles (approximate)
        - gel_time_s: Time to gel point (no more flow)
        - demold_time_s: Estimated time to 90% conversion
        """
        cream = self.cream_time(temperature_c)
        gel = self.gel_time(temperature_c)

        # Work time: approximately when conversion reaches ~30%
        # (viscosity roughly doubled)
        work = self._model.time_to_conversion(0.30, temperature_c) if hasattr(self._model, 'time_to_conversion') else cream * 2

        # Demold time: ~90% conversion
        demold = self._model.time_to_conversion(0.90, temperature_c) if hasattr(self._model, 'time_to_conversion') else gel * 2

        return {
            'cream_time_s': cream,
            'work_time_s': work,
            'gel_time_s': gel,
            'demold_time_s': demold,
            'temperature_c': temperature_c,
        }


# =============================================================================
# Convenience Functions
# =============================================================================

def calculate_cure_state(
    time_s: float,
    temperature_c: float,
    params: Optional[CureKineticsParameters] = None,
    model: CureModel = CureModel.KAMAL_SOUROUR
) -> CureState:
    """
    Convenience function to calculate cure state.

    Args:
        time_s: Time since mixing (seconds)
        temperature_c: Temperature (Celsius)
        params: Kinetics parameters (uses defaults if None)
        model: Which model to use

    Returns:
        CureState object
    """
    if params is None:
        params = CureKineticsParameters()

    kinetics = CureKinetics(params, model)
    return kinetics.get_cure_state(time_s, temperature_c)


def calculate_gel_time(
    temperature_c: float,
    params: Optional[CureKineticsParameters] = None,
    model: CureModel = CureModel.KAMAL_SOUROUR
) -> float:
    """
    Convenience function to calculate gel time.

    Args:
        temperature_c: Temperature (Celsius)
        params: Kinetics parameters (uses defaults if None)
        model: Which model to use

    Returns:
        Gel time in seconds
    """
    if params is None:
        params = CureKineticsParameters()

    kinetics = CureKinetics(params, model)
    return kinetics.gel_time(temperature_c)


def calculate_cream_time(
    temperature_c: float,
    params: Optional[CureKineticsParameters] = None,
    model: CureModel = CureModel.KAMAL_SOUROUR
) -> float:
    """
    Convenience function to calculate cream time.

    Args:
        temperature_c: Temperature (Celsius)
        params: Kinetics parameters (uses defaults if None)
        model: Which model to use

    Returns:
        Cream time in seconds
    """
    if params is None:
        params = CureKineticsParameters()

    kinetics = CureKinetics(params, model)
    return kinetics.cream_time(temperature_c)


def calibrate_from_experimental(
    cream_time_s: float,
    gel_time_s: float,
    reference_temp_c: float = 25.0,
    gel_conversion: float = 0.65
) -> CureKineticsParameters:
    """
    Create kinetics parameters calibrated to experimental cream/gel times.

    This provides reasonable starting parameters when only cream time
    and gel time are known from datasheets.

    Args:
        cream_time_s: Experimental cream time at reference temp
        gel_time_s: Experimental gel time at reference temp
        reference_temp_c: Temperature at which times were measured
        gel_conversion: Assumed conversion at gel point

    Returns:
        CureKineticsParameters calibrated to match experimental times
    """
    # Approximate cream conversion
    cream_conversion = 0.08

    # Estimate Kamal-Sourour parameters from experimental times
    # This is a simplified calibration - real calibration requires DSC data

    # k1 primarily controls early reaction (cream time)
    # k2 primarily controls acceleration (gel time)

    # Simple estimates based on characteristic times
    k1_ref = cream_conversion / cream_time_s / 2  # Rough estimate
    k2_ref = 0.5 / gel_time_s  # Rough estimate for autocatalytic contribution

    return CureKineticsParameters(
        k1_ref=k1_ref,
        k2_ref=k2_ref,
        m=1.0,
        n=1.5,
        activation_energy_k1=50000,
        activation_energy_k2=45000,
        reference_temp_c=reference_temp_c,
        gel_conversion=gel_conversion,
        cream_time_ref_s=cream_time_s,
        gel_time_ref_s=gel_time_s,
    )
