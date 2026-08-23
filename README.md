# Polyurethane Injection Optimizer Tool

**Calculate optimal injection parameters for polyurethane molding processes.**

## What Is This?

A physics-based calculation engine that helps polyurethane injection molding manufacturers understand:
- **Injection pressure** — what pressure to set, and why (line demand vs. the machine's own minimum)
- **How close to turbulent flow you are** — not just laminar/turbulent, but the margin and which dial to move
- **Temperature effects** — viscosity change with process temperature, and drift toward ambient in the feed line
- **Blowing agent behaviour** — whether it stays in solution at the process temperature and pressure
- **Cure & exotherm** — cream/gel time, processing window, scorch risk (for catalogued materials with a data sheet)
- **Machine compatibility** — does a low- or high-pressure machine work for these conditions?
- **Environmental impact** — GWP of the selected material and blowing agent

**Technology:** Python physics engine + React/TypeScript UI running in your browser (via Pyodide WebAssembly). No backend, no server — everything runs client-side, and works offline after the first load.

---

## Quick Example

**Input:**
- Material: Genfoam HD12
- Pipe: 1000 mm long, 20 mm diameter
- Flow: 10 L/min
- Temperature: 25 °C

**Output:**
- Pipe pressure drop, with fittings accounted for
- Reynolds number, flow regime, and how much headroom remains before it turns turbulent
- The pressure to actually set on the machine (line demand, or the machine's minimum — whichever governs — with the reasoning shown)
- Machine compatibility (low-pressure / high-pressure)

---

## What Can It Do?

### Core Physics
- Pressure drop (Darcy–Weisbach, Swamee–Jain friction factor)
- Temperature-dependent viscosity (Arrhenius) and shear-thinning (power law)
- Flow analysis (Reynolds number, shear rate, flow regime, laminar/turbulent margin)
- Shear heating
- Fitting losses

### Process Modelling (optional inputs)
- **Line thermal drift** — supply an ambient temperature and idle time, and the tool models the material cooling/warming toward ambient in the hose before it reaches the mix head, rather than assuming the tank set point holds all the way through
- **Blowing agent volatility** — checks whether the agent stays dissolved at the calculated line temperature and pressure
- **Cure & exotherm** — for catalogued materials with reaction data on their sheet: cream/gel/tack-free time, processing window, adiabatic temperature rise, and scorch risk, given a part thickness and mould temperature

### Materials & Machines
- **4 catalogued polyurethane systems**, defined in a single CSV (`src/data/polyurethane_foam_database.csv`) that both the UI and the Python engine read — add a row, get a new material, no code change needed
- **Custom materials** — enter viscosity, density, flow index and activation energy directly when your material isn't catalogued
- **2 machine classes** — low-pressure (8–20 bar) and high-pressure (100–200 bar), with the operator's actual set point derived from whichever binds: line demand, or the machine's own minimum

### Learning From Real Outcomes
Every calculation is saved locally in the browser. After a part is made, you can record how it actually came out (good / voids / short-shot / scorch / …). Once there are enough labelled shots, the tool can fit a small model to the *residual* between the physics prediction and reality — it deliberately will not train or show a confidence figure before there's real labelled data to train on, and it never invents synthetic training data. Datasets can be exported/imported as JSON to pool shots across machines or people, since the app has no backend of its own.

### Export
Results can be exported as JSON, CSV, a plain-text report, or a PDF (with the pressure chart embedded).

---

## Getting Started

1. **First time?** → Read [GETTING_STARTED.md](GETTING_STARTED.md)
2. **Need details on inputs/outputs?** → Read [CAPABILITIES.md](CAPABILITIES.md)
3. **Material data?** → See [MATERIALS_GUIDE.md](MATERIALS_GUIDE.md) and `src/data/database_data_dictionary.md`
4. **Machine types?** → See [MACHINE_SYSTEM_DOCUMENTATION.md](MACHINE_SYSTEM_DOCUMENTATION.md)
5. **Validation rules & custom materials?** → See [ERROR_HANDLING_AND_CUSTOM_PRODUCTS.md](ERROR_HANDLING_AND_CUSTOM_PRODUCTS.md)
6. **Recording outcomes & the shot dataset?** → See [LOGGING_GUIDE.md](LOGGING_GUIDE.md)
7. **Architecture?** → Read [ARCHITECTURE_PYTHON_FIRST.md](ARCHITECTURE_PYTHON_FIRST.md)

---

## Current Status

The calculation engine, custom materials, line-thermal modelling, blowing-agent volatility, cure/exotherm prediction, the laminar-flow-margin display, and the shot-record/residual-learning workflow are all implemented and covered by CI (unit tests, Python tests, and an end-to-end Playwright suite gate every deploy).

A few Python modules exist and are tested but are **not yet wired into the UI**: non-Newtonian rheology models beyond the power law (`src/core/rheology`), the standalone pressure/inverse optimizers (`src/core/optimizers`), and the advanced heat-transfer module (`src/core/thermodynamics`). They're available to build on, not features you'll find in the app today.

There is no neural-network surrogate and no synthetic-data ML quality/defect classifier — an earlier version of this project had one, and it was deliberately removed in favor of the shot-record model described above, which only speaks once it has real outcomes to learn from.

---

## Technology Stack

### Backend (runs in-browser via Pyodide/WASM)
- **Python** — pure standard library for the calculation engine (no numpy/scipy required to run a calculation)
- **scikit-learn** — loaded on demand, only when there's enough labelled shot data to train the residual model

### Frontend
- **TypeScript** + **React**
- **Vite**, **Tailwind CSS**
- **Vitest** (unit) + **Playwright** (end-to-end)

### Deployment
- **GitHub Pages**, deployed via **GitHub Actions** — the deploy job is gated on lint, type-check, unit tests, the Python test suite, and the full end-to-end suite all passing, and it ships the exact build artifact that suite ran against

---

## Try It Now

[Open the Polyurethane Optimizer](https://waltteriaxw.github.io/Pu-optimizer-tool/)

---

## Questions?

**For usage questions:** See [GETTING_STARTED.md](GETTING_STARTED.md) or [CAPABILITIES.md](CAPABILITIES.md)

**For material questions:** See [MATERIALS_GUIDE.md](MATERIALS_GUIDE.md)

**For developers:** See [ARCHITECTURE_PYTHON_FIRST.md](ARCHITECTURE_PYTHON_FIRST.md)
