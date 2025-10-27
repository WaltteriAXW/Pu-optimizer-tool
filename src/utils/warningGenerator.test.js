import { describe, it, expect } from 'vitest';
import {
  generateWarnings,
  simplifyWarning,
  simplifyRecommendation
} from './warningGenerator';

describe('warningGenerator', () => {
  describe('generateWarnings', () => {
    it('should return empty warnings for optimal parameters', () => {
      const params = {
        reynolds: 2000, // Laminar
        shearRate: 500, // Low
        velocity: 2.0,  // Moderate
        temperature: 25,
        totalPressureBar: 4.0,
        moldFillingTime: 10,
        moldVolume: 2.5,
        flowRateKgMin: 5,
        compatible: true,
        machine: { maxPressure: 6.0, output: '10-50 kg/min' },
        correctedViscosity: 0.4,
        density: 1120,
        diameter: 12,
        area: 0.00011310,
        machineSpecs: {}
      };

      const { warnings, recommendations } = generateWarnings(params);

      expect(warnings).toBeInstanceOf(Array);
      expect(recommendations).toBeInstanceOf(Array);
      // Should have minimal warnings for good parameters
      expect(warnings.length).toBeLessThan(3);
    });

    it('should warn about turbulent flow', () => {
      const params = {
        reynolds: 3000, // Turbulent
        shearRate: 500,
        velocity: 2.0,
        temperature: 25,
        totalPressureBar: 4.0,
        moldFillingTime: 10,
        moldVolume: 2.5,
        flowRateKgMin: 5,
        compatible: true,
        machine: { maxPressure: 6.0, output: '10-50 kg/min' },
        correctedViscosity: 0.4,
        density: 1120,
        diameter: 12,
        area: 0.00011310,
        machineSpecs: {}
      };

      const { warnings, recommendations } = generateWarnings(params);

      expect(warnings.some(w => w.includes('turbulent'))).toBe(true);
      expect(recommendations.some(r => r.includes('laminar'))).toBe(true);
    });

    it('should warn about high shear rate', () => {
      const params = {
        reynolds: 2000,
        shearRate: 1500, // High shear rate
        velocity: 2.0,
        temperature: 25,
        totalPressureBar: 4.0,
        moldFillingTime: 10,
        moldVolume: 2.5,
        flowRateKgMin: 5,
        compatible: true,
        machine: { maxPressure: 6.0, output: '10-50 kg/min' },
        correctedViscosity: 0.4,
        density: 1120,
        diameter: 12,
        area: 0.00011310,
        machineSpecs: {}
      };

      const { warnings, recommendations } = generateWarnings(params);

      expect(warnings.some(w => w.includes('shear rate'))).toBe(true);
      expect(recommendations.some(r =>
        r.includes('diameter') || r.includes('flow rate')
      )).toBe(true);
    });

    it('should warn about machine incompatibility', () => {
      const params = {
        reynolds: 2000,
        shearRate: 500,
        velocity: 2.0,
        temperature: 25,
        totalPressureBar: 7.0, // Exceeds capacity
        moldFillingTime: 10,
        moldVolume: 2.5,
        flowRateKgMin: 5,
        compatible: false,
        machine: { maxPressure: 6.0, output: '10-50 kg/min' },
        correctedViscosity: 0.4,
        density: 1120,
        diameter: 12,
        area: 0.00011310,
        machineSpecs: {}
      };

      const { warnings, recommendations } = generateWarnings(params);

      expect(warnings.some(w => w.includes('exceeds machine capacity'))).toBe(true);
      expect(recommendations.some(r =>
        r.includes('diameter') || r.includes('capacity')
      )).toBe(true);
    });

    it('should warn about high velocity', () => {
      const params = {
        reynolds: 2000,
        shearRate: 500,
        velocity: 6.0, // High velocity
        temperature: 25,
        totalPressureBar: 4.0,
        moldFillingTime: 10,
        moldVolume: 2.5,
        flowRateKgMin: 5,
        compatible: true,
        machine: { maxPressure: 6.0, output: '10-50 kg/min' },
        correctedViscosity: 0.4,
        density: 1120,
        diameter: 12,
        area: 0.00011310,
        machineSpecs: {}
      };

      const { warnings, recommendations } = generateWarnings(params);

      expect(warnings.some(w => w.includes('velocity'))).toBe(true);
    });

    it('should provide temperature recommendations for low temp', () => {
      const params = {
        reynolds: 2000,
        shearRate: 500,
        velocity: 2.0,
        temperature: 15, // Low temperature
        totalPressureBar: 4.0,
        moldFillingTime: 10,
        moldVolume: 2.5,
        flowRateKgMin: 5,
        compatible: true,
        machine: { maxPressure: 6.0, output: '10-50 kg/min' },
        correctedViscosity: 0.4,
        density: 1120,
        diameter: 12,
        area: 0.00011310,
        machineSpecs: {}
      };

      const { recommendations } = generateWarnings(params);

      expect(recommendations.some(r => r.includes('temperature'))).toBe(true);
    });

    it('should warn about high temperature', () => {
      const params = {
        reynolds: 2000,
        shearRate: 500,
        velocity: 2.0,
        temperature: 40, // High temperature
        totalPressureBar: 4.0,
        moldFillingTime: 10,
        moldVolume: 2.5,
        flowRateKgMin: 5,
        compatible: true,
        machine: { maxPressure: 6.0, output: '10-50 kg/min' },
        correctedViscosity: 0.4,
        density: 1120,
        diameter: 12,
        area: 0.00011310,
        machineSpecs: {}
      };

      const { warnings } = generateWarnings(params);

      expect(warnings.some(w => w.includes('temperature'))).toBe(true);
    });

    it('should warn about fast mold filling', () => {
      const params = {
        reynolds: 2000,
        shearRate: 500,
        velocity: 2.0,
        temperature: 25,
        totalPressureBar: 4.0,
        moldFillingTime: 1.5, // Too fast
        moldVolume: 2.5,
        flowRateKgMin: 5,
        compatible: true,
        machine: { maxPressure: 6.0, output: '10-50 kg/min' },
        correctedViscosity: 0.4,
        density: 1120,
        diameter: 12,
        area: 0.00011310,
        machineSpecs: {}
      };

      const { warnings, recommendations } = generateWarnings(params);

      expect(warnings.some(w => w.includes('fast'))).toBe(true);
      expect(warnings.some(w => w.includes('air entrapment'))).toBe(true);
      expect(recommendations.some(r => r.includes('Reduce flow rate'))).toBe(true);
    });

    it('should warn about slow mold filling', () => {
      const params = {
        reynolds: 2000,
        shearRate: 500,
        velocity: 2.0,
        temperature: 25,
        totalPressureBar: 4.0,
        moldFillingTime: 35, // Too slow
        moldVolume: 2.5,
        flowRateKgMin: 5,
        compatible: true,
        machine: { maxPressure: 6.0, output: '10-50 kg/min' },
        correctedViscosity: 0.4,
        density: 1120,
        diameter: 12,
        area: 0.00011310,
        machineSpecs: {}
      };

      const { warnings, recommendations } = generateWarnings(params);

      expect(warnings.some(w => w.includes('Slow'))).toBe(true);
      expect(warnings.some(w => w.includes('gelation'))).toBe(true);
      expect(recommendations.some(r => r.includes('Increase flow rate'))).toBe(true);
    });

    it('should recommend mold clamping for high pressure', () => {
      const params = {
        reynolds: 2000,
        shearRate: 500,
        velocity: 2.0,
        temperature: 25,
        totalPressureBar: 7.0, // High pressure
        moldFillingTime: 10,
        moldVolume: 2.5,
        flowRateKgMin: 5,
        compatible: true,
        machine: { maxPressure: 8.0, output: '10-50 kg/min' },
        correctedViscosity: 0.4,
        density: 1120,
        diameter: 12,
        area: 0.00011310,
        machineSpecs: {}
      };

      const { recommendations } = generateWarnings(params);

      expect(recommendations.some(r => r.includes('clamping'))).toBe(true);
    });

    it('should handle zero mold volume', () => {
      const params = {
        reynolds: 2000,
        shearRate: 500,
        velocity: 2.0,
        temperature: 25,
        totalPressureBar: 4.0,
        moldFillingTime: 0,
        moldVolume: 0, // No mold
        flowRateKgMin: 5,
        compatible: true,
        machine: { maxPressure: 6.0, output: '10-50 kg/min' },
        correctedViscosity: 0.4,
        density: 1120,
        diameter: 12,
        area: 0.00011310,
        machineSpecs: {}
      };

      const { warnings, recommendations } = generateWarnings(params);

      // Should not generate mold-specific warnings
      expect(warnings.every(w => !w.includes('mold'))).toBe(true);
    });

    it('should suggest suitable machines when incompatible', () => {
      const machineSpecs = {
        weak: { name: 'Weak Machine', maxPressure: 4.0 },
        medium: { name: 'Medium Machine', maxPressure: 6.0 },
        strong: { name: 'Strong Machine', maxPressure: 10.0 }
      };

      const params = {
        reynolds: 2000,
        shearRate: 500,
        velocity: 2.0,
        temperature: 25,
        totalPressureBar: 7.0,
        moldFillingTime: 10,
        moldVolume: 2.5,
        flowRateKgMin: 5,
        compatible: false,
        machine: { maxPressure: 4.0, output: '10-50 kg/min' },
        correctedViscosity: 0.4,
        density: 1120,
        diameter: 12,
        area: 0.00011310,
        machineSpecs
      };

      const { recommendations } = generateWarnings(params);

      const upgradeRec = recommendations.find(r => r.includes('upgrading'));
      expect(upgradeRec).toBeDefined();
    });
  });

  describe('simplifyWarning', () => {
    it('should remove Reynolds number details', () => {
      const warning = 'Flow is turbulent (Re = 3500 > 2300) - consider reducing flow rate';
      const simplified = simplifyWarning(warning);

      expect(simplified).not.toContain('Re =');
      expect(simplified).not.toContain('3500');
      expect(simplified).toContain('Flow is turbulent');
    });

    it('should remove shear rate values', () => {
      const warning = 'High shear rate (1200 s⁻¹) may degrade material';
      const simplified = simplifyWarning(warning);

      expect(simplified).not.toContain('(1200 s⁻¹)');
      expect(simplified).toContain('High shear rate');
    });

    it('should remove pressure values', () => {
      const warning = 'Required pressure (7.5 bar) exceeds machine capacity';
      const simplified = simplifyWarning(warning);

      expect(simplified).not.toContain('(7.5 bar)');
      expect(simplified).toContain('Required pressure');
    });

    it('should remove temperature values', () => {
      const warning = 'High temperature (40°C) may accelerate reaction';
      const simplified = simplifyWarning(warning);

      expect(simplified).not.toContain('(40°C)');
      expect(simplified).toContain('High temperature');
    });

    it('should remove time values', () => {
      const warning = 'Very fast mold filling (1.5s) may cause air entrapment';
      const simplified = simplifyWarning(warning);

      expect(simplified).not.toContain('(1.5s)');
      expect(simplified).toContain('Very fast mold filling');
    });

    it('should handle warnings without values', () => {
      const warning = 'Check mold clamping force';
      const simplified = simplifyWarning(warning);

      expect(simplified).toBe('Check mold clamping force');
    });

    it('should normalize whitespace', () => {
      const warning = 'Flow  is   turbulent  (Re = 3500 > 2300)';
      const simplified = simplifyWarning(warning);

      expect(simplified).not.toContain('  '); // No double spaces
      expect(simplified.trim()).toBe(simplified); // No leading/trailing spaces
    });
  });

  describe('simplifyRecommendation', () => {
    it('should remove specific flow rate values', () => {
      const rec = 'Reduce flow rate below 8.5 L/min for laminar flow';
      const simplified = simplifyRecommendation(rec);

      expect(simplified).not.toContain('8.5 L/min');
      expect(simplified).toContain('Reduce flow rate');
    });

    it('should remove specific time values', () => {
      const rec = 'Reduce flow rate to increase fill time above 2 seconds';
      const simplified = simplifyRecommendation(rec);

      expect(simplified).not.toContain('above 2 seconds');
      expect(simplified).toContain('Reduce flow rate');
    });

    it('should remove specific temperature ranges', () => {
      const rec = 'Consider increasing temperature to 20-35°C for better flow';
      const simplified = simplifyRecommendation(rec);

      expect(simplified).not.toContain('20-35°C');
      expect(simplified).toContain('Consider increasing temperature');
    });

    it('should handle recommendations without specific values', () => {
      const rec = 'Increase pipe diameter or reduce flow rate';
      const simplified = simplifyRecommendation(rec);

      expect(simplified).toBe('Increase pipe diameter or reduce flow rate');
    });

    it('should normalize whitespace', () => {
      const rec = 'Reduce  flow  rate  below 8.5 L/min';
      const simplified = simplifyRecommendation(rec);

      expect(simplified).not.toContain('  '); // No double spaces
    });
  });

  describe('Edge cases', () => {
    it('should handle extreme parameter values', () => {
      const params = {
        reynolds: 100000, // Extremely turbulent
        shearRate: 5000, // Extremely high
        velocity: 15.0, // Extremely high
        temperature: 50, // Very high
        totalPressureBar: 15.0, // Way over capacity
        moldFillingTime: 0.5, // Extremely fast
        moldVolume: 10.0,
        flowRateKgMin: 100,
        compatible: false,
        machine: { maxPressure: 6.0, output: '10-50 kg/min' },
        correctedViscosity: 2.0,
        density: 1120,
        diameter: 12,
        area: 0.00011310,
        machineSpecs: {}
      };

      const { warnings, recommendations } = generateWarnings(params);

      // Should generate multiple warnings
      expect(warnings.length).toBeGreaterThan(3);
      expect(recommendations.length).toBeGreaterThan(3);
    });

    it('should handle missing machine specs', () => {
      const params = {
        reynolds: 2000,
        shearRate: 500,
        velocity: 2.0,
        temperature: 25,
        totalPressureBar: 7.0,
        moldFillingTime: 10,
        moldVolume: 2.5,
        flowRateKgMin: 5,
        compatible: false,
        machine: { maxPressure: 6.0, output: '10-50 kg/min' },
        correctedViscosity: 0.4,
        density: 1120,
        diameter: 12,
        area: 0.00011310,
        machineSpecs: null
      };

      expect(() => generateWarnings(params)).not.toThrow();
    });
  });
});
