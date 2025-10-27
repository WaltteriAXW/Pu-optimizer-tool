/**
 * Dimensions Database Loader
 *
 * @module utils/dimensionsDatabaseLoader
 * @description Utilities for loading and querying the pipe and mold databases.
 * Provides search, filter, and recommendation functions for selecting
 * standard pipes and molds from the comprehensive databases.
 */

// Database files will be loaded as static data
// In production, you might want to fetch these from an API or use a proper CSV parser
// For now, we'll create helper functions that work with the CSV structure

/**
 * Pipe configuration from database
 * @typedef {Object} PipeConfig
 * @property {string} pipe_id - Unique identifier (e.g., "PIPE-00523")
 * @property {number} inner_diameter_mm - Inner diameter in mm
 * @property {number} outer_diameter_mm - Outer diameter in mm
 * @property {number} wall_thickness_mm - Wall thickness in mm
 * @property {number} length_mm - Length in mm
 * @property {number} cross_section_area_mm2 - Cross-sectional area in mm²
 * @property {number} volume_liters - Internal volume in liters
 * @property {string} size_class - Size classification (Small/Medium/Large/Extra Large)
 * @property {string} length_class - Length classification (Short/Medium/Long/Extra Long)
 * @property {number} recommended_max_pressure_bar - Max recommended pressure in bar
 * @property {string} material - Pipe material
 * @property {number} surface_roughness_um - Surface roughness in μm
 * @property {number} temperature_rating_c - Max temperature in °C
 * @property {string} notes - Additional notes
 */

/**
 * Mold configuration from database
 * @typedef {Object} MoldConfig
 * @property {string} mold_id - Unique identifier (e.g., "MOLD-RECT-00150")
 * @property {string} shape - Mold shape (Rectangular/Cylindrical/Spherical)
 * @property {string} type - Size/type classification
 * @property {string} application - Typical applications
 * @property {number|null} length_mm - Length (rectangular only)
 * @property {number|null} width_mm - Width (rectangular only)
 * @property {number} height_thickness_mm - Height or thickness
 * @property {number|null} diameter_mm - Diameter (cylindrical/spherical)
 * @property {number|null} wall_thickness_mm - Wall thickness (hollow shapes)
 * @property {number} volume_liters - Foam volume in liters
 * @property {number} surface_area_mm2 - Surface area in mm²
 * @property {number} cavity_count - Number of cavities
 * @property {number} injection_points - Recommended injection points
 * @property {string} typical_material - Recommended PU material
 * @property {number} typical_density_kgm3 - Typical density in kg/m³
 * @property {number} cycle_time_estimate_s - Estimated cycle time in seconds
 * @property {string} notes - Additional notes
 */

/**
 * Parse CSV line into object or array
 * @private
 * @param {string} line - CSV line to parse
 * @param {Array<string>|null} headers - Column headers (null to return raw array)
 * @returns {Object|Array} Parsed object or array of values
 */
function parseCSVLine(line, headers) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  // If no headers provided, return raw values array
  if (!headers) {
    return values;
  }

  // Otherwise, map values to object using headers
  const obj = {};
  headers.forEach((header, index) => {
    let value = values[index] || '';
    // Remove quotes if present
    value = value.replace(/^"|"$/g, '');

    // Convert to number if it looks like a number
    if (value && !isNaN(value) && value !== '') {
      obj[header] = parseFloat(value);
    } else if (value === '') {
      obj[header] = null;
    } else {
      obj[header] = value;
    }
  });

  return obj;
}

/**
 * Parse CSV text into array of objects
 * @private
 */
function parseCSV(csvText) {
  // Normalize line endings (handle both \r\n and \n)
  const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.trim().split('\n');

  // Use parseCSVLine for headers too to handle quoted fields with commas
  const headers = parseCSVLine(lines[0], null).map(h => {
    // Remove quotes if present
    let header = h.replace(/^"|"$/g, '');
    return header.trim();
  });

  return lines.slice(1).map(line => parseCSVLine(line, headers));
}

/**
 * Load pipe database
 * NOTE: This is a placeholder. In real implementation, you'd fetch the CSV file
 *
 * @returns {Promise<PipeConfig[]>} Array of pipe configurations
 */
export async function loadPipeDatabase() {
  try {
    const response = await fetch('/Dimensions database/injection_pipe_database.csv');
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error('Failed to load pipe database:', error);
    return [];
  }
}

/**
 * Load mold database
 * NOTE: This is a placeholder. In real implementation, you'd fetch the CSV file
 *
 * @returns {Promise<MoldConfig[]>} Array of mold configurations
 */
export async function loadMoldDatabase() {
  try {
    const response = await fetch('/Dimensions database/mold_dimensions_database.csv');
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error('Failed to load mold database:', error);
    return [];
  }
}

/**
 * Find pipe by exact dimensions
 *
 * @param {PipeConfig[]} database - Pipe database
 * @param {number} diameter - Inner diameter in mm
 * @param {number} length - Length in mm
 * @returns {PipeConfig|null} Matching pipe or null
 */
export function findPipeByDimensions(database, diameter, length) {
  return database.find(p =>
    p.inner_diameter_mm === diameter &&
    p.length_mm === length
  ) || null;
}

/**
 * Find closest pipe to target dimensions
 *
 * @param {PipeConfig[]} database - Pipe database
 * @param {number} targetDiameter - Target diameter in mm
 * @param {number} targetLength - Target length in mm
 * @returns {PipeConfig|null} Closest matching pipe
 */
export function findClosestPipe(database, targetDiameter, targetLength) {
  if (database.length === 0) return null;

  return database.reduce((closest, pipe) => {
    const currentDistance = Math.sqrt(
      Math.pow(pipe.inner_diameter_mm - targetDiameter, 2) +
      Math.pow(pipe.length_mm - targetLength, 2)
    );

    const closestDistance = Math.sqrt(
      Math.pow(closest.inner_diameter_mm - targetDiameter, 2) +
      Math.pow(closest.length_mm - targetLength, 2)
    );

    return currentDistance < closestDistance ? pipe : closest;
  });
}

/**
 * Filter pipes by size class
 *
 * @param {PipeConfig[]} database - Pipe database
 * @param {string} sizeClass - Size class (Small/Medium/Large/Extra Large)
 * @returns {PipeConfig[]} Filtered pipes
 */
export function filterPipesBySize(database, sizeClass) {
  if (!sizeClass || sizeClass === 'all') return database;
  return database.filter(p => p.size_class === sizeClass);
}

/**
 * Filter pipes by length class
 *
 * @param {PipeConfig[]} database - Pipe database
 * @param {string} lengthClass - Length class (Short/Medium/Long/Extra Long)
 * @returns {PipeConfig[]} Filtered pipes
 */
export function filterPipesByLength(database, lengthClass) {
  if (!lengthClass || lengthClass === 'all') return database;
  return database.filter(p => p.length_class === lengthClass);
}

/**
 * Filter pipes by pressure rating
 *
 * @param {PipeConfig[]} database - Pipe database
 * @param {number} minPressure - Minimum required pressure in bar
 * @returns {PipeConfig[]} Filtered pipes
 */
export function filterPipesByPressure(database, minPressure) {
  return database.filter(p => p.recommended_max_pressure_bar >= minPressure);
}

/**
 * Get unique diameter options from database
 *
 * @param {PipeConfig[]} database - Pipe database
 * @returns {number[]} Sorted array of unique diameters
 */
export function getAvailableDiameters(database) {
  const diameters = [...new Set(database.map(p => p.inner_diameter_mm))];
  return diameters.sort((a, b) => a - b);
}

/**
 * Get unique length options for a diameter
 *
 * @param {PipeConfig[]} database - Pipe database
 * @param {number} diameter - Diameter to filter by
 * @returns {number[]} Sorted array of available lengths
 */
export function getAvailableLengths(database, diameter) {
  const lengths = database
    .filter(p => p.inner_diameter_mm === diameter)
    .map(p => p.length_mm);
  return [...new Set(lengths)].sort((a, b) => a - b);
}

/**
 * Find mold by ID
 *
 * @param {MoldConfig[]} database - Mold database
 * @param {string} moldId - Mold ID (e.g., "MOLD-RECT-00150")
 * @returns {MoldConfig|null} Matching mold or null
 */
export function findMoldById(database, moldId) {
  return database.find(m => m.mold_id === moldId) || null;
}

/**
 * Filter molds by shape
 *
 * @param {MoldConfig[]} database - Mold database
 * @param {string} shape - Shape (Rectangular/Cylindrical/Spherical)
 * @returns {MoldConfig[]} Filtered molds
 */
export function filterMoldsByShape(database, shape) {
  if (!shape || shape === 'all') return database;
  return database.filter(m => m.shape === shape);
}

/**
 * Filter molds by application
 *
 * @param {MoldConfig[]} database - Mold database
 * @param {string} application - Application keyword
 * @returns {MoldConfig[]} Filtered molds
 */
export function filterMoldsByApplication(database, application) {
  if (!application) return database;
  const searchTerm = application.toLowerCase();
  return database.filter(m =>
    m.application.toLowerCase().includes(searchTerm)
  );
}

/**
 * Filter molds by volume range
 *
 * @param {MoldConfig[]} database - Mold database
 * @param {number} minVolume - Minimum volume in liters
 * @param {number} maxVolume - Maximum volume in liters
 * @returns {MoldConfig[]} Filtered molds
 */
export function filterMoldsByVolume(database, minVolume, maxVolume) {
  return database.filter(m =>
    m.volume_liters >= minVolume &&
    m.volume_liters <= maxVolume
  );
}

/**
 * Suggest optimal pipe for a mold based on target cycle time
 *
 * @param {PipeConfig[]} pipeDatabase - Pipe database
 * @param {MoldConfig} mold - Selected mold
 * @param {number} targetCycleTime - Target cycle time in seconds (default: 60)
 * @param {number} maxPressure - Maximum available pressure in bar (default: 8)
 * @returns {PipeConfig|null} Suggested pipe or null
 */
export function suggestPipeForMold(pipeDatabase, mold, targetCycleTime = 60, maxPressure = 8) {
  // Calculate required flow rate (L/min)
  const requiredFlowRate = (mold.volume_liters / targetCycleTime) * 60;

  // Estimate optimal diameter using simplified formula
  // Q = v × A, where v ≈ 1.5 m/s is a reasonable velocity
  const targetVelocity = 1.5; // m/s
  const requiredArea = (requiredFlowRate / 60000) / targetVelocity; // m²
  const optimalDiameter = 2 * Math.sqrt(requiredArea / Math.PI) * 1000; // mm

  // Find pipes that can handle the pressure and are close to optimal diameter
  const suitablePipes = pipeDatabase.filter(p =>
    p.recommended_max_pressure_bar >= maxPressure
  );

  if (suitablePipes.length === 0) return null;

  // Find closest to optimal diameter
  return findClosestPipe(suitablePipes, optimalDiameter, 500); // Assume 500mm length
}

/**
 * Calculate material requirements for a mold
 *
 * @param {MoldConfig} mold - Mold configuration
 * @param {number} quantity - Number of parts
 * @param {number} foamDensity - Foam density in kg/m³ (default: 40)
 * @param {number} mixRatio - Polyol:Iso ratio (default: 100:110)
 * @returns {Object} Material requirements (without waste factor - apply separately)
 */
export function calculateMaterialRequirements(mold, quantity = 1, foamDensity = 40, mixRatio = { polyol: 100, iso: 110 }) {
  const totalVolume_L = mold.volume_liters * quantity;
  const totalMass_kg = totalVolume_L * foamDensity;

  const ratioSum = mixRatio.polyol + mixRatio.iso;
  const polyol_kg = totalMass_kg * (mixRatio.polyol / ratioSum);
  const iso_kg = totalMass_kg * (mixRatio.iso / ratioSum);

  return {
    mold_id: mold.mold_id,
    quantity,
    foam_volume_L: totalVolume_L,
    polyol_needed_kg: parseFloat(polyol_kg.toFixed(2)),
    iso_needed_kg: parseFloat(iso_kg.toFixed(2)),
    total_material_kg: parseFloat(totalMass_kg.toFixed(2)),
    production_time_min: parseFloat(((mold.cycle_time_estimate_s * quantity) / 60).toFixed(1)),
    parts_per_hour: parseFloat((3600 / mold.cycle_time_estimate_s).toFixed(1))
  };
}

/**
 * Get popular/recommended molds for beginners
 *
 * @param {MoldConfig[]} database - Mold database
 * @param {number} count - Number of recommendations (default: 6)
 * @returns {MoldConfig[]} Recommended molds
 */
export function getRecommendedMolds(database, count = 6) {
  // Select a variety of common applications
  const recommendations = [];

  // Small refrigerator panel
  const smallPanel = database.find(m =>
    m.shape === 'Rectangular' &&
    m.volume_liters >= 10 &&
    m.volume_liters <= 50 &&
    m.application.includes('Refrigerator')
  );
  if (smallPanel) recommendations.push(smallPanel);

  // Medium water heater
  const waterHeater = database.find(m =>
    m.shape === 'Cylindrical' &&
    m.volume_liters >= 50 &&
    m.volume_liters <= 150 &&
    m.application.includes('Water Heater')
  );
  if (waterHeater) recommendations.push(waterHeater);

  // Door core
  const doorCore = database.find(m =>
    m.shape === 'Rectangular' &&
    m.volume_liters >= 1 &&
    m.volume_liters <= 10 &&
    m.application.includes('Door')
  );
  if (doorCore) recommendations.push(doorCore);

  // Fill remaining with varied sizes
  const remaining = database
    .filter(m => !recommendations.includes(m))
    .sort((a, b) => Math.random() - 0.5)
    .slice(0, count - recommendations.length);

  return [...recommendations, ...remaining].slice(0, count);
}

export default {
  loadPipeDatabase,
  loadMoldDatabase,
  findPipeByDimensions,
  findClosestPipe,
  filterPipesBySize,
  filterPipesByLength,
  filterPipesByPressure,
  getAvailableDiameters,
  getAvailableLengths,
  findMoldById,
  filterMoldsByShape,
  filterMoldsByApplication,
  filterMoldsByVolume,
  suggestPipeForMold,
  calculateMaterialRequirements,
  getRecommendedMolds
};
