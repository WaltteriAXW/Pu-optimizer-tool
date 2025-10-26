# State Management Migration Guide

## Overview

The calculator state management has been prepared for migration from multiple `useState` hooks to a single `useReducer` for better organization and predictability.

## Current Architecture

The component currently uses multiple `useState` hooks:
- UI state (viewMode, showDatabase, etc.)
- Input state (inputs, selectedMachine, etc.)
- Calculation state (results, loading, error, etc.)

## New Architecture (Available)

A reducer-based state management system is available in:
- `src/reducers/calculatorReducer.js` - Reducer and action types
- `src/hooks/useCalculatorState.js` - Custom hook with clean API

## Migration Example

### Before (Current)
```jsx
const [inputs, setInputs] = useState({ pipeLength: 500, ... });
const [loading, setLoading] = useState(false);
const [results, setResults] = useState(null);

// Update state
setInputs(prev => ({ ...prev, pipeLength: 600 }));
setLoading(true);
setResults(calculationResults);
```

### After (With Reducer)
```jsx
const { state, actions } = useCalculatorState();

// Access state
const { inputs, loading, results } = state;

// Update state
actions.setInput('pipeLength', 600);
actions.startCalculation();
actions.calculationSuccess(calculationResults, pressureData);
```

## Benefits

1. **Centralized State Logic**: All state updates in one place
2. **Predictable Updates**: Action-based updates are easier to track
3. **Better Testing**: Pure reducer functions are easy to test
4. **Time Travel Debugging**: Can log and replay actions
5. **Cleaner Code**: Less boilerplate for complex state updates

## Migration Steps

### Step 1: Import the hook
```jsx
import { useCalculatorState } from './hooks/useCalculatorState';
```

### Step 2: Replace useState calls
```jsx
// Remove these:
// const [inputs, setInputs] = useState(...);
// const [loading, setLoading] = useState(false);
// const [results, setResults] = useState(null);
// ... etc

// Add this:
const { state, actions } = useCalculatorState();
```

### Step 3: Update state references
```jsx
// Before: inputs.pipeLength
// After:  state.inputs.pipeLength

// Before: setInputs(prev => ({ ...prev, pipeLength: 600 }))
// After:  actions.setInput('pipeLength', 600)
```

### Step 4: Update calculation functions
```jsx
const calculateResults = useCallback(async () => {
  actions.startCalculation(); // Instead of: setLoading(true); setError(null);

  try {
    // ... calculations ...
    actions.calculationSuccess(results, pressureData);
  } catch (err) {
    actions.calculationError(err.message);
  }
}, [state.inputs, state.selectedMachine, actions]);
```

## When to Migrate

**Now:**
- When adding new features that require complex state coordination
- When debugging state-related bugs
- When state updates become hard to track

**Later:**
- Existing working code can remain as-is
- Gradual migration is fine
- No urgency if current approach works

## Testing the Reducer

```javascript
import { calculatorReducer, initialState, ACTIONS } from '../reducers/calculatorReducer';

test('should update input', () => {
  const action = { type: ACTIONS.SET_INPUT, payload: { name: 'pipeLength', value: 600 } };
  const newState = calculatorReducer(initialState, action);

  expect(newState.inputs.pipeLength).toBe(600);
  expect(newState.inputs.temperature).toBe(initialState.inputs.temperature); // Others unchanged
});

test('should start calculation', () => {
  const action = { type: ACTIONS.START_CALCULATION };
  const newState = calculatorReducer(initialState, action);

  expect(newState.loading).toBe(true);
  expect(newState.error).toBe(null);
});
```

## Notes

- The reducer is **optional** - current code works fine
- Migration can be done **gradually** - one section at a time
- The infrastructure is **ready** when you need it
- Consider migrating when state management becomes complex
