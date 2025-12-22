"""
Machine Specifications Module

Defines machine types and specifications for polyurethane injection systems:
- High-Pressure (HP) Systems - 100-200 bar, 5-200+ kg/min
- Low-Pressure (LP) Systems - 8-20 bar, 2-300+ kg/min

Provides machine definitions, compatibility checking, and specifications.
"""

from .machine_definitions import (
    MachineType,
    PressureSpecification,
    FlowSpecification,
    TemperatureControl,
    PolyurethaneMachine,
    MachineDatabase,
)

__all__ = [
    'MachineType',
    'PressureSpecification',
    'FlowSpecification',
    'TemperatureControl',
    'PolyurethaneMachine',
    'MachineDatabase',
]
