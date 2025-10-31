# Quick Reference Guide - Database Usage Examples

## Sample Data Preview

### Injection Pipe Database - Sample Entries

```csv
pipe_id          | diameter | length | volume   | pressure | size_class
-----------------|----------|--------|----------|----------|------------
PIPE-00001       | 4mm      | 50mm   | 0.0006L  | 12.0bar  | Small
PIPE-00523       | 12mm     | 350mm  | 0.0396L  | 12.0bar  | Medium
PIPE-01245       | 20mm     | 750mm  | 0.2356L  | 10.0bar  | Large
PIPE-03891       | 45mm     | 1500mm | 2.3857L  | 6.0bar   | Extra Large
```

### Mold Database - Sample Entries

**Rectangular Molds:**
```csv
mold_id          | dimensions (LxWxH)    | volume   | application
-----------------|-----------------------|----------|------------------
MOLD-RECT-00001  | 300x200x10mm         | 0.6L     | Appliance Door
MOLD-RECT-00150  | 1200x800x50mm        | 48.0L    | Refrigerator Panel
MOLD-RECT-00400  | 2500x1250x100mm      | 312.5L   | Wall Panel
```

**Cylindrical Molds:**
```csv
mold_id          | diameter x height     | wall     | volume   | application
-----------------|----------------------|----------|----------|------------------
MOLD-CYL-00439   | 300mm x 600mm       | 30mm     | 13.3L    | Small Tank
MOLD-CYL-00550   | 600mm x 1200mm      | 50mm     | 106.8L   | Water Heater
MOLD-CYL-00680   | 1200mm x 2000mm     | 80mm     | 544.6L   | Large Boiler
```

**Spherical Molds:**
```csv
mold_id          | diameter    | wall     | volume   | application
-----------------|-------------|----------|----------|------------------
MOLD-SPH-00657   | 300mm      | 30mm     | 4.5L     | Small Vessel
MOLD-SPH-00700   | 700mm      | 50mm     | 50.2L    | Medium Tank
MOLD-SPH-00730   | 1500mm     | 80mm     | 381.7L   | Large Storage
```

---

## Common Use Cases

### 1. Design a Complete Injection System

**Scenario:** Need to fill a 1200mm × 800mm × 50mm refrigerator panel

**Step 1:** Find the mold
```javascript
const targetMold = moldDatabase.find(m => 
  m.length_mm === 1200 && 
  m.width_mm === 800 && 
  m.height_thickness_mm === 50
);
// Result: MOLD-RECT-00150 (48.0L volume)
```

**Step 2:** Calculate required flow rate
```javascript
// Target cycle time: 60 seconds (typical for this size)
const cycleTime_s = 60;
const flowRate_lpm = (targetMold.volume_liters / cycleTime_s) * 60;
// Result: 48L ÷ 60s × 60 = 48 L/min
```

**Step 3:** Select appropriate pipe
```javascript
// For 48 L/min, need larger diameter pipe
const optimalPipe = pipeDatabase.find(p => 
  p.inner_diameter_mm >= 20 && 
  p.length_mm === 500 &&  // Assume 500mm distance
  p.recommended_max_pressure_bar >= 8
);
// Result: PIPE-01247 (20mm × 500mm)
```

**Step 4:** Run pressure calculation
```javascript
calculateResults({
  pipeLength: 500,
  pipeDiameter: 20,
  temperature: 25,
  flowRate: 48,
  moldVolume: 48,
  machineType: 'low_pressure'  // Low-Pressure System: 2-300+ kg/min, 5-20 bar
});
```

---

### 2. Find Compatible Pipes for High-Pressure Application

**Scenario:** Machine has 10 bar capacity, need to pump through 1000mm pipe

```javascript
const highPressurePipes = pipeDatabase.filter(p =>
  p.length_mm === 1000 &&
  p.recommended_max_pressure_bar >= 10
).sort((a, b) => b.inner_diameter_mm - a.inner_diameter_mm);

// Results: All pipes ≤20mm diameter (Medium and Small classes)
```

**Analysis:**
- Small pipes (4-9mm): 12 bar rating ✓
- Medium pipes (10-19mm): 12 bar rating ✓
- Large pipes (20-34mm): 10 bar rating ✓
- Extra Large (35-50mm): 6 bar rating ✗

**Recommendation:** Use 20mm diameter pipe (largest compatible with 10 bar)

---

### 3. Optimize Water Heater Production

**Scenario:** Producing 500mm diameter × 1000mm height water heaters

**Step 1:** Find matching mold
```javascript
const waterHeaterMolds = moldDatabase.filter(m =>
  m.shape === 'Cylindrical' &&
  m.diameter_mm === 500 &&
  m.height_thickness_mm === 1000
);

// Available with walls: 30mm, 40mm, 50mm, 60mm, 80mm
// Choose based on insulation requirements
const selectedMold = waterHeaterMolds.find(m => m.wall_thickness_mm === 50);
// Result: ~60L foam volume, 2 injection points recommended
```

**Step 2:** Calculate material needs
```javascript
const foamVolume = selectedMold.volume_liters;  // 60L
const foamDensity = 40;  // kg/m³ from Ecofoam XHD RC
const materialNeeded = foamVolume * foamDensity;
// Result: 60L × 40 kg/m³ = 2.4 kg total material

// With 100:110 mix ratio (Polyol:Iso)
const polyolNeeded = 2.4 * (100/210) = 1.14 kg
const isoNeeded = 2.4 * (110/210) = 1.26 kg
```

**Step 3:** Determine cycle time
```javascript
const estimatedCycleTime = selectedMold.cycle_time_estimate_s;
// Result: ~195 seconds (base 60s + volume factor)

// Parts per hour
const partsPerHour = 3600 / estimatedCycleTime;
// Result: ~18 parts/hour
```

---

### 4. Design Multi-Point Injection Strategy

**Scenario:** Large panel (2500mm × 1250mm × 100mm) requires multiple injection points

```javascript
const largeMold = moldDatabase.find(m =>
  m.mold_id === 'MOLD-RECT-00400'
);

console.log(`
Mold: ${largeMold.mold_id}
Volume: ${largeMold.volume_liters}L
Recommended injection points: ${largeMold.injection_points}
`);
// Result: 312.5L, 4 injection points recommended

// Calculate per-point flow
const totalFlowRate = 40;  // L/min total capacity
const flowPerPoint = totalFlowRate / largeMold.injection_points;
// Result: 10 L/min per injection point

// Select pipes for each point
const pipeForEachPoint = pipeDatabase.find(p =>
  p.inner_diameter_mm === 12 &&  // Suitable for 10 L/min
  p.length_mm === 300            // Short runners to injection points
);
```

**Injection Point Layout:**
```
   [1]────────────────[2]
    |                  |
    |    2500mm       |
    |                  |
   [3]────────────────[4]
        1250mm
```

---

### 5. Material Consumption Calculator

**Scenario:** Calculate material usage for production batch

```javascript
function calculateBatchMaterials(moldId, quantity, foamDensity = 40) {
  const mold = moldDatabase.find(m => m.mold_id === moldId);
  
  const totalVolume_L = mold.volume_liters * quantity;
  const totalMass_kg = totalVolume_L * foamDensity;
  
  // Assuming 100:110 Polyol:Iso ratio
  const polyol_kg = totalMass_kg * (100/210);
  const iso_kg = totalMass_kg * (110/210);
  
  // Add 5% waste factor
  const wasteFactor = 1.05;
  
  return {
    mold: mold.mold_id,
    quantity: quantity,
    foam_volume_L: totalVolume_L,
    polyol_needed_kg: (polyol_kg * wasteFactor).toFixed(2),
    iso_needed_kg: (iso_kg * wasteFactor).toFixed(2),
    total_material_kg: (totalMass_kg * wasteFactor).toFixed(2),
    production_time_min: ((mold.cycle_time_estimate_s * quantity) / 60).toFixed(1)
  };
}

// Example: 100 refrigerator panels
const batchCalc = calculateBatchMaterials('MOLD-RECT-00150', 100);
console.log(batchCalc);
/* Result:
{
  mold: 'MOLD-RECT-00150',
  quantity: 100,
  foam_volume_L: 4800,
  polyol_needed_kg: '96.00',
  iso_needed_kg: '105.60',
  total_material_kg: '201.60',
  production_time_min: '128.0'
}
*/
```

---

### 6. Pressure Drop Analysis Across Pipe Lengths

**Scenario:** Compare pressure requirements for different pipe lengths

```javascript
function analyzePressureByLength(diameter_mm, flowRate_lpm) {
  const pipeLengths = [200, 500, 1000, 1500, 2000];
  
  return pipeLengths.map(length => {
    const pipe = pipeDatabase.find(p =>
      p.inner_diameter_mm === diameter_mm &&
      p.length_mm === length
    );
    
    // Simplified pressure calculation (actual calculation in main app)
    const pressureDrop_bar = (flowRate_lpm * length * 0.001) / (diameter_mm ** 2);
    
    return {
      pipe_id: pipe.pipe_id,
      length_mm: length,
      pressure_drop_bar: pressureDrop_bar.toFixed(3),
      compatible_machines: pressureDrop_bar < 6 ? 'All' : 
                           pressureDrop_bar < 8 ? 'Medium/Large' : 'Large only'
    };
  });
}

// Example: 12mm pipe at 10 L/min
const analysis = analyzePressureByLength(12, 10);
/* Results show pressure increasing with length:
   200mm → 0.139 bar (All machines)
   500mm → 0.347 bar (All machines)
   1000mm → 0.694 bar (All machines)
   1500mm → 1.042 bar (All machines)
   2000mm → 1.389 bar (All machines)
*/
```

---

### 7. Find Molds by Application Type

```javascript
// Find all water heater molds
const waterHeaterMolds = moldDatabase.filter(m =>
  m.application.toLowerCase().includes('water heater')
);

// Find all sandwich panel molds over 100L
const largePanels = moldDatabase.filter(m =>
  m.application.toLowerCase().includes('sandwich') &&
  m.volume_liters > 100
);

// Find all small pressure vessels
const smallVessels = moldDatabase.filter(m =>
  m.application.toLowerCase().includes('pressure vessel') &&
  m.volume_liters < 50
);
```

---

### 8. Production Planning Dashboard Data

```javascript
function generateProductionMetrics(moldIds) {
  return moldIds.map(id => {
    const mold = moldDatabase.find(m => m.mold_id === id);
    const material_kg = mold.volume_liters * mold.typical_density_kgm3;
    
    return {
      part_name: `${mold.shape} ${mold.type}`,
      mold_id: id,
      cycle_time_min: (mold.cycle_time_estimate_s / 60).toFixed(1),
      parts_per_hour: (3600 / mold.cycle_time_estimate_s).toFixed(1),
      material_per_part_kg: material_kg.toFixed(2),
      material_per_hour_kg: ((3600 / mold.cycle_time_estimate_s) * material_kg).toFixed(1),
      recommended_machine: mold.volume_liters < 20 ? 'Small' : 
                          mold.volume_liters < 100 ? 'Medium' : 'Large'
    };
  });
}

// Generate metrics for specific production line
const productionLine = generateProductionMetrics([
  'MOLD-RECT-00150',  // Refrigerator panels
  'MOLD-CYL-00550',   // Water heaters
  'MOLD-SPH-00700'    // Pressure vessels
]);
```

---

## Integration Tips

### For React Applications

```javascript
// Import databases
import pipeDB from './injection_pipe_database.csv';
import moldDB from './mold_dimensions_database.csv';

// Create lookup hooks
const usePipeLookup = (diameter, length) => {
  return useMemo(() => 
    pipeDB.find(p => 
      p.inner_diameter_mm === diameter && 
      p.length_mm === length
    ),
    [diameter, length]
  );
};

const useMoldsByApplication = (application) => {
  return useMemo(() =>
    moldDB.filter(m => 
      m.application.toLowerCase().includes(application.toLowerCase())
    ),
    [application]
  );
};
```

### For Python Backend

```python
import pandas as pd

# Load databases
pipes = pd.read_csv('injection_pipe_database.csv')
molds = pd.read_csv('mold_dimensions_database.csv')

# Query examples
large_pipes = pipes[pipes['size_class'] == 'Large']
cylindrical_molds = molds[molds['shape'] == 'Cylindrical']

# Advanced filtering
optimal_pipes = pipes[
    (pipes['inner_diameter_mm'] >= 12) &
    (pipes['inner_diameter_mm'] <= 20) &
    (pipes['recommended_max_pressure_bar'] >= 8)
]
```

---

## Performance Optimization

### Database Indexing Strategies

For large-scale applications, consider:

1. **Pre-index by common queries:**
   - Diameter ranges
   - Volume ranges
   - Application types

2. **Create lookup tables:**
   - Diameter → Pipe IDs
   - Application → Mold IDs
   - Pressure ratings → Compatible pipes

3. **Cache frequent calculations:**
   - Pressure drops for standard configurations
   - Material requirements for common molds
   - Cycle times for typical scenarios

---

## Validation Checklist

Before production use:

- [ ] Verify pipe dimensions match actual available inventory
- [ ] Confirm pressure ratings with pipe supplier specifications
- [ ] Validate mold volumes with CAD measurements
- [ ] Test cycle time estimates against actual production data
- [ ] Verify material consumption calculations with supplier data
- [ ] Check machine compatibility ratings
- [ ] Validate injection point recommendations with mold designer

---

*Use these databases as starting references and always validate with real-world testing!*
