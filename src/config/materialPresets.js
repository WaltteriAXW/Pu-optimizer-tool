/**
 * Material Presets - Based on Official Foam Supplies TDS Documents
 *
 * Sources:
 * - TDS_Ecofoam_XHD_RC_EN_rev_1_15-11-24.pdf
 * - TDS_Ecospray_EC_EN_rev_2_27-01-23.pdf (Product name: Ecomate Spray EC)
 * - TDS_Genfoam_HD12_EN_rev_1_02-02-24.pdf
 * - TDS_Genfoam_HD20_EN_rev_1_02-02-24.pdf
 *
 * IMPORTANT: "Ecospray" in TDS should be displayed as "Ecomate Spray" in the UI
 */

export const MATERIAL_PRESETS = {

  // ============================================
  // ECOMATE® BLOWN SYSTEMS (Zero GWP/ODP)
  // ============================================

  ecofoam_xhd_rc: {
    id: 'ecofoam_xhd_rc',
    name: 'Ecofoam XHD RC',
    description: 'ecomate® blown rigid foam for insulating panels and cavity filling',
    category: 'ecomate',

    // --- Component Physical Properties (from TDS) ---
    polyol: {
      viscosity: 850,              // cP @ 25°C (850 ± 50)
      viscosityRange: [800, 900],
      specificGravity: 1.12,       // g/cm³ @ 25°C
      density: 1120,               // kg/m³
      appearance: 'Clear yellowish to brown liquid'
    },
    isocyanate: {
      viscosity: 200,              // cP @ 25°C (200 ± 20)
      viscosityRange: [180, 220],
      specificGravity: 1.23,       // g/cm³ @ 25°C
      density: 1230,               // kg/m³
      appearance: 'Brown liquid'
    },

    // --- Mixed Liquid Properties (for flow calculations) ---
    // Weighted average based on 100:110 mix ratio
    liquidDensity: 1177,           // kg/m³ ((1120*100 + 1230*110) / 210)
    liquidViscosity: 510,          // cP (approximate mixed viscosity)

    // --- Mix Ratio ---
    mixRatio: {
      polyol: 100,                 // parts by weight
      isocyanate: 110              // parts by weight
    },

    // --- Processing Conditions ---
    processing: {
      chemicalTemp: { min: 22, max: 25, unit: '°C' },
      moldTemp: { min: 35, max: 45, unit: '°C' }
    },

    // --- Reaction Characteristics (CRITICAL for timing) ---
    reaction: {
      creamTime: { min: 8, max: 12, unit: 's' },    // Time before foam starts rising
      gelTime: { min: 28, max: 32, unit: 's' }      // Time until foam sets
    },

    // --- Foam Properties ---
    foam: {
      freeRiseDensity: { min: 40, max: 45, unit: 'kg/m³' },
      closedCellContent: { min: 95, unit: '%' },
      thermalConductivity: { value: 0.020, range: [0.019, 0.022], unit: 'W/m·K' },
      compressiveStrength: {
        parallel: { value: 414, unit: 'kPa' },       // 60 psi
        perpendicular: { value: 275, unit: 'kPa' }   // 40 psi
      },
      dimensionalStability: {
        cold: { temp: -25, hours: 48, change: 0.5, unit: '%' },
        hot: { temp: 70, hours: 48, change: 1.0, unit: '%' }
      }
    },

    // --- Fire Properties ---
    fire: {
      classification: 'E',         // UNI EN 13501-1: 2019
      fireRetardant: true
    },

    // --- Environmental ---
    environmental: {
      gwp: 0,
      odp: 0,
      pfasFree: true,
      blowingAgent: 'ecomate® (methyl formate)',
      compliant: ['Montreal Protocol', 'Kyoto Protocol', 'Paris Agreement', 'Kigali Amendment', 'US SNAP']
    },

    // --- Storage ---
    storage: {
      temperature: { min: 10, max: 25, unit: '°C' },
      shelfLife: { polyol: 6, isocyanate: 6, unit: 'months' }
    }
  },

  ecomate_spray_ec: {
    id: 'ecomate_spray_ec',
    name: 'Ecomate Spray EC',      // NOTE: TDS says "Ecospray" but display as "Ecomate Spray"
    description: 'ecomate® blown closed-cell spray foam for continuous coatings',
    category: 'ecomate',

    // --- Component Physical Properties ---
    polyol: {
      viscosity: 300,              // cP @ 25°C (300 ± 20)
      viscosityRange: [280, 320],
      specificGravity: 1.12,       // g/cm³ @ 25°C
      density: 1120,               // kg/m³
    },
    isocyanate: {
      viscosity: 200,              // cP @ 25°C (200 ± 20)
      viscosityRange: [180, 220],
      specificGravity: 1.23,       // g/cm³ @ 25°C
      density: 1230,               // kg/m³
    },

    // --- Mixed Liquid Properties ---
    liquidDensity: 1177,           // kg/m³
    liquidViscosity: 250,          // cP (approximate)

    // --- Mix Ratio ---
    mixRatio: {
      polyol: 100,                 // parts by weight
      isocyanate: 110,             // parts by weight
      volumeRatio: { polyol: 100, isocyanate: 100 }  // 1:1 by volume
    },

    // --- Processing Conditions ---
    processing: {
      chemicalTemp: { min: 25, max: 30, unit: '°C' },
      substrateTemp: { min: 5, max: 40, unit: '°C' },
      substrateHumidity: {
        porous: { max: 20, unit: '%' },
        nonporous: 'No condensation'
      },
      layerThickness: { min: 10, max: 25, unit: 'mm' }  // 1-2.5 cm per layer
    },

    // --- Reaction Characteristics (VERY FAST) ---
    reaction: {
      creamTime: { min: 1, max: 5, unit: 's' },        // 3 ± 2 seconds
      tackFreeTime: { min: 7, max: 13, unit: 's' }     // 10 ± 3 seconds
    },

    // --- Foam Properties ---
    foam: {
      freeRiseDensity: { min: 28.8, max: 32, unit: 'kg/m³' },
      appliedDensity: { min: 31, max: 39, unit: 'kg/m³' },  // 35 ± 4
      closedCellContent: { min: 90, unit: '%' },
      thermalConductivity: { value: 0.020, range: [0.019, 0.022], unit: 'W/m·K' },
      compressiveStrength: {
        parallel: { value: 276, unit: 'kPa' },         // 40 psi
        perpendicular: { value: 166, unit: 'kPa' }     // 24 psi
      },
      dimensionalStability: {
        hotHumid: { temp: 54, humidity: 90, days: 7, change: 0.24, unit: '%' },
        cold: { temp: -62, days: 7, change: 0.22, unit: '%' }
      }
    },

    // --- Thermal Performance Table (from TDS page 3) ---
    thermalPerformance: {
      // λD (declared thermal conductivity) by thickness range
      thin: { maxThickness: 80, lambdaD: 0.028, unit: 'W/m·K' },
      medium: { minThickness: 80, maxThickness: 120, lambdaD: 0.027, unit: 'W/m·K' },
      thick: { minThickness: 120, lambdaD: 0.026, unit: 'W/m·K' }
    },

    // --- Fire Properties ---
    fire: {
      classification: 'E',
      fireRetardant: true
    },

    // --- Environmental ---
    environmental: {
      gwp: 0,
      odp: 0,
      pfasFree: true,
      blowingAgent: 'ecomate® (methyl formate)',
      compliant: ['Montreal Protocol', 'Kyoto Protocol', 'Paris Agreement', 'Kigali Amendment', 'US SNAP']
    },

    // --- Storage ---
    storage: {
      temperature: { min: 10, max: 25, unit: '°C' },
      shelfLife: { polyol: 3, isocyanate: 6, unit: 'months' }  // Note: Polyol only 3 months
    }
  },

  // ============================================
  // WATER-BLOWN SYSTEMS (Genfoam)
  // ============================================

  genfoam_hd12: {
    id: 'genfoam_hd12',
    name: 'Genfoam HD12',
    description: 'Water-blown high-density rigid foam (350-550 kg/m³ molded)',
    category: 'water-blown',

    // --- Component Physical Properties ---
    polyol: {
      viscosity: 975,              // cP @ 25°C (900-1050, midpoint)
      viscosityRange: [900, 1050],
      specificGravity: 1.07,       // g/cm³ @ 25°C
      density: 1070,               // kg/m³
    },
    isocyanate: {
      viscosity: 200,              // cP @ 25°C (200 ± 20)
      viscosityRange: [180, 220],
      specificGravity: 1.23,       // g/cm³ @ 25°C
      density: 1230,               // kg/m³
    },

    // --- Mixed Liquid Properties ---
    liquidDensity: 1154,           // kg/m³ ((1070*90 + 1230*100) / 190)
    liquidViscosity: 570,          // cP (approximate)

    // --- Mix Ratio ---
    mixRatio: {
      polyol: 90,                  // parts by weight
      isocyanate: 100              // parts by weight
    },

    // --- Processing Conditions ---
    processing: {
      chemicalTemp: { min: 22, max: 25, unit: '°C' }
    },

    // --- Reaction Characteristics (SLOW - good for large molds) ---
    reaction: {
      creamTime: { min: 50, max: 60, unit: 's' },
      gelTime: { min: 130, max: 140, unit: 's' }
    },

    // --- Foam Properties ---
    foam: {
      freeRiseDensity: { min: 195, max: 215, unit: 'kg/m³' },
      moldedDensity: { min: 350, max: 550, unit: 'kg/m³' },
      dimensionalStability: {
        cold: { temp: -20, hours: 24, change: 1, unit: '%' },
        hot: { temp: 80, hours: 24, change: 1, unit: '%' }
      }
    },

    // --- Environmental ---
    environmental: {
      gwp: 0,
      odp: 0,
      blowingAgent: 'Water'
    },

    // --- Storage ---
    storage: {
      temperature: { min: 15, max: 25, unit: '°C' },
      shelfLife: { polyol: 6, isocyanate: 6, unit: 'months' },
      notes: 'Re-mix polyol after 3 months'
    }
  },

  genfoam_hd20: {
    id: 'genfoam_hd20',
    name: 'Genfoam HD20',
    description: 'Water-blown very high-density rigid foam (400-600 kg/m³ molded)',
    category: 'water-blown',

    // --- Component Physical Properties ---
    polyol: {
      viscosity: 975,
      viscosityRange: [900, 1050],
      specificGravity: 1.07,
      density: 1070,
    },
    isocyanate: {
      viscosity: 200,
      viscosityRange: [180, 220],
      specificGravity: 1.23,
      density: 1230,
    },

    liquidDensity: 1154,
    liquidViscosity: 570,

    mixRatio: {
      polyol: 90,
      isocyanate: 100
    },

    processing: {
      chemicalTemp: { min: 22, max: 25, unit: '°C' }
    },

    reaction: {
      creamTime: { min: 50, max: 60, unit: 's' },
      gelTime: { min: 130, max: 140, unit: 's' }
    },

    foam: {
      freeRiseDensity: { min: 290, max: 315, unit: 'kg/m³' },
      moldedDensity: { min: 400, max: 600, unit: 'kg/m³' },
      dimensionalStability: {
        cold: { temp: -20, hours: 24, change: 1, unit: '%' },
        hot: { temp: 80, hours: 24, change: 1, unit: '%' }
      }
    },

    environmental: {
      gwp: 0,
      odp: 0,
      blowingAgent: 'Water'
    },

    storage: {
      temperature: { min: 15, max: 25, unit: '°C' },
      shelfLife: { polyol: 6, isocyanate: 6, unit: 'months' },
      notes: 'Re-mix polyol after 3 months'
    }
  },

  // ============================================
  // CUSTOM MATERIAL
  // ============================================

  custom: {
    id: 'custom',
    name: 'Custom Material',
    description: 'User-defined material properties',
    category: 'custom',

    polyol: {
      viscosity: 500,
      specificGravity: 1.10,
      density: 1100,
    },
    isocyanate: {
      viscosity: 200,
      specificGravity: 1.23,
      density: 1230,
    },

    liquidDensity: 1165,
    liquidViscosity: 350,

    mixRatio: {
      polyol: 100,
      isocyanate: 100
    },

    processing: {
      chemicalTemp: { min: 20, max: 30, unit: '°C' }
    },

    reaction: {
      creamTime: { min: 10, max: 30, unit: 's' },
      gelTime: { min: 60, max: 120, unit: 's' }
    },

    foam: {
      freeRiseDensity: { min: 30, max: 50, unit: 'kg/m³' }
    },

    environmental: {
      gwp: null,
      odp: null,
      blowingAgent: 'Unknown'
    }
  }
};

/**
 * Helper function to get material by ID
 */
export const getMaterialById = (id) => MATERIAL_PRESETS[id] || MATERIAL_PRESETS.custom;

/**
 * Get all materials as array for dropdowns
 */
export const getMaterialOptions = () => Object.values(MATERIAL_PRESETS);

/**
 * Get materials by category
 */
export const getMaterialsByCategory = (category) =>
  Object.values(MATERIAL_PRESETS).filter(m => m.category === category);
