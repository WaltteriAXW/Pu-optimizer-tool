# Polyurethane Injection Molding - Database Documentation

## Overview
These databases provide comprehensive reference data for injection pipe configurations and mold geometries used in polyurethane foam injection molding processes.

---

## 1. Injection Pipe Database

### File: `injection_pipe_database.csv`

**Total Entries:** 4,136 pipe configurations

### Columns

| Column | Type | Description | Range/Values |
|--------|------|-------------|--------------|
| `pipe_id` | String | Unique identifier | PIPE-00001 to PIPE-04136 |
| `inner_diameter_mm` | Integer | Internal pipe diameter | 4mm to 50mm (1mm increments) |
| `outer_diameter_mm` | Float | External pipe diameter (including wall) | Calculated based on wall thickness |
| `wall_thickness_mm` | Float | Pipe wall thickness | 1.0mm to 2.5mm (diameter-dependent) |
| `length_mm` | Integer | Pipe length | 50mm to 2000mm |
| `cross_section_area_mm2` | Float | Internal cross-sectional area | Calculated: π × (d/2)² |
| `volume_liters` | Float | Internal pipe volume | Calculated from area × length |
| `size_class` | String | Pipe size classification | Small, Medium, Large, Extra Large |
| `length_class` | String | Pipe length classification | Short, Medium, Long, Extra Long |
| `recommended_max_pressure_bar` | Float | Maximum recommended pressure | 6.0 to 12.0 bar |
| `material` | String | Pipe material | Stainless Steel 316L |
| `surface_roughness_um` | Float | Internal surface roughness | 0.8 μm (typical polished) |
| `temperature_rating_c` | Integer | Maximum operating temperature | 150°C |
| `notes` | String | Additional information | Description of pipe characteristics |

### Dimension Ranges

**Diameter Coverage:**
- Small (4-9mm): 6 sizes
- Medium (10-19mm): 10 sizes  
- Large (20-34mm): 15 sizes
- Extra Large (35-50mm): 16 sizes

**Length Coverage:**
- Short (50-190mm): 15 options
- Medium (200-490mm): 30 options
- Long (500-990mm): 21 options
- Extra Long (1000-2000mm): 21 options

### Use Cases

1. **Flow Rate Calculations**: Use diameter and length to calculate pressure drop
2. **Machine Compatibility**: Match recommended max pressure with machine capabilities
3. **System Design**: Select optimal pipe size for target flow rates
4. **Optimization**: Find best diameter/length combination for minimal pressure loss

### Example Usage in Application

```javascript
// Filter pipes by diameter range
const mediumPipes = pipeDatabase.filter(p => 
  p.inner_diameter_mm >= 10 && p.inner_diameter_mm <= 20
);

// Find pipes suitable for high pressure
const highPressurePipes = pipeDatabase.filter(p => 
  p.recommended_max_pressure_bar >= 10
);

// Calculate flow characteristics
const selectedPipe = pipeDatabase.find(p => 
  p.pipe_id === 'PIPE-00523'
);
```

---

## 2. Mold Dimensions Database

### File: `mold_dimensions_database.csv`

**Total Entries:** 739 mold configurations
- **Rectangular Molds:** 438 entries
- **Cylindrical Molds:** 219 entries
- **Spherical Molds:** 82 entries

### Columns

| Column | Type | Description | Values/Range |
|--------|------|-------------|--------------|
| `mold_id` | String | Unique identifier | MOLD-RECT-#####, MOLD-CYL-#####, MOLD-SPH-##### |
| `shape` | String | Mold geometry type | Rectangular, Cylindrical, Spherical |
| `type` | String | Size classification | Small/Medium/Large Panel/Cylinder/Sphere |
| `application` | String | Typical industrial application | Various applications (see below) |
| `length_mm` | Integer | Rectangular mold length | 300-3000mm (null for cylindrical/spherical) |
| `width_mm` | Integer | Rectangular mold width | 200-1500mm (null for cylindrical/spherical) |
| `height_thickness_mm` | Integer | Height or thickness | 10-150mm (rectangular), 200-2500mm (cylindrical) |
| `diameter_mm` | Integer | Diameter (cylindrical/spherical) | 100-2000mm (null for rectangular) |
| `wall_thickness_mm` | Integer | Foam wall thickness | 20-100mm (cylindrical/spherical only) |
| `volume_liters` | Float | Foam volume required | Calculated based on geometry |
| `surface_area_mm2` | Float | Total surface area | Calculated |
| `cavity_count` | Integer | Number of cavities | Always 1 in this database |
| `injection_points` | Integer | Recommended injection points | 1-6 (volume-dependent) |
| `typical_material` | String | Recommended PU system | Ecofoam Standard, XHD RC, Ecomate Spray EC |
| `typical_density_kgm3` | Integer | Typical foam density | 40-45 kg/m³ |
| `cycle_time_estimate_s` | Float | Estimated cycle time | Calculated: base + volume factor |
| `notes` | String | Additional information | Type and application summary |

---

## Rectangular Molds (438 entries)

### Size Classifications

**Small Panels** (300-800mm length)
- **Dimensions:** 300-800mm × 200-600mm × 10-50mm
- **Applications:** 
  - Appliance door cores
  - Light insulation panels
  - Small refrigerator components
- **Volume Range:** 0.6 - 24 liters
- **Entries:** ~146

**Medium Panels** (800-1500mm length)
- **Dimensions:** 800-1500mm × 400-1000mm × 20-80mm
- **Applications:**
  - Refrigerator panels
  - Door cores
  - Medium insulation
  - Commercial equipment
- **Volume Range:** 6 - 120 liters
- **Entries:** ~146

**Large Panels** (1500-3000mm length)
- **Dimensions:** 1500-3000mm × 1000-1500mm × 30-150mm
- **Applications:**
  - Wall panels
  - Roof panels
  - Structural sandwich panels
  - Cold storage panels
  - Heavy insulation
- **Volume Range:** 45 - 675 liters
- **Entries:** ~146

### Typical Applications by Thickness

| Thickness Range | Applications |
|----------------|--------------|
| 10-29mm | Appliance doors, light insulation |
| 30-59mm | Refrigerator panels, medium insulation |
| 60-99mm | Sandwich panels, structural insulation |
| 100-150mm | Heavy insulation, cold storage |

---

## Cylindrical Molds (219 entries)

### Size Classifications

**Small Cylinders**
- **Diameter:** 100-400mm
- **Height:** 200-800mm
- **Wall Thickness:** 20-50mm
- **Applications:**
  - Small tanks
  - Pipe insulation
  - Small water heaters
- **Volume Range:** 1 - 40 liters
- **Entries:** ~73

**Medium Cylinders**
- **Diameter:** 400-800mm
- **Height:** 800-1600mm
- **Wall Thickness:** 30-80mm
- **Applications:**
  - Water heaters (50-200L capacity)
  - Small boilers
  - Storage tanks
- **Volume Range:** 30 - 320 liters
- **Entries:** ~73

**Large Cylinders**
- **Diameter:** 800-1500mm
- **Height:** 1000-2500mm
- **Wall Thickness:** 40-100mm
- **Applications:**
  - Large boilers
  - Industrial storage tanks
  - Large water heaters
- **Volume Range:** 100 - 900 liters
- **Entries:** ~73

### Wall Thickness Guidelines

| Diameter | Typical Wall Thickness | Application |
|----------|----------------------|-------------|
| 100-300mm | 20-40mm | Pipe insulation, small tanks |
| 300-600mm | 30-60mm | Water heaters, medium tanks |
| 600-1000mm | 40-80mm | Large tanks, boilers |
| 1000-1500mm | 60-100mm | Industrial vessels |

---

## Spherical Molds (82 entries)

### Size Classifications

**Small Spheres**
- **Diameter:** 200-500mm
- **Wall Thickness:** 20-50mm
- **Applications:**
  - Small pressure vessels
  - Buoys
  - Specialty tanks
- **Volume Range:** 1 - 15 liters
- **Entries:** ~27

**Medium Spheres**
- **Diameter:** 500-1000mm
- **Wall Thickness:** 30-80mm
- **Applications:**
  - Medium tanks
  - Pressure vessels
  - Marine applications
- **Volume Range:** 10 - 135 liters
- **Entries:** ~28

**Large Spheres**
- **Diameter:** 1000-2000mm
- **Wall Thickness:** 40-100mm
- **Applications:**
  - Large storage tanks
  - Industrial pressure vessels
  - Specialty applications
- **Volume Range:** 85 - 850 liters
- **Entries:** ~27

---

## Integration with Application

### Loading the Databases

```javascript
// Load pipe database
import pipeDatabase from './injection_pipe_database.csv';

// Load mold database
import moldDatabase from './mold_dimensions_database.csv';
```

### Example Queries

**1. Find optimal pipe for given flow requirements:**
```javascript
function findOptimalPipe(flowRate_lpm, maxPressure_bar) {
  return pipeDatabase.filter(pipe => 
    pipe.recommended_max_pressure_bar >= maxPressure_bar
  ).sort((a, b) => 
    Math.abs(calculateIdealDiameter(flowRate_lpm) - a.inner_diameter_mm) -
    Math.abs(calculateIdealDiameter(flowRate_lpm) - b.inner_diameter_mm)
  )[0];
}
```

**2. Find mold by application:**
```javascript
function findMoldsByApplication(application, maxVolume_l) {
  return moldDatabase.filter(mold =>
    mold.application.toLowerCase().includes(application.toLowerCase()) &&
    mold.volume_liters <= maxVolume_l
  );
}
```

**3. Calculate material requirements:**
```javascript
function calculateMaterialNeeds(moldId, foamDensity_kgm3) {
  const mold = moldDatabase.find(m => m.mold_id === moldId);
  const materialWeight_kg = mold.volume_liters * foamDensity_kgm3;
  
  return {
    volume_liters: mold.volume_liters,
    material_weight_kg: materialWeight_kg,
    cycle_time_s: mold.cycle_time_estimate_s,
    recommended_material: mold.typical_material
  };
}
```

**4. Optimize injection strategy:**
```javascript
function optimizeInjection(moldId, machineMaxPressure_bar) {
  const mold = moldDatabase.find(m => m.mold_id === moldId);
  
  // Calculate optimal flow rate based on volume and cycle time
  const optimalFlowRate_lpm = (mold.volume_liters / mold.cycle_time_estimate_s) * 60;
  
  // Find compatible pipes
  const compatiblePipes = pipeDatabase.filter(pipe =>
    pipe.recommended_max_pressure_bar <= machineMaxPressure_bar
  );
  
  return {
    mold: mold,
    optimal_flow_rate: optimalFlowRate_lpm,
    injection_points: mold.injection_points,
    compatible_pipes: compatiblePipes.slice(0, 5) // Top 5 options
  };
}
```

---

## Data Quality Notes

### Pipe Database
- All dimensions are in millimeters for consistency with industrial standards
- Pressure ratings are conservative estimates based on typical stainless steel pipes
- Volume calculations assume perfectly circular cross-sections
- Wall thickness follows industry standards for polyurethane injection applications

### Mold Database
- Volume calculations are based on ideal geometric shapes
- Actual foam volume may vary by ±5% due to mold design features (gates, vents, etc.)
- Cycle time estimates include: injection time + reaction time + cooling time
- Injection point recommendations based on volume distribution requirements

### Calculation Formulas Used

**Pipe Volume:**
```
V = π × (d/2)² × L / 1,000,000
where: d = inner diameter (mm), L = length (mm), V = volume (liters)
```

**Rectangular Mold Volume:**
```
V = L × W × H / 1,000,000
where: L = length (mm), W = width (mm), H = thickness (mm), V = volume (liters)
```

**Cylindrical Mold Volume (hollow):**
```
V = π × (R_outer² - R_inner²) × H / 1,000,000
where: R_outer = outer radius, R_inner = inner radius, H = height, V = volume (liters)
```

**Spherical Mold Volume (hollow):**
```
V = (4/3) × π × (R_outer³ - R_inner³) / 1,000,000
where: R_outer = outer radius, R_inner = inner radius, V = volume (liters)
```

---

## Future Enhancements

### Potential Database Additions
1. Multi-cavity molds (2, 4, 8 cavity configurations)
2. Complex geometries (conical, elliptical, irregular shapes)
3. Hybrid shapes (rectangular with rounded corners, etc.)
4. Historical performance data (actual vs. estimated cycle times)
5. Machine-specific compatibility ratings
6. Material consumption tracking
7. Quality metrics database

### Integration Opportunities
- Link with machine database for automatic compatibility checking
- Connect with material database for precise consumption calculations
- Integrate with production scheduling system
- Real-time performance tracking and database updates

---

## Version History

**Version 1.0** (Current)
- Initial release with 4,136 pipe configurations
- 739 mold configurations across 3 geometry types
- Basic dimensional and application data
- Estimated performance parameters

---

## Support & Contributions

For questions, issues, or suggestions for database improvements:
- Submit issues via GitHub
- Propose new mold geometries or pipe configurations
- Share real-world performance data to improve estimates

---

## License & Usage

These databases are provided as reference data for the PU Injection Molding Calculator project.
Data is based on industrial standards and typical manufacturing practices.

Always validate calculations with actual testing and consult with material suppliers
for specific product recommendations.

---

*Last Updated: October 2025*
