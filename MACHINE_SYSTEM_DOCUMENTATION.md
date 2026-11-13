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
| **Operating Pressure Range** | 8–20 | bar | Gentle, controlled delivery |
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

The machine specifications live in one place, `MACHINE_SPECS` in `src/constants.py`. The engine reads them; the UI only sends the machine's ID.

### TypeScript (UI)

The form sends the machine as `machine_type` with the other process parameters (`ProcessParameters` in `src/calculator_types.ts`):

```typescript
const params: ProcessParameters = {
  pipe_length_mm: 500,
  pipe_diameter_mm: 12,
  temperature_c: 25,
  flow_rate_lpm: 5,
  material_key: 'genfoam_hd12',
  machine_type: 'low_pressure', // or 'high_pressure'
}
```

### Python

The engine's entry point is `calculate_all` in `src/core/processors/calculation_processor.py`. Run from the repository root:

```python
from src.core.processors.calculation_processor import calculate_all

results = calculate_all({
    'pipe_length_mm': 500,
    'pipe_diameter_mm': 12,
    'temperature_c': 25,
    'flow_rate_lpm': 5,
    'material_key': 'genfoam_hd12',
    'machine_type': 'low_pressure',  # or 'high_pressure'
})

compat = results['data']['machine_compatibility']
print(compat['is_compatible'], compat['min_pressure_bar'], compat['max_pressure_bar'])
```

Production outcomes are recorded in the browser (History, "How did the part come out?"), not through a Python API. See [LOGGING_GUIDE.md](LOGGING_GUIDE.md).

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

2. **Default machine:**
   - The form starts on `high_pressure` (see [Default Configuration](#default-configuration))

3. **Test calculations:**
   - Verify that pressure calculations are within the new machine limits
   - High-pressure systems: 100-200 bar
   - Low-pressure systems: 8-20 bar

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

The engine checks every result against the selected machine in `calculate_machine_compatibility` (`src/core/modules/pressure.py`). The result is returned as `machine_compatibility`, with `is_compatible`, `status`, the line demand, the injection pressure and the machine's pressure and output limits. When the line needs more than the machine can deliver, `warning` says so, for example "The line demands 271.0 bar, beyond the machine maximum of 20.0 bar". [Troubleshooting](#troubleshooting) covers what to change.

---

## Default Configuration

### Default Machine Selection
- **Default:** `high_pressure`
- **Location:**
  - The form: the `machine_type` starting value in `src/components/CalculatorForm.tsx`
  - The engine: `calculate_all` also falls back to `high_pressure` when no `machine_type` is given (`src/core/processors/calculation_processor.py`)
- `Defaults.MACHINE` in `src/constants.py` says `low_pressure`, but the app does not read it.

### Changing Defaults

To change the machine the form starts on, change the `machine_type` starting value in `src/components/CalculatorForm.tsx`:

```typescript
machine_type: 'low_pressure', // was 'high_pressure'
```

---

## Advanced Configuration

### Custom Machine Specifications

Machine specifications are the `MACHINE_SPECS` dictionary in `src/constants.py` (snake_case keys such as `max_pressure`, `pressure_range`, `output_range`, `process_loss`). The form only offers the machines listed in `MACHINE_OPTIONS` in `src/components/CalculatorForm.tsx`, so a new machine needs an entry in both. Adding a machine type is a feature change.

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

- [LOGGING_GUIDE.md](LOGGING_GUIDE.md) - Recording outcomes and the shot dataset
- [MATERIALS_GUIDE.md](MATERIALS_GUIDE.md) - The material database
- [ERROR_HANDLING_AND_CUSTOM_PRODUCTS.md](ERROR_HANDLING_AND_CUSTOM_PRODUCTS.md) - Validation and custom materials
- [reference-data/dimensions](reference-data/dimensions/) - Pipe and mould dimension reference tables (not used by the app)

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
3. Consult the code comments in `src/constants.py` (`MACHINE_SPECS`), `src/core/modules/pressure.py` (`calculate_machine_compatibility`) and `src/core/processors/calculation_processor.py` (`calculate_all`)
