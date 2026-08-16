"""
Application Layer - Main interfaces for Polyurethane Injection Optimizer

Provides user-facing interfaces for:
- calculator: Main calculation engine interface
- optimizer: ML-based optimization module
- reporter: Report generation and export functionality
"""

from .calculator import (
    PolyurethaneCalculator,
    ValidationError,
    calculate_environmental_impact,
    MACHINE_SPECS,
    MATERIAL_PRESETS,
)

from .optimizer import (
    ProcessOptimizerML,
    get_ml_predictions,
)

from .reporter import (
    ReportGenerator,
    SummaryReportBuilder,
    generate_report,
)

__all__ = [
    # Calculator
    'PolyurethaneCalculator',
    'ValidationError',
    'calculate_environmental_impact',
    'MACHINE_SPECS',
    'MATERIAL_PRESETS',

    # Optimizer
    'ProcessOptimizerML',
    'get_ml_predictions',

    # Reporter
    'ReportGenerator',
    'SummaryReportBuilder',
    'generate_report',
]
