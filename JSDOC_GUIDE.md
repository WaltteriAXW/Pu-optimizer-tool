# JSDoc Documentation Guide

## Overview

JSDoc provides type annotations and documentation for JavaScript code, improving IDE support and code understanding.

## Why JSDoc?

✅ **Better IDE Support** - Auto-completion, parameter hints, type checking
✅ **Self-Documenting Code** - Clear function purposes and parameters
✅ **Type Safety** - Catch errors without TypeScript
✅ **Generated Documentation** - Can generate docs websites
✅ **Better Collaboration** - Clear API contracts

## Basic Syntax

### Function Documentation

```javascript
/**
 * Calculate the area of a rectangle
 *
 * @param {number} width - The width of the rectangle
 * @param {number} height - The height of the rectangle
 * @returns {number} The calculated area
 *
 * @example
 * const area = calculateArea(5, 10);
 * console.log(area); // 50
 */
function calculateArea(width, height) {
  return width * height;
}
```

### With Type Definitions

```javascript
/**
 * User object
 * @typedef {Object} User
 * @property {string} id - User ID
 * @property {string} name - User name
 * @property {string} email - User email
 * @property {boolean} [isAdmin=false] - Whether user is admin (optional)
 */

/**
 * Get user by ID
 * @param {string} userId - The user ID
 * @returns {Promise<User>} The user object
 * @throws {Error} If user not found
 */
async function getUser(userId) {
  // Implementation
}
```

### Complex Types

```javascript
/**
 * @typedef {Object} CalculationParams
 * @property {number} pipeLength - Pipe length in mm
 * @property {number} pipeDiameter - Pipe diameter in mm
 * @property {number} temperature - Temperature in °C
 * @property {number} flowRate - Flow rate in L/min
 * @property {number} [viscosity=350] - Viscosity in cP (optional)
 * @property {number} [density=1120] - Density in kg/m³ (optional)
 */

/**
 * @typedef {Object} CalculationResults
 * @property {number} pressure - Required pressure in kPa
 * @property {number} reynolds - Reynolds number
 * @property {'laminar'|'turbulent'} flowRegime - Flow regime
 * @property {string[]} warnings - Warning messages
 */

/**
 * Calculate injection parameters
 * @param {CalculationParams} params - Calculation parameters
 * @returns {Promise<CalculationResults>} Calculation results
 */
async function calculate(params) {
  // Implementation
}
```

## Common Tags

### @param

```javascript
/**
 * @param {string} name - User name
 * @param {number} age - User age
 * @param {Object} options - Configuration options
 * @param {boolean} options.admin - Is admin
 * @param {string[]} options.roles - User roles
 */
function createUser(name, age, options) {
  // Implementation
}
```

### @returns / @return

```javascript
/**
 * @returns {number} The calculated value
 */

/**
 * @returns {Promise<User>} Resolves with user object
 */

/**
 * @returns {void} No return value
 */
```

### @throws

```javascript
/**
 * @throws {ValidationError} If input is invalid
 * @throws {Error} If calculation fails
 */
function validateAndCalculate(input) {
  // Implementation
}
```

### @example

```javascript
/**
 * Format a number with unit
 * @param {number} value - The number to format
 * @param {string} unit - The unit string
 * @returns {string} Formatted string
 *
 * @example
 * formatValue(12.5, 'kPa')
 * // Returns: "12.5 kPa"
 *
 * @example
 * formatValue(100, 'mm')
 * // Returns: "100 mm"
 */
function formatValue(value, unit) {
  return `${value} ${unit}`;
}
```

### @deprecated

```javascript
/**
 * Old calculation method
 * @deprecated Use calculateV2() instead
 * @param {number} x - Input value
 * @returns {number} Result
 */
function calculateV1(x) {
  // Old implementation
}
```

### @see

```javascript
/**
 * Calculate pressure
 * @see {@link calculateTemperature} for temperature calculation
 * @see {@link https://example.com/docs} for documentation
 */
function calculatePressure() {
  // Implementation
}
```

## Type Annotations

### Primitive Types

```javascript
/**
 * @param {string} text
 * @param {number} count
 * @param {boolean} flag
 * @param {null} value
 * @param {undefined} value
 * @param {*} anything - Any type
 */
```

### Arrays

```javascript
/**
 * @param {string[]} names - Array of strings
 * @param {number[]} values - Array of numbers
 * @param {Array<User>} users - Array of User objects
 */
```

### Objects

```javascript
/**
 * @param {Object} config - Configuration object
 * @param {Object.<string, number>} map - String keys, number values
 * @param {{name: string, age: number}} person - Inline object type
 */
```

### Union Types

```javascript
/**
 * @param {string|number} id - String or number
 * @param {('success'|'error'|'warning')} status - One of these values
 */
```

### Nullable and Optional

```javascript
/**
 * @param {?string} name - Nullable (can be null)
 * @param {string} [name] - Optional parameter
 * @param {string} [name='default'] - Optional with default
 */
```

### Function Types

```javascript
/**
 * @callback CalculationCallback
 * @param {number} result - Calculation result
 * @returns {void}
 */

/**
 * Perform calculation with callback
 * @param {number} value - Input value
 * @param {CalculationCallback} callback - Callback function
 */
function calculate(value, callback) {
  const result = value * 2;
  callback(result);
}
```

### Generic Types

```javascript
/**
 * @template T
 * @param {T} value - Value of generic type
 * @returns {Promise<T>} Promise resolving to same type
 */
function wrapInPromise(value) {
  return Promise.resolve(value);
}
```

## React Components

### Functional Component

```javascript
/**
 * Button component
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Button content
 * @param {Function} props.onClick - Click handler
 * @param {boolean} [props.disabled=false] - Whether button is disabled
 * @param {'primary'|'secondary'} [props.variant='primary'] - Button variant
 * @returns {React.ReactElement} Button element
 *
 * @example
 * <Button onClick={handleClick} variant="primary">
 *   Click Me
 * </Button>
 */
function Button({ children, onClick, disabled = false, variant = 'primary' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
}
```

### With PropTypes Alternative

```javascript
/**
 * @typedef {Object} ButtonProps
 * @property {React.ReactNode} children - Button content
 * @property {()=> void} onClick - Click handler
 * @property {boolean} [disabled] - Whether disabled
 * @property {'primary'|'secondary'} [variant] - Button style
 */

/**
 * Button component
 * @param {ButtonProps} props - Component props
 * @returns {React.ReactElement}
 */
function Button(props) {
  // Implementation
}
```

### Custom Hooks

```javascript
/**
 * Custom hook for debouncing values
 *
 * @param {*} value - Value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {*} Debounced value
 *
 * @example
 * const debouncedValue = useDebounce(searchTerm, 500);
 * useEffect(() => {
 *   performSearch(debouncedValue);
 * }, [debouncedValue]);
 */
function useDebounce(value, delay) {
  // Implementation
}
```

## Class Documentation

```javascript
/**
 * Polyurethane calculator class
 *
 * @class
 * @classdesc Performs calculations for polyurethane injection parameters
 *
 * @example
 * const calc = new PolyurethaneCalculator();
 * const results = calc.calculate(params);
 */
class PolyurethaneCalculator {
  /**
   * Create a calculator instance
   * @param {string} materialPreset - Material preset name
   */
  constructor(materialPreset) {
    this.materialPreset = materialPreset;
  }

  /**
   * Calculate injection parameters
   * @param {CalculationParams} params - Input parameters
   * @returns {CalculationResults} Calculation results
   * @throws {ValidationError} If parameters are invalid
   */
  calculate(params) {
    // Implementation
  }

  /**
   * Validate input parameters
   * @private
   * @param {CalculationParams} params - Parameters to validate
   * @returns {boolean} Whether parameters are valid
   */
  _validateParams(params) {
    // Implementation
  }
}
```

## Module Documentation

```javascript
/**
 * Validation utilities
 *
 * @module validation
 * @description Provides input validation functions for the calculator
 *
 * @example
 * import { validateInput, validateAll } from './validation';
 *
 * const result = validateInput('pipeLength', 500);
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 */

// Module code...
```

## Best Practices

### ✅ DO

```javascript
/**
 * Calculate Reynolds number
 *
 * Reynolds number indicates whether flow is laminar or turbulent.
 * Values below 2300 indicate laminar flow.
 *
 * @param {number} velocity - Flow velocity in m/s
 * @param {number} diameter - Pipe diameter in m
 * @param {number} density - Fluid density in kg/m³
 * @param {number} viscosity - Dynamic viscosity in Pa·s
 * @returns {number} Reynolds number (dimensionless)
 *
 * @example
 * const re = calculateReynolds(2.5, 0.012, 1120, 0.35);
 * console.log(re > 2300 ? 'Turbulent' : 'Laminar');
 */
function calculateReynolds(velocity, diameter, density, viscosity) {
  return (density * velocity * diameter) / viscosity;
}
```

### ❌ DON'T

```javascript
// Too brief
/**
 * @param {number} v
 * @param {number} d
 * @returns {number}
 */
function calc(v, d) {
  return v * d;
}

// Too verbose
/**
 * This function calculates something very important
 * You should use it carefully and make sure to pass the right parameters
 * It will return a value that you can use in your calculations
 * Make sure to check the return value before using it
 * ...
 */
function calculate() {}
```

## Generating Documentation

### Setup JSDoc

```bash
npm install --save-dev jsdoc
```

### Configuration File (jsdoc.json)

```json
{
  "source": {
    "include": ["src"],
    "includePattern": ".js$",
    "excludePattern": "(node_modules|test)"
  },
  "opts": {
    "destination": "./docs/jsdoc",
    "recurse": true,
    "readme": "README.md"
  },
  "plugins": ["plugins/markdown"],
  "templates": {
    "cleverLinks": true,
    "monospaceLinks": true
  }
}
```

### Add Script to package.json

```json
{
  "scripts": {
    "docs": "jsdoc -c jsdoc.json"
  }
}
```

### Generate Docs

```bash
npm run docs
```

## IDE Integration

### VS Code

JSDoc works automatically in VS Code. Hover over functions to see documentation.

### Settings

```json
{
  "javascript.suggest.jsdoc.generateReturns": true,
  "typescript.suggest.jsdoc.generateReturns": true
}
```

## Quick Reference

| Tag | Purpose | Example |
|-----|---------|---------|
| `@param` | Parameter | `@param {string} name - User name` |
| `@returns` | Return value | `@returns {number} The result` |
| `@throws` | Exceptions | `@throws {Error} If invalid` |
| `@example` | Usage example | `@example myFunc(5)` |
| `@typedef` | Define type | `@typedef {Object} User` |
| `@callback` | Function type | `@callback Handler` |
| `@deprecated` | Mark deprecated | `@deprecated Use v2 instead` |
| `@see` | Reference | `@see otherFunction` |
| `@todo` | TODO note | `@todo Implement validation` |
| `@private` | Private member | `@private` |
| `@readonly` | Read-only | `@readonly` |

## Checklist for Documentation

- [ ] All public functions have JSDoc
- [ ] All parameters documented with types
- [ ] Return values documented
- [ ] Complex types defined with @typedef
- [ ] Examples provided for complex functions
- [ ] Exceptions documented with @throws
- [ ] Deprecated functions marked
- [ ] Units specified in descriptions (mm, kg, °C, etc.)
- [ ] Valid ranges mentioned
- [ ] Related functions cross-referenced

---

**Status**: ✅ JSDoc guide ready
**Priority**: High - Better code documentation
**Tool Support**: VS Code, WebStorm, others
