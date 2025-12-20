"""
Application Layer - Main interfaces for Polyurethane Injection Optimizer

Provides user-facing interfaces for:
- calculator: Main calculation engine interface
- optimizer: ML-based optimization module
- reporter: Report generation and export functionality
"""

from .calculator import (
    calculate_all_parameters,
    get_material_list,
    get_machine_types,
    CalculationError,
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
    'calculate_all_parameters',
    'get_material_list',
    'get_machine_types',
    'CalculationError',

    # Optimizer
    'ProcessOptimizerML',
    'get_ml_predictions',

    # Reporter
    'ReportGenerator',
    'SummaryReportBuilder',
    'generate_report',
]
