# Getting Started - Your First Calculation

**Time: 5 minutes**

This guide walks you through your first pressure drop calculation using the Polyurethane Optimizer.

---

## Step 1: Open the Tool

Navigate to: [Polyurethane Optimizer](https://walteriaXw.github.io/Pu-optimizer-tool/)

You should see a form with input fields for:
- Material (dropdown)
- Pipe length (mm)
- Pipe diameter (mm)
- Temperature (°C)
- Flow rate (L/min)

---

## Step 2: Select a Material

Click the **Material** dropdown and select a polyurethane system.

**Recommended for first test:**
- **Ecofoam HD12** - General purpose, water-blown, zero GWP

**Other common options:**
- **Genfoam HD20** - Higher density water-blown
- **Ecomate Spray** - Ultra-fast spray foam
- **Ecofoam XHD RC** - Rigid, high-density closed-cell

If you don't see your material, you can create a custom one. See [Custom Materials](ERROR_HANDLING_AND_CUSTOM_PRODUCTS.md#creating-custom-materials).

---

## Step 3: Enter Pipe Dimensions

**Pipe Length:** 1000 mm
- This is how long your injection system is
- Longer pipes = more pressure drop

**Pipe Diameter:** 20 mm
- Internal diameter of your hose/pipe
- Larger diameter = less pressure drop

**Rule of thumb:** Typical injection systems are 500-2000mm with 10-30mm diameter pipes.

---

## Step 4: Enter Temperature

**Temperature:** 25 °C
- Ambient room temperature
- This affects material viscosity
- Warmer = lower viscosity = lower pressure drop

**Range:** 5-50°C (adjust for your heating/cooling system)

---

## Step 5: Enter Flow Rate

**Flow Rate:** 10 L/min
- How fast the material flows (liters per minute)
- Higher flow = higher pressure drop
- Typical range: 0.5-50 L/min

**For your machine type:**
- Low-pressure machines: 0.5-30 L/min typical
- High-pressure machines: 5-200 L/min typical

---

## Step 6: Click Calculate

Click the **Calculate** button.

The system will:
1. ✅ Validate your inputs
2. ✅ Load material properties
3. ✅ Run calculations (pressure, temperature, flow, etc.)
4. ✅ Display results

---

## Reading the Results

### Pressure Results
```
Pressure Drop: 12.3 bar
├─ Base pressure: 10.8 bar
└─ With fittings: 12.3 bar (15% loss)

Machine Needed: High-Pressure (100-200 bar) ✅ Compatible
```

**What it means:**
- You need **at least 12.3 bar** to push material through the pipe
- Your machine must support this pressure
- Green checkmark = your machine works

### Thermal Results
```
Temperature Rise: 2.1°C
└─ Final temperature: 27.1°C
```

**What it means:**
- Material heats up slightly due to friction
- Final temperature is still safe (27.1°C)
- No risk of premature cure

### Flow Analysis
```
Shear Rate: 1,234 s⁻¹
Reynolds Number: 45.2
Flow Regime: Laminar ✅
```

**What it means:**
- **Laminar** = smooth, controlled flow (good!)
- **Turbulent** = chaotic flow (usually bad - causes mixing issues)

### Quality Assessment
```
Quality Confidence: 92% ✅
├─ Low defect risk
├─ Good mixing expected
└─ Recommended action: Use suggested pressure
```

---

## Common Next Steps

### "I need a different pressure"
→ Adjust **Pipe Diameter** or **Flow Rate** and recalculate
- Larger diameter = lower pressure
- Lower flow rate = lower pressure

### "Temperature is too high"
→ Adjust one of:
- **Inlet Temperature** (lower = less heating)
- **Pipe Diameter** (larger = less shear heating)
- **Flow Rate** (lower = less heating)

### "I need to optimize pressure"
→ Switch to **Optimization Mode** (if available)
- System finds the optimal pressure automatically
- Shows required vs optimal vs alternative pressures

### "I have a custom material"
→ See [Custom Materials](ERROR_HANDLING_AND_CUSTOM_PRODUCTS.md#creating-custom-materials)

---

## What Each Input Does

| Input | Effect | Increase = |
|-------|--------|-----------|
| **Pipe Length** | Friction resistance | More pressure ↑ |
| **Pipe Diameter** | Flow resistance | Less pressure ↓ |
| **Flow Rate** | Velocity | More pressure ↑ |
| **Temperature** | Viscosity | Less pressure ↓ |
| **Material** | Base properties | Varies |

---

## Troubleshooting

### "Error: Missing required inputs"
→ Make sure all fields are filled (Material, Length, Diameter, Temp, Flow Rate)

### "Error: Material not found"
→ Check the material name or create a custom material

### "Warning: Pressure too high"
→ Your calculated pressure exceeds your machine's capability
→ Solution: Increase pipe diameter, reduce flow rate, or increase temperature

### "Warning: Flow is turbulent"
→ Material is flowing too chaotically
→ Solution: Increase pipe diameter or reduce flow rate

---

## Key Concepts

### Pressure Drop
The resistance created by pushing material through a pipe. Measured in bar.

### Temperature Rise
Material heats up due to friction while flowing. Measured in °C.

### Shear Rate
How fast the material is being pushed/twisted. Fast shear can degrade materials.

### Reynolds Number
Indicator of flow regime (laminar = smooth, turbulent = chaotic).

---

## Ready for More?

### Understand the capabilities
→ Read [CAPABILITIES.md](CAPABILITIES.md) - Learn what else the tool can do

### Dive into machine details
→ Read [MACHINES_GUIDE.md](MACHINE_SYSTEM_DOCUMENTATION.md) - Machine types explained

### Learn about materials
→ Read [MATERIALS_GUIDE.md](MATERIALS_GUIDE.md) - Material database details

### Production use
→ Read [LOGGING.md](LOGGING_GUIDE.md) - Log runs and train ML models

---

## Example Calculations

### Example 1: Standard Low-Pressure System
```
Material: Ecofoam HD12
Pipe: 500mm × 15mm
Flow: 15 L/min
Temp: 25°C

Results:
→ Pressure: 8.2 bar (Low-pressure OK ✅)
→ Temp rise: 1.5°C (Good)
→ Flow regime: Laminar (Optimal)
→ Action: Ready to produce
```

### Example 2: High-Viscosity Material
```
Material: Ecofoam XHD RC (high viscosity)
Pipe: 1000mm × 20mm
Flow: 20 L/min
Temp: 25°C

Results:
→ Pressure: 45.2 bar (Needs high-pressure ✅)
→ Temp rise: 5.8°C (Acceptable)
→ Flow regime: Laminar (Good)
→ Action: Use high-pressure machine
```

### Example 3: Temperature-Optimized
```
Material: Ecofoam HD12
Pipe: 1000mm × 20mm
Flow: 10 L/min
Temp: 35°C (heated) ← Higher temp!

Results:
→ Pressure: 7.4 bar (LOWER than Example 1!)
→ Temp rise: 1.2°C
→ Flow regime: Laminar
→ Action: Preheat material to reduce pressure
```

---

## Next: Full Documentation

- **Capabilities:** [CAPABILITIES.md](CAPABILITIES.md)
- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md) (for developers)
- **Materials:** [MATERIALS_GUIDE.md](MATERIALS_GUIDE.md)
- **Machines:** [MACHINE_SYSTEM_DOCUMENTATION.md](MACHINE_SYSTEM_DOCUMENTATION.md)

---

**Questions?** See the relevant guide above or check [ARCHITECTURE.md](ARCHITECTURE.md) for technical details.
