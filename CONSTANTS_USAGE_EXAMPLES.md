# Constants Usage Examples

## Overview

Magic numbers have been extracted to `src/constants.js` and `src/constants.py` for better maintainability and consistency.

## JavaScript Examples

### Before: Magic Numbers Scattered Throughout Code

```javascript
// ❌ Hard to understand, easy to make mistakes
const temp_k = temperature + 273.15;
const activationEnergy = 25000.0;
const gasConstant = 8.314;
const reynoldsThreshold = 2300;

if (inputs.pipeLength < 50) {
  throw new Error("Pipe length must be at least 50mm");
}

if (shearRate > 1000) {
  warnings.push("High shear rate");
}

const flowRateM3s = flowRate / 60000; // What is 60000?
```

### After: Using Constants

```javascript
import {
  PHYSICS,
  MATERIAL_DEFAULTS,
  THRESHOLDS,
  CONVERSIONS,
  VALIDATION_RANGES,
  celsiusToKelvin,
  validateInput,
  isTurbulent,
  exceedsThreshold
} from './constants';

// ✅ Clear, self-documenting, centralized
const temp_k = celsiusToKelvin(temperature);
const activationEnergy = MATERIAL_DEFAULTS.ACTIVATION_ENERGY_STANDARD;
const gasConstant = PHYSICS.GAS_CONSTANT;

// Validation with helper function
const validation = validateInput('pipeLength', inputs.pipeLength);
if (!validation.valid) {
  throw new Error(validation.error);
}

// Using threshold constants
if (exceedsThreshold(shearRate, 'SHEAR_RATE_HIGH')) {
  warnings.push("High shear rate may affect material properties");
}

// Clear unit conversion
const flowRateM3s = flowRate * CONVERSIONS.L_PER_MIN_TO_M3_PER_SEC;

// Flow regime check
const flowRegime = isTurbulent(reynolds) ? 'turbulent' : 'laminar';
```

## Python Examples

### Before: Magic Numbers in Calculator

```python
# ❌ Scattered magic numbers
self.activation_energy = 25000.0
self.gas_constant = 8.314
self.power_law_index = 0.85
self.safety_factor = 1.5

# Validation
if pipe_length < 50:
    raise ValidationError("Pipe length must be at least 50mm")

# Conversions
radius = pipe_diameter / 2000  # What units?
flow_rate = flow_rate_lpm / 60000  # Why 60000?
```

### After: Using Constants

```python
from constants import (
    Physics,
    MaterialDefaults,
    Thresholds,
    Conversions,
    validate_input,
    is_turbulent,
    exceeds_threshold
)

# ✅ Clear and centralized
class PolyurethaneCalculator:
    def __init__(self, material_preset="ecofoam_standard"):
        self.activation_energy = MaterialDefaults.ACTIVATION_ENERGY_STANDARD
        self.gas_constant = Physics.GAS_CONSTANT
        self.power_law_index = MaterialDefaults.POWER_LAW_INDEX_STANDARD
        self.safety_factor = MaterialDefaults.SAFETY_FACTOR

    def validate_inputs(self, pipe_length, pipe_diameter, temperature,
                       flow_rate, viscosity, density):
        # Use validation helper
        result = validate_input('pipe_length', pipe_length)
        if not result['valid']:
            raise ValidationError(result['error'])

        result = validate_input('temperature', temperature)
        if not result['valid']:
            raise ValidationError(result['error'])

    def calculate(self, pipe_length, pipe_diameter, temperature, flow_rate_lpm,
                  viscosity=None, density=None):
        # Use default constants
        if viscosity is None:
            viscosity = Defaults.VISCOSITY
        if density is None:
            density = Defaults.DENSITY

        # Clear unit conversions
        radius = pipe_diameter * Conversions.MM_TO_M / 2
        length = pipe_length * Conversions.MM_TO_M
        flow_rate = flow_rate_lpm * Conversions.L_PER_MIN_TO_M3_PER_SEC

        # Temperature conversion
        temp_k = Conversions.celsius_to_kelvin(temperature)
        ref_temp_k = Conversions.celsius_to_kelvin(
            MaterialDefaults.REFERENCE_TEMPERATURE
        )

        # Check thresholds
        if exceeds_threshold(shear_rate, 'SHEAR_RATE_HIGH'):
            warnings.append("High shear rate may affect material properties")

        # Flow regime
        flow_regime = "turbulent" if is_turbulent(reynolds) else "laminar"
```

## Validation Examples

### JavaScript

```javascript
import { validateInput, VALIDATION_RANGES } from './constants';

// Single field validation
const result = validateInput('temperature', userInput);
if (!result.valid) {
  setError(result.error);
  return;
}

// Validate all inputs
const fields = ['pipeLength', 'pipeDiameter', 'temperature', 'flowRate'];
for (const field of fields) {
  const result = validateInput(field, inputs[field]);
  if (!result.valid) {
    errors[field] = result.error;
  }
}

// Get range info for UI
const tempRange = VALIDATION_RANGES.temperature;
console.log(`Temperature: ${tempRange.min}-${tempRange.max} ${tempRange.unit}`);
```

### Python

```python
from constants import validate_input, VALIDATION_RANGES

# Single field validation
result = validate_input('temperature', user_input)
if not result['valid']:
    raise ValidationError(result['error'])

# Validate all inputs
fields = ['pipe_length', 'pipe_diameter', 'temperature', 'flow_rate']
errors = {}
for field in fields:
    result = validate_input(field, inputs[field])
    if not result['valid']:
        errors[field] = result['error']

if errors:
    raise ValidationError(f"Validation failed: {errors}")

# Get range info
temp_range = VALIDATION_RANGES['temperature']
print(f"Temperature: {temp_range['min']}-{temp_range['max']} {temp_range['unit']}")
```

## Unit Conversion Examples

```javascript
import { CONVERSIONS } from './constants';

// Clear and self-documenting
const radiusM = (pipeDiameterMm / 2) * CONVERSIONS.MM_TO_M;
const lengthM = pipeLengthMm * CONVERSIONS.MM_TO_M;
const flowRateM3s = flowRateLpm * CONVERSIONS.L_PER_MIN_TO_M3_PER_SEC;
const viscosityPas = viscosityCp * CONVERSIONS.CP_TO_PA_S;
const pressureBar = pressureKpa * CONVERSIONS.KPA_TO_BAR;
```

```python
from constants import Conversions

# Clear and self-documenting
radius_m = (pipe_diameter_mm / 2) * Conversions.MM_TO_M
length_m = pipe_length_mm * Conversions.MM_TO_M
flow_rate_m3s = flow_rate_lpm * Conversions.L_PER_MIN_TO_M3_PER_SEC
viscosity_pas = viscosity_cp * Conversions.CP_TO_PA_S
pressure_bar = pressure_kpa * Conversions.KPA_TO_BAR
```

## Formatting Examples

```javascript
import { formatValue, UI_CONFIG } from './constants';

// Consistent decimal places
const pressureStr = formatValue(12.3456, 'pressure');  // "12.35"
const tempStr = formatValue(25.6789, 'temperature');   // "25.7"
const viscStr = formatValue(0.12345, 'viscosity');     // "0.1235"

// Access decimal config directly
const decimals = UI_CONFIG.DECIMAL_PLACES.pressure; // 2
```

```python
from constants import format_value, UIConfig

# Consistent decimal places
pressure_str = format_value(12.3456, 'pressure')    # "12.35"
temp_str = format_value(25.6789, 'temperature')     # "25.7"
visc_str = format_value(0.12345, 'viscosity')       # "0.1235"

# Access decimal config directly
decimals = UIConfig.DECIMAL_PLACES['pressure']  # 2
```

## Migration Checklist

### For Each File

- [ ] Import required constants at the top
- [ ] Replace magic numbers with named constants
- [ ] Use conversion constants instead of bare numbers
- [ ] Use helper functions for validation
- [ ] Use helper functions for threshold checks
- [ ] Use formatValue for consistent display
- [ ] Update tests to use constants

### Priority Order

1. **High Priority** - Replace in calculation functions
   - Unit conversions
   - Physical constants
   - Validation ranges

2. **Medium Priority** - Replace in UI components
   - Display formatting
   - Default values
   - Debounce delays

3. **Low Priority** - Replace in helper utilities
   - Decimal places
   - Animation delays

## Benefits

✅ **Single Source of Truth**: Change a value once, affects everywhere
✅ **Self-Documenting**: Named constants are clearer than numbers
✅ **Type Safety**: Constants can be typed in TypeScript
✅ **Easier Testing**: Mock constants for different test scenarios
✅ **Consistency**: Same values in Python and JavaScript
✅ **Maintainability**: Easy to find and update values

## Notes

- Constants are **backward compatible** - can migrate gradually
- Both JS and Python files use the **same values**
- Helper functions make common operations **easier**
- No need to migrate everything at once
