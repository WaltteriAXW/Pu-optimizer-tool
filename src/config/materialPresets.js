/**
 * Material Presets Configuration
 *
 * Default material presets for polyurethane formulations
 * Updated with accurate Ecofoam/Ecomate specifications
 */

export const MATERIAL_PRESETS = {
  ecofoam_standard: {
    name: 'Ecofoam Standard (Methyl Formate)',
    density: 1120,           // kg/m³ (liquid component)
    viscosity: 350,          // cP at 25°C
    polyolSG: 1.12,
    isoSG: 1.23,
    weightRatio: [100, 110], // Polyol:Iso
    foamDensity: 32,         // kg/m³ (final foam)
    processingTemp: { min: 18, max: 25 },
    flowIndex: 0.85,
    activationEnergy: 25000  // J/mol
  },
  ecofoam_xhd: {
    name: 'Ecofoam XHD RC (High Density)',
    density: 1120,
    viscosity: 850,          // Higher viscosity
    polyolSG: 1.12,
    isoSG: 1.23,
    weightRatio: [100, 110],
    foamDensity: 40,         // Higher density foam
    processingTemp: { min: 20, max: 28 },
    flowIndex: 0.82,
    activationEnergy: 28000
  },
  ecomate_spray_ec: {
    name: 'Ecomate Spray EC',
    density: 1100,
    viscosity: 280,          // Lower for spray application
    polyolSG: 1.10,
    isoSG: 1.23,
    weightRatio: [100, 105],
    foamDensity: 28,
    processingTemp: { min: 15, max: 25 },
    flowIndex: 0.88,
    activationEnergy: 24000
  },
  custom: {
    name: 'Custom Material',
    density: 1100,
    viscosity: 400,
    polyolSG: 1.10,
    isoSG: 1.20,
    weightRatio: [100, 100],
    foamDensity: 35,
    processingTemp: { min: 15, max: 30 },
    flowIndex: 0.85,
    activationEnergy: 26000
  }
};
