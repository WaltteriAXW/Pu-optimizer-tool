import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalculatorState } from './useCalculatorState';
import { ACTIONS } from '../reducers/calculatorReducer';

describe('useCalculatorState', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useCalculatorState());

    expect(result.current.state.viewMode).toBe('simple');
    expect(result.current.state.showDatabase).toBe(false);
    expect(result.current.state.selectedMachine).toBe('low_pressure');
    expect(result.current.state.selectedMaterial).toBe('ecofoam_standard');
    expect(result.current.state.loading).toBe(false);
    expect(result.current.state.error).toBe(null);
  });

  it('should provide action dispatchers', () => {
    const { result } = renderHook(() => useCalculatorState());

    expect(typeof result.current.actions.setViewMode).toBe('function');
    expect(typeof result.current.actions.toggleDatabase).toBe('function');
    expect(typeof result.current.actions.setInput).toBe('function');
    expect(typeof result.current.actions.startCalculation).toBe('function');
  });

  describe('UI Actions', () => {
    it('should toggle view mode', () => {
      const { result } = renderHook(() => useCalculatorState());

      act(() => {
        result.current.actions.setViewMode('advanced');
      });

      expect(result.current.state.viewMode).toBe('advanced');
    });

    it('should toggle database visibility', () => {
      const { result } = renderHook(() => useCalculatorState());

      expect(result.current.state.showDatabase).toBe(false);

      act(() => {
        result.current.actions.toggleDatabase();
      });

      expect(result.current.state.showDatabase).toBe(true);

      act(() => {
        result.current.actions.toggleDatabase();
      });

      expect(result.current.state.showDatabase).toBe(false);
    });

    it('should toggle mix ratio section', () => {
      const { result } = renderHook(() => useCalculatorState());

      expect(result.current.state.mixRatioExpanded).toBe(false);

      act(() => {
        result.current.actions.toggleMixRatio();
      });

      expect(result.current.state.mixRatioExpanded).toBe(true);
    });

    it('should toggle mold dimensions section', () => {
      const { result } = renderHook(() => useCalculatorState());

      expect(result.current.state.moldDimensionsExpanded).toBe(true);

      act(() => {
        result.current.actions.toggleMoldDimensions();
      });

      expect(result.current.state.moldDimensionsExpanded).toBe(false);
    });
  });

  describe('Input Actions', () => {
    it('should update a single input', () => {
      const { result } = renderHook(() => useCalculatorState());

      act(() => {
        result.current.actions.setInput('pipeLength', 1000);
      });

      expect(result.current.state.inputs.pipeLength).toBe(1000);
      // Other inputs should remain unchanged
      expect(result.current.state.inputs.pipeDiameter).toBe(12);
    });

    it('should update multiple inputs at once', () => {
      const { result } = renderHook(() => useCalculatorState());

      act(() => {
        result.current.actions.setInputs({
          pipeLength: 800,
          pipeDiameter: 15,
          temperature: 30
        });
      });

      expect(result.current.state.inputs.pipeLength).toBe(800);
      expect(result.current.state.inputs.pipeDiameter).toBe(15);
      expect(result.current.state.inputs.temperature).toBe(30);
      // Other inputs should remain unchanged
      expect(result.current.state.inputs.flowRate).toBe(5);
    });

    it('should update selected machine', () => {
      const { result } = renderHook(() => useCalculatorState());

      act(() => {
        result.current.actions.setMachine('high_pressure');
      });

      expect(result.current.state.selectedMachine).toBe('high_pressure');
    });

    it('should update selected material', () => {
      const { result } = renderHook(() => useCalculatorState());

      act(() => {
        result.current.actions.setMaterial('ecofoam_xhd');
      });

      expect(result.current.state.selectedMaterial).toBe('ecofoam_xhd');
    });
  });

  describe('Mold Actions', () => {
    it('should update mold shape', () => {
      const { result } = renderHook(() => useCalculatorState());

      act(() => {
        result.current.actions.setMoldShape('cylinder');
      });

      expect(result.current.state.moldShape).toBe('cylinder');
    });

    it('should update a single mold dimension', () => {
      const { result } = renderHook(() => useCalculatorState());

      act(() => {
        result.current.actions.setMoldDimension('length', 1500);
      });

      expect(result.current.state.moldDimensions.length).toBe(1500);
      // Other dimensions should remain unchanged
      expect(result.current.state.moldDimensions.width).toBe(500);
    });

    it('should update mold volume', () => {
      const { result } = renderHook(() => useCalculatorState());

      act(() => {
        result.current.actions.setMoldVolume(2.5);
      });

      expect(result.current.state.moldVolume).toBe(2.5);
    });
  });

  describe('Mix Ratio Actions', () => {
    it('should update a single mix input', () => {
      const { result } = renderHook(() => useCalculatorState());

      act(() => {
        result.current.actions.setMixInput('polyolSG', 1.15);
      });

      expect(result.current.state.mixInputs.polyolSG).toBe(1.15);
      // Other mix inputs should remain unchanged
      expect(result.current.state.mixInputs.isoSG).toBe(1.23);
    });

    it('should set mix results', () => {
      const { result } = renderHook(() => useCalculatorState());

      const mixResults = {
        polyolKg: '1.234',
        isoKg: '1.357',
        totalWeight: '2.591'
      };

      act(() => {
        result.current.actions.setMixResults(mixResults);
      });

      expect(result.current.state.mixResults).toEqual(mixResults);
    });
  });

  describe('Calculation Actions', () => {
    it('should start calculation', () => {
      const { result } = renderHook(() => useCalculatorState());

      act(() => {
        result.current.actions.startCalculation();
      });

      expect(result.current.state.loading).toBe(true);
      expect(result.current.state.error).toBe(null);
    });

    it('should handle calculation success', () => {
      const { result } = renderHook(() => useCalculatorState());

      const mockResults = { pressure: 3.5, flowRegime: 'Laminar' };
      const mockPressureData = [{ length: 100, pressure: 1.5 }];

      act(() => {
        result.current.actions.startCalculation();
      });

      act(() => {
        result.current.actions.calculationSuccess(mockResults, mockPressureData);
      });

      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.results).toEqual(mockResults);
      expect(result.current.state.pressureVsLength).toEqual(mockPressureData);
      expect(result.current.state.error).toBe(null);
    });

    it('should handle calculation error', () => {
      const { result } = renderHook(() => useCalculatorState());

      const errorMessage = 'Invalid pipe diameter';

      act(() => {
        result.current.actions.startCalculation();
      });

      act(() => {
        result.current.actions.calculationError(errorMessage);
      });

      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.error).toBe(errorMessage);
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useCalculatorState());

      act(() => {
        result.current.actions.calculationError('Some error');
      });

      expect(result.current.state.error).toBe('Some error');

      act(() => {
        result.current.actions.clearError();
      });

      expect(result.current.state.error).toBe(null);
    });
  });

  describe('Database Actions', () => {
    it('should select preset from database', () => {
      const { result } = renderHook(() => useCalculatorState());

      const preset = {
        name: 'Custom Preset',
        density: 1150,
        viscosity: 400,
        polyolSG: 1.15,
        isoSG: 1.25
      };

      act(() => {
        result.current.actions.selectFromDatabase(preset);
      });

      expect(result.current.state.inputs.density).toBe(1150);
      expect(result.current.state.inputs.viscosity).toBe(400);
      expect(result.current.state.inputs.specificGravity).toBe(1.15);
      expect(result.current.state.mixInputs.polyolSG).toBe(1.15);
      expect(result.current.state.mixInputs.isoSG).toBe(1.25);
      expect(result.current.state.selectedMaterialName).toBe('Custom Preset');
      expect(result.current.state.showDatabase).toBe(false);
    });
  });

  describe('Reset Actions', () => {
    it('should reset inputs to defaults', () => {
      const { result } = renderHook(() => useCalculatorState());

      // Modify some inputs
      act(() => {
        result.current.actions.setInputs({
          pipeLength: 1000,
          temperature: 35
        });
        result.current.actions.setMoldDimension('length', 2000);
      });

      // Reset
      act(() => {
        result.current.actions.resetInputs();
      });

      expect(result.current.state.inputs.pipeLength).toBe(500);
      expect(result.current.state.inputs.temperature).toBe(25);
      expect(result.current.state.moldDimensions.length).toBe(1000);
    });

    it('should reset all state', () => {
      const { result } = renderHook(() => useCalculatorState());

      // Modify various parts of state
      act(() => {
        result.current.actions.setViewMode('advanced');
        result.current.actions.toggleDatabase();
        result.current.actions.setInput('pipeLength', 1000);
        result.current.actions.calculationError('Test error');
      });

      // Verify state was modified
      expect(result.current.state.viewMode).toBe('advanced');
      expect(result.current.state.showDatabase).toBe(true);
      expect(result.current.state.inputs.pipeLength).toBe(1000);
      expect(result.current.state.error).toBe('Test error');

      // Reset all
      act(() => {
        result.current.actions.resetAll();
      });

      // Verify everything is back to defaults
      expect(result.current.state.viewMode).toBe('simple');
      expect(result.current.state.showDatabase).toBe(false);
      expect(result.current.state.inputs.pipeLength).toBe(500);
      expect(result.current.state.error).toBe(null);
    });
  });
});
