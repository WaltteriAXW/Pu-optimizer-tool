# Error Handling & Custom Products Guide

**Complete User Input Workflow for Production System**

---

## 🎯 Three Scenarios

### Scenario 1: User Provides Incomplete Input ❌

**User Question (Incomplete):**
```
"I have a 1000mm long pipe, 20mm diameter.
Should I use high pressure or low pressure?"
```

**What's Missing:**
```
Required inputs:
├─ ✅ pipe_length_mm: 1000
├─ ✅ pipe_diameter_mm: 20
├─ ❌ material_key: NOT PROVIDED
├─ ❌ temperature_c: NOT PROVIDED
└─ ❌ flow_rate_lpm: NOT PROVIDED
```

**System Response:**

```
❌ VALIDATION FAILED

Missing required inputs:
  • material_key
  • temperature_c
  • flow_rate_lpm

To complete calculation, please provide:

1. MATERIAL KEY - Which polyurethane system?
   Available options:
   └─ genfoam_hd12 (water-blown, general purpose)
   └─ genfoam_hd20 (water-blown, higher density)
   └─ ecomate_spray (zero GWP, spray application)
   └─ ecofoam_xhd_rc (zero GWP, rigid high-density)

   OR create a custom material

2. TEMPERATURE - At what temperature?
   Example: 25 for room temperature, 40 for heated

3. FLOW RATE - What flow rate in LPM?
   Example: 10 for 10 Liters Per Minute
```

---

### Scenario 2: User Provides Invalid Input ⚠️

**User Question (Invalid Values):**
```python
{
    'pipe_length_mm': -100,      # NEGATIVE!
    'pipe_diameter_mm': 0.2,     # Tiny - warning
    'material_key': 'ecofoam_xhd_rc',
    'temperature_c': 'hot',      # NOT A NUMBER!
    'flow_rate_lpm': 500,        # Extreme
}
```

**System Response:**

```
❌ VALIDATION FAILED - Errors prevent calculation

⚠️  ERRORS (calculation cannot proceed):

  • pipe_length_mm: Pipe length must be positive, got -100
    💡 Provide length > 0 mm, e.g., 1000 mm for 1 meter

  • temperature_c: Expected number, got str
    💡 Provide temperature as a number, e.g., 25

⚠️  WARNINGS (check these - calculation could proceed but may be wrong):

  • pipe_diameter_mm: Pipe diameter 0.2 mm is very small
    💡 Very small pipes (<1 mm) may be difficult to work with.

  • flow_rate_lpm: Flow velocity is 22.5 m/s (very high, >10 m/s)
    💡 High velocity causes large pressure drops and heating.
       Consider larger diameter pipe.

  • pipe_length_mm / pipe_diameter_mm: Length/diameter ratio is 5000 (very high)
    💡 Very long thin pipes have extreme pressure drops.
       Confirm this is intentional.
```

---

### Scenario 3: Material Not In Database 🤔

**User Question (Unknown Material):**
```python
{
    'pipe_length_mm': 1000,
    'pipe_diameter_mm': 20,
    'material_key': 'acme_custom_foam_v2',  # NOT IN DATABASE!
    'temperature_c': 25,
    'flow_rate_lpm': 10,
}
```

**System Response:**

```
⚠️  WARNINGS (check these - calculation could proceed)

  • material_key: Material 'acme_custom_foam_v2' not found in database
    💡 This will be treated as a CUSTOM material. You'll need to provide
       all specifications.

       Available materials:
       ├─ genfoam_hd12
       ├─ genfoam_hd20
       ├─ ecomate_spray
       └─ ecofoam_xhd_rc

✅ Valid (calculation can proceed IF you provide custom material specs)

💡 TO PROCEED WITH CUSTOM MATERIAL:

Option A - Switch to known material:
  Change material_key to one of the available options above

Option B - Define custom material:
  You need to provide these specifications for 'acme_custom_foam_v2':

  1. Component Viscosities:
     • polyol_viscosity_cps: ? (e.g., 650)
     • isocyanate_viscosity_cps: ? (e.g., 220)

  2. Component Densities:
     • polyol_density_kg_m3: ? (e.g., 1100)
     • isocyanate_density_kg_m3: ? (e.g., 1230)

  3. Reaction Characteristics:
     • cream_time_s: ? (e.g., 12)
     • gel_time_s: ? (e.g., 45)
     • free_rise_density_kg_m3: ? (e.g., 50)

  4. Rheological Properties:
     • flow_index: ? (e.g., 0.80, between 0-1)
     • consistency_coefficient_pa_s: ? (e.g., 0.65)
     • yield_stress_pa: ? (optional, e.g., 3.0)
     • activation_energy_j_mol: ? (e.g., 26000)

  5. Environmental (optional):
     • gwp_kg_co2_eq: ? (e.g., 2000, or 0 for eco-friendly)
     • notes: ? (e.g., "Custom formulation for special app")
```

---

## 🏗️ Custom Product Creation Workflow

### Step 1: User Has Custom Material

```
"I have a custom polyurethane foam from Acme Corporation.
It's different from the standard ones."
```

### Step 2: User Provides Specifications

```python
custom_product = {
    # Identity
    'product_name': 'Acme Custom Foam v2',
    'product_key': 'acme_custom_foam_v2',

    # Component Properties @ 25°C
    'polyol_viscosity_cps': 650,
    'isocyanate_viscosity_cps': 220,
    'polyol_density_kg_m3': 1100,
    'isocyanate_density_kg_m3': 1230,

    # Reaction Characteristics
    'cream_time_s': 12,
    'gel_time_s': 45,
    'free_rise_density_kg_m3': 50,

    # Rheological (for calculation models)
    'flow_index': 0.80,  # How much shear-thinning
    'consistency_coefficient_pa_s': 0.65,  # Viscosity constant
    'yield_stress_pa': 3.0,  # Resistance to flow initially
    'activation_energy_j_mol': 26000,  # Temperature sensitivity

    # Environmental
    'gwp_kg_co2_eq': 2000,  # Global warming potential
    'notes': 'Custom formulation for structural insulation'
}
```

### Step 3: System Validates Custom Spec

```
Validating custom product:
├─ Viscosities: ✅ Reasonable (650, 220 cP)
├─ Densities: ✅ Reasonable (1100, 1230 kg/m³)
├─ Reaction times: ✅ Consistent (cream < gel)
├─ Flow index: ✅ Valid (0.80 is between 0-1)
├─ Consistency: ✅ Positive (0.65)
├─ Activation energy: ✅ Typical (26000 J/mol in 10k-50k range)
└─ ✅ ALL VALIDATIONS PASSED

Custom product created successfully!
```

### Step 4: User Can Now Use Custom Material

```python
# Now user can calculate with custom product
params = {
    'pipe_length_mm': 1000,
    'pipe_diameter_mm': 20,
    'material_key': 'acme_custom_foam_v2',  # ← Custom material!
    'temperature_c': 25,
    'flow_rate_lpm': 10,
}

# System finds and uses custom product specs automatically
```

### Step 5: Save Custom Product (Optional)

```
System can save custom products to:
├─ Local file (JSON/CSV)
├─ Database (PostgreSQL/MongoDB)
├─ Cloud storage (AWS/GCP/Azure)
└─ Custom backend

Allows:
├─ Reuse in future calculations
├─ Sharing with team members
├─ Version control
└─ Material library building
```

---

## 📊 Complete Error Handling Hierarchy

```
USER INPUT
    ↓
[Validation]
    ├─ Is input provided?
    │  └─ NO → "❌ No input provided"
    │
    ├─ Are all required fields present?
    │  └─ NO → "❌ Missing: [field list]"
    │
    ├─ Is each field the right type?
    │  └─ NO → "❌ [field] must be [type], got [actual_type]"
    │
    ├─ Is each field in valid range?
    │  └─ NO → "❌ [field] out of range: [value]"
    │
    ├─ Does material exist in database?
    │  ├─ YES → ✅ Use database specs
    │  └─ NO → Check if custom allowed
    │      ├─ YES → ⚠️  Will need custom specs
    │      └─ NO → ❌ Material not found
    │
    └─ Are cross-parameters physically valid?
       └─ NO → "⚠️  Warning: unusual combination"

    ↓
[Decision]
    ├─ Are there ERRORS? → STOP, ask for fixes
    ├─ Are there WARNINGS? → ASK, continue if user confirms
    └─ All valid? → ✅ PROCEED TO CALCULATION
```

---

## 🎓 Example: Complete Workflow

### User Interaction 1:

```
USER: "What pressure should I use?"

SYSTEM:
❌ INCOMPLETE INPUT

Please provide:
1. Material (material_key): ?
2. Pipe length (pipe_length_mm): ?
3. Pipe diameter (pipe_diameter_mm): ?
4. Temperature (temperature_c): ?
5. Flow rate (flow_rate_lpm): ?

(Or type "list materials" for available options)
```

### User Interaction 2:

```
USER: "list materials"

SYSTEM:
Available polyurethane systems:
├─ genfoam_hd12
│  └─ Water-blown, general purpose
│  └─ Viscosity: 900-1050 cP
│  └─ Free rise density: 195-215 kg/m³
│
├─ genfoam_hd20
│  └─ Water-blown, higher density
│  └─ Viscosity: 900-1050 cP
│  └─ Free rise density: 290-315 kg/m³
│
├─ ecomate_spray
│  └─ Zero-GWP spray foam
│  └─ Viscosity: 280-320 cP (ultra-low)
│  └─ Free rise density: 28.8-32.0 kg/m³
│  └─ Cream time: 3 seconds (very fast!)
│
└─ ecofoam_xhd_rc
   └─ Zero-GWP rigid high-density
   └─ Viscosity: 800-900 cP
   └─ Free rise density: 40-45 kg/m³
   └─ Compressive strength: 414 kPa parallel

Or create a custom material: "create custom"
```

### User Interaction 3:

```
USER: "I'll use ecofoam_xhd_rc, 1000mm pipe, 20mm diameter, 40°C, 10 LPM"

SYSTEM:
Validating input:
├─ ✅ material_key: ecofoam_xhd_rc (found in database)
├─ ✅ pipe_length_mm: 1000 mm
├─ ✅ pipe_diameter_mm: 20 mm
├─ ✅ temperature_c: 40°C
├─ ✅ flow_rate_lpm: 10 LPM
└─ ✅ All parameters valid!

⚠️  NOTE: You're using ecofoam_xhd_rc which requires
    HOT MOLD (35-45°C). Your temperature is 40°C ✅

Ready to calculate!
Processing...
```

### System Calculates & Returns:

```
RESULTS:

Optimal Machine Pressure: 160 bar
├─ Required minimum: 145 bar
├─ Recommended optimal: 160 bar
├─ Confidence: 92%
└─ Use HIGH-PRESSURE machine (100-200 bar)

Quality Analysis:
├─ 145 bar → 78% quality
├─ 150 bar → 82% quality
├─ 160 bar → 92% quality ← BEST
├─ 170 bar → 89% quality
└─ 200 bar → 75% quality

Thermal Effects:
├─ Temperature rise: 4.2°C
├─ Final temp: 40°C + 4.2°C = 44.2°C ✅ (within mold range)

Flow Analysis:
├─ Shear rate: 1234 s⁻¹
├─ Reynolds number: 45.2
├─ Flow regime: LAMINAR ✅ (perfect for XHD)

Environmental:
├─ GWP: 0 kg CO2-eq (zero emissions!)
├─ Biodegradable: Yes
└─ PFAS-free: Yes

✅ READY FOR PRODUCTION

Next: Set machine to 160 bar and proceed with injection
```

---

## 🗄️ Saving & Managing Custom Products

### Creating Custom Product:

```python
# User creates custom spec
custom_spec = CustomProductSpec(
    product_name="Acme Custom Foam v2",
    product_key="acme_custom_foam_v2",
    # ... all specifications ...
)

# System creates and optionally saves
custom_mgr.create_custom_product(custom_spec)

# Result:
✅ Custom product 'Acme Custom Foam v2' created successfully
   Key: acme_custom_foam_v2

   You can now use it:
   'material_key': 'acme_custom_foam_v2'
```

### Listing Custom Products:

```python
custom_mgr.list_custom_products()

# Returns:
{
    'acme_custom_foam_v2': 'Acme Custom Foam v2',
    'customer_special_blend': 'Customer Special Blend',
    'experimental_eco_v3': 'Experimental Eco v3'
}
```

### Using Custom Product Later:

```python
# User wants to use previously created custom material
params = {
    'pipe_length_mm': 800,
    'pipe_diameter_mm': 15,
    'material_key': 'acme_custom_foam_v2',  # From library
    'temperature_c': 25,
    'flow_rate_lpm': 8,
}

# System finds and uses saved specs automatically
# ✅ Calculation proceeds
```

### Deleting Custom Product:

```python
custom_mgr.delete_custom_product('acme_custom_foam_v2')

# Result:
✅ Custom product 'acme_custom_foam_v2' deleted
```

---

## 🎯 Error Message Quality

### Poor Error Message ❌
```
"Invalid input"
```

### Good Error Message ✅
```
"❌ pipe_diameter_mm: Pipe diameter must be positive, got -5
   💡 Provide diameter > 0 mm, e.g., 20 mm"
```

### Excellent Error Message ⭐
```
"❌ pipe_diameter_mm: Pipe diameter must be positive, got -5
   💡 Provide diameter > 0 mm, e.g., 20 mm

   Did you mean:
   • 5 mm (small diameter, high pressure drop)
   • 20 mm (standard diameter)
   • 50 mm (large diameter, low pressure drop)"
```

---

## 📋 Validation Checklist

For every user input, system checks:

| Check | Example | Error If |
|-------|---------|----------|
| **Type** | Is it a number? | Not int/float |
| **Range** | Is it positive? | ≤ 0 |
| **Extremes** | Is it reasonable? | Too large/small |
| **Exists** | Is material in DB? | Not found |
| **Consistency** | Do parameters make sense together? | Conflicting |
| **Physics** | Is it physically possible? | Violates laws |

---

## 🔄 Storage Backend Options

System supports saving custom products to:

```
1. FILE STORAGE (JSON/CSV)
   ├─ Fast, local, no dependencies
   ├─ Good for: Single user, small teams
   └─ Storage: ~/.pu-optimizer/custom_materials.json

2. DATABASE (PostgreSQL/MongoDB)
   ├─ Scalable, concurrent access
   ├─ Good for: Team collaboration, production
   └─ Enables: User accounts, version history, sharing

3. CLOUD STORAGE (AWS/GCP/Azure)
   ├─ Global access, automatic backup
   ├─ Good for: Enterprise, distributed teams
   └─ Enables: Mobile apps, sync across devices

4. CUSTOM BACKEND
   ├─ Your own database/API
   ├─ Good for: Integration with existing systems
   └─ Enables: Full customization
```

---

## Summary

**Error Handling:** ✅ Complete, user-friendly
**Custom Products:** ✅ Fully supported
**Saving Custom Products:** ✅ Pluggable storage backends
**Validation:** ✅ Comprehensive with helpful messages
**Extensibility:** ✅ Easy to add new materials

**Result:** Production-ready system that guides users through input,
handles errors gracefully, and supports unlimited custom materials.
