# Polyurethane Optimizer - Python-First Architecture

## Overview

This project uses a **Python-first architecture** where all complex calculations are performed in Python, and JavaScript/TypeScript acts as a thin UI wrapper.

```
┌──────────────────────────────────────────────────────────────┐
│              React Components (UI Layer)                      │
└────────────────────────┬─────────────────────────────────────┘
                         │
         ┌───────────────▼────────────────┐
         │  CalculationService.ts         │ ← TypeScript Facade
         │  (Single entry point)          │
         └───────────────┬────────────────┘
                         │
         ┌───────────────▼────────────────────────┐
         │  Pyodide Manager                       │
         │  (Python runtime bridge)               │
         └───────────────┬────────────────────────┘
                         │
      ┌──────────────────▼──────────────────────┐
      │     Python Backend (Calculation Engine) │
      ├──────────────────────────────────────────┤
      │  calculation_processor.py                │ ← Orchestrator
      │  ├─ modules/pressure.py                 │ ← Pressure drop
      │  ├─ modules/thermal.py                  │ ← Temperature/viscosity
      │  ├─ modules/flow.py                     │ ← Flow properties
      │  └─ modules/environmental.py            │ ← Environmental impact
      │                                          │
      │  process_optimizer_ml.py                │ ← ML predictions
      │  validation.py                          │ ← Input validation
      │  constants.py                           │ ← Physical constants
      └──────────────────────────────────────────┘
```

## Architecture Principles

### 1. **Single Source of Truth**
- **Python is the primary calculation engine**
- All complex math happens in Python
- JavaScript only calls Python via Pyodide
- No duplicate calculation logic

### 2. **Clean Separation of Concerns**
- **Python modules**: One responsibility each
  - `pressure.py` → Only pressure calculations
  - `thermal.py` → Only thermal calculations
  - `flow.py` → Only flow properties
  - `environmental.py` → Only environmental impact

- **TypeScript service layer**: Facade pattern
  - `CalculationService` → Orchestrates Python calls
  - Handles errors, caching, validation
  - Returns clean results to React

- **React components**: Dumb consumers
  - Call `CalculationService.calculate()`
  - Display results in Redux store
  - No calculation logic

### 3. **Python Modules Are Pure Functions**
Each module exports functions that:
- Take clear input parameters
- Return well-defined output dictionaries
- Have no side effects
- Are independently testable

### 4. **Clear Data Flow**
```
Input Parameters → Validation → Calculation Modules → Results → UI Display
     (dict)          ↓                ↓                   ↓
                  errors?        pressure.py         display
                                thermal.py          format
                                flow.py             cache
                                environmental.py
```

## Directory Structure

```
src/
├── core/                          ← Python calculation engine
│   ├── __init__.py
│   ├── constants.py               ← Physics constants (SINGLE SOURCE)
│   ├── validation.py              ← Input validation
│   │
│   ├── modules/                   ← Focused calculation modules
│   │   ├── __init__.py
│   │   ├── pressure.py            ← Pressure drop calculations
│   │   ├── thermal.py             ← Temperature & viscosity
│   │   ├── flow.py                ← Shear rate, Reynolds number
│   │   └── environmental.py       ← Environmental impact
│   │
│   └── processors/                ← Orchestrators
│       ├── __init__.py
│       └── calculation_processor.py ← Main coordinator
│
├── services/                      ← TypeScript service layer
│   ├── CalculationService.ts      ← Calls Python via Pyodide
│   ├── index.ts
│   └── (other services TBD)
│
├── models/
│   └── types.ts                   ← Shared type definitions
│
├── integrations/
│   └── pyodide/
│       ├── PyodideManager.ts      ← Manages Python runtime
│       └── PythonBridge.ts        ← Communication layer
│
└── __tests__/                     ← Test files
    ├── services/
    │   └── CalculationService.test.ts
    └── integration/
        └── pyodide.test.ts
```

## How to Use

### For React Components

```typescript
// In a component or hook
import { CalculationService } from '@/services'
import { useEffect, useState } from 'react'

export function MyComponent() {
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function calculate() {
      try {
        const calcService = new CalculationService(pyodideManager)

        const results = await calcService.calculate({
          pipe_length_mm: 500,
          pipe_diameter_mm: 12,
          material_key: 'ecofoam_standard',
          temperature_c: 25,
          flow_rate_lpm: 1.0
        })

        setResults(results)
      } catch (err) {
        setError(err.message)
      }
    }

    calculate()
  }, [])

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {results && (
        <div>
          <p>Pressure: {results.pressure.pressure_with_fittings_bar} bar</p>
          <p>Flow Regime: {results.flow.flow_regime}</p>
        </div>
      )}
    </div>
  )
}
```

### For Python Backend

```python
# Direct Python usage
from core.processors.calculation_processor import calculate_all

result = calculate_all({
    'pipe_length_mm': 500,
    'pipe_diameter_mm': 12,
    'material_key': 'ecofoam_standard',
    'temperature_c': 25,
    'flow_rate_lpm': 1.0
})

print(result['data']['pressure']['pressure_with_fittings_bar'])  # 12.3
```

## Python Module API

### pressure.py

**Functions:**
- `calculate_pressure_drop()` → Darcy-Weisbach equation
- `calculate_pressure_with_fittings()` → Account for losses
- `calculate_machine_compatibility()` → Check machine suitability
- `swamee_jain_friction_factor()` → Friction factor calculation

**Example:**
```python
from core.modules import pressure

result = pressure.calculate_pressure_drop(
    diameter_mm=12,
    length_mm=500,
    flow_rate_lpm=1.0,
    viscosity_cp=350
)
print(result['pressure_drop_bar'])  # 12.3
```

### thermal.py

**Functions:**
- `calculate_temperature_dependent_viscosity()` → Arrhenius equation
- `calculate_shear_heating()` → Heat from friction
- `estimate_final_temperature()` → Temperature prediction
- `calculate_viscosity_change_factor()` → Quick viscosity change

**Example:**
```python
from core.modules import thermal

result = thermal.calculate_temperature_dependent_viscosity(
    reference_temp_c=25,
    reference_viscosity_cp=350,
    activation_energy_j_mol=25000,
    current_temp_c=35
)
print(result['current_viscosity_cp'])  # ~320
```

### flow.py

**Functions:**
- `calculate_shear_rate()` → γ̇ calculation
- `calculate_apparent_viscosity_power_law()` → Power Law model
- `calculate_reynolds_number()` → Re calculation
- `calculate_all_flow_properties()` → Convenience function

**Example:**
```python
from core.modules import flow

result = flow.calculate_all_flow_properties(
    diameter_mm=12,
    flow_rate_lpm=1.0,
    consistency_cp=350,
    flow_index=0.85
)
print(result['reynolds_number'])  # 450 (laminar)
```

### environmental.py

**Functions:**
- `calculate_environmental_impact()` → GWP calculation
- `compare_materials()` → Material comparison
- `estimate_co2_offset_equivalent()` → CO2 equivalents
- `get_environmental_recommendation()` → Eco-friendly rating

**Example:**
```python
from core.modules import environmental

result = environmental.calculate_environmental_impact(
    material_key='ecofoam_water',
    quantity_kg=10
)
print(result['recommendation'])  # "BEST - Zero emission material..."
```

## Testing Strategy

### Python Tests
```bash
# Test individual modules
python -m pytest src/core/modules/test_pressure.py
python -m pytest src/core/modules/test_thermal.py
python -m pytest src/core/modules/test_flow.py

# Test orchestrator
python -m pytest src/core/processors/test_calculation_processor.py

# Run all
python -m pytest src/core/
```

### TypeScript Tests
```bash
# Test service layer
npm test src/services/CalculationService.test.ts

# Test Pyodide integration
npm test src/integrations/pyodide/__tests__/PyodideManager.test.ts
```

### Integration Tests
```bash
# Full flow: React → Service → Pyodide → Python
npm test src/__tests__/integration/end-to-end.test.ts
```

## Migration Guide: From Old JS-Centric to New Python-First

### What Changed

| Old (Bad) | New (Good) |
|-----------|-----------|
| `calculationHelpers.js` (14KB) | Deleted - all in Python |
| `warningGenerator.js` (14KB) | Deleted - all in Python |
| `reducers/calculatorReducer.js` (11KB) | Simplified - just dispatches |
| `utils/database_loader.ts` | Simplified or deleted |
| Complex calculation logic | Single source of truth in Python |

### Migration Steps

1. **Stop using `calculationHelpers.js`**
   ```typescript
   // ❌ OLD
   import { calculatePressureDrop } from '@/utils/calculationHelpers'
   const pressure = calculatePressureDrop(...)

   // ✅ NEW
   const calcService = new CalculationService(pyodideManager)
   const results = await calcService.calculate(parameters)
   const pressure = results.pressure.pressure_with_fittings_bar
   ```

2. **Stop using `warningGenerator.js`**
   ```typescript
   // ❌ OLD
   import { generateWarnings } from '@/utils/warningGenerator'
   const warnings = generateWarnings(results, parameters)

   // ✅ NEW
   const results = await calcService.calculate(parameters)
   // Warnings already included in results
   const warnings = results.warnings
   ```

3. **Update Redux reducer**
   ```typescript
   // ❌ OLD
   const newResults = {
     pressureDrop: calculatePressureDrop(...),
     warnings: generateWarnings(...),
     // ... manual calculations
   }

   // ✅ NEW
   const results = await calculationService.calculate(inputs)
   dispatch(setResults(results))  // Already complete
   ```

## Performance Considerations

### Caching
- `CalculationService` caches identical requests
- Clear cache when preferences change: `calcService.clearCache()`

### Pyodide Loading
- Python runtime loads on first calculation
- Subsequent calls are ~100ms (fast)
- ~6MB wasm payload (one-time)

### Optimization Tips
1. Reuse `CalculationService` instance (singleton)
2. Use caching to avoid redundant calculations
3. Debounce input changes before calculating
4. Use React.memo for result display components

## Future Improvements

### Phase 2: Additional Services
- `ValidationService` - Wrap Python validation
- `WarningService` - Warning generation service
- `MLService` - ML predictions (process_optimizer_ml.py)
- `ExportService` - Report/CSV generation

### Phase 3: ML Integration
- Proper `MLService` wrapping `process_optimizer_ml.py`
- Feature engineering in Python
- Model versioning and tracking
- A/B testing support

### Phase 4: Database Integration
- `DatabaseService` for mold dimensions
- `RecipeService` for saved recipes
- `ProductionService` for logging

## Troubleshooting

### "Module not found" Error
```
Error: cannot import name 'pressure' from 'core.modules'
```
Solution: Ensure `__init__.py` files exist in all directories

### "Python function not available"
```
Error: function 'calculate_all' not found
```
Solution: Check Pyodide has loaded the module via `pyodide_loader.ts`

### Incorrect Results
```
Results don't match expectations
```
Solution:
1. Check input parameters are correct
2. Verify Python module math (unit conversions)
3. Test Python directly: `python -c "from core.processors import calculation_processor; ..."`

## Links & References

- **Python Backend**: `src/core/`
- **TypeScript Service**: `src/services/CalculationService.ts`
- **Type Definitions**: `src/models/types.ts`
- **Constants**: `src/core/constants.py`
- **Tests**: `src/__tests__/`
- **ML Module**: `src/ml/` (optional, isolated)
