import { describe, it, expect } from 'vitest';
import { VALIDATION_RANGES, CONVERSIONS, DEFAULTS } from './constants';

describe('Constants - Validation Ranges', () => {
  it('should have pipe length range', () => {
    expect(VALIDATION_RANGES.pipeLength).toEqual({
      min: 50,
      max: 10000,
      unit: 'mm',
      name: 'Pipe Length'
    });
  });

  it('should have temperature range matching the Python backend', () => {
    // These mirror src/constants.py, which is authoritative. The two tables used to
    // disagree (18-35 here vs 5-50 there), so the form rejected values the engine
    // would have accepted.
    expect(VALIDATION_RANGES.temperature).toEqual({
      min: 5,
      max: 50,
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

describe('Defaults', () => {
  it('should have correct default values', () => {
    expect(DEFAULTS.pipeLength).toBe(500);
    expect(DEFAULTS.pipeDiameter).toBe(12);
    expect(DEFAULTS.temperature).toBe(25);
    expect(DEFAULTS.flowRate).toBe(5);
  });

  it('should not carry a default material or machine', () => {
    // These were removed rather than corrected. DEFAULTS.material named
    // 'ecofoam_standard', a key absent from the material database since it became the
    // single source of truth, and DEFAULTS.machine contradicted the form's own default.
    // The form now takes its material from the first row of the CSV, so there is no
    // second place for either to go stale.
    expect(DEFAULTS.material).toBeUndefined();
    expect(DEFAULTS.machine).toBeUndefined();
  });
});
