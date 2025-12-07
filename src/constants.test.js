import { describe, it, expect } from 'vitest';
import {
  PHYSICS,
  MATERIAL_DEFAULTS,
  VALIDATION_RANGES,
  THRESHOLDS,
  CONVERSIONS,
  UI_CONFIG,
  DEFAULTS,
  validateInput,
  formatValue,
  celsiusToKelvin,
  isTurbulent,
  exceedsThreshold
} from './constants';

describe('Constants - Physics', () => {
  it('should have correct gas constant', () => {
    expect(PHYSICS.GAS_CONSTANT).toBe(8.314);
  });

  it('should have correct atmospheric pressure', () => {
    expect(PHYSICS.ATMOSPHERIC_PRESSURE_BAR).toBeCloseTo(1.01325);
  });

  it('should have correct Reynolds threshold', () => {
    expect(PHYSICS.REYNOLDS_LAMINAR_THRESHOLD).toBe(2300);
  });
});

describe('Constants - Material Defaults', () => {
  it('should have standard activation energy', () => {
    expect(MATERIAL_DEFAULTS.ACTIVATION_ENERGY_STANDARD).toBe(25000.0);
  });

  it('should have standard power law index', () => {
    expect(MATERIAL_DEFAULTS.POWER_LAW_INDEX_STANDARD).toBe(0.85);
  });

  it('should have safety factor', () => {
    expect(MATERIAL_DEFAULTS.SAFETY_FACTOR).toBe(1.5);
  });
});

describe('Constants - Validation Ranges', () => {
  it('should have pipe length range', () => {
    expect(VALIDATION_RANGES.pipeLength).toEqual({
      min: 50,
      max: 10000,
      unit: 'mm',
      name: 'Pipe Length'
    });
  });

  it('should have temperature range', () => {
    expect(VALIDATION_RANGES.temperature).toEqual({
      min: 18,
      max: 35,
      unit: '°C',
      name: 'Temperature'
    });
  });

  it('should have all required fields', () => {
    const fields = ['pipeLength', 'pipeDiameter', 'temperature', 'flowRate', 'viscosity', 'density'];
    fields.forEach(field => {
      expect(VALIDATION_RANGES[field]).toBeDefined();
      expect(VALIDATION_RANGES[field].min).toBeDefined();
      expect(VALIDATION_RANGES[field].max).toBeDefined();
      expect(VALIDATION_RANGES[field].unit).toBeDefined();
      expect(VALIDATION_RANGES[field].name).toBeDefined();
    });
  });
});

describe('Constants - Thresholds', () => {
  it('should have shear rate threshold', () => {
    expect(THRESHOLDS.SHEAR_RATE_HIGH).toBe(1000);
  });

  it('should have viscosity threshold', () => {
    expect(THRESHOLDS.VISCOSITY_HIGH).toBe(1.0);
  });

  it('should have velocity threshold', () => {
    expect(THRESHOLDS.VELOCITY_HIGH).toBe(5.0);
  });
});

describe('Constants - Conversions', () => {
  it('should convert mm to m correctly', () => {
    expect(CONVERSIONS.MM_TO_M).toBe(1 / 1000);
    expect(100 * CONVERSIONS.MM_TO_M).toBe(0.1);
  });

  it('should convert L/min to m³/s correctly', () => {
    expect(CONVERSIONS.L_PER_MIN_TO_M3_PER_SEC).toBe(1 / 60000);
    expect(60 * CONVERSIONS.L_PER_MIN_TO_M3_PER_SEC).toBe(0.001);
  });

  it('should convert cP to Pa·s correctly', () => {
    expect(CONVERSIONS.CP_TO_PA_S).toBe(0.001);
    expect(350 * CONVERSIONS.CP_TO_PA_S).toBeCloseTo(0.35, 10);
  });

  it('should convert pressure units correctly', () => {
    expect(CONVERSIONS.BAR_TO_KPA).toBe(100);
    expect(CONVERSIONS.KPA_TO_BAR).toBe(1 / 100);
    expect(5 * CONVERSIONS.BAR_TO_KPA).toBe(500);
  });

  it('should convert Celsius to Kelvin correctly', () => {
    expect(CONVERSIONS.CELSIUS_TO_KELVIN(0)).toBe(273.15);
    expect(CONVERSIONS.CELSIUS_TO_KELVIN(25)).toBe(298.15);
    expect(CONVERSIONS.CELSIUS_TO_KELVIN(100)).toBe(373.15);
  });
});

describe('Helper Functions - validateInput', () => {
  it('should validate correct pipe length', () => {
    const result = validateInput('pipeLength', 500);
    expect(result.valid).toBe(true);
  });

  it('should reject pipe length too short', () => {
    const result = validateInput('pipeLength', 30);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 50');
  });

  it('should reject pipe length too long', () => {
    const result = validateInput('pipeLength', 15000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not exceed 10000');
  });

  it('should validate correct temperature', () => {
    const result = validateInput('temperature', 25);
    expect(result.valid).toBe(true);
  });

  it('should reject temperature too low', () => {
    const result = validateInput('temperature', 10);
    expect(result.valid).toBe(false);
  });

  it('should reject temperature too high', () => {
    const result = validateInput('temperature', 40);
    expect(result.valid).toBe(false);
  });

  it('should handle invalid numbers', () => {
    const result = validateInput('pipeLength', NaN);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('valid number');
  });

  it('should return valid for unknown fields', () => {
    const result = validateInput('unknownField', 100);
    expect(result.valid).toBe(true);
  });
});

describe('Helper Functions - formatValue', () => {
  it('should format pressure with 2 decimals', () => {
    expect(formatValue(12.3456, 'pressure')).toBe('12.35');
  });

  it('should format temperature with 1 decimal', () => {
    expect(formatValue(25.6789, 'temperature')).toBe('25.7');
  });

  it('should format viscosity with 4 decimals', () => {
    expect(formatValue(0.123456, 'viscosity')).toBe('0.1235');
  });

  it('should default to 2 decimals for unknown types', () => {
    expect(formatValue(123.456, 'unknown')).toBe('123.46');
  });
});

describe('Helper Functions - celsiusToKelvin', () => {
  it('should convert 0°C to 273.15K', () => {
    expect(celsiusToKelvin(0)).toBe(273.15);
  });

  it('should convert 25°C to 298.15K', () => {
    expect(celsiusToKelvin(25)).toBe(298.15);
  });

  it('should convert negative temperatures', () => {
    expect(celsiusToKelvin(-10)).toBe(263.15);
  });
});

describe('Helper Functions - isTurbulent', () => {
  it('should return false for laminar flow', () => {
    expect(isTurbulent(1000)).toBe(false);
    expect(isTurbulent(2000)).toBe(false);
    expect(isTurbulent(2299)).toBe(false);
  });

  it('should return true for turbulent flow', () => {
    expect(isTurbulent(2301)).toBe(true);
    expect(isTurbulent(3000)).toBe(true);
    expect(isTurbulent(10000)).toBe(true);
  });

  it('should handle boundary case', () => {
    expect(isTurbulent(2300)).toBe(false);
    expect(isTurbulent(2300.1)).toBe(true);
  });
});

describe('Helper Functions - exceedsThreshold', () => {
  it('should detect when shear rate exceeds threshold', () => {
    expect(exceedsThreshold(1500, 'SHEAR_RATE_HIGH')).toBe(true);
    expect(exceedsThreshold(500, 'SHEAR_RATE_HIGH')).toBe(false);
  });

  it('should detect when viscosity exceeds threshold', () => {
    expect(exceedsThreshold(1.5, 'VISCOSITY_HIGH')).toBe(true);
    expect(exceedsThreshold(0.5, 'VISCOSITY_HIGH')).toBe(false);
  });

  it('should handle unknown thresholds', () => {
    expect(exceedsThreshold(1000, 'UNKNOWN_THRESHOLD')).toBe(false);
  });
});

describe('UI Config', () => {
  it('should have correct debounce delays', () => {
    expect(UI_CONFIG.INPUT_DEBOUNCE_DELAY).toBe(500);
    expect(UI_CONFIG.MOLD_DEBOUNCE_DELAY).toBe(300);
  });

  it('should have decimal places configuration', () => {
    expect(UI_CONFIG.DECIMAL_PLACES.pressure).toBe(2);
    expect(UI_CONFIG.DECIMAL_PLACES.temperature).toBe(1);
    expect(UI_CONFIG.DECIMAL_PLACES.viscosity).toBe(4);
  });
});

describe('Defaults', () => {
  it('should have correct default values', () => {
    expect(DEFAULTS.pipeLength).toBe(500);
    expect(DEFAULTS.pipeDiameter).toBe(12);
    expect(DEFAULTS.temperature).toBe(25);
    expect(DEFAULTS.flowRate).toBe(5);
  });

  it('should have default machine and material', () => {
    expect(DEFAULTS.machine).toBe('low_pressure');
    expect(DEFAULTS.material).toBe('ecofoam_standard');
  });
});
