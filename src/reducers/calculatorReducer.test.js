import { describe, it, expect } from 'vitest';
import { calculatorReducer, initialState, ACTIONS, actionCreators } from './calculatorReducer';

describe('Calculator Reducer - Initial State', () => {
  it('should have correct initial state', () => {
    expect(initialState.viewMode).toBe('simple');
    expect(initialState.selectedMachine).toBe('low_pressure');
    expect(initialState.selectedMaterial).toBe('ecofoam_standard');
    expect(initialState.loading).toBe(false);
    expect(initialState.error).toBe(null);
  });

  it('should have default inputs', () => {
    expect(initialState.inputs.pipeLength).toBe(500);
    expect(initialState.inputs.temperature).toBe(25);
    expect(initialState.inputs.flowRate).toBe(5);
  });
});

describe('Calculator Reducer - UI Actions', () => {
  it('should set view mode', () => {
    const action = { type: ACTIONS.SET_VIEW_MODE, payload: 'advanced' };
    const newState = calculatorReducer(initialState, action);
    expect(newState.viewMode).toBe('advanced');
  });

  it('should toggle database', () => {
    const action = { type: ACTIONS.TOGGLE_DATABASE };
    const newState = calculatorReducer(initialState, action);
    expect(newState.showDatabase).toBe(true);

    const newState2 = calculatorReducer(newState, action);
    expect(newState2.showDatabase).toBe(false);
  });

  it('should toggle mix ratio', () => {
    const action = { type: ACTIONS.TOGGLE_MIX_RATIO };
    const newState = calculatorReducer(initialState, action);
    expect(newState.mixRatioExpanded).toBe(true);
  });

  it('should toggle mold dimensions', () => {
    const action = { type: ACTIONS.TOGGLE_MOLD_DIMENSIONS };
    const newState = calculatorReducer(initialState, action);
    expect(newState.moldDimensionsExpanded).toBe(false);
  });
});

describe('Calculator Reducer - Input Actions', () => {
  it('should set single input', () => {
    const action = {
      type: ACTIONS.SET_INPUT,
      payload: { name: 'pipeLength', value: 600 }
    };
    const newState = calculatorReducer(initialState, action);
    expect(newState.inputs.pipeLength).toBe(600);
    expect(newState.inputs.temperature).toBe(initialState.inputs.temperature);
  });

  it('should set multiple inputs', () => {
    const action = {
      type: ACTIONS.SET_INPUTS,
      payload: { pipeLength: 700, temperature: 30 }
    };
    const newState = calculatorReducer(initialState, action);
    expect(newState.inputs.pipeLength).toBe(700);
    expect(newState.inputs.temperature).toBe(30);
    expect(newState.inputs.flowRate).toBe(initialState.inputs.flowRate);
  });

  it('should set machine', () => {
    const action = { type: ACTIONS.SET_MACHINE, payload: 'high_pressure' };
    const newState = calculatorReducer(initialState, action);
    expect(newState.selectedMachine).toBe('high_pressure');
  });

  it('should set material', () => {
    const action = { type: ACTIONS.SET_MATERIAL, payload: 'ecofoam_xhd' };
    const newState = calculatorReducer(initialState, action);
    expect(newState.selectedMaterial).toBe('ecofoam_xhd');
  });
});

describe('Calculator Reducer - Mold Actions', () => {
  it('should set mold shape', () => {
    const action = { type: ACTIONS.SET_MOLD_SHAPE, payload: 'cylinder' };
    const newState = calculatorReducer(initialState, action);
    expect(newState.moldShape).toBe('cylinder');
  });

  it('should set mold dimension', () => {
    const action = {
      type: ACTIONS.SET_MOLD_DIMENSION,
      payload: { name: 'length', value: 1200 }
    };
    const newState = calculatorReducer(initialState, action);
    expect(newState.moldDimensions.length).toBe(1200);
    expect(newState.moldDimensions.width).toBe(initialState.moldDimensions.width);
  });

  it('should set mold volume', () => {
    const action = { type: ACTIONS.SET_MOLD_VOLUME, payload: 25.5 };
    const newState = calculatorReducer(initialState, action);
    expect(newState.moldVolume).toBe(25.5);
  });
});

describe('Calculator Reducer - Mix Ratio Actions', () => {
  it('should set mix input', () => {
    const action = {
      type: ACTIONS.SET_MIX_INPUT,
      payload: { name: 'polyolSG', value: 1.15 }
    };
    const newState = calculatorReducer(initialState, action);
    expect(newState.mixInputs.polyolSG).toBe(1.15);
  });

  it('should set mix results', () => {
    const results = { polyolKg: 10, isoKg: 11 };
    const action = { type: ACTIONS.SET_MIX_RESULTS, payload: results };
    const newState = calculatorReducer(initialState, action);
    expect(newState.mixResults).toEqual(results);
  });
});

describe('Calculator Reducer - Calculation Actions', () => {
  it('should start calculation', () => {
    const action = { type: ACTIONS.START_CALCULATION };
    const newState = calculatorReducer(initialState, action);
    expect(newState.loading).toBe(true);
    expect(newState.error).toBe(null);
  });

  it('should handle calculation success', () => {
    const results = { pressure: 5.2, reynolds: 2000 };
    const pressureData = [{ distance: 0, pressure: 5 }];
    const action = {
      type: ACTIONS.CALCULATION_SUCCESS,
      payload: { results, pressureVsLength: pressureData }
    };
    const newState = calculatorReducer(initialState, action);
    expect(newState.loading).toBe(false);
    expect(newState.results).toEqual(results);
    expect(newState.pressureVsLength).toEqual(pressureData);
    expect(newState.error).toBe(null);
  });

  it('should handle calculation error', () => {
    const action = {
      type: ACTIONS.CALCULATION_ERROR,
      payload: 'Calculation failed'
    };
    const newState = calculatorReducer(initialState, action);
    expect(newState.loading).toBe(false);
    expect(newState.error).toBe('Calculation failed');
  });

  it('should clear error', () => {
    const stateWithError = { ...initialState, error: 'Some error' };
    const action = { type: ACTIONS.CLEAR_ERROR };
    const newState = calculatorReducer(stateWithError, action);
    expect(newState.error).toBe(null);
  });
});

describe('Calculator Reducer - Database Actions', () => {
  it('should select from database', () => {
    const preset = {
      name: 'Test Material',
      density: 1150,
      viscosity: 400,
      polyolSG: 1.15,
      isoSG: 1.25
    };
    const action = { type: ACTIONS.SELECT_FROM_DATABASE, payload: preset };
    const newState = calculatorReducer(initialState, action);

    expect(newState.inputs.density).toBe(1150);
    expect(newState.inputs.viscosity).toBe(400);
    expect(newState.inputs.specificGravity).toBe(1.15);
    expect(newState.mixInputs.polyolSG).toBe(1.15);
    expect(newState.mixInputs.isoSG).toBe(1.25);
    expect(newState.selectedMaterialName).toBe('Test Material');
    expect(newState.showDatabase).toBe(false);
  });
});

describe('Calculator Reducer - Reset Actions', () => {
  it('should reset inputs', () => {
    const modifiedState = {
      ...initialState,
      inputs: { ...initialState.inputs, pipeLength: 999 },
      results: { pressure: 5 }
    };
    const action = { type: ACTIONS.RESET_INPUTS };
    const newState = calculatorReducer(modifiedState, action);

    expect(newState.inputs).toEqual(initialState.inputs);
    expect(newState.results).toEqual(modifiedState.results); // Results unchanged
  });

  it('should reset all state', () => {
    const modifiedState = {
      ...initialState,
      viewMode: 'advanced',
      inputs: { ...initialState.inputs, pipeLength: 999 },
      loading: true,
      results: { pressure: 5 }
    };
    const action = { type: ACTIONS.RESET_ALL };
    const newState = calculatorReducer(modifiedState, action);

    expect(newState).toEqual(initialState);
  });
});

describe('Calculator Reducer - Unknown Action', () => {
  it('should return current state for unknown action', () => {
    const action = { type: 'UNKNOWN_ACTION', payload: 'test' };
    const newState = calculatorReducer(initialState, action);
    expect(newState).toEqual(initialState);
  });

  it('should not mutate state', () => {
    const action = { type: ACTIONS.SET_INPUT, payload: { name: 'pipeLength', value: 600 } };
    const originalState = { ...initialState };
    calculatorReducer(initialState, action);
    expect(initialState).toEqual(originalState);
  });
});

describe('Action Creators', () => {
  it('should create setViewMode action', () => {
    const action = actionCreators.setViewMode('advanced');
    expect(action).toEqual({
      type: ACTIONS.SET_VIEW_MODE,
      payload: 'advanced'
    });
  });

  it('should create setInput action', () => {
    const action = actionCreators.setInput('pipeLength', 600);
    expect(action).toEqual({
      type: ACTIONS.SET_INPUT,
      payload: { name: 'pipeLength', value: 600 }
    });
  });

  it('should create startCalculation action', () => {
    const action = actionCreators.startCalculation();
    expect(action).toEqual({ type: ACTIONS.START_CALCULATION });
  });

  it('should create calculationSuccess action', () => {
    const results = { pressure: 5 };
    const pressureData = [];
    const action = actionCreators.calculationSuccess(results, pressureData);
    expect(action).toEqual({
      type: ACTIONS.CALCULATION_SUCCESS,
      payload: { results, pressureVsLength: pressureData }
    });
  });

  it('should create calculationError action', () => {
    const action = actionCreators.calculationError('Error message');
    expect(action).toEqual({
      type: ACTIONS.CALCULATION_ERROR,
      payload: 'Error message'
    });
  });
});

describe('State Immutability', () => {
  it('should not mutate original state when updating input', () => {
    const originalState = { ...initialState, inputs: { ...initialState.inputs } };
    const action = { type: ACTIONS.SET_INPUT, payload: { name: 'pipeLength', value: 600 } };

    const newState = calculatorReducer(initialState, action);

    expect(initialState).toEqual(originalState);
    expect(newState).not.toBe(initialState);
    expect(newState.inputs).not.toBe(initialState.inputs);
  });

  it('should create new objects for nested state', () => {
    const action = { type: ACTIONS.SET_INPUT, payload: { name: 'temperature', value: 30 } };
    const newState = calculatorReducer(initialState, action);

    expect(newState.inputs).not.toBe(initialState.inputs);
  });
});
