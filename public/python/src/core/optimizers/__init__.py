"""
Optimization modules for polyurethane process optimization.

- pressure_optimizer: Pressure-based optimization using scipy
- inverse_optimization: Inverse problem solving to find optimal process parameters
"""

from .pressure_optimizer import (
    PressureOptimizationObjective,
    OptimizationResult as PressureOptimizationResult,
    PressureOptimizer,
)

from .inverse_optimization import (
    OptimizationObjective,
    ParameterBounds,
    TargetSpecification,
    OptimizationResult as InverseOptimizationResult,
    InverseOptimizer,
    create_temperature_target_optimizer,
    create_pressure_target_optimizer,
    create_flow_target_optimizer,
)

__all__ = [
    # pressure_optimizer
    'PressureOptimizationObjective',
    'PressureOptimizationResult',
    'PressureOptimizer',
    # inverse_optimization
    'OptimizationObjective',
    'ParameterBounds',
    'TargetSpecification',
    'InverseOptimizationResult',
    'InverseOptimizer',
    'create_temperature_target_optimizer',
    'create_pressure_target_optimizer',
    'create_flow_target_optimizer',
]
