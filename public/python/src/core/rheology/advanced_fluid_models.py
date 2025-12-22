"""
Advanced Non-Newtonian Fluid Models

Implements multiple rheological models for polyurethane and foam systems:
- Power Law (existing)
- Herschel-Bulkley (yield stress fluids)
- Cross model (better shear-thinning representation)
- Carreau model (smooth transition to Newtonian at low shear)

Each model captures different aspects of polyurethane behavior at various
shear rates and temperatures.
"""

import math
from typing import Literal, Dict, Any
from dataclasses import dataclass


@dataclass
class RheologicalProperties:
    """Material rheological properties for non-Newtonian models"""
    # Power Law parameters
    consistency_coefficient_pa_s: float  # K in η = K * γ̇^(n-1)
    flow_index: float  # n (0 < n < 1 for shear thinning)

    # Herschel-Bulkley parameters (yield stress model)
    yield_stress_pa: float  # τ₀ - minimum stress to initiate flow
    hb_consistency_pa_s: float  # K_HB in τ = τ₀ + K_HB * γ̇^n_HB
    hb_flow_index: float  # n_HB

    # Cross model parameters (smooth shear-thinning)
    zero_shear_viscosity_pa_s: float  # η₀
    infinite_shear_viscosity_pa_s: float  # η∞
    cross_k: float  # Time constant (s)
    cross_n: float  # Power law exponent (typically 0.5-1.0)

    # Carreau model parameters
    carreau_lambda: float  # Time constant (s)
    carreau_n: float  # Power law index

    # Temperature effects
    activation_energy_j_mol: float  # E_a for Arrhenius
    reference_viscosity_pa_s: float  # Reference viscosity at T_ref
    reference_temp_k: float  # Reference temperature (K)

    # Physical properties
    density_kg_m3: float
    specific_heat_j_kg_k: float  # Heat capacity


class NonNewtonianFluidModel:
    """
    Comprehensive non-Newtonian fluid model selector and calculator
    """

    GAS_CONSTANT = 8.314  # J/(mol·K)

    def __init__(self, properties: RheologicalProperties):
        """
        Initialize with material properties

        Args:
            properties: RheologicalProperties dataclass with all model parameters
        """
        self.props = properties

    # =========================================================================
    # POWER LAW MODEL (Ostwald Model)
    # =========================================================================

    def power_law_viscosity(
        self,
        shear_rate_s_inv: float,
        temperature_c: float
    ) -> float:
        """
        Power Law model: η = K * γ̇^(n-1)

        Simplest model, works well for 100 < γ̇ < 10000 s⁻¹

        Args:
            shear_rate_s_inv: Shear rate in s⁻¹
            temperature_c: Temperature in Celsius

        Returns:
            Apparent viscosity in Pa·s
        """
        if shear_rate_s_inv <= 0:
            return self.props.consistency_coefficient_pa_s

        # Apply temperature correction using Arrhenius
        temp_factor = self._arrhenius_factor(temperature_c)

        # Power law equation
        exponent = self.props.flow_index - 1  # n - 1
        viscosity = (
            self.props.consistency_coefficient_pa_s *
            temp_factor *
            math.pow(shear_rate_s_inv, exponent)
        )

        return max(viscosity, 0.001)  # Ensure positive

    # =========================================================================
    # HERSCHEL-BULKLEY MODEL
    # =========================================================================

    def herschel_bulkley_viscosity(
        self,
        shear_rate_s_inv: float,
        temperature_c: float
    ) -> float:
        """
        Herschel-Bulkley model: τ = τ₀ + K_HB * γ̇^n_HB

        Models yield stress (minimum stress to initiate flow)
        Better for highly structured fluids and foam systems

        Args:
            shear_rate_s_inv: Shear rate in s⁻¹
            temperature_c: Temperature in Celsius

        Returns:
            Apparent viscosity η = τ / γ̇ in Pa·s
        """
        if shear_rate_s_inv <= 0:
            # At zero shear, return a very high viscosity (near infinite)
            return 10000  # 10 Pa·s (very stiff)

        # Temperature correction
        temp_factor = self._arrhenius_factor(temperature_c)

        # Herschel-Bulkley shear stress
        tau_zero = self.props.yield_stress_pa * temp_factor
        k_hb = self.props.hb_consistency_pa_s * temp_factor
        n_hb = self.props.hb_flow_index

        # τ = τ₀ + K_HB * γ̇^n
        shear_stress_pa = (
            tau_zero +
            k_hb * math.pow(shear_rate_s_inv, n_hb)
        )

        # Apparent viscosity: η = τ / γ̇
        apparent_viscosity = shear_stress_pa / shear_rate_s_inv

        return max(apparent_viscosity, 0.001)

    # =========================================================================
    # CROSS MODEL
    # =========================================================================

    def cross_viscosity(
        self,
        shear_rate_s_inv: float,
        temperature_c: float
    ) -> float:
        """
        Cross model: η = η∞ + (η₀ - η∞) / (1 + (k*γ̇)^n)

        Smooth transition from zero-shear to infinite-shear viscosity
        Excellent for most polymer systems

        Args:
            shear_rate_s_inv: Shear rate in s⁻¹
            temperature_c: Temperature in Celsius

        Returns:
            Apparent viscosity in Pa·s
        """
        # Temperature-corrected viscosities
        temp_factor = self._arrhenius_factor(temperature_c)
        eta_zero = self.props.zero_shear_viscosity_pa_s * temp_factor
        eta_inf = self.props.infinite_shear_viscosity_pa_s * temp_factor
        k = self.props.cross_k
        n = self.props.cross_n

        # Cross equation
        denominator = 1.0 + math.pow(k * shear_rate_s_inv, n)
        viscosity = eta_inf + (eta_zero - eta_inf) / denominator

        return max(viscosity, 0.001)

    # =========================================================================
    # CARREAU MODEL
    # =========================================================================

    def carreau_viscosity(
        self,
        shear_rate_s_inv: float,
        temperature_c: float
    ) -> float:
        """
        Carreau model: η = η₀ * [1 + (λ*γ̇)²]^((n-1)/2)

        Another smooth-transition model, commonly used in industry

        Args:
            shear_rate_s_inv: Shear rate in s⁻¹
            temperature_c: Temperature in Celsius

        Returns:
            Apparent viscosity in Pa·s
        """
        # Temperature correction
        temp_factor = self._arrhenius_factor(temperature_c)
        eta_zero = self.props.reference_viscosity_pa_s * temp_factor

        lambda_param = self.props.carreau_lambda
        n = self.props.carreau_n

        # Carreau equation: η = η₀ * [1 + (λ*γ̇)²]^((n-1)/2)
        base_term = 1.0 + math.pow(lambda_param * shear_rate_s_inv, 2)
        exponent = (n - 1.0) / 2.0
        viscosity = eta_zero * math.pow(base_term, exponent)

        return max(viscosity, 0.001)

    # =========================================================================
    # MODEL SELECTION
    # =========================================================================

    def get_viscosity(
        self,
        shear_rate_s_inv: float,
        temperature_c: float,
        model: Literal['power_law', 'herschel_bulkley', 'cross', 'carreau'] = 'power_law'
    ) -> float:
        """
        Get viscosity using selected model

        Args:
            shear_rate_s_inv: Shear rate in s⁻¹
            temperature_c: Temperature in Celsius
            model: Which model to use

        Returns:
            Apparent viscosity in Pa·s
        """
        if model == 'power_law':
            return self.power_law_viscosity(shear_rate_s_inv, temperature_c)
        elif model == 'herschel_bulkley':
            return self.herschel_bulkley_viscosity(shear_rate_s_inv, temperature_c)
        elif model == 'cross':
            return self.cross_viscosity(shear_rate_s_inv, temperature_c)
        elif model == 'carreau':
            return self.carreau_viscosity(shear_rate_s_inv, temperature_c)
        else:
            raise ValueError(f"Unknown model: {model}")

    # =========================================================================
    # HELPER FUNCTIONS
    # =========================================================================

    def _arrhenius_factor(self, temperature_c: float) -> float:
        """
        Temperature correction using Arrhenius equation

        η(T) = η_ref * exp[E_a / R * (1/T - 1/T_ref)]

        Returns correction factor to multiply viscosity by
        """
        temp_k = temperature_c + 273.15
        ref_temp_k = self.props.reference_temp_k

        exponent = (
            (self.props.activation_energy_j_mol / self.GAS_CONSTANT) *
            ((1.0 / temp_k) - (1.0 / ref_temp_k))
        )

        return math.exp(exponent)

    def wall_slip_correction(
        self,
        shear_stress_pa: float,
        wall_temperature_c: float,
        slip_constant: float = 0.0005
    ) -> float:
        """
        Correction factor for wall slip at high shear stress

        At high shear rates (>5000 s⁻¹), polymer chains can slip at wall
        Reduces effective shear rate by 10-30%

        Args:
            shear_stress_pa: Shear stress in Pa
            wall_temperature_c: Wall temperature in Celsius
            slip_constant: Material-dependent slip parameter

        Returns:
            Slip velocity correction factor (0.7-1.0, where <1 means slip)
        """
        # Wall slip increases with stress and decreases with temperature (more fluid)
        temp_factor = math.exp(-0.05 * (wall_temperature_c - 20))  # Relative to 20°C
        slip_factor = slip_constant * shear_stress_pa * temp_factor

        # Return correction (1.0 = no slip, 0.7 = 30% slip)
        return 1.0 / (1.0 + slip_factor)

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the rheological model"""
        return {
            'consistency_coefficient_pa_s': self.props.consistency_coefficient_pa_s,
            'flow_index': self.props.flow_index,
            'yield_stress_pa': self.props.yield_stress_pa,
            'zero_shear_viscosity_pa_s': self.props.zero_shear_viscosity_pa_s,
            'infinite_shear_viscosity_pa_s': self.props.infinite_shear_viscosity_pa_s,
            'activation_energy_j_mol': self.props.activation_energy_j_mol,
            'density_kg_m3': self.props.density_kg_m3,
        }
