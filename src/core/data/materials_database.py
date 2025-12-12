"""
Polyurethane Material Database

Comprehensive database of real polyurethane foam systems with complete
physical, chemical, and thermal properties.

Materials included:
- Genfoam HD12 (water-blown)
- Genfoam HD20 (water-blown)
- Ecomate Spray (ecomate® blown, zero GWP)
- Ecofoam XHD RC (ecomate® blown, zero GWP)
"""

from typing import Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum


class BlowingAgent(Enum):
    """Blowing agent types"""
    WATER = "water"  # Water-blown foams
    ECOMATE = "ecomate"  # eco-mate® (zero GWP)
    HFC = "HFC-134a"  # Hydrofluorocarbon (high GWP)
    HC = "HC"  # Hydrocarbon
    HFO = "HFO"  # Hydrofluoroolefin


@dataclass
class ComponentProperties:
    """Properties of polyol or isocyanate component"""
    viscosity_cps: float  # centiPoise at 25°C
    specific_gravity: float  # g/cm³
    density_kg_m3: float = field(init=False)

    def __post_init__(self):
        # Calculate density from specific gravity
        # Specific gravity × 1000 kg/m³ = density
        self.density_kg_m3 = self.specific_gravity * 1000


@dataclass
class ReactionCharacteristics:
    """Reaction kinetics at reference temperature (typically 25°C)"""
    cream_time_s: float  # Time until visible reaction starts
    gel_time_s: float  # Time until mixture solidifies
    free_rise_density_kg_m3: float  # Density of unpressed foam
    reference_temp_c: float = 25  # Temperature at which measurements taken


@dataclass
class CureKineticsData:
    """
    Cure kinetics parameters for Avrami and Kamal-Sourour models.

    These parameters are typically determined from DSC (Differential Scanning
    Calorimetry) experiments and rheological measurements during cure.
    """
    # Kamal-Sourour model parameters (preferred for PU)
    k1_ref: float = 0.0001       # Uncatalyzed rate constant at ref temp (s^-1)
    k2_ref: float = 0.001        # Autocatalyzed rate constant at ref temp (s^-1)
    m: float = 1.0               # Autocatalytic exponent (0.5-1.5 typical)
    n: float = 1.5               # Reaction order (1-2 typical)

    # Avrami model parameters (alternative)
    avrami_k: float = 0.001      # Rate constant at reference temp (s^-n)
    avrami_n: float = 2.0        # Avrami exponent (1.5-3 for PU)

    # Temperature dependence (Arrhenius)
    activation_energy_k1: float = 50000   # Ea for k1 (J/mol)
    activation_energy_k2: float = 45000   # Ea for k2 (J/mol)

    # Gel point
    gel_conversion: float = 0.65  # Conversion at gel point (0.6-0.7 typical)


@dataclass
class ViscosityConversionData:
    """
    Castro-Macosko viscosity-conversion coupling parameters.

    η(α, T) = η₀(T) × (αg / (αg - α))^(A + B×α)

    Determines how viscosity rises during cure reaction.
    Critical for processing window prediction.
    """
    # Castro-Macosko exponents
    A: float = 2.0               # Primary exponent (1-3 typical)
    B: float = 2.5               # Conversion-dependent exponent (1-4 typical)

    # Processing limits
    max_processable_viscosity_pa_s: float = 100.0  # Beyond this, no flow
    critical_conversion: float = 0.50              # Practical limit for processing


@dataclass
class ThermalReactionData:
    """
    Thermal reaction parameters for exotherm modeling.

    ΔT_max = (ΔH_r × ρ) / C_p × α_max

    Determines heat generation during cure and scorch risk.
    """
    # Heat of reaction
    heat_of_reaction_j_kg: float = 100000  # ΔH_r (80-120 kJ/kg typical for PU)

    # Material thermal properties
    specific_heat_j_kg_k: float = 1800     # C_p (1500-2000 for PU)
    thermal_conductivity_w_m_k: float = 0.2  # k (0.15-0.25 for PU)

    # Degradation thresholds
    scorch_temp_c: float = 180.0           # Temperature causing visible degradation
    degradation_temp_c: float = 220.0      # Temperature causing severe degradation


@dataclass
class FoamKineticsData:
    """
    Foam-specific kinetics parameters.

    For foam rise, density distribution, and cell structure prediction.
    """
    # Foam rise parameters
    rise_time_constant_s: float = 30.0     # τ - characteristic rise time

    # Density distribution
    skin_density_kg_m3: float = 800.0      # Density at surface
    core_density_kg_m3: float = 35.0       # Density in core
    skin_thickness_mm: float = 2.0         # Characteristic skin depth

    # Cell nucleation parameters
    surface_tension_n_m: float = 0.025     # γ (0.02-0.03 for PU)
    supersaturation_pa: float = 500000     # ΔP (0.5-2 MPa typical)
    target_cell_diameter_um: float = 200   # Target cell size (100-500 μm)

    # Gas thermal properties
    gas_thermal_conductivity_w_m_k: float = 0.012  # Blowing gas k


@dataclass
class PolymerProperties:
    """Properties of cured foam at index 100"""
    molded_density_min_kg_m3: float
    molded_density_max_kg_m3: float
    compressive_strength_parallel_kpa: float  # Parallel to rise direction
    compressive_strength_perpendicular_kpa: float  # Perpendicular to rise
    dimensional_stability_cold_percent: float  # At -20°C or -25°C for 24-48h
    dimensional_stability_hot_percent: float  # At 70-80°C for 24-48h
    closed_cell_content_percent: float  # % of closed cells


@dataclass
class ThermalProperties:
    """Thermal characteristics of cured foam"""
    initial_k_factor_w_m_k: float  # Immediately after curing
    declared_lambda_thin_w_m_k: float  # At thickness ≤80 mm
    declared_lambda_medium_w_m_k: Optional[float] = None  # At 80-120 mm
    declared_lambda_thick_w_m_k: Optional[float] = None  # At ≥120 mm
    gas_lambda_mw_m_k: float = field(default=10.7)  # Conductivity of blowing gas


@dataclass
class EnvironmentalProperties:
    """Environmental impact metrics"""
    gwp_kg_co2_eq: float  # Global Warming Potential per kg foam
    odp: float  # Ozone Depletion Potential
    pfas_free: bool  # Per- and polyfluoroalkyl substances
    biodegradable: bool  # Readily biodegradable
    aquatic_toxicity: bool  # Non-toxic to aquatic life


@dataclass
class ProcessingConditions:
    """Optimal processing conditions"""
    polyol_temp_min_c: float
    polyol_temp_max_c: float
    isocyanate_temp_min_c: float
    isocyanate_temp_max_c: float
    polyol_to_isocyanate_weight_ratio: float
    polyol_to_isocyanate_volume_ratio: Optional[float] = None
    substrate_temp_min_c: Optional[float] = None
    substrate_temp_max_c: Optional[float] = None
    substrate_humidity_max_percent: Optional[float] = None
    mold_temp_min_c: Optional[float] = None
    mold_temp_max_c: Optional[float] = None
    layer_thickness_min_cm: Optional[float] = None
    layer_thickness_max_cm: Optional[float] = None


@dataclass
class StorageConditions:
    """Storage and shelf life information"""
    storage_temp_min_c: float
    storage_temp_max_c: float
    polyol_shelf_life_months: int
    isocyanate_shelf_life_months: int
    re_mix_polyol_months: Optional[int] = None  # When to re-mix polyol


@dataclass
class PolyurethaneMaterial:
    """Complete material specification"""
    name: str
    material_key: str
    blowing_agent: BlowingAgent
    polyol: ComponentProperties
    isocyanate: ComponentProperties
    reaction_characteristics: ReactionCharacteristics
    polymer_properties: PolymerProperties
    thermal_properties: ThermalProperties
    environmental_properties: EnvironmentalProperties
    processing_conditions: ProcessingConditions
    storage_conditions: StorageConditions

    # Rheological properties (for calculation models)
    flow_index: float  # Power law: 0.7-0.9 for polyurethanes
    consistency_coefficient_pa_s: float
    yield_stress_pa: Optional[float] = None  # For Herschel-Bulkley
    activation_energy_j_mol: float = 25000  # Typical: 15,000-40,000
    reference_temp_k: float = 298.15  # 25°C in Kelvin

    # Kinetics parameters (Phase 4 - Kinetics Extension)
    cure_kinetics: Optional[CureKineticsData] = None
    viscosity_conversion: Optional[ViscosityConversionData] = None
    thermal_reaction: Optional[ThermalReactionData] = None
    foam_kinetics: Optional[FoamKineticsData] = None

    # Quality & performance
    fire_rating: str = "UNI EN 13501-1:2019 Class E"
    notes: str = ""


# Material Database Definition

GENFOAM_HD12 = PolyurethaneMaterial(
    name="Genfoam HD12",
    material_key="genfoam_hd12",
    blowing_agent=BlowingAgent.WATER,

    polyol=ComponentProperties(
        viscosity_cps=975,  # 900-1050 cP average: 975
        specific_gravity=1.07
    ),

    isocyanate=ComponentProperties(
        viscosity_cps=200,  # 200 ± 20 cP
        specific_gravity=1.23
    ),

    reaction_characteristics=ReactionCharacteristics(
        cream_time_s=55,  # 50-60 s average
        gel_time_s=135,  # 130-140 s average
        free_rise_density_kg_m3=205,  # 195-215 kg/m³ average
        reference_temp_c=25
    ),

    polymer_properties=PolymerProperties(
        molded_density_min_kg_m3=350,
        molded_density_max_kg_m3=550,
        compressive_strength_parallel_kpa=None,  # Not specified
        compressive_strength_perpendicular_kpa=None,
        dimensional_stability_cold_percent=1.0,  # ≤1% @ -20°C
        dimensional_stability_hot_percent=1.0,  # ≤1% @ 80°C
        closed_cell_content_percent=None  # Not specified
    ),

    thermal_properties=ThermalProperties(
        initial_k_factor_w_m_k=0.020,  # Typical for water-blown
        declared_lambda_thin_w_m_k=0.028,
        declared_lambda_medium_w_m_k=None,
        declared_lambda_thick_w_m_k=None,
        gas_lambda_mw_m_k=30.0  # Water has higher conductivity
    ),

    environmental_properties=EnvironmentalProperties(
        gwp_kg_co2_eq=0,  # Water-blown: zero GWP
        odp=0,  # Zero ODP
        pfas_free=True,
        biodegradable=True,
        aquatic_toxicity=False
    ),

    processing_conditions=ProcessingConditions(
        polyol_temp_min_c=22,
        polyol_temp_max_c=25,
        isocyanate_temp_min_c=22,
        isocyanate_temp_max_c=25,
        polyol_to_isocyanate_weight_ratio=90/100
    ),

    storage_conditions=StorageConditions(
        storage_temp_min_c=15,
        storage_temp_max_c=25,
        polyol_shelf_life_months=6,
        isocyanate_shelf_life_months=6,
        re_mix_polyol_months=3
    ),

    flow_index=0.82,  # Typical for water-blown
    consistency_coefficient_pa_s=0.85,
    yield_stress_pa=2.0,  # Estimated for water-blown
    activation_energy_j_mol=24000,

    # Kinetics parameters calibrated to cream/gel times
    cure_kinetics=CureKineticsData(
        k1_ref=0.00015,       # Calibrated for 55s cream time
        k2_ref=0.0008,        # Calibrated for 135s gel time
        m=1.0,
        n=1.5,
        activation_energy_k1=50000,
        activation_energy_k2=45000,
        gel_conversion=0.65,
    ),
    viscosity_conversion=ViscosityConversionData(
        A=2.0,
        B=2.5,
        max_processable_viscosity_pa_s=100.0,
        critical_conversion=0.50,
    ),
    thermal_reaction=ThermalReactionData(
        heat_of_reaction_j_kg=95000,   # Water-blown, moderate exotherm
        specific_heat_j_kg_k=1800,
        thermal_conductivity_w_m_k=0.20,
        scorch_temp_c=180.0,
        degradation_temp_c=220.0,
    ),
    foam_kinetics=FoamKineticsData(
        rise_time_constant_s=40.0,     # Slower rise for water-blown
        skin_density_kg_m3=800.0,
        core_density_kg_m3=205.0,      # Higher core density
        skin_thickness_mm=2.5,
        surface_tension_n_m=0.028,
        supersaturation_pa=400000,
        target_cell_diameter_um=250,
        gas_thermal_conductivity_w_m_k=0.026,  # Water/CO2 higher k
    ),

    notes="Water-blown polyurethane. Standard density range suitable for molding."
)


GENFOAM_HD20 = PolyurethaneMaterial(
    name="Genfoam HD20",
    material_key="genfoam_hd20",
    blowing_agent=BlowingAgent.WATER,

    polyol=ComponentProperties(
        viscosity_cps=975,  # 900-1050 cP average
        specific_gravity=1.07
    ),

    isocyanate=ComponentProperties(
        viscosity_cps=200,  # 200 ± 20 cP
        specific_gravity=1.23
    ),

    reaction_characteristics=ReactionCharacteristics(
        cream_time_s=55,  # 50-60 s average
        gel_time_s=135,  # 130-140 s average
        free_rise_density_kg_m3=302.5,  # 290-315 kg/m³ average
        reference_temp_c=25
    ),

    polymer_properties=PolymerProperties(
        molded_density_min_kg_m3=400,
        molded_density_max_kg_m3=600,
        compressive_strength_parallel_kpa=None,
        compressive_strength_perpendicular_kpa=None,
        dimensional_stability_cold_percent=1.0,  # ≤1% @ -20°C
        dimensional_stability_hot_percent=1.0,  # ≤1% @ 80°C
        closed_cell_content_percent=None
    ),

    thermal_properties=ThermalProperties(
        initial_k_factor_w_m_k=0.020,
        declared_lambda_thin_w_m_k=0.028,
        gas_lambda_mw_m_k=30.0
    ),

    environmental_properties=EnvironmentalProperties(
        gwp_kg_co2_eq=0,  # Water-blown
        odp=0,
        pfas_free=True,
        biodegradable=True,
        aquatic_toxicity=False
    ),

    processing_conditions=ProcessingConditions(
        polyol_temp_min_c=22,
        polyol_temp_max_c=25,
        isocyanate_temp_min_c=22,
        isocyanate_temp_max_c=25,
        polyol_to_isocyanate_weight_ratio=90/100
    ),

    storage_conditions=StorageConditions(
        storage_temp_min_c=15,
        storage_temp_max_c=25,
        polyol_shelf_life_months=6,
        isocyanate_shelf_life_months=6,
        re_mix_polyol_months=3
    ),

    flow_index=0.82,
    consistency_coefficient_pa_s=0.85,
    yield_stress_pa=2.0,
    activation_energy_j_mol=24000,

    # Kinetics parameters calibrated to cream/gel times
    cure_kinetics=CureKineticsData(
        k1_ref=0.00015,       # Same as HD12
        k2_ref=0.0008,
        m=1.0,
        n=1.5,
        activation_energy_k1=50000,
        activation_energy_k2=45000,
        gel_conversion=0.65,
    ),
    viscosity_conversion=ViscosityConversionData(
        A=2.0,
        B=2.5,
        max_processable_viscosity_pa_s=100.0,
        critical_conversion=0.50,
    ),
    thermal_reaction=ThermalReactionData(
        heat_of_reaction_j_kg=95000,
        specific_heat_j_kg_k=1800,
        thermal_conductivity_w_m_k=0.20,
        scorch_temp_c=180.0,
        degradation_temp_c=220.0,
    ),
    foam_kinetics=FoamKineticsData(
        rise_time_constant_s=40.0,
        skin_density_kg_m3=850.0,
        core_density_kg_m3=302.5,      # Higher core density than HD12
        skin_thickness_mm=2.5,
        surface_tension_n_m=0.028,
        supersaturation_pa=400000,
        target_cell_diameter_um=220,   # Slightly smaller cells
        gas_thermal_conductivity_w_m_k=0.026,
    ),

    notes="Water-blown polyurethane. Higher density than HD12. Suitable for molding."
)


ECOMATE_SPRAY = PolyurethaneMaterial(
    name="Ecomate Spray",
    material_key="ecomate_spray",
    blowing_agent=BlowingAgent.ECOMATE,

    polyol=ComponentProperties(
        viscosity_cps=300,  # 300 ± 20 cP (very low - spray grade)
        specific_gravity=1.12
    ),

    isocyanate=ComponentProperties(
        viscosity_cps=200,  # 200 ± 20 cP
        specific_gravity=1.23
    ),

    reaction_characteristics=ReactionCharacteristics(
        cream_time_s=3,  # 3 ± 2 s - VERY FAST
        gel_time_s=10,  # 10 ± 3 s tack-free time
        free_rise_density_kg_m3=30.4,  # 28.8-32.0 kg/m³ average
        reference_temp_c=20
    ),

    polymer_properties=PolymerProperties(
        molded_density_min_kg_m3=31,  # 35 ± 4 kg/m³ = 31-39
        molded_density_max_kg_m3=39,
        compressive_strength_parallel_kpa=276,  # 40 psi
        compressive_strength_perpendicular_kpa=166,  # 24 psi
        dimensional_stability_cold_percent=0.22,  # ≤0.22% @ -62°C
        dimensional_stability_hot_percent=0.24,  # ≤0.24% @ 54°C, >90% RH
        closed_cell_content_percent=90  # >90%
    ),

    thermal_properties=ThermalProperties(
        initial_k_factor_w_m_k=0.020,  # 0.019-0.022 W/m·K
        declared_lambda_thin_w_m_k=0.028,  # ≤80 mm
        declared_lambda_medium_w_m_k=0.027,  # 80-120 mm
        declared_lambda_thick_w_m_k=0.026,  # ≥120 mm
        gas_lambda_mw_m_k=10.7  # ecomate® blowing gas
    ),

    environmental_properties=EnvironmentalProperties(
        gwp_kg_co2_eq=0,  # Zero GWP - key benefit
        odp=0,  # Zero ODP
        pfas_free=True,
        biodegradable=True,
        aquatic_toxicity=False
    ),

    processing_conditions=ProcessingConditions(
        polyol_temp_min_c=25,
        polyol_temp_max_c=30,
        isocyanate_temp_min_c=25,
        isocyanate_temp_max_c=30,
        polyol_to_isocyanate_weight_ratio=100/110,
        polyol_to_isocyanate_volume_ratio=100/100,
        substrate_temp_min_c=5,
        substrate_temp_max_c=40,
        substrate_humidity_max_percent=20,
        layer_thickness_min_cm=1,
        layer_thickness_max_cm=2.5
    ),

    storage_conditions=StorageConditions(
        storage_temp_min_c=10,
        storage_temp_max_c=25,
        polyol_shelf_life_months=3,  # Shorter for low-viscosity spray grade
        isocyanate_shelf_life_months=6
    ),

    flow_index=0.88,  # Higher flow index (less shear thinning) for spray
    consistency_coefficient_pa_s=0.30,  # Much lower viscosity
    yield_stress_pa=0.5,  # Very low yield stress
    activation_energy_j_mol=24000,  # Similar to other systems

    # Kinetics parameters - VERY FAST system
    cure_kinetics=CureKineticsData(
        k1_ref=0.003,         # Very high for 3s cream time
        k2_ref=0.015,         # Very high for 10s gel time
        m=1.2,                # Higher autocatalytic effect
        n=1.3,
        activation_energy_k1=45000,   # Lower Ea for faster kinetics
        activation_energy_k2=40000,
        gel_conversion=0.60,  # Earlier gel for spray
    ),
    viscosity_conversion=ViscosityConversionData(
        A=1.8,                # Lower exponents for faster buildup
        B=3.0,
        max_processable_viscosity_pa_s=50.0,  # Lower limit for spray
        critical_conversion=0.40,
    ),
    thermal_reaction=ThermalReactionData(
        heat_of_reaction_j_kg=110000,  # Higher for ecomate system
        specific_heat_j_kg_k=1700,
        thermal_conductivity_w_m_k=0.18,
        scorch_temp_c=170.0,           # Lower threshold for spray
        degradation_temp_c=210.0,
    ),
    foam_kinetics=FoamKineticsData(
        rise_time_constant_s=5.0,      # Very fast rise
        skin_density_kg_m3=600.0,
        core_density_kg_m3=30.4,       # Low density spray foam
        skin_thickness_mm=1.5,
        surface_tension_n_m=0.022,
        supersaturation_pa=600000,     # Higher supersaturation
        target_cell_diameter_um=180,   # Smaller cells
        gas_thermal_conductivity_w_m_k=0.011,  # Ecomate low k
    ),

    fire_rating="UNI EN 13501-1:2019 Class E",
    notes="Spray foam with zero GWP. Ultra-low viscosity for spray application. Very fast reaction (3s cream time)."
)


ECOFOAM_XHD_RC = PolyurethaneMaterial(
    name="Ecofoam XHD RC",
    material_key="ecofoam_xhd_rc",
    blowing_agent=BlowingAgent.ECOMATE,

    polyol=ComponentProperties(
        viscosity_cps=850,  # 850 ± 50 cP - HIGH VISCOSITY
        specific_gravity=1.12
    ),

    isocyanate=ComponentProperties(
        viscosity_cps=200,  # 200 ± 20 cP
        specific_gravity=1.23
    ),

    reaction_characteristics=ReactionCharacteristics(
        cream_time_s=10,  # 8-12 s - moderate
        gel_time_s=30,  # 28-32 s average
        free_rise_density_kg_m3=42.5,  # 40.0-45.0 kg/m³ average
        reference_temp_c=25
    ),

    polymer_properties=PolymerProperties(
        molded_density_min_kg_m3=36,  # Estimated from index 100
        molded_density_max_kg_m3=52,
        compressive_strength_parallel_kpa=414,  # 60 psi - VERY HIGH
        compressive_strength_perpendicular_kpa=275,  # 40 psi - VERY HIGH
        dimensional_stability_cold_percent=0.5,  # <0.5% @ -25°C
        dimensional_stability_hot_percent=1.0,  # <1.0% @ 70°C
        closed_cell_content_percent=95  # >95% - VERY CLOSED
    ),

    thermal_properties=ThermalProperties(
        initial_k_factor_w_m_k=0.020,  # 0.019-0.022 W/m·K
        declared_lambda_thin_w_m_k=0.024,  # Excellent insulation (estimated)
        gas_lambda_mw_m_k=10.7
    ),

    environmental_properties=EnvironmentalProperties(
        gwp_kg_co2_eq=0,  # Zero GWP
        odp=0,  # Zero ODP
        pfas_free=True,
        biodegradable=True,
        aquatic_toxicity=False
    ),

    processing_conditions=ProcessingConditions(
        polyol_temp_min_c=22,
        polyol_temp_max_c=25,
        isocyanate_temp_min_c=22,
        isocyanate_temp_max_c=25,
        polyol_to_isocyanate_weight_ratio=100/110,
        mold_temp_min_c=35,
        mold_temp_max_c=45  # CRITICAL: Hot mold required
    ),

    storage_conditions=StorageConditions(
        storage_temp_min_c=10,
        storage_temp_max_c=25,
        polyol_shelf_life_months=6,
        isocyanate_shelf_life_months=6
    ),

    flow_index=0.80,  # Lower flow index (more shear thinning) due to high viscosity
    consistency_coefficient_pa_s=0.85,  # HIGH - similar to Genfoam
    yield_stress_pa=5.0,  # Higher yield stress
    activation_energy_j_mol=28000,  # Slightly higher for rigid foam

    # Kinetics parameters - Moderate speed, rigid cell
    cure_kinetics=CureKineticsData(
        k1_ref=0.0008,        # Calibrated for 10s cream time
        k2_ref=0.004,         # Calibrated for 30s gel time
        m=1.0,
        n=1.5,
        activation_energy_k1=52000,   # Higher Ea for rigid foam
        activation_energy_k2=48000,
        gel_conversion=0.68,  # Higher gel conversion for rigid
    ),
    viscosity_conversion=ViscosityConversionData(
        A=2.2,                # Higher exponents for rigid foam
        B=2.8,
        max_processable_viscosity_pa_s=150.0,  # Higher limit for molding
        critical_conversion=0.55,
    ),
    thermal_reaction=ThermalReactionData(
        heat_of_reaction_j_kg=105000,  # High exotherm
        specific_heat_j_kg_k=1750,
        thermal_conductivity_w_m_k=0.19,
        scorch_temp_c=175.0,
        degradation_temp_c=215.0,
    ),
    foam_kinetics=FoamKineticsData(
        rise_time_constant_s=15.0,     # Moderate rise
        skin_density_kg_m3=900.0,      # High skin density for structural
        core_density_kg_m3=42.5,
        skin_thickness_mm=3.0,         # Thicker skin
        surface_tension_n_m=0.024,
        supersaturation_pa=550000,
        target_cell_diameter_um=150,   # Small cells for good properties
        gas_thermal_conductivity_w_m_k=0.011,
    ),

    fire_rating="UNI EN 13501-1:2019 Class E",
    notes="High-density closed-cell foam with excellent insulation (RC = Rigid Cell). Zero GWP. Requires hot mold (35-45°C). High compressive strength for structural applications."
)


class MaterialDatabase:
    """Material database accessor"""

    MATERIALS = {
        'genfoam_hd12': GENFOAM_HD12,
        'genfoam_hd20': GENFOAM_HD20,
        'ecomate_spray': ECOMATE_SPRAY,
        'ecofoam_xhd_rc': ECOFOAM_XHD_RC,
    }

    @classmethod
    def get_material(cls, material_key: str) -> Optional[PolyurethaneMaterial]:
        """Get material by key"""
        return cls.MATERIALS.get(material_key)

    @classmethod
    def list_materials(cls) -> Dict[str, str]:
        """List all available materials"""
        return {key: mat.name for key, mat in cls.MATERIALS.items()}

    @classmethod
    def get_material_by_name(cls, name: str) -> Optional[PolyurethaneMaterial]:
        """Get material by display name"""
        for material in cls.MATERIALS.values():
            if material.name.lower() == name.lower():
                return material
        return None

    @classmethod
    def get_materials_by_blowing_agent(cls, blowing_agent: BlowingAgent) -> Dict[str, PolyurethaneMaterial]:
        """Get all materials using a specific blowing agent"""
        return {
            key: mat for key, mat in cls.MATERIALS.items()
            if mat.blowing_agent == blowing_agent
        }

    @classmethod
    def get_zero_gwp_materials(cls) -> Dict[str, PolyurethaneMaterial]:
        """Get all zero-GWP materials"""
        return {
            key: mat for key, mat in cls.MATERIALS.items()
            if mat.environmental_properties.gwp_kg_co2_eq == 0
        }

    @classmethod
    def compare_materials(cls, material_keys: list) -> Dict[str, Any]:
        """Compare properties of multiple materials"""
        comparison = {}
        for key in material_keys:
            mat = cls.get_material(key)
            if mat:
                comparison[key] = {
                    'name': mat.name,
                    'polyol_viscosity_cps': mat.polyol.viscosity_cps,
                    'isocyanate_viscosity_cps': mat.isocyanate.viscosity_cps,
                    'cream_time_s': mat.reaction_characteristics.cream_time_s,
                    'gel_time_s': mat.reaction_characteristics.gel_time_s,
                    'free_rise_density': mat.reaction_characteristics.free_rise_density_kg_m3,
                    'gwp': mat.environmental_properties.gwp_kg_co2_eq,
                    'flow_index': mat.flow_index,
                    'consistency_coeff': mat.consistency_coefficient_pa_s,
                }
        return comparison

    @classmethod
    def get_kinetics_parameters(cls, material_key: str) -> Optional[Dict[str, Any]]:
        """
        Get all kinetics parameters for a material.

        Returns dict with cure_kinetics, viscosity_conversion,
        thermal_reaction, and foam_kinetics data.
        """
        mat = cls.get_material(material_key)
        if not mat:
            return None

        result = {
            'material_key': material_key,
            'name': mat.name,
            'cream_time_s': mat.reaction_characteristics.cream_time_s,
            'gel_time_s': mat.reaction_characteristics.gel_time_s,
            'free_rise_density_kg_m3': mat.reaction_characteristics.free_rise_density_kg_m3,
            'reference_temp_c': mat.reaction_characteristics.reference_temp_c,
        }

        if mat.cure_kinetics:
            result['cure_kinetics'] = {
                'k1_ref': mat.cure_kinetics.k1_ref,
                'k2_ref': mat.cure_kinetics.k2_ref,
                'm': mat.cure_kinetics.m,
                'n': mat.cure_kinetics.n,
                'avrami_k': mat.cure_kinetics.avrami_k,
                'avrami_n': mat.cure_kinetics.avrami_n,
                'activation_energy_k1': mat.cure_kinetics.activation_energy_k1,
                'activation_energy_k2': mat.cure_kinetics.activation_energy_k2,
                'gel_conversion': mat.cure_kinetics.gel_conversion,
            }

        if mat.viscosity_conversion:
            result['viscosity_conversion'] = {
                'A': mat.viscosity_conversion.A,
                'B': mat.viscosity_conversion.B,
                'max_processable_viscosity_pa_s': mat.viscosity_conversion.max_processable_viscosity_pa_s,
                'critical_conversion': mat.viscosity_conversion.critical_conversion,
            }

        if mat.thermal_reaction:
            result['thermal_reaction'] = {
                'heat_of_reaction_j_kg': mat.thermal_reaction.heat_of_reaction_j_kg,
                'specific_heat_j_kg_k': mat.thermal_reaction.specific_heat_j_kg_k,
                'thermal_conductivity_w_m_k': mat.thermal_reaction.thermal_conductivity_w_m_k,
                'scorch_temp_c': mat.thermal_reaction.scorch_temp_c,
                'degradation_temp_c': mat.thermal_reaction.degradation_temp_c,
            }

        if mat.foam_kinetics:
            result['foam_kinetics'] = {
                'rise_time_constant_s': mat.foam_kinetics.rise_time_constant_s,
                'skin_density_kg_m3': mat.foam_kinetics.skin_density_kg_m3,
                'core_density_kg_m3': mat.foam_kinetics.core_density_kg_m3,
                'skin_thickness_mm': mat.foam_kinetics.skin_thickness_mm,
                'surface_tension_n_m': mat.foam_kinetics.surface_tension_n_m,
                'supersaturation_pa': mat.foam_kinetics.supersaturation_pa,
                'target_cell_diameter_um': mat.foam_kinetics.target_cell_diameter_um,
                'gas_thermal_conductivity_w_m_k': mat.foam_kinetics.gas_thermal_conductivity_w_m_k,
            }

        return result

    @classmethod
    def get_materials_with_kinetics(cls) -> Dict[str, str]:
        """Get all materials that have kinetics data defined"""
        return {
            key: mat.name for key, mat in cls.MATERIALS.items()
            if mat.cure_kinetics is not None
        }


# Convenience access
def get_material(material_key: str) -> Optional[PolyurethaneMaterial]:
    """Convenience function to get material"""
    return MaterialDatabase.get_material(material_key)


def list_materials() -> Dict[str, str]:
    """Convenience function to list materials"""
    return MaterialDatabase.list_materials()
