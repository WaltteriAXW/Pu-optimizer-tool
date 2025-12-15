"""
Test suite for report.py module
Demonstrates usage of report generation functionality
"""

import pytest
import json
import csv
from pathlib import Path
from tempfile import TemporaryDirectory

from report import ReportGenerator, SummaryReportBuilder, generate_report


# Sample data fixtures
@pytest.fixture
def sample_calculation_result():
    """Sample calculation result from CalculationProcessor"""
    return {
        "success": True,
        "errors": [],
        "warnings": [],
        "data": {
            "input": {
                "pipe_length_mm": 500,
                "pipe_diameter_mm": 12,
                "material_key": "ecofoam_standard",
                "temperature_c": 25,
                "flow_rate_lpm": 1.5,
                "machine_type": "high_pressure"
            },
            "flow": {
                "velocity_m_s": 0.22,
                "reynolds_number": 1250.5,
                "shear_rate_s_inv": 3680.0,
                "flow_regime": "transitional"
            },
            "pressure": {
                "required_pressure_bar": 85.5,
                "pressure_loss_bar": 78.3,
                "safety_factor": 1.1,
                "machine_pressure_setting": "high_pressure"
            },
            "thermal": {
                "temperature_rise_c": 8.5,
                "outlet_temperature_c": 33.5,
                "heat_generation_w": 450.0,
                "thermal_efficiency": 0.82
            },
            "environmental": {
                "ambient_temperature_c": 20,
                "pressure_drop_efficiency": 0.85,
                "energy_consumption_kwh": 0.12
            },
            "machine_compatibility": {
                "compatible": True,
                "pressure_within_range": True,
                "flow_rate_within_range": True,
                "messages": ["All parameters within safe operating range"]
            },
            "timestamp": "2025-12-15T10:30:00"
        }
    }


@pytest.fixture
def sample_optimization_result():
    """Sample optimization result from PressureOptimizer"""
    return {
        "success": True,
        "objective": "balanced",
        "required_pressure_bar": 85.5,
        "optimal_pressure_bar": 105.0,
        "machine_pressure_setting": "High Pressure (100-200 bar)",
        "shear_rate_optimal_s_inv": 4500.0,
        "apparent_viscosity_optimal_cp": 320.0,
        "temperature_rise_optimal_c": 8.5,
        "reynolds_number_optimal": 1500.0,
        "constraint_violations": [],
        "confidence_score": 0.92,
        "alternative_pressures": {
            "90.0": 0.85,
            "100.0": 0.95,
            "105.0": 0.98,
            "110.0": 0.94,
            "120.0": 0.80
        },
        "iterations": 45,
        "optimization_time_s": 1.23,
        "messages": [
            "Optimization converged successfully",
            "Pressure within machine capabilities",
            "Quality score maximized at 105 bar"
        ]
    }


@pytest.fixture
def sample_ml_predictions():
    """Sample predictions from ProcessOptimizerML"""
    return {
        "optimal_parameters": {
            "temperature_c": 28.5,
            "flow_rate_lpm": 1.8,
            "pressure_bar": 102.0
        },
        "quality_prediction": {
            "quality_score": 0.92,
            "probability_good_parts": 0.95,
            "probability_defects": 0.05
        },
        "defect_prediction": {
            "void_defects_probability": 0.02,
            "surface_defects_probability": 0.03,
            "flow_lines_probability": 0.01
        },
        "confidence": 0.88
    }


@pytest.fixture
def sample_model_evaluation():
    """Sample model evaluation results from ModelEvaluator"""
    return {
        "quality_classifier": {
            "model": "RandomForestClassifier",
            "model_type": "classifier",
            "metrics": {
                "accuracy": {
                    "test_mean": 0.9450,
                    "test_std": 0.0256,
                    "train_mean": 0.9820,
                    "overfitting": 0.0370
                },
                "precision": {
                    "test_mean": 0.9380,
                    "test_std": 0.0312,
                    "train_mean": 0.9850
                },
                "recall": {
                    "test_mean": 0.9520,
                    "test_std": 0.0189,
                    "train_mean": 0.9810
                },
                "f1": {
                    "test_mean": 0.9450,
                    "test_std": 0.0225,
                    "train_mean": 0.9830
                }
            }
        },
        "pressure_predictor": {
            "model": "GradientBoostingRegressor",
            "model_type": "regressor",
            "metrics": {
                "r2": {
                    "test_mean": 0.8950,
                    "test_std": 0.0412,
                    "train_mean": 0.9450
                },
                "mae": {
                    "test_mean": 4.25,
                    "test_std": 0.89,
                    "train_mean": 2.15
                },
                "mse": {
                    "test_mean": 25.50,
                    "test_std": 8.30,
                    "train_mean": 10.20
                }
            }
        }
    }


class TestReportGenerator:
    """Test ReportGenerator class"""

    def test_initialization(self):
        """Test report generator initialization"""
        with TemporaryDirectory() as tmpdir:
            gen = ReportGenerator(tmpdir)
            assert gen.output_dir == Path(tmpdir)
            assert gen.timestamp is not None

    def test_generate_calculation_report_json(self, sample_calculation_result):
        """Test generating calculation report in JSON format"""
        with TemporaryDirectory() as tmpdir:
            gen = ReportGenerator(tmpdir)
            result = gen.generate_calculation_report(
                sample_calculation_result,
                format="json",
                filename="test_calc"
            )

            assert result["success"] is True
            assert result["format"] == "json"
            assert Path(result["filepath"]).exists()

            # Verify JSON content
            with open(result["filepath"]) as f:
                data = json.load(f)
                assert data["type"] == "calculation"
                assert data["status"] == "success"

    def test_generate_calculation_report_csv(self, sample_calculation_result):
        """Test generating calculation report in CSV format"""
        with TemporaryDirectory() as tmpdir:
            gen = ReportGenerator(tmpdir)
            result = gen.generate_calculation_report(
                sample_calculation_result,
                format="csv",
                filename="test_calc"
            )

            assert result["success"] is True
            assert result["format"] == "csv"
            assert Path(result["filepath"]).exists()

    def test_generate_calculation_report_text(self, sample_calculation_result):
        """Test generating calculation report in text format"""
        with TemporaryDirectory() as tmpdir:
            gen = ReportGenerator(tmpdir)
            result = gen.generate_calculation_report(
                sample_calculation_result,
                format="text",
                filename="test_calc"
            )

            assert result["success"] is True
            assert result["format"] == "text"
            assert Path(result["filepath"]).exists()

            # Verify text content
            with open(result["filepath"]) as f:
                content = f.read()
                assert "POLYURETHANE INJECTION OPTIMIZER REPORT" in content
                assert "CALCULATION" in content

    def test_generate_optimization_report(self, sample_optimization_result):
        """Test generating optimization report"""
        with TemporaryDirectory() as tmpdir:
            gen = ReportGenerator(tmpdir)
            result = gen.generate_optimization_report(
                sample_optimization_result,
                format="json"
            )

            assert result["success"] is True
            assert Path(result["filepath"]).exists()

    def test_generate_ml_predictions_report(self, sample_ml_predictions):
        """Test generating ML predictions report"""
        with TemporaryDirectory() as tmpdir:
            gen = ReportGenerator(tmpdir)
            result = gen.generate_ml_prediction_report(
                sample_ml_predictions,
                format="json"
            )

            assert result["success"] is True
            assert Path(result["filepath"]).exists()

    def test_generate_model_evaluation_report(self, sample_model_evaluation):
        """Test generating model evaluation report"""
        with TemporaryDirectory() as tmpdir:
            gen = ReportGenerator(tmpdir)
            result = gen.generate_model_evaluation_report(
                sample_model_evaluation,
                format="json"
            )

            assert result["success"] is True
            assert Path(result["filepath"]).exists()

    def test_generate_batch_report(self, sample_calculation_result):
        """Test generating batch report"""
        with TemporaryDirectory() as tmpdir:
            gen = ReportGenerator(tmpdir)
            batch = [sample_calculation_result] * 3

            result = gen.generate_batch_report(
                batch,
                report_type="calculations",
                format="csv"
            )

            assert result["success"] is True
            assert result["count"] == 3
            assert Path(result["filepath"]).exists()

    def test_failed_calculation_report(self):
        """Test report generation from failed calculation"""
        failed_result = {
            "success": False,
            "errors": ["Invalid parameters"],
            "warnings": [],
            "data": None
        }

        with TemporaryDirectory() as tmpdir:
            gen = ReportGenerator(tmpdir)
            result = gen.generate_calculation_report(failed_result)

            assert result["success"] is False
            assert "error" in result

    def test_invalid_format(self, sample_calculation_result):
        """Test handling of invalid format"""
        with TemporaryDirectory() as tmpdir:
            gen = ReportGenerator(tmpdir)
            result = gen.generate_calculation_report(
                sample_calculation_result,
                format="invalid_format"
            )

            assert result["success"] is False


class TestSummaryReportBuilder:
    """Test SummaryReportBuilder class"""

    def test_add_result(self, sample_calculation_result):
        """Test adding results to summary"""
        builder = SummaryReportBuilder()
        builder.add_result(sample_calculation_result, "Test 1")

        assert len(builder.results) == 1
        assert builder.results[0]["label"] == "Test 1"

    def test_generate_summary(self, sample_calculation_result):
        """Test generating summary from multiple results"""
        builder = SummaryReportBuilder()
        builder.add_result(sample_calculation_result, "Test 1")
        builder.add_result(sample_calculation_result, "Test 2")

        summary = builder.generate_summary()

        assert summary["total_results"] == 2
        assert "statistics" in summary

    def test_compute_statistics(self, sample_calculation_result):
        """Test statistics computation"""
        builder = SummaryReportBuilder()

        # Add multiple variations
        result1 = sample_calculation_result.copy()
        result2 = sample_calculation_result.copy()

        builder.add_result(result1)
        builder.add_result(result2)

        summary = builder.generate_summary()

        assert len(summary["results"]) == 2
        assert "statistics" in summary


class TestConvenienceFunctions:
    """Test convenience functions"""

    def test_generate_report_calculation(self, sample_calculation_result):
        """Test generate_report function for calculations"""
        with TemporaryDirectory() as tmpdir:
            result = generate_report(
                sample_calculation_result,
                report_type="calculation",
                format="json",
                output_dir=tmpdir
            )

            assert result["success"] is True

    def test_generate_report_optimization(self, sample_optimization_result):
        """Test generate_report function for optimization"""
        with TemporaryDirectory() as tmpdir:
            result = generate_report(
                sample_optimization_result,
                report_type="optimization",
                format="json",
                output_dir=tmpdir
            )

            assert result["success"] is True

    def test_generate_report_invalid_type(self, sample_calculation_result):
        """Test generate_report with invalid type"""
        with TemporaryDirectory() as tmpdir:
            result = generate_report(
                sample_calculation_result,
                report_type="invalid",
                output_dir=tmpdir
            )

            assert result["success"] is False


# Integration tests
class TestReportIntegration:
    """Integration tests with realistic scenarios"""

    def test_full_workflow(
        self,
        sample_calculation_result,
        sample_optimization_result,
        sample_ml_predictions
    ):
        """Test complete workflow: calculation -> optimization -> ML -> reports"""
        with TemporaryDirectory() as tmpdir:
            gen = ReportGenerator(tmpdir)

            # Generate calculation report
            calc_report = gen.generate_calculation_report(
                sample_calculation_result,
                format="json"
            )
            assert calc_report["success"]

            # Generate optimization report with context
            opt_report = gen.generate_optimization_report(
                sample_optimization_result,
                calculation_result=sample_calculation_result,
                format="json"
            )
            assert opt_report["success"]

            # Generate ML report
            ml_report = gen.generate_ml_prediction_report(
                sample_ml_predictions,
                format="json"
            )
            assert ml_report["success"]

            # All reports should be created
            assert len(list(Path(tmpdir).glob("*.json"))) >= 3

    def test_export_multiple_formats(self, sample_calculation_result):
        """Test exporting same data in multiple formats"""
        with TemporaryDirectory() as tmpdir:
            gen = ReportGenerator(tmpdir)

            formats = ["json", "csv", "text"]
            results = []

            for fmt in formats:
                result = gen.generate_calculation_report(
                    sample_calculation_result,
                    format=fmt,
                    filename=f"test_{fmt}"
                )
                results.append(result)
                assert result["success"]
                assert Path(result["filepath"]).exists()

            # Verify all formats created
            files = list(Path(tmpdir).glob("*"))
            assert len(files) >= 3


# Usage examples for documentation
def example_basic_usage():
    """Example: Basic report generation"""
    from report import ReportGenerator

    # Create generator
    gen = ReportGenerator(output_dir="./reports")

    # Sample calculation result
    calc_result = {
        "success": True,
        "data": {
            "input": {"pipe_length_mm": 500, "temperature_c": 25},
            "pressure": {"required_pressure_bar": 85.5},
            "thermal": {"temperature_rise_c": 8.5}
        }
    }

    # Generate reports in multiple formats
    json_report = gen.generate_calculation_report(calc_result, format="json")
    csv_report = gen.generate_calculation_report(calc_result, format="csv")
    text_report = gen.generate_calculation_report(calc_result, format="text")

    print(f"JSON: {json_report['filepath']}")
    print(f"CSV: {csv_report['filepath']}")
    print(f"Text: {text_report['filepath']}")


def example_batch_processing():
    """Example: Batch report generation"""
    from report import ReportGenerator

    gen = ReportGenerator(output_dir="./reports")

    # Multiple calculation results
    results = [
        {"success": True, "data": {...}},
        {"success": True, "data": {...}},
        {"success": True, "data": {...}}
    ]

    # Generate batch report
    batch_report = gen.generate_batch_report(
        results,
        report_type="calculations",
        format="csv"
    )

    print(f"Batch report: {batch_report['filepath']}")


def example_summary_builder():
    """Example: Summary report from multiple results"""
    from report import SummaryReportBuilder

    builder = SummaryReportBuilder()

    # Add multiple results with labels
    builder.add_result(result1, "Configuration A")
    builder.add_result(result2, "Configuration B")
    builder.add_result(result3, "Configuration C")

    # Generate summary with statistics
    summary = builder.generate_summary()

    print(f"Total results: {summary['total_results']}")
    print(f"Statistics: {summary['statistics']}")


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])
