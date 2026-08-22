"""
Application Layer - Main interfaces for Polyurethane Injection Optimizer

Provides user-facing interfaces for:
- reporter: Report generation and export functionality

Calculations themselves live in src/core/processors/calculation_processor.py, which is
what the application calls.

The ML optimizer that used to sit here was removed: it trained gradient-boosting models on
data it generated from these same physics equations, in memory, discarding them at the end
of each call, and nothing in the application ever imported it. A model fitted to the output
of the physics can only reproduce the physics.
"""

from .reporter import (
    ReportGenerator,
    SummaryReportBuilder,
    generate_report,
)

__all__ = [
    'ReportGenerator',
    'SummaryReportBuilder',
    'generate_report',
]
