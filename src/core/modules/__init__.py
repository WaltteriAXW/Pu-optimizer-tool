"""
Core calculation modules for polyurethane injection optimization.

Each module focuses on a single domain:
- pressure: Pressure drop and machine compatibility
- thermal: Temperature and viscosity effects
- flow: Flow properties and shear calculations
- environmental: Environmental impact assessment
"""

from . import pressure
from . import thermal
from . import flow
from . import environmental

__all__ = ['pressure', 'thermal', 'flow', 'environmental']
