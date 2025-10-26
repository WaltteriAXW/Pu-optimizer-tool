import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  validateField,
  validateInputs,
  validateProcessParameters,
  sanitizeNumber,
  clamp,
  getFieldConstraints
} from './validation';

describe('ValidationError', () => {
  it('should create error with message', () => {
    const error = new ValidationError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('ValidationError');
  });

  it('should create error with field', () => {
    const error = new ValidationError('Test error', 'pipeLength');
    expect(error.field).toBe('pipeLength');
  });
});

describe('validateField', () => {
  it('should validate correct pipe length', () => {
    const result = validateField('pipeLength', 500);
    expect(result.valid).toBe(true);
  });

  it('should reject pipe length below minimum', () => {
    const result = validateField('pipeLength', 30);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 50 mm');
    expect(result.field).toBe('pipeLength');
  });

  it('should reject pipe length above maximum', () => {
    const result = validateField('pipeLength', 15000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not exceed 10000 mm');
  });

  it('should validate temperature in range', () => {
    expect(validateField('temperature', 25).valid).toBe(true);
    expect(validateField('temperature', 5).valid).toBe(true);
    expect(validateField('temperature', 50).valid).toBe(true);
  });

  it('should reject temperature out of range', () => {
    expect(validateField('temperature', 0).valid).toBe(false);
    expect(validateField('temperature', 60).valid).toBe(false);
  });

  it('should handle string numbers', () => {
    const result = validateField('pipeLength', '500');
    expect(result.valid).toBe(true);
  });

  it('should reject invalid numbers', () => {
    const result = validateField('pipeLength', NaN);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('valid number');
  });

  it('should reject infinite numbers', () => {
    const result = validateField('pipeLength', Infinity);
    expect(result.valid).toBe(false);
  });

  it('should return valid for unknown fields', () => {
    const result = validateField('unknownField', 100);
    expect(result.valid).toBe(true);
  });
});

describe('validateInputs', () => {
  const validInputs = {
    pipeLength: 500,
    pipeDiameter: 12,
    temperature: 25,
    flowRate: 5,
    viscosity: 350,
    density: 1120
  };

  it('should validate correct inputs', () => {
    const result = validateInputs(validInputs);
    expect(result.valid).toBe(true);
  });

  it('should reject invalid pipe length', () => {
    const result = validateInputs({...validInputs, pipeLength: 30});
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Pipe Length');
  });

  it('should reject invalid temperature', () => {
    const result = validateInputs({...validInputs, temperature: 60});
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Temperature');
  });

  it('should reject multiple invalid inputs', () => {
    const result = validateInputs({
      ...validInputs,
      pipeLength: 30,
      temperature: 60
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it('should detect diameter too large for length', () => {
    const result = validateInputs({
      ...validInputs,
      pipeLength: 100,
      pipeDiameter: 60
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('unusually large');
  });

  it('should include all errors in error message', () => {
    const result = validateInputs({
      pipeLength: 10,
      pipeDiameter: -5,
      temperature: 100,
      flowRate: -1,
      viscosity: 0,
      density: 500
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('validateProcessParameters', () => {
  const validParams = {
    reynolds: 2000,
    shearRate: 500,
    apparentViscosity: 0.5,
    velocity: 3,
    pressureBar: 5,
    temperature: 25,
    machineMaxPressure: 8,
    fillTime: 5
  };

  it('should validate correct parameters', () => {
    const result = validateProcessParameters(validParams);
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('should warn about turbulent flow', () => {
    const result = validateProcessParameters({
      ...validParams,
      reynolds: 3000
    });
    expect(result.valid).toBe(false);
    expect(result.hasWarnings).toBe(true);
    expect(result.warnings[0]).toContain('turbulent');
  });

  it('should warn about high shear rate', () => {
    const result = validateProcessParameters({
      ...validParams,
      shearRate: 1500
    });
    expect(result.warnings.some(w => w.includes('shear rate'))).toBe(true);
  });

  it('should warn about high viscosity', () => {
    const result = validateProcessParameters({
      ...validParams,
      apparentViscosity: 1.5
    });
    expect(result.warnings.some(w => w.includes('viscosity'))).toBe(true);
  });

  it('should warn about high velocity', () => {
    const result = validateProcessParameters({
      ...validParams,
      velocity: 6
    });
    expect(result.warnings.some(w => w.includes('velocity'))).toBe(true);
  });

  it('should warn about pressure exceeding machine capacity', () => {
    const result = validateProcessParameters({
      ...validParams,
      pressureBar: 10,
      machineMaxPressure: 8
    });
    expect(result.warnings.some(w => w.includes('exceeds machine capacity'))).toBe(true);
  });

  it('should warn about fill time too fast', () => {
    const result = validateProcessParameters({
      ...validParams,
      fillTime: 1
    });
    expect(result.warnings.some(w => w.includes('fast fill'))).toBe(true);
  });

  it('should warn about fill time too slow', () => {
    const result = validateProcessParameters({
      ...validParams,
      fillTime: 35
    });
    expect(result.warnings.some(w => w.includes('Slow fill'))).toBe(true);
  });

  it('should provide recommendations', () => {
    const result = validateProcessParameters({
      ...validParams,
      reynolds: 3000
    });
    expect(result.hasRecommendations).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('should handle low temperature', () => {
    const result = validateProcessParameters({
      ...validParams,
      temperature: 15
    });
    expect(result.recommendations.some(r => r.includes('temperature'))).toBe(true);
  });

  it('should handle high temperature', () => {
    const result = validateProcessParameters({
      ...validParams,
      temperature: 40
    });
    expect(result.warnings.some(w => w.includes('High temperature'))).toBe(true);
  });
});

describe('sanitizeNumber', () => {
  it('should return number as-is', () => {
    expect(sanitizeNumber(42)).toBe(42);
    expect(sanitizeNumber(3.14)).toBe(3.14);
  });

  it('should parse string numbers', () => {
    expect(sanitizeNumber('42')).toBe(42);
    expect(sanitizeNumber('3.14')).toBe(3.14);
  });

  it('should return default for invalid input', () => {
    expect(sanitizeNumber('invalid', 10)).toBe(10);
    expect(sanitizeNumber(NaN, 5)).toBe(5);
    expect(sanitizeNumber(null, 0)).toBe(0);
    expect(sanitizeNumber(undefined, 7)).toBe(7);
  });

  it('should use 0 as default if not specified', () => {
    expect(sanitizeNumber('invalid')).toBe(0);
  });

  it('should handle negative numbers', () => {
    expect(sanitizeNumber(-42)).toBe(-42);
    expect(sanitizeNumber('-3.14')).toBe(-3.14);
  });
});

describe('clamp', () => {
  it('should clamp value to minimum', () => {
    expect(clamp(5, 10, 20)).toBe(10);
  });

  it('should clamp value to maximum', () => {
    expect(clamp(25, 10, 20)).toBe(20);
  });

  it('should return value if in range', () => {
    expect(clamp(15, 10, 20)).toBe(15);
  });

  it('should handle equal min and max', () => {
    expect(clamp(5, 10, 10)).toBe(10);
  });

  it('should handle negative ranges', () => {
    expect(clamp(-15, -10, -5)).toBe(-10);
    expect(clamp(-3, -10, -5)).toBe(-5);
  });
});

describe('getFieldConstraints', () => {
  it('should return constraints for pipe length', () => {
    const constraints = getFieldConstraints('pipeLength');
    expect(constraints.min).toBe(50);
    expect(constraints.max).toBe(10000);
    expect(constraints.step).toBeDefined();
    expect(constraints.placeholder).toContain('50-10000 mm');
  });

  it('should return constraints for temperature', () => {
    const constraints = getFieldConstraints('temperature');
    expect(constraints.min).toBe(5);
    expect(constraints.max).toBe(50);
  });

  it('should calculate appropriate step for large ranges', () => {
    const constraints = getFieldConstraints('pipeLength');
    expect(constraints.step).toBe(10);
  });

  it('should calculate appropriate step for small ranges', () => {
    const constraints = getFieldConstraints('temperature');
    expect(constraints.step).toBe(0.1);
  });

  it('should return empty constraints for unknown fields', () => {
    const constraints = getFieldConstraints('unknownField');
    expect(constraints.min).toBeUndefined();
    expect(constraints.max).toBeUndefined();
  });
});
