"""
Example script demonstrating production logging and ML model retraining
This shows how to use the logging functions for continuous ML improvement
"""

from polyurethane_calculator import PolyurethaneCalculator, MATERIAL_PRESETS
from process_optimizer_ml import ml_optimizer, initialize_ml_models
import numpy as np

def example_basic_logging():
    """Example 1: Basic production run logging"""
    print("=" * 60)
    print("EXAMPLE 1: Basic Production Run Logging")
    print("=" * 60)

    # Create calculator
    calculator = PolyurethaneCalculator("ecofoam_standard")

    # Run calculation
    parameters = {
        "pipe_length": 500,
        "pipe_diameter": 12,
        "temperature": 25,
        "flow_rate": 30,
        "viscosity": 350,
        "density": 1120
    }

    results = calculator.calculate(
        pipe_length=parameters["pipe_length"],
        pipe_diameter=parameters["pipe_diameter"],
        temperature=parameters["temperature"],
        flow_rate_lpm=parameters["flow_rate"],
        viscosity=parameters["viscosity"],
        density=parameters["density"],
        machine_type="low_pressure"
    )

    # Log the production run
    log_result = calculator.log_production_run(
        parameters=parameters,
        results=results,
        quality_status="good",
        quality_notes="Perfect part, no defects observed",
        machine_type="low_pressure",
        material_preset="ecofoam_standard"
    )

    print(f"\nLogged to: {log_result['log_file']}")
    print(f"Total entries: {log_result['total_entries']}")


def example_quality_issue_logging():
    """Example 2: Logging quality issues"""
    print("\n" + "=" * 60)
    print("EXAMPLE 2: Quality Issue Logging")
    print("=" * 60)

    calculator = PolyurethaneCalculator("ecofoam_xhd")

    # Parameters that caused an issue
    problem_parameters = {
        "pipe_length": 1000,
        "pipe_diameter": 8,
        "temperature": 15,  # Too cold
        "flow_rate": 80,    # Too fast
        "viscosity": 850,
        "density": 1120
    }

    # Log the quality issue
    issue_result = calculator.log_quality_issue(
        issue_type="surface_defect",
        description="Surface roughness observed, likely due to low temperature and high flow rate",
        parameters=problem_parameters,
        severity="medium"
    )

    print(f"\nIssue logged to: {issue_result['log_file']}")
    print(f"Total issues: {issue_result['total_issues']}")


def example_ml_logging_and_training():
    """Example 3: ML training data logging and model retraining"""
    print("\n" + "=" * 60)
    print("EXAMPLE 3: ML Training Data Logging")
    print("=" * 60)

    # Initialize ML models
    print("\nInitializing ML models...")
    initialize_ml_models()

    # Simulate several production runs with actual quality outcomes
    print("\nSimulating production runs with quality outcomes...")

    production_runs = [
        {
            "params": {"pipe_length": 500, "pipe_diameter": 12, "temperature": 25, "flow_rate": 30,
                      "viscosity": 350, "density": 1120, "flow_index": 0.85, "activation_energy": 25000},
            "outcome": "good",
            "defects": {}
        },
        {
            "params": {"pipe_length": 800, "pipe_diameter": 10, "temperature": 28, "flow_rate": 40,
                      "viscosity": 350, "density": 1120, "flow_index": 0.85, "activation_energy": 25000},
            "outcome": "good",
            "defects": {}
        },
        {
            "params": {"pipe_length": 1200, "pipe_diameter": 8, "temperature": 15, "flow_rate": 70,
                      "viscosity": 850, "density": 1120, "flow_index": 0.82, "activation_energy": 28000},
            "outcome": "defective",
            "defects": {"surface_defects": True, "voids": True}
        },
        {
            "params": {"pipe_length": 600, "pipe_diameter": 15, "temperature": 32, "flow_rate": 50,
                      "viscosity": 350, "density": 1120, "flow_index": 0.85, "activation_energy": 25000},
            "outcome": "acceptable",
            "defects": {}
        },
        {
            "params": {"pipe_length": 900, "pipe_diameter": 10, "temperature": 45, "flow_rate": 90,
                      "viscosity": 350, "density": 1120, "flow_index": 0.85, "activation_energy": 25000},
            "outcome": "defective",
            "defects": {"flash": True}
        },
    ]

    calculator = PolyurethaneCalculator()

    for i, run in enumerate(production_runs, 1):
        params = run["params"]

        # Calculate results
        results = calculator.calculate(
            pipe_length=params["pipe_length"],
            pipe_diameter=params["pipe_diameter"],
            temperature=params["temperature"],
            flow_rate_lpm=params["flow_rate"],
            viscosity=params["viscosity"],
            density=params["density"]
        )

        # Log to ML training data
        log_result = ml_optimizer.log_production_data(
            parameters=params,
            results=results,
            actual_quality_outcome=run["outcome"],
            actual_defects=run["defects"],
            notes=f"Simulated production run {i}"
        )

        print(f"  Run {i}: {run['outcome']} - Labeled entries: {log_result['labeled_entries']}")


def example_production_statistics():
    """Example 4: Getting production statistics"""
    print("\n" + "=" * 60)
    print("EXAMPLE 4: Production Statistics")
    print("=" * 60)

    calculator = PolyurethaneCalculator()
    stats = calculator.get_production_statistics()

    if stats.get("total_runs", 0) > 0:
        print(f"\nTotal production runs: {stats['total_runs']}")
        print(f"Success rate: {stats['success_rate']}%")
        print(f"Runs with warnings: {stats['runs_with_warnings']}")
        print(f"\nQuality distribution:")
        for quality, count in stats['quality_distribution'].items():
            print(f"  {quality}: {count}")
        print(f"\nAverages:")
        print(f"  Pressure: {stats['averages']['pressure_bar']} bar")
        print(f"  Temperature: {stats['averages']['temperature_c']} °C")
        print(f"  Reynolds: {stats['averages']['reynolds_number']}")
    else:
        print("\nNo production data logged yet")


def example_ml_training_statistics():
    """Example 5: ML training statistics"""
    print("\n" + "=" * 60)
    print("EXAMPLE 5: ML Training Data Statistics")
    print("=" * 60)

    stats = ml_optimizer.get_training_statistics()

    print(f"\nTotal training entries: {stats['total_entries']}")
    print(f"Labeled entries: {stats['labeled_entries']}")
    print(f"Ready for retraining: {stats['ready_for_training']}")

    if stats.get('quality_distribution'):
        print(f"\nQuality distribution:")
        for quality, count in stats['quality_distribution'].items():
            print(f"  {quality}: {count}")

    if stats.get('defect_counts'):
        print(f"\nDefect occurrences:")
        for defect, count in stats['defect_counts'].items():
            print(f"  {defect}: {count}")


def example_model_retraining():
    """Example 6: Retraining ML models with production data"""
    print("\n" + "=" * 60)
    print("EXAMPLE 6: Model Retraining (requires 50+ labeled samples)")
    print("=" * 60)

    # Check if we have enough data
    stats = ml_optimizer.get_training_statistics()

    if stats['labeled_entries'] >= 50:
        print(f"\nRetraining models with {stats['labeled_entries']} labeled samples...")

        result = ml_optimizer.retrain_with_production_data(
            combine_with_synthetic=True,
            min_labeled_samples=50
        )

        if result['success']:
            print(f"\n✓ Retraining successful!")
            print(f"  Production samples: {result['production_samples']}")
            print(f"  Synthetic samples: {result['synthetic_samples']}")
            print(f"  Total samples: {result['total_samples']}")
            print(f"  Quality accuracy: {result['metrics']['quality_accuracy']*100:.1f}%")
        else:
            print(f"\n✗ Retraining failed: {result['message']}")
    else:
        print(f"\nNot enough labeled data yet ({stats['labeled_entries']}/50)")
        print("Log more production runs with actual quality outcomes to enable retraining")


def example_save_load_models():
    """Example 7: Saving and loading trained models"""
    print("\n" + "=" * 60)
    print("EXAMPLE 7: Saving and Loading Models")
    print("=" * 60)

    if ml_optimizer.is_trained:
        # Save models
        save_result = ml_optimizer.save_models("my_trained_models.pkl")

        if save_result['success']:
            print(f"\n✓ Models saved successfully")
            print(f"  File: {save_result['model_file']}")
            print(f"  Size: {save_result['file_size_kb']} KB")

            # Later, you can load them back
            load_result = ml_optimizer.load_models("my_trained_models.pkl")

            if load_result['success']:
                print(f"\n✓ Models loaded successfully")
                print(f"  Training data size: {load_result['training_data_size']}")
    else:
        print("\nModels not trained yet. Run initialize_ml_models() first.")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("PRODUCTION LOGGING & ML RETRAINING EXAMPLES")
    print("=" * 60)

    # Run all examples
    example_basic_logging()
    example_quality_issue_logging()
    example_ml_logging_and_training()
    example_production_statistics()
    example_ml_training_statistics()
    example_model_retraining()
    example_save_load_models()

    print("\n" + "=" * 60)
    print("EXAMPLES COMPLETED")
    print("=" * 60)
    print("\nCheck the 'logs' and 'models' directories for generated files:")
    print("  - logs/production_log.json: Production run data")
    print("  - logs/quality_issues.json: Quality issues and defects")
    print("  - logs/ml_training_data.json: ML training data with labels")
    print("  - models/*.pkl: Saved ML models")
