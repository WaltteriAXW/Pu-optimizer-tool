import { useReducer } from 'react';
import { calculatorReducer, initialState, actionCreators } from '../reducers/calculatorReducer';

/**
 * Custom hook for calculator state management
 *
 * Provides a clean API for managing calculator state using useReducer
 *
 * @returns {Object} State and action dispatchers
 *
 * @example
 * const { state, actions } = useCalculatorState();
 *
 * // Update a single input
 * actions.setInput('pipeLength', 600);
 *
 * // Update multiple inputs at once
 * actions.setInputs({ pipeLength: 600, temperature: 30 });
 *
 * // Start a calculation
 * actions.startCalculation();
 *
 * // Handle calculation success
 * actions.calculationSuccess(results, pressureData);
 */
export function useCalculatorState() {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);

  // Create bound action dispatchers
  const actions = {
    // UI Actions
    setViewMode: (mode) => dispatch(actionCreators.setViewMode(mode)),
    toggleDatabase: () => dispatch(actionCreators.toggleDatabase()),
    toggleMixRatio: () => dispatch(actionCreators.toggleMixRatio()),
    toggleMoldDimensions: () => dispatch(actionCreators.toggleMoldDimensions()),

    // Input Actions
    setInput: (name, value) => dispatch(actionCreators.setInput(name, value)),
    setInputs: (inputs) => dispatch(actionCreators.setInputs(inputs)),
    setMachine: (machine) => dispatch(actionCreators.setMachine(machine)),
    setMaterial: (material) => dispatch(actionCreators.setMaterial(material)),

    // Mold Actions
    setMoldShape: (shape) => dispatch(actionCreators.setMoldShape(shape)),
    setMoldDimension: (name, value) => dispatch(actionCreators.setMoldDimension(name, value)),
    setMoldVolume: (volume) => dispatch(actionCreators.setMoldVolume(volume)),

    // Mix Ratio Actions
    setMixInput: (name, value) => dispatch(actionCreators.setMixInput(name, value)),
    setMixResults: (results) => dispatch(actionCreators.setMixResults(results)),

    // Calculation Actions
    startCalculation: () => dispatch(actionCreators.startCalculation()),
    calculationSuccess: (results, pressureVsLength) =>
      dispatch(actionCreators.calculationSuccess(results, pressureVsLength)),
    calculationError: (error) => dispatch(actionCreators.calculationError(error)),
    clearError: () => dispatch(actionCreators.clearError()),

    // Database Actions
    selectFromDatabase: (preset) => dispatch(actionCreators.selectFromDatabase(preset)),

    // Reset Actions
    resetInputs: () => dispatch(actionCreators.resetInputs()),
    resetAll: () => dispatch(actionCreators.resetAll())
  };

  return { state, actions, dispatch };
}

export default useCalculatorState;
