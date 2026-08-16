"""
Foam-Specific Kinetics Models for Polyurethane Foam Systems

Implements foam rise and structure prediction models:

1. Foam Rise Kinetics:
   H(t) = H_∞ × (1 - exp(-(t - t_c) / τ))

   Where:
   - H = current foam height
   - H_∞ = final (equilibrium) height
   - t_c = cream time (onset of rise)
   - τ = rise time constant

   Essential for predicting mold fill in free-rise applications.

2. Density Distribution (Modified Gaussian):
   ρ(z) = ρ_core + (ρ_skin - ρ_core) × exp(-(z - z_s)² / (2σ²))

   Foam parts have:
   - Dense skins at surfaces (ρ_skin)
   - Lighter cores (ρ_core)
   - Gradient determined by σ (skin thickness parameter)

   Helps predict part weight and structural properties.

3. Cell Size Prediction (Nucleation Theory):
   N = N_0 × exp(-16πγ³ / (3k_B × T × ΔP²))

   Where:
   - N = cell nucleation density (cells/m³)
   - N_0 = pre-exponential factor
   - γ = surface tension (N/m)
   - k_B = Boltzmann constant
   - T = temperature (K)
   - ΔP = supersaturation pressure (Pa)

   Smaller cells = better insulation and mechanical properties.

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


# Physical constants
BOLTZMANN_CONSTANT = 1.380649e-23  # J/K

# Upper bound on a physically meaningful foam cell (10 mm). Real PU cells are 50-500 μm;
# anything approaching this ceiling means the nucleation parameters are wrong, and the
# clamp keeps that from propagating as a plausible-looking number.
MAX_PHYSICAL_CELL_DIAMETER_UM = 10_000.0


class FoamType(Enum):
    """Foam classification"""
    RIGID = "rigid"          # Closed cell, insulation
    FLEXIBLE = "flexible"    # Open cell, cushioning
    INTEGRAL_SKIN = "integral_skin"  # Dense skin, foam core
    SPRAY = "spray"          # Fast-reacting spray foam


@dataclass
class FoamKineticsParameters:
    """
    Parameters for foam kinetics models.

    Rise parameters typically determined from free-rise tests.
    Cell parameters from microscopy or CT scanning.
    """
    # Foam rise parameters
    cream_time_s: float = 10.0           # t_c - onset of visible rise
    rise_time_constant_s: float = 30.0   # τ - characteristic rise time
    free_rise_density_kg_m3: float = 40.0  # Final free-rise density

    # Maximum rise (expansion ratio)
    initial_density_kg_m3: float = 1100.0  # Liquid density before foaming
    final_height_ratio: float = 25.0       # H_∞/H_0 (expansion ratio)

    # Density distribution parameters
    skin_density_kg_m3: float = 800.0    # Density at surface
    core_density_kg_m3: float = 35.0     # Density in core
    skin_thickness_mm: float = 2.0        # Characteristic skin depth

    # Cell nucleation parameters
    surface_tension_n_m: float = 0.025   # γ (0.02-0.03 for PU)
    nucleation_prefactor: float = 1e20   # N_0 (cells/m³)
    supersaturation_pa: float = 500000   # ΔP (0.5-2 MPa typical)

    # Heterogeneous nucleation factor f(θ), the fraction of the homogeneous free-energy
    # barrier that survives when bubbles form on a nucleating agent or entrained air
    # rather than spontaneously in the bulk: ΔG*_het = ΔG*_hom · f(θ).
    #
    # This matters more than it looks. The homogeneous barrier for a PU system at these
    # conditions is of order 10^5, meaning spontaneous nucleation essentially never
    # happens — yet real foams nucleate readily, because they are formulated with
    # surfactants and nucleating agents precisely to make it easy. Ignoring that gives
    # nucleation densities around 10^-24 cells/m³ instead of the 10^11-10^15 that real
    # foams show, and absurd cell sizes follow.
    #
    # CALIBRATED, NOT MEASURED: the data sheets state no cell size, so this default is
    # solved so that reference conditions reproduce target_cell_diameter_um. Recompute it
    # with calibrate_heterogeneous_factor() if the reference conditions change, and
    # replace it with a fitted value if cell-size measurements become available.
    heterogeneous_nucleation_factor: float = 7.82e-5

    # Cell characteristics
    target_cell_diameter_um: float = 200  # Target cell size (100-500 μm)
    closed_cell_fraction: float = 0.90    # Fraction of closed cells

    # Thermal properties
    gas_thermal_conductivity_w_m_k: float = 0.012  # Blowing gas k
    polymer_thermal_conductivity_w_m_k: float = 0.20  # Solid PU k

    # Processing conditions
    mold_fill_factor: float = 1.3        # Overpacking (1.2-1.5 typical)

    @property
    def expansion_ratio(self) -> float:
        """Liquid-to-foam expansion ratio"""
        return self.initial_density_kg_m3 / self.free_rise_density_kg_m3


@dataclass
class FoamRiseResult:
    """Results from foam rise calculation"""
    time_s: float
    height_fraction: float       # 0 to 1 (relative to final)
    height_mm: float             # Actual height
    rise_rate_mm_s: float        # Current rise rate
    density_kg_m3: float         # Current average density
    is_cream_started: bool
    is_rise_complete: bool       # > 95% of final height
    gel_margin_s: float          # Time remaining before gel


class FoamRiseModel:
    """
    Foam rise kinetics model.

    H(t) = H_∞ × (1 - exp(-(t - t_c) / τ))   for t > t_c
    H(t) = 0                                   for t ≤ t_c

    The rise follows an exponential approach to final height,
    starting after cream time.
    """

    def __init__(
        self,
        foam_params: FoamKineticsParameters,
        cure_params: Optional[CureKineticsParameters] = None
    ):
        """
        Initialize foam rise model.

        Args:
            foam_params: Foam kinetics parameters
            cure_params: Cure kinetics parameters (for gel time check)
        """
        self.foam_params = foam_params
        self.cure_params = cure_params

        if cure_params:
            self.cure_model = CureKinetics(cure_params, CureModel.KAMAL_SOUROUR)
        else:
            self.cure_model = None

    def height_fraction(self, time_s: float, temperature_c: float = 25.0) -> float:
        """
        Calculate foam height as fraction of final height.

        H(t)/H_∞ = 1 - exp(-(t - t_c) / τ)   for t > t_c

        Args:
            time_s: Time since mixing (seconds)
            temperature_c: Temperature (affects cream time slightly)

        Returns:
            Height fraction (0 to 1)
        """
        t_c = self.cream_time_at_temp(temperature_c)
        tau = self.foam_params.rise_time_constant_s

        if time_s <= t_c:
            return 0.0

        # Rise equation
        h_frac = 1.0 - math.exp(-(time_s - t_c) / tau)

        return max(0.0, min(1.0, h_frac))

    def cream_time_at_temp(self, temperature_c: float) -> float:
        """
        Get cream time adjusted for temperature.

        Uses Arrhenius-like scaling if cure model available,
        otherwise returns reference cream time.
        """
        if self.cure_model:
            return self.cure_model.cream_time(temperature_c)
        else:
            # Simple temperature scaling (approximate)
            ref_temp = 25.0
            temp_factor = math.exp(0.05 * (ref_temp - temperature_c))
            return self.foam_params.cream_time_s * temp_factor

    def rise_rate(self, time_s: float, temperature_c: float = 25.0) -> float:
        """
        Calculate current rise rate as fraction of final height per second.

        dH/dt = (H_∞/τ) × exp(-(t - t_c) / τ)

        Returns:
            Rise rate (fraction/s)
        """
        t_c = self.cream_time_at_temp(temperature_c)
        tau = self.foam_params.rise_time_constant_s

        if time_s <= t_c:
            return 0.0

        rate = (1.0 / tau) * math.exp(-(time_s - t_c) / tau)
        return rate

    def current_density(self, time_s: float, temperature_c: float = 25.0) -> float:
        """
        Calculate current average density during rise.

        As foam expands, density decreases from initial to final.
        ρ(t) = ρ_initial / (1 + (expansion_ratio - 1) × h_frac)

        Returns:
            Current density (kg/m³)
        """
        h_frac = self.height_fraction(time_s, temperature_c)

        if h_frac <= 0:
            return self.foam_params.initial_density_kg_m3

        rho_initial = self.foam_params.initial_density_kg_m3
        expansion = self.foam_params.expansion_ratio

        # Density inversely proportional to volume (height for 1D)
        current_expansion = 1 + (expansion - 1) * h_frac
        rho_current = rho_initial / current_expansion

        return rho_current

    def time_to_height_fraction(
        self,
        target_fraction: float,
        temperature_c: float = 25.0
    ) -> float:
        """
        Calculate time to reach specified height fraction.

        Solving: target = 1 - exp(-(t - t_c) / τ)
        t = t_c - τ × ln(1 - target)

        Returns:
            Time in seconds
        """
        if target_fraction <= 0:
            return 0.0
        if target_fraction >= 1.0:
            return float('inf')

        t_c = self.cream_time_at_temp(temperature_c)
        tau = self.foam_params.rise_time_constant_s

        return t_c - tau * math.log(1 - target_fraction)

    def mold_fill_time(
        self,
        mold_height_mm: float,
        initial_pour_height_mm: float,
        temperature_c: float = 25.0
    ) -> float:
        """
        Calculate time to fill mold.

        Args:
            mold_height_mm: Internal mold height
            initial_pour_height_mm: Initial liquid pour height
            temperature_c: Temperature

        Returns:
            Time to fill mold (seconds)
        """
        # Required expansion to fill mold
        required_expansion = mold_height_mm / initial_pour_height_mm
        max_expansion = self.foam_params.expansion_ratio

        if required_expansion > max_expansion:
            # Won't fill - return infinity
            return float('inf')

        # Height fraction needed
        h_frac = (required_expansion - 1) / (max_expansion - 1)
        h_frac = min(h_frac, 0.999)

        return self.time_to_height_fraction(h_frac, temperature_c)

    def get_rise_state(
        self,
        time_s: float,
        temperature_c: float = 25.0,
        initial_height_mm: float = 10.0
    ) -> FoamRiseResult:
        """
        Get complete rise state at given time.

        Args:
            time_s: Time since mixing
            temperature_c: Temperature
            initial_height_mm: Initial pour height

        Returns:
            FoamRiseResult with all rise info
        """
        h_frac = self.height_fraction(time_s, temperature_c)
        rate = self.rise_rate(time_s, temperature_c)
        density = self.current_density(time_s, temperature_c)
        cream_time = self.cream_time_at_temp(temperature_c)

        # Calculate actual height
        final_height = initial_height_mm * self.foam_params.expansion_ratio
        current_height = initial_height_mm + h_frac * (final_height - initial_height_mm)

        # Rise rate in mm/s
        rise_rate_mm_s = rate * (final_height - initial_height_mm)

        # Gel margin
        if self.cure_model:
            gel_time = self.cure_model.gel_time(temperature_c)
            gel_margin = max(0, gel_time - time_s)
        else:
            gel_margin = float('inf')

        return FoamRiseResult(
            time_s=time_s,
            height_fraction=h_frac,
            height_mm=current_height,
            rise_rate_mm_s=rise_rate_mm_s,
            density_kg_m3=density,
            is_cream_started=time_s >= cream_time,
            is_rise_complete=h_frac >= 0.95,
            gel_margin_s=gel_margin,
        )

    def rise_profile(
        self,
        total_time_s: float,
        temperature_c: float = 25.0,
        initial_height_mm: float = 10.0,
        num_points: int = 50
    ) -> List[FoamRiseResult]:
        """
        Generate rise profile over time.

        Returns:
            List of FoamRiseResult at each time point
        """
        dt = total_time_s / (num_points - 1) if num_points > 1 else total_time_s
        profile = []

        for i in range(num_points):
            t = i * dt
            state = self.get_rise_state(t, temperature_c, initial_height_mm)
            profile.append(state)

        return profile


class DensityDistributionModel:
    """
    Density distribution model for foam cross-section.

    ρ(z) = ρ_core + (ρ_skin - ρ_core) × exp(-(z - z_s)² / (2σ²))

    Creates gradient from dense skin to light core.
    Important for structural predictions.
    """

    def __init__(self, foam_params: FoamKineticsParameters):
        """
        Initialize density distribution model.

        Args:
            foam_params: Foam kinetics parameters
        """
        self.foam_params = foam_params

    def density_at_depth(
        self,
        depth_mm: float,
        part_thickness_mm: float
    ) -> float:
        """
        Calculate density at given depth from surface.

        Uses symmetric distribution (skin on both sides).

        Args:
            depth_mm: Distance from nearest surface
            part_thickness_mm: Total part thickness

        Returns:
            Density at that depth (kg/m³)
        """
        rho_skin = self.foam_params.skin_density_kg_m3
        rho_core = self.foam_params.core_density_kg_m3
        sigma = self.foam_params.skin_thickness_mm

        # Distance from center
        center = part_thickness_mm / 2
        dist_from_surface = min(depth_mm, part_thickness_mm - depth_mm)

        # Gaussian distribution from skin
        exp_term = math.exp(-(dist_from_surface ** 2) / (2 * sigma ** 2))
        rho = rho_core + (rho_skin - rho_core) * exp_term

        return rho

    def density_profile(
        self,
        part_thickness_mm: float,
        num_points: int = 20
    ) -> List[Tuple[float, float]]:
        """
        Generate density profile through part thickness.

        Returns:
            List of (depth_mm, density_kg_m3) tuples
        """
        profile = []
        dz = part_thickness_mm / (num_points - 1) if num_points > 1 else part_thickness_mm

        for i in range(num_points):
            z = i * dz
            rho = self.density_at_depth(z, part_thickness_mm)
            profile.append((z, rho))

        return profile

    def average_density(self, part_thickness_mm: float) -> float:
        """
        Calculate average density across part thickness.

        Integrates density profile numerically.

        Returns:
            Average density (kg/m³)
        """
        profile = self.density_profile(part_thickness_mm, num_points=50)
        densities = [rho for _, rho in profile]
        return sum(densities) / len(densities)

    def part_weight(
        self,
        length_mm: float,
        width_mm: float,
        thickness_mm: float
    ) -> float:
        """
        Calculate part weight considering density gradient.

        Args:
            length_mm: Part length
            width_mm: Part width
            thickness_mm: Part thickness

        Returns:
            Part weight in kg
        """
        avg_density = self.average_density(thickness_mm)
        volume_m3 = (length_mm * width_mm * thickness_mm) / 1e9

        return avg_density * volume_m3

    def skin_fraction(self, part_thickness_mm: float) -> float:
        """
        Calculate fraction of part that is "skin" (>50% of skin density).

        Returns:
            Skin fraction (0 to 1)
        """
        threshold = (self.foam_params.skin_density_kg_m3 +
                    self.foam_params.core_density_kg_m3) / 2

        profile = self.density_profile(part_thickness_mm, num_points=100)
        skin_count = sum(1 for _, rho in profile if rho > threshold)

        return skin_count / len(profile)


class CellNucleationModel:
    """
    Cell nucleation and size prediction model.

    N = N_0 × exp(-16πγ³ / (3k_B × T × ΔP²))

    Based on classical nucleation theory.
    Cell size affects thermal and mechanical properties.
    """

    def __init__(self, foam_params: FoamKineticsParameters):
        """
        Initialize cell nucleation model.

        Args:
            foam_params: Foam kinetics parameters
        """
        self.foam_params = foam_params

    def nucleation_density(
        self,
        temperature_c: float,
        supersaturation_pa: Optional[float] = None
    ) -> float:
        """
        Calculate cell nucleation density.

        N = N_0 × exp(-f(θ) × 16πγ³ / (3k_B × T × ΔP²))

        The f(θ) term is what makes this heterogeneous rather than homogeneous
        nucleation. Bubbles in a real foam form on nucleating agents and entrained air,
        which cuts the free-energy barrier by orders of magnitude; without it the model
        predicts that foam essentially cannot nucleate at all.

        Args:
            temperature_c: Temperature (°C)
            supersaturation_pa: Override supersaturation pressure

        Returns:
            Nucleation density (cells/m³)
        """
        temp_k = temperature_c + 273.15
        gamma = self.foam_params.surface_tension_n_m
        n_0 = self.foam_params.nucleation_prefactor
        delta_p = supersaturation_pa or self.foam_params.supersaturation_pa

        if delta_p <= 0:
            return 0

        # Homogeneous barrier, then the heterogeneous reduction
        homogeneous_barrier = (16 * math.pi * gamma**3) / (3 * BOLTZMANN_CONSTANT * temp_k * delta_p**2)
        barrier = homogeneous_barrier * self.foam_params.heterogeneous_nucleation_factor

        # Guard the exponential against overflow at extreme parameter values
        barrier = max(0.0, min(barrier, 700))

        return n_0 * math.exp(-barrier)

    def cell_diameter_from_density(
        self,
        nucleation_density: float,
        foam_density_kg_m3: float
    ) -> float:
        """
        Estimate average cell diameter from nucleation density.

        Assuming spherical cells:
        d = (6 / (π × N × (1 - φ)))^(1/3)

        Where φ is solid fraction.

        Args:
            nucleation_density: Cells per m³
            foam_density_kg_m3: Foam density

        Returns:
            Average cell diameter (μm)
        """
        if nucleation_density <= 0:
            return self.foam_params.target_cell_diameter_um

        # Solid fraction
        phi = foam_density_kg_m3 / self.foam_params.initial_density_kg_m3

        # Effective cells per unit volume of gas
        # (only gas phase has cells)
        gas_fraction = 1 - phi
        if gas_fraction <= 0:
            return 0

        # Cell volume = gas_volume / N
        cell_volume = gas_fraction / nucleation_density

        # Diameter from volume (sphere)
        diameter_m = math.pow(6 * cell_volume / math.pi, 1/3)
        diameter_um = diameter_m * 1e6

        # A cell cannot be larger than the part it is in. An implausible nucleation
        # density used to escape as a "cell" tens of millions of metres across, which is
        # the kind of number that should never leave a physical model quietly.
        if not math.isfinite(diameter_um) or diameter_um > MAX_PHYSICAL_CELL_DIAMETER_UM:
            return MAX_PHYSICAL_CELL_DIAMETER_UM

        return diameter_um

    def predict_cell_diameter(
        self,
        temperature_c: float,
        foam_density_kg_m3: Optional[float] = None
    ) -> float:
        """
        Predict average cell diameter at given conditions.

        Args:
            temperature_c: Temperature (°C)
            foam_density_kg_m3: Foam density (uses free-rise if None)

        Returns:
            Predicted cell diameter (μm)
        """
        density = foam_density_kg_m3 or self.foam_params.free_rise_density_kg_m3
        n = self.nucleation_density(temperature_c)

        return self.cell_diameter_from_density(n, density)

    def calibrate_heterogeneous_factor(
        self,
        target_cell_diameter_um: Optional[float] = None,
        temperature_c: float = 25.0,
        foam_density_kg_m3: Optional[float] = None,
    ) -> float:
        """
        Solve for the heterogeneous nucleation factor that yields a known cell size.

        Classical nucleation theory gives the shape of the temperature and
        supersaturation dependence but not its absolute scale, because that depends on
        the surfactant and nucleating-agent package, which no data sheet quantifies.
        Rather than inventing the factor, this inverts the model against a cell diameter
        that IS known:

            N_target = gas_fraction / cell_volume     from the target diameter
            f        = ln(N_0 / N_target) / ΔG*_hom   from the barrier equation

        The result is a calibration to an assumed cell size, not a measurement. Treat it
        as such: it makes the temperature and pressure trends meaningful, and it will be
        no more accurate than the target it was anchored to.

        Args:
            target_cell_diameter_um: Cell size to anchor to (defaults to the parameter)
            temperature_c: Reference temperature for the calibration
            foam_density_kg_m3: Reference foam density (defaults to free-rise)

        Returns:
            The heterogeneous factor, in (0, 1]
        """
        target_um = target_cell_diameter_um or self.foam_params.target_cell_diameter_um
        density = foam_density_kg_m3 or self.foam_params.free_rise_density_kg_m3

        gas_fraction = 1 - (density / self.foam_params.initial_density_kg_m3)
        if gas_fraction <= 0 or target_um <= 0:
            raise ValueError('Cannot calibrate against a non-foaming reference state')

        cell_volume_m3 = (math.pi / 6.0) * (target_um * 1e-6) ** 3
        target_density = gas_fraction / cell_volume_m3

        temp_k = temperature_c + 273.15
        gamma = self.foam_params.surface_tension_n_m
        delta_p = self.foam_params.supersaturation_pa
        homogeneous_barrier = (16 * math.pi * gamma**3) / (3 * BOLTZMANN_CONSTANT * temp_k * delta_p**2)

        required_barrier = math.log(self.foam_params.nucleation_prefactor / target_density)

        # A negative barrier would mean the prefactor alone undershoots the target, in
        # which case no reduction helps and nucleation is already unhindered.
        factor = max(0.0, required_barrier) / homogeneous_barrier

        return min(1.0, factor)

    def thermal_conductivity(
        self,
        cell_diameter_um: float,
        foam_density_kg_m3: float
    ) -> float:
        """
        Estimate foam thermal conductivity from cell structure.

        Uses simplified model:
        k_foam = k_gas × (1-φ) + k_polymer × φ + k_radiation

        Where radiation contribution depends on cell size.

        Args:
            cell_diameter_um: Average cell diameter
            foam_density_kg_m3: Foam density

        Returns:
            Thermal conductivity (W/m·K)
        """
        # Solid fraction
        phi = foam_density_kg_m3 / self.foam_params.initial_density_kg_m3

        k_gas = self.foam_params.gas_thermal_conductivity_w_m_k
        k_solid = self.foam_params.polymer_thermal_conductivity_w_m_k

        # Gas and solid contributions
        k_conduction = k_gas * (1 - phi) + k_solid * phi

        # Radiation contribution (increases with cell size)
        # Approximate: k_rad ≈ 4 × σ × T³ × d
        # For typical conditions, this is ~0.001-0.005 W/m·K
        sigma = 5.67e-8  # Stefan-Boltzmann
        T = 300  # Kelvin (approximate)
        d = cell_diameter_um / 1e6
        k_radiation = 4 * sigma * T**3 * d * 0.5  # 0.5 factor for cell walls

        return k_conduction + k_radiation

    def mechanical_factor(
        self,
        cell_diameter_um: float,
        foam_density_kg_m3: float
    ) -> float:
        """
        Estimate mechanical property factor from cell structure.

        Smaller cells generally give better mechanical properties.
        Returns factor relative to 200μm baseline.

        Returns:
            Factor (>1 = better than baseline, <1 = worse)
        """
        baseline = 200  # μm
        # Empirical relationship: smaller cells = stronger
        factor = baseline / cell_diameter_um
        return max(0.5, min(2.0, factor))


# =============================================================================
# Convenience Functions
# =============================================================================

def calculate_foam_rise(
    time_s: float,
    temperature_c: float = 25.0,
    cream_time_s: float = 10.0,
    rise_time_constant_s: float = 30.0,
    expansion_ratio: float = 25.0,
    initial_height_mm: float = 10.0
) -> Dict[str, float]:
    """
    Calculate foam rise at given time.

    Args:
        time_s: Time since mixing (seconds)
        temperature_c: Temperature (°C)
        cream_time_s: Cream time (seconds)
        rise_time_constant_s: Rise time constant (seconds)
        expansion_ratio: Final expansion ratio
        initial_height_mm: Initial pour height (mm)

    Returns:
        Dict with rise info
    """
    params = FoamKineticsParameters(
        cream_time_s=cream_time_s,
        rise_time_constant_s=rise_time_constant_s,
        initial_density_kg_m3=1100,
        free_rise_density_kg_m3=1100 / expansion_ratio,
    )

    model = FoamRiseModel(params)
    result = model.get_rise_state(time_s, temperature_c, initial_height_mm)

    return {
        'time_s': result.time_s,
        'height_mm': result.height_mm,
        'height_fraction': result.height_fraction,
        'rise_rate_mm_s': result.rise_rate_mm_s,
        'density_kg_m3': result.density_kg_m3,
        'is_cream_started': result.is_cream_started,
        'is_rise_complete': result.is_rise_complete,
    }


def calculate_density_profile(
    part_thickness_mm: float,
    skin_density_kg_m3: float = 800.0,
    core_density_kg_m3: float = 35.0,
    skin_thickness_mm: float = 2.0,
    num_points: int = 20
) -> List[Dict[str, float]]:
    """
    Calculate density profile through foam part.

    Args:
        part_thickness_mm: Part thickness (mm)
        skin_density_kg_m3: Skin density
        core_density_kg_m3: Core density
        skin_thickness_mm: Skin thickness parameter
        num_points: Number of profile points

    Returns:
        List of dicts with depth and density
    """
    params = FoamKineticsParameters(
        skin_density_kg_m3=skin_density_kg_m3,
        core_density_kg_m3=core_density_kg_m3,
        skin_thickness_mm=skin_thickness_mm,
    )

    model = DensityDistributionModel(params)
    profile = model.density_profile(part_thickness_mm, num_points)

    return [{'depth_mm': z, 'density_kg_m3': rho} for z, rho in profile]


def predict_cell_size(
    temperature_c: float = 25.0,
    supersaturation_pa: float = 500000,
    surface_tension_n_m: float = 0.025,
    foam_density_kg_m3: float = 40.0
) -> Dict[str, float]:
    """
    Predict cell size from processing conditions.

    Args:
        temperature_c: Temperature (°C)
        supersaturation_pa: Blowing agent supersaturation (Pa)
        surface_tension_n_m: Surface tension (N/m)
        foam_density_kg_m3: Target foam density

    Returns:
        Dict with cell size prediction
    """
    params = FoamKineticsParameters(
        surface_tension_n_m=surface_tension_n_m,
        supersaturation_pa=supersaturation_pa,
        free_rise_density_kg_m3=foam_density_kg_m3,
    )

    model = CellNucleationModel(params)
    n = model.nucleation_density(temperature_c)
    diameter = model.predict_cell_diameter(temperature_c, foam_density_kg_m3)
    k = model.thermal_conductivity(diameter, foam_density_kg_m3)
    mech_factor = model.mechanical_factor(diameter, foam_density_kg_m3)

    return {
        'cell_diameter_um': diameter,
        'nucleation_density_per_m3': n,
        'thermal_conductivity_w_m_k': k,
        'mechanical_factor': mech_factor,
        'temperature_c': temperature_c,
    }


def calculate_mold_fill_time(
    mold_height_mm: float,
    pour_height_mm: float,
    cream_time_s: float = 10.0,
    rise_time_constant_s: float = 30.0,
    expansion_ratio: float = 25.0,
    temperature_c: float = 25.0,
    gel_time_s: Optional[float] = None
) -> Dict[str, float]:
    """
    Calculate time to fill mold and check against gel time.

    Args:
        mold_height_mm: Internal mold cavity height
        pour_height_mm: Initial pour height
        cream_time_s: Cream time (seconds)
        rise_time_constant_s: Rise time constant
        expansion_ratio: Maximum expansion ratio
        temperature_c: Temperature
        gel_time_s: Gel time (optional, for timing check)

    Returns:
        Dict with fill time analysis
    """
    params = FoamKineticsParameters(
        cream_time_s=cream_time_s,
        rise_time_constant_s=rise_time_constant_s,
        free_rise_density_kg_m3=1100 / expansion_ratio,
    )

    # Add cure params if gel time provided
    cure_params = None
    if gel_time_s:
        cure_params = CureKineticsParameters(gel_time_ref_s=gel_time_s)

    model = FoamRiseModel(params, cure_params)
    fill_time = model.mold_fill_time(mold_height_mm, pour_height_mm, temperature_c)

    # Calculate overpacking requirement
    max_height = pour_height_mm * expansion_ratio
    required_pour = mold_height_mm / expansion_ratio

    result = {
        'mold_height_mm': mold_height_mm,
        'pour_height_mm': pour_height_mm,
        'fill_time_s': fill_time,
        'max_possible_height_mm': max_height,
        'will_fill': fill_time < float('inf'),
        'minimum_pour_height_mm': required_pour,
        'current_overpack_ratio': pour_height_mm / required_pour,
    }

    if gel_time_s:
        result['gel_time_s'] = gel_time_s
        result['fills_before_gel'] = fill_time < gel_time_s
        result['margin_s'] = gel_time_s - fill_time if fill_time < float('inf') else 0

    return result


def estimate_foam_part_weight(
    length_mm: float,
    width_mm: float,
    thickness_mm: float,
    core_density_kg_m3: float = 35.0,
    skin_density_kg_m3: float = 800.0,
    skin_thickness_mm: float = 2.0
) -> Dict[str, float]:
    """
    Estimate weight of foam part considering skin/core gradient.

    Args:
        length_mm: Part length
        width_mm: Part width
        thickness_mm: Part thickness
        core_density_kg_m3: Core density
        skin_density_kg_m3: Skin density
        skin_thickness_mm: Skin thickness parameter

    Returns:
        Dict with weight analysis
    """
    params = FoamKineticsParameters(
        skin_density_kg_m3=skin_density_kg_m3,
        core_density_kg_m3=core_density_kg_m3,
        skin_thickness_mm=skin_thickness_mm,
    )

    model = DensityDistributionModel(params)
    weight = model.part_weight(length_mm, width_mm, thickness_mm)
    avg_density = model.average_density(thickness_mm)
    skin_fraction = model.skin_fraction(thickness_mm)

    # Compare to uniform density estimates
    volume_m3 = (length_mm * width_mm * thickness_mm) / 1e9
    core_only_weight = volume_m3 * core_density_kg_m3
    skin_only_weight = volume_m3 * skin_density_kg_m3

    return {
        'weight_kg': weight,
        'weight_g': weight * 1000,
        'average_density_kg_m3': avg_density,
        'skin_fraction': skin_fraction,
        'core_only_weight_kg': core_only_weight,
        'skin_only_weight_kg': skin_only_weight,
        'volume_m3': volume_m3,
    }
