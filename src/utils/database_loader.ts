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
 * The materials offered in the UI: identifier and display name.
 *
 * Only these two fields are read here. The physics is derived on the Python side, in
 * src/core/data/material_database.py, from this same CSV — keeping the mixing formulas
 * in exactly one place rather than in two languages that can drift apart.
 */
export async function getAllMaterialPresets(): Promise<Array<{ id: string; name: string }>> {
  return getDatabase().map(product => ({
    id: product.Material_Key,
    name: product.Product_Name,
  }));
}
