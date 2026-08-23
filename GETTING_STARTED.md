# Getting Started - Your First Calculation

**Time: 5 minutes**

This guide walks you through your first pressure calculation using the Polyurethane Optimizer.

---

## Step 1: Open the Tool

Navigate to: [Polyurethane Optimizer](https://waltteriaxw.github.io/Pu-optimizer-tool/)

The first load fetches the Python physics engine (Pyodide) — you'll see "Initializing Engine" for a few seconds. After that it works offline.

You'll see a form on the left with:
- Pipe Length (mm)
- Pipe Diameter (mm)
- Material Temperature (°C)
- Flow Rate (L/min)
- Material (dropdown)
- Machine Type (Low Pressure / High Pressure)
- An **Optional** section (collapsed by default) for ambient conditions and part geometry

---

## Step 2: Select a Material

Click the **Material** dropdown. The list is read live from the material database — currently:

- **Genfoam HD12** — water-blown, general purpose, rigid, ~195–215 kg/m³
- **Genfoam HD20** — water-blown, higher density, ~290–315 kg/m³
- **Ecomate Spray EC** — spray foam, ultra-fast, zero-GWP blowing agent
- **Ecofoam XHD RC** — rigid, extra-high-density, for panels and cavity filling

If your material isn't listed, select **Custom Material…** at the bottom of the list — it opens fields for viscosity, density, flow index and activation energy so you can enter your own values.

---

## Step 3: Enter Pipe Dimensions

**Pipe Length:** e.g. 500 mm — how long your injection line is. Longer = more pressure drop.

**Pipe Diameter:** e.g. 12 mm — internal diameter. Larger = less pressure drop.

Valid range: 50–10,000 mm length, 1–200 mm diameter.

---

## Step 4: Enter Temperature and Flow Rate

**Material Temperature:** e.g. 25 °C (valid range 5–50 °C). This is the tank/set-point temperature — affects viscosity directly.

**Flow Rate:** e.g. 5 L/min (valid range 0.1–200 L/min).

---

## Step 5 (optional): Ambient Conditions & Part Geometry

Expand **Optional** to model two things the basic calculation leaves out:

- **Ambient Temperature + Time Since Last Shot** — models material sitting in the hose drifting toward the surrounding air, so the pressure reflects the temperature at the mix head rather than the tank set point. Useful for single-shot or intermittent work. Leave blank and the calculation behaves exactly as if this section didn't exist.
- **Mould Temperature + Part Thickness** — adds a cure/exotherm prediction for the moulded part (cream time, gel time, processing window, scorch risk). Only available for catalogued materials whose data sheet states reaction times.

---

## Step 6: Run Simulation

Click **Run Simulation**.

---

## Reading the Results

### Required Pressure (top card)
The number to actually set on the machine — whichever governs: what the line demands, or the machine's own minimum (a high-pressure machine holds its minimum regardless of what the line asks for, because impingement mixing needs it). The card states which one is governing and shows the machine's operating window.

### Laminar Flow Margin
Not just "laminar" or "turbulent" — how much headroom is left before the line crosses into turbulence, and which input to change if it hasn't (or has).

### KPI Row
Pipe Pressure Drop, Flow Regime (with Reynolds number), Shear Rate, Viscosity.

### Pressure Analysis
The pressure profile chart, plus base pressure drop, pressure with fittings, and fitting loss broken out.

### Flow Properties
Apparent viscosity, Reynolds number, velocity, shear rate.

### Thermal & Environmental (if available)
Process temperature, reference and current viscosity, shear heating; and the selected material's blowing agent, GWP, and eco-friendliness recommendation.

### Blowing Agent (if the material names one)
Whether it stays in solution at the calculated line temperature and pressure — "stays in solution," "close to boiling," or "flash-off risk."

### Temperature at the Mix Head (only if you supplied an ambient temperature)
Set point vs. ambient vs. the effective temperature the material actually arrives at.

### Cure & Exotherm (only if you supplied a part thickness, for a catalogued material)
Cream/gel/tack-free time, working time, adiabatic temperature rise, peak core temperature, and scorch risk.

### Machine Compatibility
Whether the selected machine (Low Pressure: 8–20 bar, High Pressure: 100–200 bar) can hold the required pressure.

---

## Pressure Units

The toggle in the top bar switches every pressure on screen between **bar** and **psi**. It
is a display preference only — the engine calculates in bar, saved runs store bar, and
exported files stay in bar whatever the toggle says, so a file you open next week means the
same thing regardless of how the screen was set when you saved it. Your choice is remembered
between visits.

---

## What Is Remembered

The tool has no backend; everything stays in your browser.

- **Your form setup** is saved when you press Run Simulation, so reopening the tab picks up
  where you left off rather than resetting to the defaults.
- **Every calculation** is saved to History, along with any outcome you record.
- **Your pressure unit** choice.

The **Shot dataset** panel in the History sidebar can export all of this to a file, import a
file from another machine, and clear everything saved in this browser.

---

## Recording How the Part Came Out

Every calculation is saved to **History** (top-right). Open a saved run and use the **"How did the part come out?"** dropdown to record the outcome (good, voids, short-shot, scorch, surface defect). This is the one thing the physics can't know on its own, and it's what lets the tool eventually learn where its predictions and real parts disagree — see the **Shot dataset** panel in the history sidebar for export/import and training status.

---

## Common Next Steps

**"I need a different pressure"** → Adjust Pipe Diameter or Flow Rate and recalculate. Larger diameter or lower flow rate both reduce pressure.

**"Temperature is too high"** → Lower Material Temperature, use a larger diameter, or reduce flow rate — all reduce shear heating.

**"Flow is turbulent"** → Increase pipe diameter or reduce flow rate. The Laminar Flow Margin card tells you the minimum diameter or maximum flow rate that would keep you laminar.

**"I have a custom material"** → Select **Custom Material…** in the dropdown and fill in its properties directly.

---

## Exporting Results

Use the buttons above the results panel to export as **JSON**, **CSV**, a plain-text **Report**, or a **PDF**.

---

## Next: Full Documentation

- **Capabilities:** [CAPABILITIES.md](CAPABILITIES.md)
- **Architecture:** [ARCHITECTURE_PYTHON_FIRST.md](ARCHITECTURE_PYTHON_FIRST.md) (for developers)
- **Materials:** [MATERIALS_GUIDE.md](MATERIALS_GUIDE.md)
