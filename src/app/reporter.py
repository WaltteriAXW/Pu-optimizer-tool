"""
Report Generation Module for Polyurethane Injection Optimizer
Generates comprehensive reports in multiple formats (JSON, CSV, Text/Markdown)
from calculation results, optimization outputs, and ML evaluations.
"""

import json
import csv
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Union
from dataclasses import asdict, is_dataclass
import logging

logger = logging.getLogger(__name__)


class ReportGenerator:
    """
    Main report generator for polyurethane injection calculations.
    Handles multiple output formats and report types.
    """

    def __init__(self, output_dir: Optional[str] = None):
        """
        Initialize report generator.

        Args:
            output_dir: Directory for saving reports. Defaults to current directory.
        """
        self.output_dir = Path(output_dir) if output_dir else Path.cwd()
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    def generate_calculation_report(
        self,
        calculation_result: Dict[str, Any],
        format: str = "json",
        filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate report from CalculationProcessor output.

        Args:
            calculation_result: Output from CalculationProcessor.calculate_all()
            format: Output format ("json", "csv", "text", "html")
            filename: Optional custom filename (without extension)

        Returns:
            Dict with report metadata and path
        """
        if not calculation_result.get("success"):
            logger.error(f"Cannot generate report from failed calculation")
            return {
                "success": False,
                "error": "Calculation failed",
                "errors": calculation_result.get("errors", [])
            }

        report_data = {
            "type": "calculation",
            "timestamp": datetime.now().isoformat(),
            "status": "success",
            "calculation": calculation_result
        }

        return self._save_report(report_data, format, filename or "calculation_report")

    def generate_optimization_report(
        self,
        optimization_result: Dict[str, Any],
        calculation_result: Optional[Dict[str, Any]] = None,
        format: str = "json",
        filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate report from PressureOptimizer output.

        Args:
            optimization_result: Output from PressureOptimizer
            calculation_result: Optional CalculationProcessor output for context
            format: Output format ("json", "csv", "text", "html")
            filename: Optional custom filename

        Returns:
            Dict with report metadata and path
        """
        report_data = {
            "type": "optimization",
            "timestamp": datetime.now().isoformat(),
            "optimization": self._serialize_result(optimization_result),
        }

        if calculation_result:
            report_data["context"] = calculation_result

        return self._save_report(report_data, format, filename or "optimization_report")

    def generate_ml_prediction_report(
        self,
        predictions: Dict[str, Any],
        input_parameters: Optional[Dict[str, Any]] = None,
        format: str = "json",
        filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate report from ProcessOptimizerML predictions.

        Args:
            predictions: ML model predictions
            input_parameters: Optional input parameters for context
            format: Output format
            filename: Optional custom filename

        Returns:
            Dict with report metadata and path
        """
        report_data = {
            "type": "ml_predictions",
            "timestamp": datetime.now().isoformat(),
            "predictions": predictions,
        }

        if input_parameters:
            report_data["input_parameters"] = input_parameters

        return self._save_report(report_data, format, filename or "ml_predictions_report")

    def generate_model_evaluation_report(
        self,
        evaluation_results: Dict[str, Any],
        model_names: Optional[List[str]] = None,
        format: str = "json",
        filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate report from ModelEvaluator output.

        Args:
            evaluation_results: Dict of model evaluation results
            model_names: Optional list of model names
            format: Output format
            filename: Optional custom filename

        Returns:
            Dict with report metadata and path
        """
        report_data = {
            "type": "model_evaluation",
            "timestamp": datetime.now().isoformat(),
            "models": evaluation_results,
        }

        if model_names:
            report_data["model_names"] = model_names

        return self._save_report(report_data, format, filename or "model_evaluation_report")

    def generate_batch_report(
        self,
        batch_results: List[Dict[str, Any]],
        report_type: str = "calculations",
        format: str = "csv",
        filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate batch report from multiple calculation runs.

        Args:
            batch_results: List of calculation results
            report_type: Type of batch report
            format: Output format (typically "csv" for batch)
            filename: Optional custom filename

        Returns:
            Dict with report metadata and path
        """
        if format == "csv":
            return self._generate_batch_csv(batch_results, report_type, filename)
        else:
            report_data = {
                "type": f"batch_{report_type}",
                "timestamp": datetime.now().isoformat(),
                "count": len(batch_results),
                "results": batch_results
            }
            return self._save_report(report_data, format, filename or f"batch_{report_type}_report")

    def _generate_batch_csv(
        self,
        batch_results: List[Dict[str, Any]],
        report_type: str,
        filename: Optional[str]
    ) -> Dict[str, Any]:
        """Generate batch report in CSV format."""
        if not batch_results:
            return {"success": False, "error": "No results to export"}

        # Extract relevant rows from each result
        rows = []
        for result in batch_results:
            if result.get("success") and result.get("data"):
                row = self._flatten_result(result)
                rows.append(row)

        if not rows:
            return {"success": False, "error": "No valid results to export"}

        # Write CSV
        filename = filename or f"batch_{report_type}_report"
        filepath = self.output_dir / f"{filename}_{self.timestamp}.csv"

        try:
            with open(filepath, "w", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=rows[0].keys())
                writer.writeheader()
                writer.writerows(rows)

            logger.info(f"Batch report saved to {filepath}")
            return {
                "success": True,
                "filepath": str(filepath),
                "count": len(rows),
                "format": "csv"
            }
        except Exception as e:
            logger.error(f"Failed to generate batch CSV: {e}")
            return {"success": False, "error": str(e)}

    def _save_report(
        self,
        report_data: Dict[str, Any],
        format: str,
        filename: str
    ) -> Dict[str, Any]:
        """Save report in specified format."""
        try:
            if format == "json":
                return self._save_json(report_data, filename)
            elif format == "csv":
                return self._save_csv(report_data, filename)
            elif format in ("text", "md", "markdown"):
                return self._save_text(report_data, filename)
            else:
                return {"success": False, "error": f"Unsupported format: {format}"}
        except Exception as e:
            logger.error(f"Failed to save report: {e}")
            return {"success": False, "error": str(e)}

    def _save_json(self, report_data: Dict[str, Any], filename: str) -> Dict[str, Any]:
        """Save report as JSON."""
        filepath = self.output_dir / f"{filename}_{self.timestamp}.json"

        with open(filepath, "w") as f:
            json.dump(report_data, f, indent=2, default=self._json_serializer)

        logger.info(f"JSON report saved to {filepath}")
        return {
            "success": True,
            "filepath": str(filepath),
            "format": "json",
            "timestamp": self.timestamp
        }

    def _save_csv(self, report_data: Dict[str, Any], filename: str) -> Dict[str, Any]:
        """Save report as CSV (flattens data structure)."""
        filepath = self.output_dir / f"{filename}_{self.timestamp}.csv"

        # Flatten the report data
        flat_data = self._flatten_result(report_data)

        try:
            with open(filepath, "w", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=flat_data.keys())
                writer.writeheader()
                writer.writerow(flat_data)

            logger.info(f"CSV report saved to {filepath}")
            return {
                "success": True,
                "filepath": str(filepath),
                "format": "csv",
                "timestamp": self.timestamp
            }
        except Exception as e:
            logger.error(f"Failed to save CSV report: {e}")
            return {"success": False, "error": str(e)}

    def _save_text(self, report_data: Dict[str, Any], filename: str) -> Dict[str, Any]:
        """Save report as human-readable text/markdown."""
        filepath = self.output_dir / f"{filename}_{self.timestamp}.txt"

        text_content = self._format_text_report(report_data)

        with open(filepath, "w") as f:
            f.write(text_content)

        logger.info(f"Text report saved to {filepath}")
        return {
            "success": True,
            "filepath": str(filepath),
            "format": "text",
            "timestamp": self.timestamp
        }

    def _format_text_report(self, report_data: Dict[str, Any]) -> str:
        """Format report data as human-readable text."""
        lines = []
        lines.append("=" * 80)
        lines.append(f"POLYURETHANE INJECTION OPTIMIZER REPORT")
        lines.append("=" * 80)
        lines.append("")

        report_type = report_data.get("type", "unknown")
        timestamp = report_data.get("timestamp", "")
        lines.append(f"Report Type: {report_type.upper().replace('_', ' ')}")
        lines.append(f"Generated: {timestamp}")
        lines.append("")

        # Format based on report type
        if report_type == "calculation":
            lines.extend(self._format_calculation_text(report_data.get("calculation", {})))
        elif report_type == "optimization":
            lines.extend(self._format_optimization_text(report_data.get("optimization", {})))
        elif report_type == "ml_predictions":
            lines.extend(self._format_ml_text(report_data.get("predictions", {})))
        elif report_type == "model_evaluation":
            lines.extend(self._format_evaluation_text(report_data.get("models", {})))

        lines.append("")
        lines.append("=" * 80)
        return "\n".join(lines)

    def _format_calculation_text(self, calc_data: Dict[str, Any]) -> List[str]:
        """Format calculation results as text."""
        lines = []

        data = calc_data.get("data", {})
        if not data:
            return lines

        # Input parameters
        lines.append("\n--- INPUT PARAMETERS ---")
        input_params = data.get("input", {})
        for key, value in input_params.items():
            lines.append(f"  {key}: {value}")

        # Flow results
        lines.append("\n--- FLOW CALCULATIONS ---")
        flow = data.get("flow", {})
        for key, value in flow.items():
            if isinstance(value, (int, float)):
                lines.append(f"  {key}: {value:.4f}")
            else:
                lines.append(f"  {key}: {value}")

        # Pressure results
        lines.append("\n--- PRESSURE ANALYSIS ---")
        pressure = data.get("pressure", {})
        for key, value in pressure.items():
            if isinstance(value, (int, float)):
                lines.append(f"  {key}: {value:.4f}")
            else:
                lines.append(f"  {key}: {value}")

        # Thermal results
        lines.append("\n--- THERMAL ANALYSIS ---")
        thermal = data.get("thermal", {})
        for key, value in thermal.items():
            if isinstance(value, (int, float)):
                lines.append(f"  {key}: {value:.4f}")
            else:
                lines.append(f"  {key}: {value}")

        # Machine compatibility
        lines.append("\n--- MACHINE COMPATIBILITY ---")
        compatibility = data.get("machine_compatibility", {})
        for key, value in compatibility.items():
            lines.append(f"  {key}: {value}")

        return lines

    def _format_optimization_text(self, opt_data: Dict[str, Any]) -> List[str]:
        """Format optimization results as text."""
        lines = []

        lines.append("\n--- OPTIMIZATION RESULTS ---")
        for key, value in opt_data.items():
            if isinstance(value, (int, float)):
                lines.append(f"  {key}: {value:.4f}")
            elif isinstance(value, list):
                lines.append(f"  {key}:")
                for item in value:
                    lines.append(f"    - {item}")
            elif isinstance(value, dict):
                lines.append(f"  {key}:")
                for k, v in value.items():
                    lines.append(f"    {k}: {v}")
            else:
                lines.append(f"  {key}: {value}")

        return lines

    def _format_ml_text(self, predictions: Dict[str, Any]) -> List[str]:
        """Format ML predictions as text."""
        lines = []

        lines.append("\n--- ML PREDICTIONS ---")
        for key, value in predictions.items():
            if isinstance(value, dict):
                lines.append(f"  {key}:")
                for k, v in value.items():
                    if isinstance(v, (int, float)):
                        lines.append(f"    {k}: {v:.4f}")
                    else:
                        lines.append(f"    {k}: {v}")
            elif isinstance(value, (int, float)):
                lines.append(f"  {key}: {value:.4f}")
            else:
                lines.append(f"  {key}: {value}")

        return lines

    def _format_evaluation_text(self, models: Dict[str, Any]) -> List[str]:
        """Format model evaluation results as text."""
        lines = []

        for model_name, metrics in models.items():
            lines.append(f"\n--- {model_name.upper()} ---")
            if "error" in metrics:
                lines.append(f"  Error: {metrics['error']}")
            else:
                if "metrics" in metrics:
                    for metric_name, values in metrics["metrics"].items():
                        if isinstance(values, dict):
                            lines.append(f"  {metric_name}:")
                            for k, v in values.items():
                                if isinstance(v, (int, float)):
                                    lines.append(f"    {k}: {v:.4f}")
                                else:
                                    lines.append(f"    {k}: {v}")
                        else:
                            lines.append(f"  {metric_name}: {values}")

        return lines

    def _flatten_result(self, data: Dict[str, Any], parent_key: str = "", sep: str = "_") -> Dict[str, Any]:
        """
        Flatten nested dictionary for CSV export.

        Args:
            data: Nested dictionary
            parent_key: Parent key for recursion
            sep: Separator for key names

        Returns:
            Flattened dictionary
        """
        items = []

        for k, v in data.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k

            if isinstance(v, dict):
                items.extend(self._flatten_result(v, new_key, sep=sep).items())
            elif isinstance(v, (list, tuple)):
                items.append((new_key, str(v)))
            else:
                items.append((new_key, v))

        return dict(items)

    def _serialize_result(self, obj: Any) -> Any:
        """Serialize dataclass or other objects to JSON-compatible format."""
        if is_dataclass(obj):
            return asdict(obj)
        elif isinstance(obj, dict):
            return {k: self._serialize_result(v) for k, v in obj.items()}
        elif isinstance(obj, (list, tuple)):
            return [self._serialize_result(item) for item in obj]
        return obj

    @staticmethod
    def _json_serializer(obj: Any) -> Any:
        """Custom JSON serializer for non-standard types."""
        if is_dataclass(obj):
            return asdict(obj)
        elif hasattr(obj, "__dict__"):
            return obj.__dict__
        return str(obj)


class SummaryReportBuilder:
    """
    Builds summary reports comparing multiple results.
    Useful for batch operations and performance analysis.
    """

    def __init__(self):
        self.results = []

    def add_result(self, result: Dict[str, Any], label: Optional[str] = None) -> None:
        """Add a result to the summary."""
        self.results.append({
            "label": label or f"Result_{len(self.results) + 1}",
            "data": result,
            "timestamp": datetime.now().isoformat()
        })

    def generate_summary(self, output_dir: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate summary statistics across all results.

        Returns:
            Dict with summary statistics
        """
        if not self.results:
            return {"error": "No results to summarize"}

        summary = {
            "total_results": len(self.results),
            "timestamp": datetime.now().isoformat(),
            "results": self.results
        }

        # Generate statistics if we have numeric data
        summary["statistics"] = self._compute_statistics()

        return summary

    def _compute_statistics(self) -> Dict[str, Any]:
        """Compute statistics across results."""
        stats = {}

        # Extract numeric values from results
        all_values = {}

        for result in self.results:
            data = result.get("data", {})
            flat = self._flatten(data)

            for key, value in flat.items():
                if isinstance(value, (int, float)):
                    if key not in all_values:
                        all_values[key] = []
                    all_values[key].append(value)

        # Compute statistics
        for key, values in all_values.items():
            if len(values) > 1:
                stats[key] = {
                    "mean": sum(values) / len(values),
                    "min": min(values),
                    "max": max(values),
                    "count": len(values)
                }

        return stats

    @staticmethod
    def _flatten(d: Dict[str, Any], parent_key: str = "") -> Dict[str, Any]:
        """Flatten nested dictionary."""
        items = []
        for k, v in d.items():
            new_key = f"{parent_key}.{k}" if parent_key else k
            if isinstance(v, dict):
                items.extend(SummaryReportBuilder._flatten(v, new_key).items())
            else:
                items.append((new_key, v))
        return dict(items)


# Convenience functions
def generate_report(
    data: Dict[str, Any],
    report_type: str = "calculation",
    format: str = "json",
    output_dir: Optional[str] = None
) -> Dict[str, Any]:
    """
    Convenience function to generate a report.

    Args:
        data: Report data
        report_type: Type of report ("calculation", "optimization", "ml_predictions", "model_evaluation")
        format: Output format ("json", "csv", "text")
        output_dir: Output directory

    Returns:
        Report metadata
    """
    generator = ReportGenerator(output_dir)

    if report_type == "calculation":
        return generator.generate_calculation_report(data, format)
    elif report_type == "optimization":
        return generator.generate_optimization_report(data, format=format)
    elif report_type == "ml_predictions":
        return generator.generate_ml_prediction_report(data, format=format)
    elif report_type == "model_evaluation":
        return generator.generate_model_evaluation_report(data, format=format)
    else:
        return {"success": False, "error": f"Unknown report type: {report_type}"}
