# Report Generation Guide

## Overview

The `report.py` module provides comprehensive report generation capabilities for the Polyurethane Injection Optimizer. Generate professional reports from calculation results, optimization outputs, and ML model evaluations in multiple formats (JSON, CSV, Text).

## Installation

No additional dependencies required. The module uses only Python standard library:
- `json` - JSON serialization
- `csv` - CSV export
- `pathlib` - File path handling
- `dataclasses` - Data serialization
- `logging` - Event logging

## Quick Start

### Basic Usage

```python
from report import ReportGenerator

# Create a report generator
generator = ReportGenerator(output_dir="./reports")

# Generate report from calculation result
result = generator.generate_calculation_report(
    calculation_result,
    format="json",
    filename="my_calculation"
)

print(f"Report saved to: {result['filepath']}")
```

### Supported Report Types

1. **Calculation Reports** - From `CalculationProcessor.calculate_all()`
2. **Optimization Reports** - From `PressureOptimizer` results
3. **ML Prediction Reports** - From `ProcessOptimizerML` predictions
4. **Model Evaluation Reports** - From `ModelEvaluator` results
5. **Batch Reports** - From multiple calculation runs

### Supported Formats

- **JSON** - Full hierarchical structure with all data
- **CSV** - Flattened key-value pairs (suitable for spreadsheets)
- **Text** - Human-readable formatted report with sections

## Usage Examples

### 1. Generate Calculation Report

```python
from report import ReportGenerator

gen = ReportGenerator(output_dir="./reports")

# Assume calculation_result comes from CalculationProcessor
calculation_result = {
    "success": True,
    "data": {
        "input": {...},
        "flow": {...},
        "pressure": {...},
        "thermal": {...}
    }
}

# Generate in JSON format
json_report = gen.generate_calculation_report(
    calculation_result,
    format="json",
    filename="calculation_results"
)
print(json_report['filepath'])  # ./reports/calculation_results_YYYYMMDD_HHMMSS.json

# Generate in CSV format
csv_report = gen.generate_calculation_report(
    calculation_result,
    format="csv",
    filename="calculation_results"
)

# Generate as text report
text_report = gen.generate_calculation_report(
    calculation_result,
    format="text",
    filename="calculation_results"
)
```

### 2. Generate Optimization Report

```python
# Report from pressure optimization
optimization_result = {
    "success": True,
    "objective": "balanced",
    "required_pressure_bar": 85.5,
    "optimal_pressure_bar": 105.0,
    "confidence_score": 0.92,
    "alternative_pressures": {...}
}

report = gen.generate_optimization_report(
    optimization_result,
    calculation_result=calculation_result,  # Optional context
    format="json"
)
```

### 3. Generate ML Predictions Report

```python
# From ProcessOptimizerML
predictions = {
    "optimal_parameters": {
        "temperature_c": 28.5,
        "flow_rate_lpm": 1.8,
        "pressure_bar": 102.0
    },
    "quality_prediction": {
        "quality_score": 0.92,
        "probability_good_parts": 0.95
    },
    "defect_prediction": {
        "void_defects_probability": 0.02,
        "surface_defects_probability": 0.03
    },
    "confidence": 0.88
}

report = gen.generate_ml_prediction_report(
    predictions,
    input_parameters=input_params,  # Optional
    format="json"
)
```

### 4. Generate Model Evaluation Report

```python
# From ModelEvaluator
evaluation_results = {
    "quality_classifier": {
        "model": "RandomForestClassifier",
        "metrics": {
            "accuracy": {...},
            "precision": {...},
            "recall": {...}
        }
    },
    "pressure_predictor": {
        "model": "GradientBoostingRegressor",
        "metrics": {...}
    }
}

report = gen.generate_model_evaluation_report(
    evaluation_results,
    model_names=["quality_classifier", "pressure_predictor"],
    format="json"
)
```

### 5. Batch Report Processing

```python
# Process multiple calculation runs
batch_results = [
    calculation_result_1,
    calculation_result_2,
    calculation_result_3,
]

# Generate batch CSV (good for spreadsheet analysis)
batch_report = gen.generate_batch_report(
    batch_results,
    report_type="calculations",
    format="csv",
    filename="batch_results"
)

print(f"Processed {batch_report['count']} results")
print(f"CSV file: {batch_report['filepath']}")
```

### 6. Using SummaryReportBuilder

```python
from report import SummaryReportBuilder

# Aggregate multiple results with statistics
builder = SummaryReportBuilder()

builder.add_result(result_1, label="Configuration A")
builder.add_result(result_2, label="Configuration B")
builder.add_result(result_3, label="Configuration C")

# Generate summary with computed statistics
summary = builder.generate_summary()

print(f"Total results: {summary['total_results']}")
print(f"Statistics: {summary['statistics']}")
# Output includes min, max, mean for all numeric fields
```

### 7. Using Convenience Functions

```python
from report import generate_report

# Simplified API for quick report generation
result = generate_report(
    data=calculation_result,
    report_type="calculation",  # or "optimization", "ml_predictions", "model_evaluation"
    format="json",              # or "csv", "text"
    output_dir="./reports"
)

if result['success']:
    print(f"Report: {result['filepath']}")
else:
    print(f"Error: {result['error']}")
```

## Report Formats

### JSON Format
- **Best for:** Data preservation, programmatic processing, web APIs
- **Structure:** Hierarchical JSON with all calculation data
- **File:** `{filename}_{timestamp}.json`

```json
{
  "type": "calculation",
  "timestamp": "2025-12-15T10:30:00.000000",
  "status": "success",
  "calculation": {
    "success": true,
    "data": {
      "input": {...},
      "flow": {...},
      "pressure": {...},
      ...
    }
  }
}
```

### CSV Format
- **Best for:** Spreadsheet analysis, data comparison, bulk processing
- **Structure:** Flattened key-value pairs in rows
- **File:** `{filename}_{timestamp}.csv`

```csv
calculation_data_input_pipe_length_mm,calculation_data_input_temperature_c,calculation_data_flow_velocity_m_s,...
500,25,0.22,...
```

### Text Format
- **Best for:** Human reading, documentation, executive summaries
- **Structure:** Formatted sections with subsections
- **File:** `{filename}_{timestamp}.txt`

```
================================================================================
POLYURETHANE INJECTION OPTIMIZER REPORT
================================================================================

Report Type: CALCULATION
Generated: 2025-12-15T10:30:00.000000

--- INPUT PARAMETERS ---
  pipe_length_mm: 500
  temperature_c: 25
  ...

--- FLOW CALCULATIONS ---
  velocity_m_s: 0.2200
  reynolds_number: 1250.5000
  ...
```

## Integration with Existing Code

### From CalculationProcessor

```python
from core.processors.calculation_processor import CalculationProcessor
from report import ReportGenerator

# Run calculation
calculator = CalculationProcessor()
result = calculator.calculate_all(parameters)

# Generate report
gen = ReportGenerator()
report = gen.generate_calculation_report(result, format="json")
```

### From PressureOptimizer

```python
from core.optimizers.pressure_optimizer import PressureOptimizer
from report import ReportGenerator

# Run optimization
optimizer = PressureOptimizer(calculator)
opt_result = optimizer.optimize(...)

# Generate report
gen = ReportGenerator()
report = gen.generate_optimization_report(opt_result, format="json")
```

### From ProcessOptimizerML

```python
from process_optimizer_ml import ProcessOptimizerML
from report import ReportGenerator

# Get ML predictions
ml = ProcessOptimizerML()
ml.train()
predictions = ml.predict(input_data)

# Generate report
gen = ReportGenerator()
report = gen.generate_ml_prediction_report(predictions, format="json")
```

### From ModelEvaluator

```python
from model_evaluator import ModelEvaluator
from report import ReportGenerator

# Evaluate models
evaluator = ModelEvaluator()
eval_results = {
    "classifier": evaluator.evaluate_classifier(model, X, y),
    "regressor": evaluator.evaluate_regressor(model, X, y)
}

# Generate report
gen = ReportGenerator()
report = gen.generate_model_evaluation_report(eval_results, format="json")
```

## Advanced Usage

### Custom Output Directory

```python
# Reports will be saved in specified directory
gen = ReportGenerator(output_dir="/path/to/reports")

# Directory is created automatically if it doesn't exist
```

### Custom Filenames

```python
# Use custom filename (timestamp added automatically)
report = gen.generate_calculation_report(
    result,
    format="json",
    filename="experiment_001"
)
# Creates: experiment_001_20251215_195915.json
```

### Multi-Format Export

```python
# Export same data in all formats
for fmt in ["json", "csv", "text"]:
    report = gen.generate_calculation_report(result, format=fmt)
    print(f"{fmt.upper()}: {report['filepath']}")
```

### Batch Processing with Progress

```python
from report import ReportGenerator

gen = ReportGenerator()

# Process many results
for i, result in enumerate(results):
    report = gen.generate_calculation_report(
        result,
        format="csv",
        filename=f"result_{i:03d}"
    )
    print(f"[{i+1}/{len(results)}] Processed: {report['filepath']}")
```

## Error Handling

```python
from report import ReportGenerator

gen = ReportGenerator()

try:
    report = gen.generate_calculation_report(result, format="json")

    if report['success']:
        print(f"Report created: {report['filepath']}")
    else:
        print(f"Error: {report.get('error', 'Unknown error')}")

except Exception as e:
    print(f"Exception occurred: {e}")
```

## Performance Notes

- **JSON export:** Fast, suitable for web APIs
- **CSV export:** Very fast, good for large batches
- **Text export:** Fast, suitable for logging and documentation
- **Batch CSV:** Optimized for processing multiple results efficiently
- **Flattening:** Recursive flattening handles deeply nested structures

## Testing

The module includes comprehensive test coverage:

```bash
# Run tests
python -m pytest src/test/test_report.py -v

# Or run specific test class
python -m pytest src/test/test_report.py::TestReportGenerator -v

# Or run specific test
python -m pytest src/test/test_report.py::TestReportGenerator::test_generate_calculation_report_json -v
```

## Module Structure

```python
ReportGenerator           # Main report generation orchestrator
├── generate_calculation_report()
├── generate_optimization_report()
├── generate_ml_prediction_report()
├── generate_model_evaluation_report()
├── generate_batch_report()
└── (internal formatting methods)

SummaryReportBuilder     # Multi-result aggregation
├── add_result()
├── generate_summary()
└── (internal statistics computation)

generate_report()         # Convenience function (simplified API)
```

## Future Enhancements

Possible additions:
- HTML report generation with visualizations
- PDF export with charts and graphs
- Excel workbook export with multiple sheets
- Report templates for customization
- Automated report scheduling
- Email delivery integration
- Dashboard generation

---

**Last Updated:** 2025-12-15
**Module Version:** 1.0
**Status:** Production Ready
