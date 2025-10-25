# Polyurethane Foam Database - Data Dictionary

## Product Identification
- **Product_Name**: Commercial product name
- **Product_Type**: Category of foam (High Density Pour/Mold, Spray Foam, etc.)
- **Polyol_Component**: Name of the polyol component
- **Isocyanate_Component**: Name of the isocyanate component
- **Application_Type**: Intended application method and use
- **Blowing_Agent**: Type of blowing agent used

## Component Physical Properties
- **Polyol_Viscosity_cP**: Viscosity of polyol in centipoise at 25°C
- **Polyol_Specific_Gravity**: Specific gravity of polyol in g/dm³ at 25°C
- **Isocyanate_Viscosity_cP**: Viscosity of isocyanate in centipoise at 25°C
- **Isocyanate_Specific_Gravity**: Specific gravity of isocyanate in g/dm³ at 25°C

## Process Conditions
- **Mix_Ratio_Weight_Polyol**: Parts by weight of polyol
- **Mix_Ratio_Weight_Iso**: Parts by weight of isocyanate
- **Mix_Ratio_Volume_Polyol**: Parts by volume of polyol (when specified)
- **Mix_Ratio_Volume_Iso**: Parts by volume of isocyanate (when specified)
- **Polyol_Temp_C**: Recommended polyol temperature in °C
- **Iso_Temp_C**: Recommended isocyanate temperature in °C
- **Mold_Substrate_Temp_C_Min**: Minimum mold/substrate temperature in °C
- **Mold_Substrate_Temp_C_Max**: Maximum mold/substrate temperature in °C

## Reaction Characteristics
- **Cream_Time_s_Min**: Minimum cream time in seconds
- **Cream_Time_s_Max**: Maximum cream time in seconds
- **Gel_Time_s_Min**: Minimum gel time in seconds
- **Gel_Time_s_Max**: Maximum gel time in seconds
- **Tack_Free_Time_s_Min**: Minimum tack-free time in seconds (spray foams)
- **Tack_Free_Time_s_Max**: Maximum tack-free time in seconds (spray foams)

## Density Properties
- **Free_Rise_Density_kg_m3_Min**: Minimum free rise density in kg/m³
- **Free_Rise_Density_kg_m3_Max**: Maximum free rise density in kg/m³
- **Molded_Density_kg_m3_Min**: Minimum molded density in kg/m³
- **Molded_Density_kg_m3_Max**: Maximum molded density in kg/m³
- **Overall_Applied_Density_kg_m3**: Typical applied density in kg/m³

## Dimensional Stability
- **Dim_Stability_24h_Minus20C_Max_Percent**: Max dimensional change after 24h at -20°C (%)
- **Dim_Stability_24h_Plus80C_Max_Percent**: Max dimensional change after 24h at 80°C (%)
- **Dim_Stability_48h_Minus25C_Max_Percent**: Max dimensional change after 48h at -25°C (%)
- **Dim_Stability_48h_Plus70C_Max_Percent**: Max dimensional change after 48h at 70°C (%)

## Mechanical Properties
- **Compressive_Strength_Parallel_kPa_Min**: Minimum compressive strength parallel to rise in kPa
- **Compressive_Strength_Perpendicular_kPa_Min**: Minimum compressive strength perpendicular to rise in kPa
- **Closed_Cell_Content_Percent_Min**: Minimum closed cell content in %

## Thermal Properties
- **Initial_K_Factor_W_mK_Min**: Minimum initial k-factor in W/m·K
- **Initial_K_Factor_W_mK_Max**: Maximum initial k-factor in W/m·K
- **Declared_Lambda_80mm_W_mK**: Declared thermal conductivity at ≤80mm thickness in W/m·K
- **Declared_Lambda_120mm_W_mK**: Declared thermal conductivity at ≥120mm thickness in W/m·K

## Fire Properties
- **Fire_Rating_EN13501**: Fire classification per EN 13501-1

## Storage Conditions
- **Polyol_Storage_Temp_C_Min**: Minimum polyol storage temperature in °C
- **Polyol_Storage_Temp_C_Max**: Maximum polyol storage temperature in °C
- **Iso_Storage_Temp_C_Min**: Minimum isocyanate storage temperature in °C
- **Iso_Storage_Temp_C_Max**: Maximum isocyanate storage temperature in °C
- **Polyol_Shelf_Life_Months**: Polyol shelf life in months
- **Iso_Shelf_Life_Months**: Isocyanate shelf life in months

## Regulatory & Environmental
- **CE_Marked**: Whether product has CE marking (Yes/No)
- **DoP_Number**: Declaration of Performance number
- **Standard**: Applicable harmonized standard
- **GWP**: Global Warming Potential (Yes/No if has GWP)
- **ODP**: Ozone Depletion Potential (Yes/No if has ODP)
- **PFAS_Free**: Whether product is PFAS-free (Yes/No)

## Application Conditions (Spray Foams)
- **Substrate_Humidity_Porous_Max**: Maximum humidity for porous substrates (%)
- **Substrate_Humidity_Nonporous**: Requirements for nonporous substrates
- **Layer_Thickness_cm_Min**: Minimum application layer thickness in cm
- **Layer_Thickness_cm_Max**: Maximum application layer thickness in cm

## Additional Information
- **Notes**: Additional important information about processing, handling, or applications

## Data Sources
All data extracted from official Technical Data Sheets (TDS) provided by:
- Foam Supplies Srl / FSI Europe Srl
- Via della Sirena, 3, 42015 Correggio (RE), Italy
- Via Roma, 50/52, 46040 Casalromano (MN), Italy

## Notes on Data
- Values shown as ranges (min-max) indicate typical operating windows
- Index 100 refers to stoichiometric ratio (isocyanate index of 100)
- Lab hand mix data measured at 25°C unless otherwise specified
- Empty cells indicate data not provided in source documents
- ecomate® is a registered trademark of Foam Supplies, Inc.
