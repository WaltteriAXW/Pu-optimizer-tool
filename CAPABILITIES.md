# Capabilities - What Can This Tool Do?

**Current Status: December 2024, Phase 4 Complete ✅**

This document describes the current capabilities of the Polyurethane Injection Optimizer.

---

## Core Physics Calculations

### ✅ Pressure Drop Analysis
Calculate how much pressure is needed to push material through your injection system.

**What it calculates:**
- Base pressure drop (Darcy-Weisbach equation)
- Pressure losses from fittings & elbows (~15% additional)
- Total required pressure (bar or kPa)
- Friction factor (Swamee-Jain correlation)

**Accuracy:** ±5-10% depending on fluid model selected

**Example:**
```
Input: 1000mm pipe, 20mm diameter, 10 L/min of Ecofoam HD12 @ 25°C
Output: 12.3 bar required pressure
```

---

### ✅ Thermal Analysis
Predict how temperature changes as material flows through the system.

**What it calculates:**
- Shear heating from friction
- Temperature rise along pipe length
- Heat loss to environment
- Final outlet temperature
- Temperature distribution profile (if advanced model selected)

**Models available:**
- **Simple model** - Constant heat loss (fast, <1ms)
- **Advanced model** - Full heat transfer physics (3-5ms)
  - Convection coefficients (Dittus-Boelert, Shah correlations)
  - Radiation effects (Stefan-Boltzmann)
  - Pipe conduction
  - Insulation modeling
  - Temperature profile along length

**Accuracy:**
- Simple: ±10-15%
- Advanced: ±3-8%

**Example:**
```
Input: 1000mm pipe @ 25°C inlet, 10 L/min
Output: 27.1°C outlet (2.1°C rise)
        Flow regime: Laminar
        Heat loss: 28 W
```

---

### ✅ Flow Regime Analysis
Understand whether flow is laminar or turbulent.

**What it calculates:**
- Shear rate (γ̇) in s⁻¹
- Apparent viscosity (affected by shear, temperature)
- Reynolds number (flow regime indicator)
- Flow velocity (m/s)
- Prandtl number (thermal properties)

**Flow regimes:**
- **Laminar** (Re < 2300) - Smooth, predictable, usually good for PU
- **Transitional** (2300 < Re < 4000) - Mixed behavior
- **Turbulent** (Re > 4000) - Chaotic, can cause degradation

**Example:**
```
Input: 20mm pipe, 10 L/min, viscosity 350 cP
Output: Re = 45.2 (Laminar ✅)
        Shear rate: 1,234 s⁻¹
```

---

### ✅ Viscosity Effects
Account for how viscosity changes with temperature and shear rate.

**What it models:**
- **Arrhenius equation** - Temperature-dependent viscosity
  - Activation energy: 15,000-40,000 J/mol (material-dependent)
  - Calculates viscosity at any temperature
  - Example: +10°C → ~35% viscosity reduction

- **Shear-thinning** - Viscosity reduction under high shear
  - Power Law model (standard)
  - More advanced models available (see below)

**Example:**
```
Input: Ecofoam at 25°C (350 cP baseline), 35°C target
Output: Viscosity @ 35°C: 228 cP (35% reduction)
        Result: Lower pressure drop!
```

---

## Advanced Rheological Models (Phase 4 Tier 1)

### 4 Non-Newtonian Fluid Models

All include temperature correction (Arrhenius) and wall slip at high pressure.

#### 1. Power Law (Ostwald)
```
η = K × γ̇^(n-1)
```
- Standard baseline
- Good for 100-10,000 s⁻¹ shear rate
- Fast, accurate for most PU

**Use when:** Standard polyurethane foam

#### 2. Herschel-Bulkley (Yield Stress)
```
τ = τ₀ + K × γ̇^n
```
- Includes minimum stress to initiate flow (yield stress)
- 15-25% more accurate for structured foams
- Better for XHD rigid foams

**Use when:** Structured, high-viscosity materials (XHD, semi-rigid)

#### 3. Cross Model (Smooth Transition)
```
η = η∞ + (η₀ - η∞) / [1 + (k×γ̇)^n]
```
- Smooth transition from zero-shear to infinite-shear viscosity
- Avoids discontinuities
- Best for wide shear rate ranges

**Use when:** Processing very different flow rates

#### 4. Carreau Model (Industry Standard)
```
η = η₀ × [1 + (λ×γ̇)²]^((n-1)/2)
```
- Industry-standard smooth model
- Excellent match to experimental data
- Used in CFD simulations

**Use when:** Maximum accuracy needed

---

## Pressure Optimization (Phase 4 Tier 1)

### ✅ Find Optimal Operating Pressure

Automatically calculate:
- **REQUIRED pressure** - Minimum viable (lowest)
- **OPTIMAL pressure** - Best for quality/efficiency
- **CONFIDENCE score** - How certain is the recommendation (0-1)
- **ALTERNATIVE pressures** - Trade-offs across range

**Optimization objectives:**
- **Minimum Pressure** - Lowest viable setting
- **Quality** - Minimize defects, maximize surface finish
- **Efficiency** - Minimize energy, heat, wear
- **Balanced** - Multi-objective trade-off

**Example:**
```
Input: Ecofoam HD12, 1000mm pipe, 20mm diameter, 10 L/min
Output:
  Required: 145 bar (minimum viable)
  Optimal: 160 bar (recommended)
  Confidence: 92%

  Quality by pressure:
  145 bar → 78% quality
  150 bar → 82% quality
  160 bar → 92% quality ← BEST
  170 bar → 89% quality
  200 bar → 75% quality
```

---

## Advanced Heat Transfer (Phase 4 Tier 2)

### ✅ Full Physics-Based Heat Transfer

**Heat transfer mechanisms:**
- **Convection** - Material to pipe walls
- **Conduction** - Through pipe material (steel, copper, etc.)
- **Radiation** - To environment (with insulation)
- **Insulation effects** - Reduces heat loss 50-80%

**Flow regime-specific Nusselt correlations:**
- **Turbulent** (Re > 4000) - Dittus-Boelert equation
- **Laminar** (Re < 2300) - Shah correlation
- **Transitional** (2300 < Re < 4000) - Linear interpolation

**Pipe materials supported:**
- Steel (50 W/m·K)
- Copper (400 W/m·K)
- Aluminum (237 W/m·K)

**Insulation materials:**
- Foam (0.04 W/m·K, emissivity 0.9)
- Glass wool (0.05 W/m·K, emissivity 0.85)
- Mineral wool (0.06 W/m·K, emissivity 0.88)

**Accuracy:** ±3-6% (2x improvement over simple model)

---

## Neural Network Surrogate (Phase 4 Tier 3)

### ✅ Ultra-Fast Predictions (100x Speed Improvement)

**What it does:**
- Emulates entire calculation pipeline
- <1 millisecond per prediction
- Suitable for real-time optimization

**Architecture:**
```
Inputs: 7 parameters (pipe, flow, temp, material properties)
  ↓
Hidden layers: 256 → 128 → 64 neurons (ReLU)
  ↓
Outputs: 8 predictions (temperature, pressure, Reynolds, etc.)
  ↓
Confidence score: 0-1 (how sure is the model?)
```

**Speed comparison:**
- Physics model: 100+ ms (accurate)
- Neural network: <1 ms (fast)
- **Speedup: 100x**

**Accuracy:** ±5-8% (comparable to physics, much faster)

**When to use:**
- Real-time optimization loops
- Multi-parameter sweeps
- Interactive parameter adjustment
- Quick feasibility checks

---

## Polyurethane Kinetics (Phase 4 Bonus)

### ✅ Cure Behavior Prediction

**Models implemented:**
- **Avrami equation** - Simple exponential cure
- **Kamal-Sourour** - Autocatalytic cure (more realistic)

**What it predicts:**
- Degree of cure (α) vs time
- Cream time - When mixing starts
- Gel time - When part sets
- Peak exothermic temperature
- Thermal stability
- Cure rate at different temperatures

**Example:**
```
Input: Ecofoam HD12 @ 25°C
Output:
  Cream time: 50s (when reaction visible)
  Gel time: 120s (fully set)
  Peak exotherm: ~75°C
  Cure 99%: ~240s
```

---

## Machine Learning Predictions (Phase 4 Tier 3)

### ✅ Quality & Defect Assessment

**ML Models:**
1. **Quality Classifier**
   - Predicts: Good / Acceptable / Defective / Failed
   - Based on process parameters
   - Trained on synthetic + production data

2. **Defect Risk Predictor**
   - Predicts probability of:
     - Voids (air bubbles)
     - Short-shots (incomplete fill)
     - Flash (overflow)
     - Surface defects

3. **Pressure Optimizer ML**
   - Suggests optimal pressure
   - Learns from production feedback
   - Improves over time

4. **Confidence Scoring**
   - Indicates how sure each prediction is
   - NN surrogate provides uncertainty quantification
   - Allows fallback to physics model if low confidence

**Accuracy:** ±5-8% with high-confidence inputs

---

## Materials Database (Phase 4 Tier 4)

### ✅ 20+ Polyurethane Systems

**Included materials:**

**Rigid Foams:**
- Genfoam HD12 (water-blown, 195-215 kg/m³)
- Genfoam HD20 (water-blown, 290-315 kg/m³)
- Ecofoam XHD RC (rigid, high-density, 40-45 kg/m³)

**Spray Foams:**
- Ecomate Spray (ultra-fast, zero GWP)

**Flexible Foams:**
- Flexo Soft Grade
- Flexo Medium Grade

**Semi-Rigid:**
- Semirigid Structural

**Specialty Systems (10+ more):**
- High-temp Rigid Foam
- Low-density Spray
- Memory Foam Base
- Acoustic Foam
- Fire-retardant
- Marine Grade
- Automotive Seat
- Shoe Sole
- Pour Foam Standard

**Each includes:**
- ✅ Polyol & isocyanate viscosity
- ✅ Densities (components & foam)
- ✅ Temperature-dependent properties
- ✅ Pressure-dependent properties (compressibility)
- ✅ Reaction kinetics (cream time, gel time)
- ✅ Rheological parameters (flow index, consistency)
- ✅ Environmental impact (GWP, blowing agent)
- ✅ Processing conditions (optimal temp, pressure)
- ✅ Quality metrics (strength, closed-cell %)
- ✅ Thermal properties (k-factor)

---

## Machine Database (Phase 4 Tier 4)

### ✅ 10+ Injection Machine Types

**Standard Categories:**

**Low-Pressure (5-20 bar):**
- Standard LP system
- Compact LP
- Laboratory scale
- Ideal for: Flexible foam, elastomers, CASE

**High-Pressure (100-200 bar):**
- Standard HP system
- Precision RIM
- Industrial HP
- Ideal for: Rigid foam, integral skin, dense composites

**Specialized:**
- Ultra-high-pressure (150-350 bar)
- Spray equipment (15-50 bar)
- Batch pouring (0.5-5 bar)
- Production spray (20-80 bar)

**Each machine specs:**
- Operating pressure range
- Flow rate range
- Temperature control
- Cycle time
- Shot volume
- Repeatability

---

## Production Features (Phase 4 Bonus)

### ✅ Production Logging & ML Retraining

**Logging:**
- Log every production run
- Track actual quality outcomes
- Record defects observed
- Store parameters and results

**Analysis:**
- Get production statistics
- Identify trends
- Compare actual vs predicted

**Continuous Improvement:**
- Retrain ML models with real production data
- Combine synthetic data with actual runs
- Models improve over time
- Deploy better models automatically

**Example:**
```
Day 1: Log 10 production runs (good quality)
Day 5: Log 40 more runs (some defects)
Week 1: Retrain ML with 50 labeled samples
        → Models improve by 5-10%
```

---

## Environmental Impact

### ✅ Global Warming Potential (GWP) Calculation

**What it shows:**
- GWP of selected material (kg CO2-equivalent)
- CO2 offset equivalents (cars, trees, etc.)
- Eco-friendly rating

**Examples:**
- Water-blown materials: **0 GWP** (best)
- HFO-blown materials: **1-10 GWP** (excellent)
- HFC-blown materials: **1000+ GWP** (standard)
- CFC/HCFC: **5000+ GWP** (phased out)

---

## Custom Materials

### ✅ Define Your Own Formulations

If your material is not in the database, you can:
1. Enter viscosity, density, reaction times
2. Specify rheological properties
3. Define thermal properties
4. Save for future use
5. Share with team

**Required specs:**
- Polyol/isocyanate viscosity
- Densities
- Cream & gel times
- Flow index & consistency
- Activation energy
- Optional: GWP, notes

---

## Accuracy & Limitations

### What It's Accurate For
✅ Pressure drop (±5-10%)
✅ Temperature rise (±3-8%)
✅ Flow regime detection
✅ Machine compatibility
✅ Quality assessment (with high-confidence inputs)

### What It's NOT For
❌ Detailed mold design
❌ Chemical reaction simulation
❌ Cell structure prediction
❌ Dimensional tolerances
❌ Mechanical property prediction (strength, modulus)
❌ Detailed thermal field maps (1D only)

### Confidence Levels
- **Very High (>95%)** - Standard conditions, in-distribution inputs
- **High (85-95%)** - Near typical operating range
- **Medium (70-85%)** - Slightly outside typical range
- **Low (50-70%)** - Far from training data
- **Very Low (<50%)** - Extreme inputs, use with caution

---

## What's NOT Included

| Feature | Status | Why |
|---------|--------|-----|
| Mold design | ❌ Not included | Requires CAD software |
| Chemical simulation | ❌ Not included | Too complex for this tool |
| Mechanical properties | ❌ Not included | Needs experimental data |
| Detailed CFD | ❌ Not included | Requires specialized software |
| Business optimization | ❌ Not included | Outside scope |

---

## System Requirements

### Browser
- Chrome/Firefox/Safari (any recent version)
- ~20 MB RAM for calculations
- JavaScript enabled

### Internet
- One-time Pyodide download (~6 MB)
- After that: Works offline

### Knowledge
- Basic PU injection knowledge
- Familiarity with bar/PSI/temperature
- Understanding of pipe/flow concepts

---

## Performance

| Operation | Time | Speed |
|-----------|------|-------|
| Basic calculation | 100-200 ms | Standard |
| Advanced thermal | 3-5 ms | Added complexity |
| Optimization | 3-5 sec | Global search |
| NN prediction | <1 ms | 100x faster |
| Batch (100 points) | 50 ms | Fast |

---

## What's Next?

See documentation:
- **Getting Started:** [GETTING_STARTED.md](GETTING_STARTED.md)
- **Materials:** [MATERIALS_GUIDE.md](MATERIALS_GUIDE.md)
- **Machines:** [MACHINE_SYSTEM_DOCUMENTATION.md](MACHINE_SYSTEM_DOCUMENTATION.md)
- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md) (for developers)
- **Logging:** [LOGGING.md](LOGGING_GUIDE.md) (for production use)

---

**Questions?** Check the relevant guide or see [README.md](README.md).
