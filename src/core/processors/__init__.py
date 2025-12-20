"""
Calculation Processor Module

Main orchestrator for polyurethane injection calculations.
All calculations flow through CalculationProcessor as the single source of truth.

Features:
- Coordinates all core physics modules
- Handles optional kinetics extensions (Phase 4)
- Provides caching for performance
- Integrates with ML models
"""

from .calculation_processor import CalculationProcessor

__all__ = [
    'CalculationProcessor',
]
