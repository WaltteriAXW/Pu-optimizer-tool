"""
Polyurethane Reaction Kinetics Module

Implements reaction kinetics and cure modeling for polyurethane systems:

Phase 1 - Core Kinetics:
- Avrami equation for cure kinetics
- Kamal-Sourour model for autocatalytic cure
- Castro-Macosko viscosity-conversion coupling

Phase 2 - Thermal Reaction:
- Exotherm temperature rise calculation
- Lumped thermal model for mold heat transfer

Phase 3 - Foam-Specific Physics:
- Foam rise kinetics
- Density distribution (skin/core gradient)
- Cell size prediction (nucleation theory)

These models bridge the existing rheology and thermal modules with the
reactive nature of polyurethane, enabling time-dependent process simulation.
"""

from .reaction_kinetics import (
    CureKinetics,
    AvramiModel,
    KamalSourourModel,
    CureKineticsParameters,
    CureState,
    calculate_cure_state,
    calculate_gel_time,
    calculate_cream_time,
)

from .viscosity_conversion import (
    CastroMacoskoModel,
    ViscosityConversionParameters,
    calculate_reactive_viscosity,
    calculate_processing_window,
    estimate_fill_time_limit,
)

from .thermal_reaction import (
    ExothermModel,
    LumpedThermalModel,
    ThermalReactionParameters,
    ExothermResult,
    calculate_exotherm_rise,
    calculate_core_temperature,
    predict_scorch_risk,
)

from .foam_kinetics import (
    FoamRiseModel,
    DensityDistributionModel,
    CellNucleationModel,
    FoamKineticsParameters,
    FoamRiseResult,
    calculate_foam_rise,
    calculate_density_profile,
    predict_cell_size,
    calculate_mold_fill_time,
)

__all__ = [
    # Reaction Kinetics
    'CureKinetics',
    'AvramiModel',
    'KamalSourourModel',
    'CureKineticsParameters',
    'CureState',
    'calculate_cure_state',
    'calculate_gel_time',
    'calculate_cream_time',
    # Viscosity-Conversion
    'CastroMacoskoModel',
    'ViscosityConversionParameters',
    'calculate_reactive_viscosity',
    'calculate_processing_window',
    'estimate_fill_time_limit',
    # Thermal Reaction
    'ExothermModel',
    'LumpedThermalModel',
    'ThermalReactionParameters',
    'ExothermResult',
    'calculate_exotherm_rise',
    'calculate_core_temperature',
    'predict_scorch_risk',
    # Foam Kinetics
    'FoamRiseModel',
    'DensityDistributionModel',
    'CellNucleationModel',
    'FoamKineticsParameters',
    'FoamRiseResult',
    'calculate_foam_rise',
    'calculate_density_profile',
    'predict_cell_size',
    'calculate_mold_fill_time',
]
