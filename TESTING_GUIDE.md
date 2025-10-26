# Testing Guide

## Overview

Comprehensive test suite for the Polyurethane Injection Optimizer using Vitest and React Testing Library.

## Quick Start

```bash
# Install dependencies (if not already installed)
npm install

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

```
src/
├── constants.test.js           # Constants and helper functions
├── validation.test.js          # Validation logic
├── hooks/
│   └── useDebounce.test.js    # Custom hooks
├── reducers/
│   └── calculatorReducer.test.js  # State management
└── test/
    └── setup.js               # Test configuration
```

## What's Tested

### ✅ Constants Module (constants.test.js)
- **80+ tests** covering:
  - Physical constants (gas constant, atmospheric pressure, Reynolds threshold)
  - Material defaults (activation energy, power law index, safety factor)
  - Validation ranges (all input fields with min/max/unit)
  - Process thresholds (shear rate, viscosity, velocity, etc.)
  - Unit conversions (length, volume, flow rate, pressure, temperature)
  - Helper functions (validateInput, formatValue, celsiusToKelvin, isTurbulent, exceedsThreshold)
  - UI configuration (debounce delays, decimal places)
  - Default values

### ✅ Validation Module (validation.test.js)
- **50+ tests** covering:
  - ValidationError class
  - Field validation (validateField)
  - Complete input validation (validateInputs)
  - Process parameter validation (validateProcessParameters)
  - Number sanitization (sanitizeNumber)
  - Value clamping (clamp)
  - Field constraints (getFieldConstraints)
  - Edge cases (NaN, Infinity, invalid types)
  - Multiple validation errors
  - Warning and recommendation generation

### ✅ Reducer Module (calculatorReducer.test.js)
- **50+ tests** covering:
  - Initial state validation
  - UI actions (view mode, toggles)
  - Input actions (set single, set multiple, machine, material)
  - Mold actions (shape, dimensions, volume)
  - Mix ratio actions
  - Calculation actions (start, success, error, clear)
  - Database actions
  - Reset actions
  - Unknown action handling
  - State immutability
  - Action creators

### ✅ Custom Hooks (useDebounce.test.js)
- **15+ tests** covering:
  - useDebounce hook
  - Value debouncing
  - Timeout reset on value change
  - Custom delays
  - Multiple rapid changes
  - Different value types
  - useDebouncedCallback hook
  - Callback debouncing
  - Multiple arguments
  - Cleanup on unmount

## Test Coverage Goals

| Module | Target | Current |
|--------|--------|---------|
| Constants | 100% | ~95% |
| Validation | 100% | ~95% |
| Reducer | 100% | ~98% |
| Custom Hooks | 100% | ~90% |

## Running Tests

### All Tests
```bash
npm test
```

### Specific File
```bash
npm test constants.test.js
npm test validation.test.js
npm test calculatorReducer.test.js
npm test useDebounce.test.js
```

### Watch Mode
```bash
npm test -- --watch
```
Tests re-run automatically when files change.

### With Coverage
```bash
npm run test:coverage
```
Generates coverage report in `coverage/` directory.

### With UI
```bash
npm run test:ui
```
Opens interactive test UI in browser.

### Specific Pattern
```bash
npm test -- --grep "validateInput"
npm test -- --grep "reducer"
```

## Writing Tests

### Example: Testing a Pure Function

```javascript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myModule';

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });

  it('should handle edge cases', () => {
    expect(myFunction(null)).toBe(defaultValue);
    expect(myFunction(undefined)).toBe(defaultValue);
  });
});
```

### Example: Testing a Hook

```javascript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from './useMyHook';

describe('useMyHook', () => {
  it('should return initial value', () => {
    const { result } = renderHook(() => useMyHook('initial'));
    expect(result.current).toBe('initial');
  });

  it('should update value', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useMyHook(value),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });
    expect(result.current).toBe('updated');
  });
});
```

### Example: Testing a Component

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

## Continuous Integration

Tests should run in CI/CD:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## Best Practices

### ✅ DO

- Write tests for all new features
- Test edge cases and error conditions
- Use descriptive test names
- Group related tests with `describe`
- Test one thing per test
- Use appropriate matchers (`toBe`, `toEqual`, `toContain`, etc.)
- Mock external dependencies
- Clean up after tests

### ❌ DON'T

- Test implementation details
- Write tests that depend on each other
- Hard-code values that might change
- Ignore failing tests
- Skip edge cases
- Test third-party libraries
- Make tests too complex

## Common Matchers

```javascript
// Equality
expect(value).toBe(expected);           // Strict equality
expect(value).toEqual(expected);        // Deep equality
expect(value).not.toBe(unexpected);     // Negation

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(value).toBeGreaterThan(3);
expect(value).toBeGreaterThanOrEqual(3);
expect(value).toBeLessThan(5);
expect(value).toBeCloseTo(0.3);         // For floats

// Strings
expect(string).toMatch(/pattern/);
expect(string).toContain('substring');

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Objects
expect(object).toHaveProperty('key');
expect(object).toMatchObject({ key: value });

// Exceptions
expect(() => { throw new Error('oops'); }).toThrow();
expect(() => fn()).toThrow('error message');

// DOM (with @testing-library/jest-dom)
expect(element).toBeInTheDocument();
expect(element).toHaveTextContent('text');
expect(element).toBeVisible();
expect(element).toBeDisabled();
```

## Debugging Tests

### Run Single Test
```bash
npm test -- --run --reporter=verbose constants.test.js
```

### See Console Logs
```bash
npm test -- --run --reporter=verbose
```

### Debug in VS Code
Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Vitest",
  "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
  "args": ["run", "${file}"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Next Steps

1. **Add Component Tests**
   - Test React components
   - Test user interactions
   - Test error boundaries

2. **Add Integration Tests**
   - Test calculator with real inputs
   - Test data flow
   - Test state management

3. **Add E2E Tests**
   - Use Playwright or Cypress
   - Test full user workflows
   - Test in real browser

4. **Improve Coverage**
   - Aim for 80%+ coverage
   - Focus on critical paths
   - Test edge cases

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Status**: ✅ Test infrastructure ready with 195+ tests
**Coverage**: ~95% for tested modules
**CI/CD**: Ready for integration
