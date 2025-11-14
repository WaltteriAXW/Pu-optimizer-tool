/**
 * Machine Specifications Configuration
 *
 * Polyurethane Machine Specifications - Two-Category System
 * High-Pressure vs Low-Pressure Category System
 */

export const MACHINE_SPECS = {
  high_pressure: {
    name: 'High-Pressure (HP) System',
    category: 'High-Pressure',
    output: '5-200+ kg/min',
    outputRange: { min: 5, max: 200 }, // kg/min
    maxPressure: 200.0, // bar (typical max ~197 bar / 2800 PSI)
    pressureRange: { min: 100, max: 200 }, // bar
    minOperatingPressure: 100, // bar - minimum pressure for proper operation
    processLoss: {
      mixingHead: 15, // bar - High-energy impingement mixing head loss
      valves: 5, // bar - Check valves, shut-off valves
      filters: 3, // bar - In-line filters
      fittings: 2, // bar - Hose connections and fittings
      total: 25 // bar - Total process losses
    },
    tankCapacity: 'Variable',
    feedLineDiameterA: '4-8 mm', // A component (tight lines, high shear)
    feedLineDiameterB: '4-8 mm', // B component (symmetric for 1:1 ratio)
    pumpType: 'Axial piston / High-pressure gear / Variable displacement',
    shearRateRange: { min: 2000, max: 10000 }, // s⁻¹
    mixHeadType: 'L-style / R-style / Dual-tilted injection (High-energy stream impingement)',
    powerLawIndex: 0.65, // n (typical 0.60-0.70)
    activationEnergy: 42500, // J/mol (typical 35-50 kJ/mol)
    laminarFlowLimit: 175, // bar (up to 150-200 bar at max output)
    application: 'Rigid foam, integral skin, insulation, dense composites',
    description: 'Requires precise, fast mixing',
    manufacturer: 'Generic High-Pressure System'
  },
  low_pressure: {
    name: 'Low-Pressure (LP) System',
    category: 'Low-Pressure',
    output: '2-300+ kg/min',
    outputRange: { min: 2, max: 300 }, // kg/min
    maxPressure: 20.0, // bar (gentle, controlled delivery)
    pressureRange: { min: 8, max: 20 }, // bar
    minOperatingPressure: 8, // bar - minimum pressure for proper operation
    processLoss: {
      mixingHead: 2, // bar - Mechanical mixer chamber loss
      valves: 1, // bar - Check valves, shut-off valves
      filters: 0.5, // bar - In-line filters
      fittings: 0.5, // bar - Hose connections and fittings
      total: 4 // bar - Total process losses
    },
    tankCapacity: 'Variable (Modular)',
    feedLineDiameterA: '10-16 mm', // A component (larger lines reduce shear)
    feedLineDiameterB: '10-16 mm', // B component (generous sizing)
    pumpType: 'Gear pump (external, fixed/variable displacement, e.g., KCB83.3 ~160 kg/min)',
    shearRateRange: { min: 100, max: 1500 }, // s⁻¹
    mixHeadType: 'Mechanical mixer / Dynamic mix chamber (moving paddles/rotor, slower speeds)',
    powerLawIndex: 0.70, // n (typical 0.65-0.75)
    activationEnergy: 42500, // J/mol (typical 35-50 kJ/mol)
    laminarFlowLimit: 12.5, // bar (up to 10-15 bar at max output)
    application: 'Flexible foam, elastomers, CASE (coatings/adhesives/sealants), high-viscosity casting',
    description: 'Handles higher viscosities with less agitation',
    manufacturer: 'Generic Low-Pressure System'
  }
};
