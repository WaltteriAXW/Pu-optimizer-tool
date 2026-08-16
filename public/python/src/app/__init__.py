"""
Application Layer - Main interfaces for Polyurethane Injection Optimizer

Provides user-facing interfaces for:
- optimizer: ML-based optimization module
- reporter: Report generation and export functionality

Calculations themselves live in src/core/processors/calculation_processor.py, which is
what the application calls.
"""

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
    # Optimizer
    'ProcessOptimizerML',
    'get_ml_predictions',

    # Reporter
    'ReportGenerator',
    'SummaryReportBuilder',
    'generate_report',
]
