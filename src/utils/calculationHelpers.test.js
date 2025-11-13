import { describe, it, expect } from 'vitest';
import {
  convertUnits,
  getMaterialProperties,
  calculateTemperatureFactor,
  calculateShearRate,
  calculateApparentViscosity,
  calculateFlowCharacteristics,
  calculatePressureDrop,
  calculateInjectionTimes,
  generatePressureProfile,
  checkMachineCompatibility,
  calculateMaxLaminarFlowRate
} from './calculationHelpers';

describe('calculationHelpers', () => {
  describe('convertUnits', () => {
    it('should convert pipe dimensions to SI units', () => {
      const inputs = {
        pipeDiameter: 12,  // mm
        pipeLength: 500,   // mm
        flowRate: 5        // L/min
      };

      const result = convertUnits(inputs);

      expect(result.radius).toBeCloseTo(0.006, 6); // 6mm in meters
      expect(result.length).toBe(0.5); // 500mm in meters
      expect(result.flowRateM3s).toBeCloseTo(0.0000833, 7);
      expect(result.area).toBeCloseTo(0.00011310, 8);
    });

    it('should handle different pipe sizes', () => {
      const inputs = {
        pipeDiameter: 25,
        pipeLength: 1000,
        flowRate: 10
      };

      const result = convertUnits(inputs);

      expect(result.radius).toBeCloseTo(0.0125, 4);
      expect(result.length).toBe(1.0);
      expect(result.flowRateM3s).toBeCloseTo(0.0001667, 7);
    });
  });

  describe('getMaterialProperties', () => {
    it('should return XHD properties for ecofoam_xhd', () => {
      const props = getMaterialProperties('ecofoam_xhd');

      expect(props.activationEnergy).toBe(28000.0);
      expect(props.powerLawIndex).toBe(0.82);
      expect(props.safetyFactor).toBe(1.5);
    });

    it('should return standard properties for other materials', () => {
      const props = getMaterialProperties('ecofoam_standard');

      expect(props.activationEnergy).toBe(25000.0);
      expect(props.powerLawIndex).toBe(0.85);
      expect(props.safetyFactor).toBe(1.5);
    });
  });

  describe('calculateTemperatureFactor', () => {
    it('should return 1.0 at reference temperature (25°C)', () => {
      const factor = calculateTemperatureFactor(25, 25000);
      expect(factor).toBeCloseTo(1.0, 5);
    });

    it('should increase viscosity at lower temperatures', () => {
      const factor = calculateTemperatureFactor(15, 25000);
      expect(factor).toBeGreaterThan(1.0);
    });

    it('should decrease viscosity at higher temperatures', () => {
      const factor = calculateTemperatureFactor(35, 25000);
      expect(factor).toBeLessThan(1.0);
    });

    it('should have greater effect with higher activation energy', () => {
      const factor1 = calculateTemperatureFactor(30, 20000);
      const factor2 = calculateTemperatureFactor(30, 30000);

      // Higher activation energy = more temperature sensitivity
      expect(Math.abs(1 - factor2)).toBeGreaterThan(Math.abs(1 - factor1));
    });
  });

  describe('calculateShearRate', () => {
    it('should calculate shear rate for circular pipe', () => {
      const flowRate = 0.0000833; // m³/s (5 L/min)
      const radius = 0.006; // m (12mm diameter)

      const shearRate = calculateShearRate(flowRate, radius);

      expect(shearRate).toBeGreaterThan(0);
      expect(shearRate).toBeCloseTo(491, 0); // Approximate value
    });

    it('should increase with higher flow rate', () => {
      const radius = 0.006;
      const lowFlow = calculateShearRate(0.00005, radius);
      const highFlow = calculateShearRate(0.0001, radius);

      expect(highFlow).toBeGreaterThan(lowFlow);
      expect(highFlow / lowFlow).toBeCloseTo(2, 1);
    });

    it('should decrease with larger radius', () => {
      const flowRate = 0.0000833;
      const smallPipe = calculateShearRate(flowRate, 0.005);
      const largePipe = calculateShearRate(flowRate, 0.010);

      expect(smallPipe).toBeGreaterThan(largePipe);
    });
  });

  describe('calculateApparentViscosity', () => {
    it('should apply temperature correction', () => {
      const baseViscosity = 0.35; // Pa·s
      const tempFactor = 1.2;
      const shearRate = 500;
      const powerLawIndex = 0.85;

      const result = calculateApparentViscosity(
        baseViscosity,
        tempFactor,
        shearRate,
        powerLawIndex
      );

      expect(result.correctedViscosity).toBeCloseTo(0.42, 2);
      expect(result.apparentViscosity).toBeGreaterThan(0);
    });

    it('should show shear-thinning behavior (n < 1)', () => {
      const baseViscosity = 0.35;
      const tempFactor = 1.0;
      const powerLawIndex = 0.85; // n < 1 = shear thinning

      const lowShear = calculateApparentViscosity(baseViscosity, tempFactor, 100, powerLawIndex);
      const highShear = calculateApparentViscosity(baseViscosity, tempFactor, 1000, powerLawIndex);

      // Higher shear rate should reduce apparent viscosity for shear-thinning fluids
      expect(highShear.apparentViscosity).toBeLessThan(lowShear.apparentViscosity);
    });
  });

  describe('calculateFlowCharacteristics', () => {
    it('should calculate velocity and Reynolds number', () => {
      const flowRate = 0.0000833; // m³/s
      const area = 0.00011310; // m²
      const density = 1120; // kg/m³
      const diameter = 12; // mm
      const viscosity = 0.42; // Pa·s

      const result = calculateFlowCharacteristics(
        flowRate,
        area,
        density,
        diameter,
        viscosity
      );

      expect(result.velocity).toBeGreaterThan(0);
      expect(result.reynolds).toBeGreaterThan(0);
      expect(result.flowRegime).toBe('Laminar'); // Re should be < 2300 for typical PU
    });

    it('should identify turbulent flow at high Reynolds numbers', () => {
      const result = calculateFlowCharacteristics(
        0.001,  // High flow rate
        0.0001,
        1000,
        20,
        0.001   // Low viscosity
      );

      expect(result.reynolds).toBeGreaterThan(2300);
      expect(result.flowRegime).toBe('Turbulent');
    });
  });

  describe('calculatePressureDrop', () => {
    it('should calculate pressure drop in Pa and bar', () => {
      const apparentViscosity = 0.38; // Pa·s
      const length = 0.5; // m
      const flowRate = 0.0000833; // m³/s
      const radius = 0.006; // m
      const powerLawIndex = 0.85;
      const safetyFactor = 1.5;

      const result = calculatePressureDrop(
        apparentViscosity,
        length,
        flowRate,
        radius,
        powerLawIndex,
        safetyFactor
      );

      expect(result.pressureDrop).toBeGreaterThan(0);
      expect(result.pressureDropBar).toBeGreaterThan(0);
      expect(result.totalPressureBar).toBeGreaterThan(result.pressureDropBar);
      expect(result.totalPressureBar).toBeCloseTo(result.pressureDropBar * safetyFactor, 2);
    });

    it('should increase pressure with length', () => {
      const params = {
        apparentViscosity: 0.38,
        flowRate: 0.0000833,
        radius: 0.006,
        powerLawIndex: 0.85,
        safetyFactor: 1.5
      };

      const short = calculatePressureDrop(params.apparentViscosity, 0.5, params.flowRate, params.radius, params.powerLawIndex, params.safetyFactor);
      const long = calculatePressureDrop(params.apparentViscosity, 1.0, params.flowRate, params.radius, params.powerLawIndex, params.safetyFactor);

      expect(long.pressureDropBar).toBeGreaterThan(short.pressureDropBar);
      expect(long.pressureDropBar / short.pressureDropBar).toBeCloseTo(2, 1);
    });

    it('should decrease pressure with larger diameter', () => {
      const params = {
        apparentViscosity: 0.38,
        length: 0.5,
        flowRate: 0.0000833,
        powerLawIndex: 0.85,
        safetyFactor: 1.5
      };

      const small = calculatePressureDrop(params.apparentViscosity, params.length, params.flowRate, 0.005, params.powerLawIndex, params.safetyFactor);
      const large = calculatePressureDrop(params.apparentViscosity, params.length, params.flowRate, 0.010, params.powerLawIndex, params.safetyFactor);

      expect(small.pressureDropBar).toBeGreaterThan(large.pressureDropBar);
    });
  });

  describe('calculateInjectionTimes', () => {
    it('should calculate pipe and mold filling times', () => {
      const radius = 0.006; // m
      const length = 0.5; // m
      const flowRate = 0.0000833; // m³/s
      const moldVolume = 2.5; // L

      const result = calculateInjectionTimes(radius, length, flowRate, moldVolume);

      expect(result.pipeVolume).toBeGreaterThan(0);
      expect(result.pipeFillingTime).toBeGreaterThan(0);
      expect(result.moldFillingTime).toBeGreaterThan(0);
      expect(result.injectionTime).toBeCloseTo(
        result.pipeFillingTime + result.moldFillingTime,
        3
      );
    });

    it('should handle zero mold volume', () => {
      const result = calculateInjectionTimes(0.006, 0.5, 0.0000833, 0);

      expect(result.moldFillingTime).toBeCloseTo(0, 6);
      expect(result.injectionTime).toBeCloseTo(result.pipeFillingTime, 3);
    });

    it('should scale linearly with flow rate', () => {
      const params = { radius: 0.006, length: 0.5, moldVolume: 2.5 };

      const slow = calculateInjectionTimes(params.radius, params.length, 0.00005, params.moldVolume);
      const fast = calculateInjectionTimes(params.radius, params.length, 0.0001, params.moldVolume);

      expect(slow.injectionTime).toBeGreaterThan(fast.injectionTime);
      expect(slow.injectionTime / fast.injectionTime).toBeCloseTo(2, 1);
    });
  });

  describe('generatePressureProfile', () => {
    it('should generate pressure data points', () => {
      const profile = generatePressureProfile(
        0.38,  // apparentViscosity
        0.0000833,  // flowRate
        0.006,  // radius
        0.85,  // powerLawIndex
        1.5,  // safetyFactor
        6.0,  // machineMaxPressure
        100,  // step
        1000  // maxLength
      );

      expect(profile).toBeInstanceOf(Array);
      expect(profile.length).toBe(10); // 1000/100 = 10 points
      expect(profile[0].length).toBe(100);
      expect(profile[profile.length - 1].length).toBe(1000);
    });

    it('should have increasing pressure with length', () => {
      const profile = generatePressureProfile(
        0.38, 0.0000833, 0.006, 0.85, 1.5, 6.0
      );

      for (let i = 1; i < profile.length; i++) {
        expect(profile[i].pressure).toBeGreaterThan(profile[i - 1].pressure);
      }
    });

    it('should include machine limit in each data point', () => {
      const machineMaxPressure = 8.0;
      const profile = generatePressureProfile(
        0.38, 0.0000833, 0.006, 0.85, 1.5, machineMaxPressure
      );

      profile.forEach(point => {
        expect(point.machineLimit).toBe(machineMaxPressure);
      });
    });
  });

  describe('checkMachineCompatibility', () => {
    it('should return compatible=true when pressure is within machine capacity', () => {
      const machineSpec = { maxPressure: 6.0, pressureRange: { min: 2, max: 6 } };
      const result = checkMachineCompatibility(4.5, machineSpec);
      expect(result.compatible).toBe(true);
      expect(result.tooLow).toBe(false);
      expect(result.tooHigh).toBe(false);
      expect(result.reason).toBe(null);
    });

    it('should return compatible=false when pressure exceeds machine capacity', () => {
      const machineSpec = { maxPressure: 6.0, pressureRange: { min: 2, max: 6 } };
      const result = checkMachineCompatibility(7.0, machineSpec);
      expect(result.compatible).toBe(false);
      expect(result.tooHigh).toBe(true);
      expect(result.tooLow).toBe(false);
      expect(result.reason).toBe('exceeds_maximum');
    });

    it('should handle exact capacity match', () => {
      const machineSpec = { maxPressure: 6.0, pressureRange: { min: 2, max: 6 } };
      const result = checkMachineCompatibility(6.0, machineSpec);
      expect(result.compatible).toBe(true);
    });

    it('should return compatible=false when pressure is below minimum operating range', () => {
      const machineSpec = { maxPressure: 200, pressureRange: { min: 100, max: 200 } };
      const result = checkMachineCompatibility(50, machineSpec);
      expect(result.compatible).toBe(false);
      expect(result.tooLow).toBe(true);
      expect(result.tooHigh).toBe(false);
      expect(result.reason).toBe('below_minimum');
    });

    it('should work with HP system (100-200 bar)', () => {
      const machineSpec = { maxPressure: 200, pressureRange: { min: 100, max: 200 } };
      const result = checkMachineCompatibility(150, machineSpec);
      expect(result.compatible).toBe(true);
    });

    it('should work with LP system (8-20 bar)', () => {
      const machineSpec = { maxPressure: 20, pressureRange: { min: 8, max: 20 } };
      const result = checkMachineCompatibility(15, machineSpec);
      expect(result.compatible).toBe(true);
    });
  });

  describe('calculateMaxLaminarFlowRate', () => {
    it('should calculate maximum laminar flow rate', () => {
      const correctedViscosity = 0.42; // Pa·s
      const density = 1120; // kg/m³
      const diameter = 12; // mm
      const area = 0.00011310; // m²

      const maxFlow = calculateMaxLaminarFlowRate(
        correctedViscosity,
        density,
        diameter,
        area
      );

      expect(maxFlow).toBeGreaterThan(0);
      expect(typeof maxFlow).toBe('number');
      expect(isFinite(maxFlow)).toBe(true);
    });

    it('should increase with larger diameter', () => {
      const params = {
        correctedViscosity: 0.42,
        density: 1120
      };

      const small = calculateMaxLaminarFlowRate(
        params.correctedViscosity,
        params.density,
        10,
        Math.PI * Math.pow(0.005, 2)
      );

      const large = calculateMaxLaminarFlowRate(
        params.correctedViscosity,
        params.density,
        20,
        Math.PI * Math.pow(0.010, 2)
      );

      expect(large).toBeGreaterThan(small);
    });

    it('should increase proportionally with viscosity (for fixed Re threshold)', () => {
      const params = {
        density: 1120,
        diameter: 12,
        area: 0.00011310
      };

      const lowVisc = calculateMaxLaminarFlowRate(0.3, params.density, params.diameter, params.area);
      const highVisc = calculateMaxLaminarFlowRate(0.6, params.density, params.diameter, params.area);

      // For Re = ρvD/μ, if we want Re < 2300, higher μ allows higher v to maintain the same Re
      // This is a property of the Reynolds number formula
      expect(highVisc).toBeGreaterThan(lowVisc);
      expect(highVisc / lowVisc).toBeCloseTo(2, 1); // Double viscosity = double max flow at same Re
    });
  });

  describe('Integration tests', () => {
    it('should perform complete calculation workflow', () => {
      // Typical polyurethane injection scenario
      const inputs = {
        pipeLength: 500,
        pipeDiameter: 12,
        temperature: 25,
        flowRate: 5,
        viscosity: 350,
        density: 1120
      };

      // Step 1: Convert units
      const { radius, length, flowRateM3s, area } = convertUnits(inputs);
      expect(radius).toBeGreaterThan(0);
      expect(length).toBeGreaterThan(0);

      // Step 2: Get material properties
      const { activationEnergy, powerLawIndex, safetyFactor } = getMaterialProperties('ecofoam_standard');
      expect(activationEnergy).toBe(25000);

      // Step 3: Calculate temperature factor
      const tempFactor = calculateTemperatureFactor(inputs.temperature, activationEnergy);
      expect(tempFactor).toBeCloseTo(1.0, 1);

      // Step 4: Calculate shear rate
      const shearRate = calculateShearRate(flowRateM3s, radius);
      expect(shearRate).toBeGreaterThan(0);

      // Step 5: Calculate viscosity
      const baseViscosity = inputs.viscosity * 0.001;
      const { correctedViscosity, apparentViscosity } = calculateApparentViscosity(
        baseViscosity,
        tempFactor,
        shearRate,
        powerLawIndex
      );
      expect(apparentViscosity).toBeGreaterThan(0);

      // Step 6: Flow characteristics
      const { velocity, reynolds, flowRegime } = calculateFlowCharacteristics(
        flowRateM3s,
        area,
        inputs.density,
        inputs.pipeDiameter,
        correctedViscosity
      );
      expect(reynolds).toBeGreaterThan(0);
      expect(flowRegime).toBe('Laminar'); // Typical PU injection is laminar

      // Step 7: Pressure drop
      const { totalPressureBar } = calculatePressureDrop(
        apparentViscosity,
        length,
        flowRateM3s,
        radius,
        powerLawIndex,
        safetyFactor
      );
      expect(totalPressureBar).toBeGreaterThan(0);
      expect(totalPressureBar).toBeLessThan(10); // Reasonable for this scenario

      // Step 8: Check compatibility
      const machineSpec = { maxPressure: 6.0, pressureRange: { min: 2, max: 6 } };
      const compatibilityResult = checkMachineCompatibility(totalPressureBar, machineSpec);
      expect(compatibilityResult).toHaveProperty('compatible');
      expect(compatibilityResult).toHaveProperty('tooLow');
      expect(compatibilityResult).toHaveProperty('tooHigh');
      expect(typeof compatibilityResult.compatible).toBe('boolean');
    });
  });
});
