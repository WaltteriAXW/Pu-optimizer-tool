"""
Viscosity models beyond the power law, for custom materials with a measured flow curve.

- models: Carreau, Cross and Herschel-Bulkley flow curves, shifted with temperature
- pipe_flow: the exact laminar pipe solution (Rabinowitsch-Mooney) for any of them
"""

from .models import MODELS, RheologyModel, build_model
from .pipe_flow import solve_pipe_flow

__all__ = ['MODELS', 'RheologyModel', 'build_model', 'solve_pipe_flow']
