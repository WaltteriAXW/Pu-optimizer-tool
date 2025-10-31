/**
 * Calculator State Management Reducer
 *
 * @module reducers/calculatorReducer
 * @description Centralized state management for the Polyurethane Calculator using the reducer pattern.
 * Consolidates multiple useState hooks into a single useReducer for better state organization,
 * predictable updates, and easier testing.
 *
 * This module provides:
 * - Action types (ACTIONS)
 * - Initial state definition (initialState)
 * - Reducer function (calculatorReducer)
 * - Action creator helpers (actionCreators)
 *
 * @example
 * import { useReducer } from 'react';
 * import { calculatorReducer, initialState, actionCreators } from './reducers/calculatorReducer';
 *
 * function MyComponent() {
 *   const [state, dispatch] = useReducer(calculatorReducer, initialState);
 *
 *   // Update a single input
 *   dispatch(actionCreators.setInput('pipeLength', 600));
 *
 *   // Start calculation
 *   dispatch(actionCreators.startCalculation());
 * }
 *
 * @see {@link module:hooks/useCalculatorState} for a convenient wrapper hook
 */

/**
 * Action types enumeration
 *
 * Defines all available actions for the calculator reducer.
 * Using constants prevents typos and enables IDE autocomplete.
 *
 * @constant {Object}
 * @property {string} SET_VIEW_MODE - Switch between simple/advanced views
 * @property {string} TOGGLE_DATABASE - Toggle material database visibility
 * @property {string} TOGGLE_MIX_RATIO - Toggle mix ratio calculator
 * @property {string} TOGGLE_MOLD_DIMENSIONS - Toggle mold dimensions editor
 * @property {string} SET_INPUT - Update a single input field
 * @property {string} SET_INPUTS - Update multiple input fields at once
 * @property {string} SET_MACHINE - Select machine preset
 * @property {string} SET_MATERIAL - Select material preset
 * @property {string} SET_MOLD_SHAPE - Change mold shape
 * @property {string} SET_MOLD_DIMENSION - Update a mold dimension
 * @property {string} SET_MOLD_VOLUME - Set calculated mold volume
 * @property {string} SET_MIX_INPUT - Update mix ratio input
 * @property {string} SET_MIX_RESULTS - Set mix ratio calculation results
 * @property {string} START_CALCULATION - Begin calculation (sets loading state)
 * @property {string} CALCULATION_SUCCESS - Calculation completed successfully
 * @property {string} CALCULATION_ERROR - Calculation failed with error
 * @property {string} CLEAR_ERROR - Clear error message
 * @property {string} SELECT_FROM_DATABASE - Load preset from database
 * @property {string} RESET_INPUTS - Reset inputs to defaults
 * @property {string} RESET_ALL - Reset entire state to initial
 */
export const ACTIONS = {
  // UI Actions
  SET_VIEW_MODE: 'SET_VIEW_MODE',
  TOGGLE_DATABASE: 'TOGGLE_DATABASE',
  TOGGLE_MIX_RATIO: 'TOGGLE_MIX_RATIO',
  TOGGLE_MOLD_DIMENSIONS: 'TOGGLE_MOLD_DIMENSIONS',

  // Input Actions
  SET_INPUT: 'SET_INPUT',
  SET_INPUTS: 'SET_INPUTS',
  SET_MACHINE: 'SET_MACHINE',
  SET_MATERIAL: 'SET_MATERIAL',

  // Mold Actions
  SET_MOLD_SHAPE: 'SET_MOLD_SHAPE',
  SET_MOLD_DIMENSION: 'SET_MOLD_DIMENSION',
  SET_MOLD_VOLUME: 'SET_MOLD_VOLUME',

  // Mix Ratio Actions
  SET_MIX_INPUT: 'SET_MIX_INPUT',
  SET_MIX_RESULTS: 'SET_MIX_RESULTS',

  // Calculation Actions
  START_CALCULATION: 'START_CALCULATION',
  CALCULATION_SUCCESS: 'CALCULATION_SUCCESS',
  CALCULATION_ERROR: 'CALCULATION_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',

  // Database Actions
  SELECT_FROM_DATABASE: 'SELECT_FROM_DATABASE',

  // Reset Actions
  RESET_INPUTS: 'RESET_INPUTS',
  RESET_ALL: 'RESET_ALL'
};

/**
 * Calculator state structure
 * @typedef {Object} CalculatorState
 * @property {string} viewMode - Current view mode ('simple' or 'advanced')
 * @property {boolean} showDatabase - Whether material database is visible
 * @property {boolean} mixRatioExpanded - Whether mix ratio calculator is expanded
 * @property {boolean} moldDimensionsExpanded - Whether mold dimensions editor is expanded
 * @property {string} selectedMaterialName - Name of currently selected material
 * @property {string} selectedMachine - ID of selected machine preset
 * @property {string} selectedMaterial - ID of selected material preset
 * @property {Object} inputs - Calculator input values
 * @property {string} moldShape - Current mold shape ('rectangular', 'cylindrical', 'spherical', 'hollow')
 * @property {Object} moldDimensions - Mold dimension values
 * @property {number} moldVolume - Calculated mold volume in liters
 * @property {Object} mixInputs - Mix ratio calculator inputs
 * @property {Object|null} mixResults - Mix ratio calculation results
 * @property {Object|null} results - Main calculation results
 * @property {Array} pressureVsLength - Pressure profile data for charting
 * @property {string|null} error - Error message if calculation failed
 * @property {boolean} loading - Whether calculation is in progress
 */

/**
 * Initial state for calculator
 *
 * Defines default values for all state properties.
 * Used when initializing the reducer and for reset operations.
 *
 * @constant {CalculatorState}
 */
export const initialState = {
  // UI State
  viewMode: 'simple',
  showDatabase: false,
  mixRatioExpanded: false,
  moldDimensionsExpanded: true,
  selectedMaterialName: '',

  // Selection State
  selectedMachine: 'low_pressure',
  selectedMaterial: 'ecofoam_standard',

  // Input State
  inputs: {
    pipeLength: 500,
    pipeDiameter: 12,
    temperature: 25,
    flowRate: 5,
    viscosity: 350,
    density: 1120,
    specificGravity: 1.12
  },

  // Mold State
  moldShape: 'rectangular',
  moldDimensions: {
    length: 1000,
    width: 500,
    height: 50,
    diameter: 500,
    cylinderHeight: 1000,
    sphereDiameter: 500,
    wallThickness: 50
  },
  moldVolume: 0,

  // Mix Ratio State
  mixInputs: {
    polyolSG: 1.12,
    isoSG: 1.23,
    partVolume: 1.0
  },
  mixResults: null,

  // Calculation State
  results: null,
  pressureVsLength: [],
  error: null,
  loading: false
};

/**
 * Main reducer function
 */
export function calculatorReducer(state, action) {
  switch (action.type) {
    // UI Actions
    case ACTIONS.SET_VIEW_MODE:
      return {
        ...state,
        viewMode: action.payload
      };

    case ACTIONS.TOGGLE_DATABASE:
      return {
        ...state,
        showDatabase: !state.showDatabase
      };

    case ACTIONS.TOGGLE_MIX_RATIO:
      return {
        ...state,
        mixRatioExpanded: !state.mixRatioExpanded
      };

    case ACTIONS.TOGGLE_MOLD_DIMENSIONS:
      return {
        ...state,
        moldDimensionsExpanded: !state.moldDimensionsExpanded
      };

    // Input Actions
    case ACTIONS.SET_INPUT:
      return {
        ...state,
        inputs: {
          ...state.inputs,
          [action.payload.name]: action.payload.value
        }
      };

    case ACTIONS.SET_INPUTS:
      return {
        ...state,
        inputs: {
          ...state.inputs,
          ...action.payload
        }
      };

    case ACTIONS.SET_MACHINE:
      return {
        ...state,
        selectedMachine: action.payload
      };

    case ACTIONS.SET_MATERIAL:
      return {
        ...state,
        selectedMaterial: action.payload
      };

    // Mold Actions
    case ACTIONS.SET_MOLD_SHAPE:
      return {
        ...state,
        moldShape: action.payload
      };

    case ACTIONS.SET_MOLD_DIMENSION:
      return {
        ...state,
        moldDimensions: {
          ...state.moldDimensions,
          [action.payload.name]: action.payload.value
        }
      };

    case ACTIONS.SET_MOLD_VOLUME:
      return {
        ...state,
        moldVolume: action.payload
      };

    // Mix Ratio Actions
    case ACTIONS.SET_MIX_INPUT:
      return {
        ...state,
        mixInputs: {
          ...state.mixInputs,
          [action.payload.name]: action.payload.value
        }
      };

    case ACTIONS.SET_MIX_RESULTS:
      return {
        ...state,
        mixResults: action.payload
      };

    // Calculation Actions
    case ACTIONS.START_CALCULATION:
      return {
        ...state,
        loading: true,
        error: null
      };

    case ACTIONS.CALCULATION_SUCCESS:
      return {
        ...state,
        loading: false,
        results: action.payload.results,
        pressureVsLength: action.payload.pressureVsLength,
        error: null
      };

    case ACTIONS.CALCULATION_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    case ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    // Database Actions
    case ACTIONS.SELECT_FROM_DATABASE:
      return {
        ...state,
        inputs: {
          ...state.inputs,
          density: action.payload.density,
          viscosity: action.payload.viscosity,
          specificGravity: action.payload.density / 1000
        },
        mixInputs: {
          ...state.mixInputs,
          polyolSG: action.payload.polyolSG,
          isoSG: action.payload.isoSG
        },
        selectedMaterialName: action.payload.name,
        showDatabase: false
      };

    // Reset Actions
    case ACTIONS.RESET_INPUTS:
      return {
        ...state,
        inputs: initialState.inputs,
        moldDimensions: initialState.moldDimensions,
        mixInputs: initialState.mixInputs
      };

    case ACTIONS.RESET_ALL:
      return initialState;

    default:
      console.warn(`Unknown action type: ${action.type}`);
      return state;
  }
}

/**
 * Action creators for common operations
 */
export const actionCreators = {
  setViewMode: (mode) => ({ type: ACTIONS.SET_VIEW_MODE, payload: mode }),
  toggleDatabase: () => ({ type: ACTIONS.TOGGLE_DATABASE }),
  toggleMixRatio: () => ({ type: ACTIONS.TOGGLE_MIX_RATIO }),
  toggleMoldDimensions: () => ({ type: ACTIONS.TOGGLE_MOLD_DIMENSIONS }),

  setInput: (name, value) => ({ type: ACTIONS.SET_INPUT, payload: { name, value } }),
  setInputs: (inputs) => ({ type: ACTIONS.SET_INPUTS, payload: inputs }),
  setMachine: (machine) => ({ type: ACTIONS.SET_MACHINE, payload: machine }),
  setMaterial: (material) => ({ type: ACTIONS.SET_MATERIAL, payload: material }),

  setMoldShape: (shape) => ({ type: ACTIONS.SET_MOLD_SHAPE, payload: shape }),
  setMoldDimension: (name, value) => ({ type: ACTIONS.SET_MOLD_DIMENSION, payload: { name, value } }),
  setMoldVolume: (volume) => ({ type: ACTIONS.SET_MOLD_VOLUME, payload: volume }),

  setMixInput: (name, value) => ({ type: ACTIONS.SET_MIX_INPUT, payload: { name, value } }),
  setMixResults: (results) => ({ type: ACTIONS.SET_MIX_RESULTS, payload: results }),

  startCalculation: () => ({ type: ACTIONS.START_CALCULATION }),
  calculationSuccess: (results, pressureVsLength) => ({
    type: ACTIONS.CALCULATION_SUCCESS,
    payload: { results, pressureVsLength }
  }),
  calculationError: (error) => ({ type: ACTIONS.CALCULATION_ERROR, payload: error }),
  clearError: () => ({ type: ACTIONS.CLEAR_ERROR }),

  selectFromDatabase: (preset) => ({ type: ACTIONS.SELECT_FROM_DATABASE, payload: preset }),

  resetInputs: () => ({ type: ACTIONS.RESET_INPUTS }),
  resetAll: () => ({ type: ACTIONS.RESET_ALL })
};
