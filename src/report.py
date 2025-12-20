"""
Backward compatibility wrapper for report

This module has been moved to src/app/reporter.py
This file is kept for backward compatibility.

Import from app.reporter instead:
    from app.reporter import ReportGenerator
"""

# Re-export everything from the new location
from app.reporter import *  # noqa: F401, F403

__all__ = [
    'ReportGenerator',
    'SummaryReportBuilder',
    'generate_report',
]
