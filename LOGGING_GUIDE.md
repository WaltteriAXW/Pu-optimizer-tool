# Production Logging & ML Training Guide

This guide explains how to use the production logging and ML retraining features added to the Pu-optimizer-tool.

## Overview

The logging system enables:
- **Production tracking**: Log every production run with parameters and results
- **Quality monitoring**: Track defects and quality issues
- **Continuous ML improvement**: Retrain models with real production data
- **Performance analysis**: Get statistics and insights from historical data

## Directory Structure

```
logs/
├── production_log.json       # Simple calculator production runs
├── quality_issues.json        # Tracked quality problems
└── ml_training_data.json      # ML training data with labels

models/
├── ml_models.pkl              # Base trained models
└── models_retrained_*.pkl     # Retrained models with timestamps
```

## Usage Examples

### 1. Basic Production Run Logging

```python
from polyurethane_calculator import PolyurethaneCalculator

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
    machine_type="cannon_std_legacy"
)

# Log the production run
log_result = calculator.log_production_run(
    parameters=parameters,
    results=results,
    quality_status="good",  # "good", "acceptable", "defective", "failed"
    quality_notes="Perfect part, no defects observed",
    machine_type="cannon_std_legacy",
    material_preset="ecofoam_standard"
)

print(f"Logged to: {log_result['log_file']}")
print(f"Total entries: {log_result['total_entries']}")
```

### 2. Logging Quality Issues

```python
# Log a specific quality issue
issue_result = calculator.log_quality_issue(
    issue_type="surface_defect",  # void, short_shot, flash, surface_defect
    description="Surface roughness due to low temperature",
    parameters=problem_parameters,
    severity="medium"  # low, medium, high, critical
)
```

### 3. ML Training Data Logging

```python
from process_optimizer_ml import ml_optimizer

# After a production run with known quality outcome
log_result = ml_optimizer.log_production_data(
    parameters=params,
    results=results,
    actual_quality_outcome="good",  # Actual outcome observed
    actual_defects={"voids": False, "flash": False},  # Actual defects
    notes="Production run #123"
)

# Check if ready for retraining
if log_result['ready_for_retraining']:
    print("Enough data for retraining!")
```

### 4. Model Retraining

```python
# Check training data statistics
stats = ml_optimizer.get_training_statistics()
print(f"Labeled samples: {stats['labeled_entries']}")
print(f"Ready: {stats['ready_for_training']}")

# Retrain when you have 50+ labeled samples
if stats['ready_for_training']:
    result = ml_optimizer.retrain_with_production_data(
        combine_with_synthetic=True,  # Mix with synthetic data
        min_labeled_samples=50
    )

    if result['success']:
        print(f"Retrained with {result['total_samples']} samples")
        print(f"Accuracy: {result['metrics']['quality_accuracy']*100:.1f}%")
```

### 5. Saving and Loading Models

```python
# Save trained models
save_result = ml_optimizer.save_models("my_models.pkl")

# Later, load them back
load_result = ml_optimizer.load_models("my_models.pkl")
```

### 6. Production Statistics

```python
# Get production performance stats
stats = calculator.get_production_statistics()

print(f"Total runs: {stats['total_runs']}")
print(f"Success rate: {stats['success_rate']}%")
print(f"Average pressure: {stats['averages']['pressure_bar']} bar")
```

## Workflow for Continuous Improvement

1. **Initial Setup**
   ```python
   from process_optimizer_ml import initialize_ml_models
   initialize_ml_models()  # Train with synthetic data
   ```

2. **During Production**
   - Log every production run
   - Record actual quality outcomes
   - Track any defects or issues

3. **Weekly/Monthly**
   - Review statistics
   - Analyze quality trends
   - Check training data readiness

4. **When Ready (50+ labeled samples)**
   - Retrain ML models
   - Compare performance
   - Deploy improved models

5. **Continuous**
   - Keep logging production data
   - Retrain periodically (monthly/quarterly)
   - Export reports for analysis

## Quality Status Codes

- **good**: Perfect part, no issues
- **acceptable**: Minor issues, part is usable
- **defective**: Significant issues, part may not be usable
- **failed**: Complete failure, part unusable

## Defect Types

- **voids**: Air bubbles or voids in the part
- **short_shot**: Incomplete filling of the mold
- **flash**: Material overflow/excess material
- **surface_defects**: Surface finish problems

## File Formats

All logs are stored as JSON files for easy parsing and analysis:

```json
{
  "timestamp": "2025-10-25T10:30:00",
  "quality_status": "good",
  "parameters": {
    "pipe_length": 500,
    "temperature": 25
  },
  "results": {
    "optimal_pressure_bar": 3.5,
    "reynolds_number": 1850
  }
}
```

## Best Practices

1. **Always log production runs** - Even successful ones provide valuable data
2. **Be specific in notes** - Detailed notes help with analysis
3. **Record actual outcomes** - Label data enables ML improvement
4. **Retrain regularly** - Monthly or quarterly retraining recommended
5. **Backup logs** - Keep backups of production and training logs
6. **Review statistics** - Weekly review helps identify trends
7. **Version models** - Save models with timestamps for rollback

## Troubleshooting

**Q: Logs not saving?**
- Check write permissions on `logs/` directory
- Verify disk space

**Q: Retraining fails?**
- Ensure you have at least 50 labeled samples
- Check that numpy and scikit-learn are installed

**Q: Statistics show 0 runs?**
- Check that you're using the correct log file path
- Verify logs exist in `logs/` directory

## Advanced: Exporting Data

```python
import json

# Read and analyze logs
with open('logs/production_log.json', 'r') as f:
    logs = json.load(f)

# Export to CSV for Excel analysis
import csv
with open('production_export.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=['timestamp', 'quality_status', 'pressure'])
    writer.writeheader()
    for log in logs:
        writer.writerow({
            'timestamp': log['timestamp'],
            'quality_status': log['quality_status'],
            'pressure': log['results']['optimal_pressure_bar']
        })
```

## Integration with Frontend

The TypeScript frontend can call these Python functions via Pyodide:

```typescript
// After calculation
await pyodide.runPython(`
calculator.log_production_run(
    parameters=${JSON.stringify(params)},
    results=results,
    quality_status="good"
)
`);
```

## See Also

- `logging_example.py` - Complete working examples
- `polyurethane_calculator.py` - Simple model logging functions
- `process_optimizer_ml.py` - Advanced ML logging functions
