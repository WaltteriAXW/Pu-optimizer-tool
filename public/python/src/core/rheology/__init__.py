"""
Rheology module for non-Newtonian fluid modeling.

- advanced_fluid_models: Power-law and Carreau-Yasuda viscosity models
"""

from .advanced_fluid_models import (
    RheologicalProperties,
    NonNewtonianFluidModel,
)

__all__ = [
    'RheologicalProperties',
    'NonNewtonianFluidModel',
]
