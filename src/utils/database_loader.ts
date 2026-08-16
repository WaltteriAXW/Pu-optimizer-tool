/**
 * Polyurethane Foam Database Loader
 *
 * Loads and parses the polyurethane foam database CSV, which is the single source of
 * truth for the materials the optimizer offers. The CSV is imported at build time, so
 * adding a material is a one-row edit with no code change and no runtime fetch.
 */

import csvText from '@/data/polyurethane_foam_database.csv?raw'

export interface PolyurethaneProduct {
  // Identification
  Material_Key: string;
  Product_Name: string;
  Product_Type: string;
  Polyol_Component: string;
  Isocyanate_Component: string;
  Application_Type: string;
  Blowing_Agent: string;

  // Component Properties
  Polyol_Viscosity_cP: string;
  Polyol_Specific_Gravity: string;
  Isocyanate_Viscosity_cP: string;
  Isocyanate_Specific_Gravity: string;

  // Rheology (drives the pressure model)
  Viscosity_Reference_Temp_C: string;
  Flow_Index: string;
  Activation_Energy_J_mol: string;

  // Mix Ratios
  Mix_Ratio_Weight_Polyol: string;
  Mix_Ratio_Weight_Iso: string;
  Mix_Ratio_Volume_Polyol: string;
  Mix_Ratio_Volume_Iso: string;

  // Process Temperatures
  Polyol_Temp_C: string;
  Iso_Temp_C: string;
  Mold_Substrate_Temp_C_Min: string;
  Mold_Substrate_Temp_C_Max: string;

  // Reaction Times
  Cream_Time_s_Min: string;
  Cream_Time_s_Max: string;
  Gel_Time_s_Min: string;
  Gel_Time_s_Max: string;
  Tack_Free_Time_s_Min: string;
  Tack_Free_Time_s_Max: string;

  // Density Properties
  Free_Rise_Density_kg_m3_Min: string;
  Free_Rise_Density_kg_m3_Max: string;
  Molded_Density_kg_m3_Min: string;
  Molded_Density_kg_m3_Max: string;
  Overall_Applied_Density_kg_m3: string;

  // Dimensional Stability
  Dim_Stability_24h_Minus20C_Max_Percent: string;
  Dim_Stability_24h_Plus80C_Max_Percent: string;
  Dim_Stability_48h_Minus25C_Max_Percent: string;
  Dim_Stability_48h_Plus70C_Max_Percent: string;

  // Mechanical Properties
  Compressive_Strength_Parallel_kPa_Min: string;
  Compressive_Strength_Perpendicular_kPa_Min: string;
  Closed_Cell_Content_Percent_Min: string;

  // Thermal Properties
  Initial_K_Factor_W_mK_Min: string;
  Initial_K_Factor_W_mK_Max: string;
  Declared_Lambda_80mm_W_mK: string;
  Declared_Lambda_120mm_W_mK: string;

  // Fire Rating
  Fire_Rating_EN13501: string;

  // Storage Requirements
  Polyol_Storage_Temp_C_Min: string;
  Polyol_Storage_Temp_C_Max: string;
  Iso_Storage_Temp_C_Min: string;
  Iso_Storage_Temp_C_Max: string;
  Polyol_Shelf_Life_Months: string;
  Iso_Shelf_Life_Months: string;

  // Regulatory
  CE_Marked: string;
  DoP_Number: string;
  Standard: string;
  GWP: string;
  ODP: string;
  PFAS_Free: string;

  // Application Requirements
  Substrate_Humidity_Porous_Max: string;
  Substrate_Humidity_Nonporous: string;
  Layer_Thickness_cm_Min: string;
  Layer_Thickness_cm_Max: string;

  // Notes
  Notes: string;
}

/**
 * Physics properties derived from a product's two components.
 *
 * The optimizer models the mixed liquid travelling down a single line, so neither the
 * polyol nor the isocyanate figure is usable on its own — both are blended here.
 */
export interface DerivedMaterialPhysics {
  /** Mixed liquid viscosity at the reference temperature (cP) */
  viscosity_cp: number;
  /** Mixed liquid density before foaming (kg/m³) */
  density_kg_m3: number;
  /** Temperature the component viscosities were measured at (°C) */
  reference_temp_c: number;
  /** Power-law flow behaviour index */
  flow_index: number;
  /** Arrhenius activation energy (J/mol) */
  activation_energy_j_mol: number;
  /** Density of the cured foam, not the liquid (kg/m³) */
  final_density_kg_m3: number;
}

let cachedDatabase: PolyurethaneProduct[] | null = null;

/**
 * Parse a single CSV line, handling quoted values with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Parse the database CSV.
 *
 * Rows whose field count does not match the header are rejected rather than mapped, since
 * a short or long row silently shifts every column after it — which is exactly how foam
 * densities once ended up in the viscosity columns.
 */
export function parseCSV(csv: string): PolyurethaneProduct[] {
  const normalizedCsv = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedCsv.trim().split('\n').filter(line => line.trim() !== '');

  if (lines.length === 0) {
    throw new Error('Material database is empty');
  }

  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());

  return lines.slice(1).map((line, index) => {
    const values = parseCSVLine(line);

    if (values.length !== headers.length) {
      const name = values[1] || values[0] || `row ${index + 2}`;
      throw new Error(
        `Material database row "${name}" has ${values.length} fields but the header has ` +
        `${headers.length}. Every row must have exactly one field per column.`
      );
    }

    const product: Record<string, string> = {};
    headers.forEach((header, i) => {
      product[header] = values[i];
    });

    if (!product.Material_Key) {
      throw new Error(
        `Material database row "${product.Product_Name || `row ${index + 2}`}" is missing ` +
        'a Material_Key.'
      );
    }

    return product as unknown as PolyurethaneProduct;
  });
}

function getDatabase(): PolyurethaneProduct[] {
  if (!cachedDatabase) {
    cachedDatabase = parseCSV(csvText);
  }
  return cachedDatabase;
}

/**
 * Parse a viscosity cell written as a range ("900-1050") or a tolerance ("200±20").
 * Returns the midpoint of a range, or the nominal value of a tolerance.
 */
export function parseViscosity(value: string): number {
  const text = (value || '').trim();

  if (text.includes('±')) {
    return parseFloat(text.split('±')[0]);
  }

  if (text.includes('-')) {
    const [min, max] = text.split('-').map(v => parseFloat(v));
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return (min + max) / 2;
    }
  }

  return parseFloat(text);
}

/** Parse a numeric cell, returning null when it is empty or unparseable. */
function parseNumber(value: string): number | null {
  const parsed = parseFloat((value || '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function requireNumber(value: string, column: string, product: string): number {
  const parsed = parseNumber(value);
  if (parsed === null) {
    throw new Error(`Material "${product}" is missing a valid ${column}.`);
  }
  return parsed;
}

function requireViscosity(value: string, column: string, product: string): number {
  const parsed = parseViscosity(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Material "${product}" is missing a valid ${column}.`);
  }
  return parsed;
}

/**
 * Derive the mixed-liquid physics the pressure model needs from a product's two components.
 *
 * Density uses volume-additive mixing, viscosity uses logarithmic blending on volume
 * fractions (the standard Arrhenius blending rule for miscible liquids). Both are
 * properties of the liquid being pumped, and are unrelated to the density of the cured
 * foam, which is reported separately as final_density_kg_m3.
 */
export function deriveMaterialPhysics(product: PolyurethaneProduct): DerivedMaterialPhysics {
  const name = product.Product_Name || product.Material_Key;

  const polyolViscosity = requireViscosity(product.Polyol_Viscosity_cP, 'Polyol_Viscosity_cP', name);
  const isoViscosity = requireViscosity(product.Isocyanate_Viscosity_cP, 'Isocyanate_Viscosity_cP', name);
  const polyolSg = requireNumber(product.Polyol_Specific_Gravity, 'Polyol_Specific_Gravity', name);
  const isoSg = requireNumber(product.Isocyanate_Specific_Gravity, 'Isocyanate_Specific_Gravity', name);
  const polyolParts = requireNumber(product.Mix_Ratio_Weight_Polyol, 'Mix_Ratio_Weight_Polyol', name);
  const isoParts = requireNumber(product.Mix_Ratio_Weight_Iso, 'Mix_Ratio_Weight_Iso', name);

  if (polyolParts + isoParts <= 0) {
    throw new Error(`Material "${name}" has a zero total mix ratio.`);
  }

  const polyolDensity = polyolSg * 1000;
  const isoDensity = isoSg * 1000;

  // Mass fractions from the weight mix ratio
  const totalParts = polyolParts + isoParts;
  const polyolMassFraction = polyolParts / totalParts;
  const isoMassFraction = isoParts / totalParts;

  // Specific volumes, from which both the mixed density and the volume fractions follow
  const polyolSpecificVolume = polyolMassFraction / polyolDensity;
  const isoSpecificVolume = isoMassFraction / isoDensity;
  const totalSpecificVolume = polyolSpecificVolume + isoSpecificVolume;

  const density_kg_m3 = 1 / totalSpecificVolume;
  const polyolVolumeFraction = polyolSpecificVolume / totalSpecificVolume;
  const isoVolumeFraction = isoSpecificVolume / totalSpecificVolume;

  const viscosity_cp = Math.exp(
    polyolVolumeFraction * Math.log(polyolViscosity) +
    isoVolumeFraction * Math.log(isoViscosity)
  );

  return {
    viscosity_cp,
    density_kg_m3,
    reference_temp_c: parseNumber(product.Viscosity_Reference_Temp_C) ?? 25,
    flow_index: requireNumber(product.Flow_Index, 'Flow_Index', name),
    activation_energy_j_mol: requireNumber(product.Activation_Energy_J_mol, 'Activation_Energy_J_mol', name),
    final_density_kg_m3: deriveFinalFoamDensity(product),
  };
}

/**
 * Density of the cured foam. Prefers the stated applied density, falling back to the
 * midpoint of the free-rise range and then the molded range.
 */
function deriveFinalFoamDensity(product: PolyurethaneProduct): number {
  const applied = parseViscosity(product.Overall_Applied_Density_kg_m3);
  if (Number.isFinite(applied) && applied > 0) {
    return applied;
  }

  const ranges: Array<[string, string]> = [
    [product.Free_Rise_Density_kg_m3_Min, product.Free_Rise_Density_kg_m3_Max],
    [product.Molded_Density_kg_m3_Min, product.Molded_Density_kg_m3_Max],
  ];

  for (const [minText, maxText] of ranges) {
    const min = parseNumber(minText);
    const max = parseNumber(maxText);
    if (min !== null && max !== null) {
      return (min + max) / 2;
    }
    if (min !== null) {
      return min;
    }
    if (max !== null) {
      return max;
    }
  }

  return 0;
}

/**
 * Environmental characteristics as stated on the technical data sheet.
 */
export function deriveEnvironmentalProfile(product: PolyurethaneProduct) {
  const isNo = (value: string) => (value || '').trim().toLowerCase() === 'no';
  const isYes = (value: string) => (value || '').trim().toLowerCase() === 'yes';

  const hasGwp = !isNo(product.GWP);
  const hasOdp = !isNo(product.ODP);

  return {
    blowing_agent: product.Blowing_Agent || 'Unknown',
    // The sheets record GWP/ODP as a Yes/No presence flag rather than a figure, so a
    // product declared free of both contributes zero.
    gwp_per_kg: hasGwp ? null : 0,
    is_eco_friendly: !hasGwp && !hasOdp,
    pfas_free: isYes(product.PFAS_Free),
  };
}

/**
 * Get all products from the database
 */
export async function getAllProducts(): Promise<PolyurethaneProduct[]> {
  return getDatabase();
}

/**
 * Get a specific product by name
 */
export async function getProductByName(name: string): Promise<PolyurethaneProduct | undefined> {
  return getDatabase().find(p => p.Product_Name === name);
}

/**
 * Get products by type
 */
export async function getProductsByType(type: string): Promise<PolyurethaneProduct[]> {
  return getDatabase().filter(p => p.Product_Type === type);
}

/**
 * Get all unique product types
 */
export async function getProductTypes(): Promise<string[]> {
  return Array.from(new Set(getDatabase().map(p => p.Product_Type)));
}

/**
 * Get all products as material presets, with their physics derived from the component data.
 */
export async function getAllMaterialPresets() {
  return getDatabase().map(product => ({
    id: product.Material_Key,
    name: product.Product_Name,
    ...deriveMaterialPhysics(product),
    environmental: deriveEnvironmentalProfile(product),
    polyol_sg: parseNumber(product.Polyol_Specific_Gravity) ?? 0,
    iso_sg: parseNumber(product.Isocyanate_Specific_Gravity) ?? 0,
    weight_ratio: [
      parseNumber(product.Mix_Ratio_Weight_Polyol) ?? 0,
      parseNumber(product.Mix_Ratio_Weight_Iso) ?? 0,
    ] as [number, number],
    fullProduct: product,
  }));
}
