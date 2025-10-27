/**
 * Polyurethane Foam Database Loader
 * Loads and parses the polyurethane foam database CSV file
 */

export interface PolyurethaneProduct {
  // Basic Info
  Product_Name: string;
  Product_Type: string;
  Polyol_Component: string;
  Isocyanate_Component: string;
  Application_Type: string;
  Blowing_Agent: string;

  // Component Properties
  Polyol_Viscosity_cP: string;
  Polyol_Specific_Gravity: number;
  Isocyanate_Viscosity_cP: string;
  Isocyanate_Specific_Gravity: number;

  // Mix Ratios
  Mix_Ratio_Weight_Polyol: number;
  Mix_Ratio_Weight_Iso: number;
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
  Overall_Applied_Density_kg_m3: number;

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

// Hardcoded database - loaded from CSV
const DATABASE_CSV = `Product_Name,Product_Type,Polyol_Component,Isocyanate_Component,Application_Type,Blowing_Agent,Polyol_Viscosity_cP,Polyol_Specific_Gravity,Isocyanate_Viscosity_cP,Isocyanate_Specific_Gravity,Mix_Ratio_Weight_Polyol,Mix_Ratio_Weight_Iso,Mix_Ratio_Volume_Polyol,Mix_Ratio_Volume_Iso,Polyol_Temp_C,Iso_Temp_C,Mold_Substrate_Temp_C_Min,Mold_Substrate_Temp_C_Max,Cream_Time_s_Min,Cream_Time_s_Max,Gel_Time_s_Min,Gel_Time_s_Max,Tack_Free_Time_s_Min,Tack_Free_Time_s_Max,Free_Rise_Density_kg_m3_Min,Free_Rise_Density_kg_m3_Max,Molded_Density_kg_m3_Min,Molded_Density_kg_m3_Max,Overall_Applied_Density_kg_m3,Dim_Stability_24h_Minus20C_Max_Percent,Dim_Stability_24h_Plus80C_Max_Percent,Dim_Stability_48h_Minus25C_Max_Percent,Dim_Stability_48h_Plus70C_Max_Percent,Compressive_Strength_Parallel_kPa_Min,Compressive_Strength_Perpendicular_kPa_Min,Closed_Cell_Content_Percent_Min,Initial_K_Factor_W_mK_Min,Initial_K_Factor_W_mK_Max,Declared_Lambda_80mm_W_mK,Declared_Lambda_120mm_W_mK,Fire_Rating_EN13501,Polyol_Storage_Temp_C_Min,Polyol_Storage_Temp_C_Max,Iso_Storage_Temp_C_Min,Iso_Storage_Temp_C_Max,Polyol_Shelf_Life_Months,Iso_Shelf_Life_Months,CE_Marked,DoP_Number,Standard,GWP,ODP,PFAS_Free,Substrate_Humidity_Porous_Max,Substrate_Humidity_Nonporous,Layer_Thickness_cm_Min,Layer_Thickness_cm_Max,Notes
Genfoam HD12,High Density Pour/Mold,Genfoam HD12 Polyol,Genfoam Isocyanate,Pour-in-place and molded foam,Water-blown,900-1050,1.07,200±20,1.23,90,100,,,22-25,22-25,,,,50,60,130,140,,,,195,215,350,550,,1,1,,,,,,,,,,,,,15,25,15,25,6,6,No,,,No,No,,,,,,"High and low pressure machines, very high applied density, re-mix polyol after 3 months"
Genfoam HD20,High Density Pour/Mold,Genfoam HD20 Polyol,Genfoam Isocyanate,Pour-in-place and molded foam,Water-blown,900-1050,1.07,200±20,1.23,90,100,,,22-25,22-25,,,,50,60,130,140,,,,290,315,400,600,,1,1,,,,,,,,,,,,,15,25,15,25,6,6,No,,,No,No,,,,,,"High and low pressure machines, very high applied density, re-mix polyol after 3 months"
Ecomate Spray EC,Spray Foam,Ecomate Spray EC Polyol,Ecomate Spray Isocyanate,Spray foam - continuous coatings,ecomate®,350±50,1.12,200±20,1.23,100,110,100,100,25-30,25-30,5,40,8,12,18,26,18,26,28.8,32.0,,,,40±4,,,,,200,,90,0.019,0.022,0.027,0.026,E (d0),10,25,10,25,3,6,Yes,CPR-DE-7538-001/24,EN 14315-1:2013,No,No,Yes,≤20%,No condensation,1,2.5,"Good adhesion to concrete/brick/wood/steel/aluminum/fiberglass, evaluate adhesion on samples first, closed cells, high thermal resistance"
Ecofoam XHD RC,Extra High Density Panel/Cavity Fill,Ecofoam XHD RC Polyol,Ecofoam Isocyanate,Insulating panels and cavity filling - discontinuous,ecomate®,850±50,1.12,200±20,1.23,100,110,,,22-25,22-25,35,45,8,12,28,32,,,,40.0,45.0,,,,,,,0.5,1.0,414,275,95,0.019,0.022,,,E,10,25,10,25,6,6,No,,,No,No,Yes,,,,,Yellowish to brown polyol appearance; verify substrate conditions to avoid heat sink effect`;

/**
 * Parse CSV string to array of objects
 */
function parseCSV(csv: string): PolyurethaneProduct[] {
  // Normalize line endings
  const normalizedCsv = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedCsv.trim().split('\n');

  // Parse headers using parseCSVLine to handle quoted fields with commas
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const product: any = {};

    headers.forEach((header, index) => {
      product[header] = values[index] || '';
    });

    return product as PolyurethaneProduct;
  });
}

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
 * Get all products from the database
 */
export function getAllProducts(): PolyurethaneProduct[] {
  return parseCSV(DATABASE_CSV);
}

/**
 * Get a specific product by name
 */
export function getProductByName(name: string): PolyurethaneProduct | undefined {
  const products = getAllProducts();
  return products.find(p => p.Product_Name === name);
}

/**
 * Get products by type
 */
export function getProductsByType(type: string): PolyurethaneProduct[] {
  const products = getAllProducts();
  return products.filter(p => p.Product_Type === type);
}

/**
 * Get all unique product types
 */
export function getProductTypes(): string[] {
  const products = getAllProducts();
  const types = new Set(products.map(p => p.Product_Type));
  return Array.from(types);
}

/**
 * Convert product data to material preset format
 */
export function productToMaterialPreset(product: PolyurethaneProduct) {
  // Parse viscosity range (e.g., "900-1050" or "350±50")
  const parseViscosity = (viscStr: string): number => {
    if (viscStr.includes('±')) {
      return parseFloat(viscStr.split('±')[0]);
    }
    if (viscStr.includes('-')) {
      const [min, max] = viscStr.split('-').map(v => parseFloat(v));
      return (min + max) / 2;
    }
    return parseFloat(viscStr) || 350;
  };

  // Parse density (use Overall_Applied_Density_kg_m3 if available)
  const density = product.Overall_Applied_Density_kg_m3 || 1120;

  return {
    name: product.Product_Name,
    density: density,
    viscosity: parseViscosity(product.Polyol_Viscosity_cP),
    polyolSG: product.Polyol_Specific_Gravity,
    isoSG: product.Isocyanate_Specific_Gravity,
    weightRatio: [
      product.Mix_Ratio_Weight_Polyol,
      product.Mix_Ratio_Weight_Iso
    ]
  };
}

/**
 * Get all products as material presets
 */
export function getAllMaterialPresets() {
  const products = getAllProducts();
  return products.map(product => ({
    id: product.Product_Name.toLowerCase().replace(/\s+/g, '_'),
    ...productToMaterialPreset(product),
    fullProduct: product
  }));
}
