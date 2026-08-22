"""
Core Calculation Engine for Polyurethane Injection Optimizer

Provides all core physics calculations and optimization:
- core.kinetics - Reaction kinetics and cure modeling
- core.machines - Machine specifications and compatibility
- core.modules - Core physics calculations (pressure, flow, thermal, environmental)
- core.optimizers - Optimization algorithms (pressure, inverse)
- core.processors - Main calculation orchestrator
- core.thermodynamics - Advanced heat transfer modeling
- core.rheology - Non-Newtonian fluid modeling
- core.validation - Input validation workflows
- core.data - Material and machine databases

Main entry point: CalculationProcessor
"""

from .processors import CalculationProcessor

__all__ = [
    'CalculationProcessor',
]
