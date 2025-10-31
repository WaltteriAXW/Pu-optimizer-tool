# Polyurethane Machine Selection System Documentation

## Overview

The Pu-optimizer-tool now uses a **two-category machine system** based on operating pressure characteristics rather than specific manufacturer models. This provides a more flexible and universal approach to machine selection.

## Machine Categories

### 1. High-Pressure (HP) System

**ID:** `high_pressure`

#### Technical Specifications

| Parameter | Value | Unit | Notes |
|-----------|-------|------|-------|
| **Operating Pressure Range** | 100–200 | bar | Max typically 197 bar (2800 PSI) |
| **Typical Output** | 5–200+ | kg/min | Depends on mix head size |
| **Feed Line Diameter (A component)** | 4–8 | mm | Tight lines create high shear environment |
| **Feed Line Diameter (B component)** | 4–8 | mm | Symmetric for 1:1 ratio |
| **Pump Type** | Axial piston / High-pressure gear / Variable displacement | - | - |
| **Shear Rate at Operating Point** | 2,000–10,000 | s⁻¹ | High velocity through restricted lines |
| **Mix Head Type** | L-style / R-style / Dual-tilted injection | - | High-energy stream impingement mixing |
| **Power Law Index (n)** | 0.60–0.70 | - | Shear-thinning behavior (typical: 0.65) |
| **Activation Energy (Ea)** | 35–50 | kJ/mol | Material-dependent (typical: 42.5 kJ/mol) |
| **Laminar Flow Limit** | 150–200 | bar | Up to max output |

#### Best Applications
- Rigid foam
- Integral skin
- Insulation
- Dense composites
- **Requires precise, fast mixing**

---

### 2. Low-Pressure (LP) System

**ID:** `low_pressure`

#### Technical Specifications

| Parameter | Value | Unit | Notes |
|-----------|-------|------|-------|
| **Operating Pressure Range** | 5–20 | bar | Gentle, controlled delivery |
| **Typical Output** | 2–300+ | kg/min | Very modular, highly variable |
| **Feed Line Diameter (A component)** | 10–16 | mm | Larger lines reduce shear |
| **Feed Line Diameter (B component)** | 10–16 | mm | Generous sizing |
| **Pump Type** | Gear pump (external) | - | Fixed/variable displacement; KCB83.3 common (~160 kg/min) |
| **Shear Rate at Operating Point** | 100–1,500 | s⁻¹ | Low velocity, gentle handling |
| **Mix Head Type** | Mechanical mixer / Dynamic mix chamber | - | Moving paddles or rotor; slower speeds |
| **Power Law Index (n)** | 0.65–0.75 | - | Slightly less aggressive shear-thinning (typical: 0.70) |
| **Activation Energy (Ea)** | 35–50 | kJ/mol | Material-dependent (typical: 42.5 kJ/mol) |
| **Laminar Flow Limit** | 10–15 | bar | Up to max output |

#### Best Applications
- Flexible foam
- Elastomers
- CASE (Coatings/Adhesives/Sealants)
- High-viscosity casting
- **Handles higher viscosities with less agitation**

---

## Usage in Code

### JavaScript/TypeScript

```javascript
// Machine selection in component
const MACHINE_SPECS = {
  high_pressure: {
    name: "High-Pressure (HP) System",
    maxPressure: 200.0,
    output: "5-200+ kg/min",
    // ... other properties
  },
  low_pressure: {
    name: "Low-Pressure (LP) System",
    maxPressure: 20.0,
    output: "2-300+ kg/min",
    // ... other properties
  }
};

// Using in calculations
calculateResults({
  pipeLength: 500,
  pipeDiameter: 20,
  temperature: 25,
  flowRate: 48,
  moldVolume: 48,
  machineType: 'low_pressure'  // or 'high_pressure'
});
```

### Python

```python
from polyurethane_calculator import PolyurethaneCalculator

calculator = PolyurethaneCalculator("ecofoam_standard")

# Calculate with Low-Pressure system
results = calculator.calculate(
    pipe_length=500,
    pipe_diameter=12,
    temperature=25,
    flow_rate_lpm=30,
    viscosity=350,
    density=1120,
    machine_type="low_pressure"  # or "high_pressure"
)

# Log production run
log_result = calculator.log_production_run(
    parameters=parameters,
    results=results,
    quality_status="good",
    machine_type="low_pressure",
    material_preset="ecofoam_standard"
)
```

---

## Migration from Old System

### Old Machine Models (Deprecated)
The following specific machine models have been replaced:
- ~~`cannon_std_legacy`~~ → `low_pressure`
- ~~`cannon_a205`~~ → `low_pressure`
- ~~`cannon_a500`~~ → `low_pressure` or `high_pressure`
- ~~`cannon_compact_ht`~~ → `low_pressure`
- ~~`ama_mix1`~~ → `low_pressure`
- ~~`ama_mix2`~~ → `low_pressure`
- ~~`saip_sd`~~ → `low_pressure`
- ~~`isc_fillmix`~~ → `low_pressure`
- ~~`isc_ultramix`~~ → `low_pressure`

### Migration Guide

1. **Replace machine selection IDs:**
   - Change all references from specific model names to either `high_pressure` or `low_pressure`
   - Use `high_pressure` for applications requiring >20 bar pressure
   - Use `low_pressure` for standard applications with ≤20 bar pressure

2. **Update default values:**
   - New default machine: `low_pressure`
   - This provides a safe starting point for most applications

3. **Test calculations:**
   - Verify that pressure calculations are within the new machine limits
   - High-pressure systems: 100-200 bar
   - Low-pressure systems: 5-20 bar

---

## Decision Matrix

### When to Use High-Pressure (HP) System

✅ **Use HP when:**
- Required pressure > 20 bar
- Need for rigid foam production
- Fast cycle times required
- Dense composite manufacturing
- Integral skin applications
- High shear mixing required

❌ **Don't use HP when:**
- Flexible foam production
- High-viscosity materials (>1000 cP)
- Delicate mixing required
- Standard pressure (<20 bar) is sufficient

### When to Use Low-Pressure (LP) System

✅ **Use LP when:**
- Required pressure ≤ 20 bar
- Flexible foam production
- Elastomer manufacturing
- High-viscosity materials
- CASE applications
- Gentle mixing required

❌ **Don't use LP when:**
- Required pressure > 20 bar
- Rigid foam requiring fast mixing
- Very fast cycle times
- Dense composites

---

## Pressure Compatibility Checking

The calculator automatically checks machine compatibility:

```javascript
// Example compatibility check
if (calculatedPressure > machine.maxPressure) {
  warnings.push(
    `Required pressure (${calculatedPressure} bar) exceeds ` +
    `machine capacity (${machine.maxPressure} bar)`
  );
  recommendations.push(
    "Consider: 1) Reduce flow rate, 2) Increase pipe diameter, " +
    "3) Increase temperature, or 4) Use High-Pressure system"
  );
}
```

---

## Default Configuration

### Default Machine Selection
- **Default:** `low_pressure`
- **Rationale:** Safe for most standard applications
- **Location:**
  - JavaScript: `/src/constants.js`
  - Python: `/src/constants.py`
  - Reducers: `/src/reducers/calculatorReducer.js`

### Changing Defaults

To change the default machine in your deployment:

```javascript
// In constants.js
export const DEFAULTS = {
  // ... other defaults
  machine: 'high_pressure', // Change here
  material: 'ecofoam_standard'
};
```

---

## Advanced Configuration

### Custom Machine Specifications

If you need to add custom machine specifications, extend the `MACHINE_SPECS` object:

```javascript
const MACHINE_SPECS = {
  high_pressure: { /* ... */ },
  low_pressure: { /* ... */ },

  // Add custom machine
  custom_ultra_high: {
    name: "Custom Ultra-High Pressure System",
    category: "Ultra-High-Pressure",
    output: "10-150 kg/min",
    maxPressure: 350.0,
    // ... other properties
  }
};
```

---

## Technical Background

### Shear Rate Calculation

The shear rate (γ̇) is calculated as:

```
γ̇ = (4 × Q) / (π × r³)
```

Where:
- Q = volumetric flow rate (m³/s)
- r = pipe radius (m)

### Pressure Drop Calculation

Based on the Hagen-Poiseuille equation for non-Newtonian fluids:

```
ΔP = (8 × η × L × v) / r²
```

Where:
- η = apparent viscosity (Pa·s)
- L = pipe length (m)
- v = flow velocity (m/s)
- r = pipe radius (m)

### Power Law Model

Apparent viscosity is calculated using the Power Law model:

```
η = η₀ × γ̇^(n-1) × exp(Ea/R × (1/T - 1/T₀))
```

Where:
- η₀ = reference viscosity
- n = power law index
- Ea = activation energy
- R = gas constant (8.314 J/(mol·K))
- T = temperature (K)
- T₀ = reference temperature (298.15 K)

---

## Troubleshooting

### Issue: Pressure Exceeds Machine Capacity

**Problem:** Calculated pressure is higher than machine max pressure

**Solutions:**
1. Reduce flow rate
2. Increase pipe diameter
3. Increase material temperature
4. Switch to High-Pressure system (if using Low-Pressure)

### Issue: Shear Rate Too High

**Problem:** Shear rate > 10,000 s⁻¹ (material degradation risk)

**Solutions:**
1. Increase pipe diameter
2. Reduce flow rate
3. Consider Low-Pressure system with larger feed lines

### Issue: Turbulent Flow

**Problem:** Reynolds number > 2300

**Solutions:**
1. Reduce flow rate
2. Increase material viscosity
3. Lower temperature

---

## Related Documentation

- [LOGGING_GUIDE.md](/LOGGING_GUIDE.md) - Production logging
- [CONSTANTS_USAGE_EXAMPLES.md](/CONSTANTS_USAGE_EXAMPLES.md) - Constants usage
- [QUICK_REFERENCE.md](/Dimensions%20database/QUICK_REFERENCE.md) - Database usage
- [IMPROVEMENTS.md](/IMPROVEMENTS.md) - Recent improvements

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2025-10-31 | Migrated from 9 specific models to 2-category system (HP/LP) |
| 1.0.0 | 2024 | Initial release with manufacturer-specific models |

---

## Support

For questions or issues with the machine selection system:
1. Review this documentation
2. Check the [troubleshooting section](#troubleshooting)
3. Consult the code comments in `/src/polyurethane_calculator.py` and `/src/polyurethane_optimizer_component.jsx`
4. Review example usage in `/src/logging_example.py`
