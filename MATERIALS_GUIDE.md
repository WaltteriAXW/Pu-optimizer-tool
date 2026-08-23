# Materials Guide - Polyurethane Database Reference

**Reference for the 4 materials currently in the Polyurethane Optimizer's database**, plus how to use a material that isn't in it.

The database lives in one place — `src/data/polyurethane_foam_database.csv` — and both the browser UI and the Python calculation engine read it directly, so this guide only states values that are actually in that file. Where a material's data sheet doesn't state a property, that's shown as "not specified" rather than an invented number. For the full column reference, see `src/data/database_data_dictionary.md`.

---

## Quick Selection Guide

| Application | Material | Polyol Viscosity | Free-Rise Density | Blowing Agent |
|---|---|---|---|---|
| General purpose molding | **Genfoam HD12** | 900–1050 cP | 195–215 kg/m³ | Water |
| Denser / stronger parts | **Genfoam HD20** | 900–1050 cP | 290–315 kg/m³ | Water |
| Spray foam, fastest cure | **Ecomate Spray EC** | 350±50 cP | 28.8–32.0 kg/m³ | ecomate® |
| Rigid, highest strength | **Ecofoam XHD RC** | 850±50 cP | 40.0–45.0 kg/m³ | ecomate® |

---

## Material Specifications

Values below are read straight from the CSV. "n/a" means the data sheet doesn't state that property for this material — the calculation engine falls back to a literature-typical value in that case and flags the result as an estimate (this applies to cure/exotherm predictions in particular; see [CAPABILITIES.md](CAPABILITIES.md)).

### Genfoam HD12

- **Type:** High-density pour/mould, water-blown
- **Application:** Pour-in-place and molded foam
- Polyol viscosity: 900–1050 cP · Isocyanate viscosity: 200±20 cP (both @ 25 °C)
- Flow index: 0.85 · Activation energy: 25,000 J/mol
- Cream time: 50–60 s · Gel time: 130–140 s
- Free-rise density: 195–215 kg/m³ · Molded density: 350–550 kg/m³
- Heat of reaction, peak exotherm, mould temperature, compressive strength, closed-cell content, k-factor: n/a (not on this data sheet)

### Genfoam HD20

- **Type:** High-density pour/mould, water-blown, denser than HD12
- **Application:** Pour-in-place and molded foam
- Polyol viscosity: 900–1050 cP · Isocyanate viscosity: 200±20 cP (both @ 25 °C)
- Flow index: 0.83 · Activation energy: 26,000 J/mol
- Cream time: 50–60 s · Gel time: 130–140 s
- Free-rise density: 290–315 kg/m³ · Molded density: 400–600 kg/m³
- Heat of reaction, peak exotherm, mould temperature, compressive strength, closed-cell content, k-factor: n/a (not on this data sheet)

### Ecomate Spray EC

- **Type:** Spray foam, continuous coatings
- Polyol viscosity: 350±50 cP · Isocyanate viscosity: 200±20 cP (both @ 25 °C) — much lower than the pour/mould products, characteristic of spray systems
- Flow index: 0.88 · Activation energy: 24,000 J/mol
- Mould/substrate temperature: 5–40 °C
- Cream time: 8–12 s · Gel time: 18–26 s · Tack-free time: 18–26 s — fast, as expected of a spray system
- Free-rise density: 28.8–32.0 kg/m³
- Compressive strength (parallel): ≥ 200 kPa · Closed-cell content: ≥ 90% · Initial k-factor: 0.019–0.022 W/m·K
- PFAS-free: Yes

### Ecofoam XHD RC

- **Type:** Extra-high-density panel/cavity fill, discontinuous application
- Polyol viscosity: 850±50 cP · Isocyanate viscosity: 200±20 cP (both @ 25 °C)
- Flow index: 0.82 · Activation energy: 28,000 J/mol
- Mould/substrate temperature: 35–45 °C — needs a heated mould, unlike the other three
- Cream time: 8–12 s · Gel time: 28–32 s
- Free-rise density: 40.0–45.0 kg/m³
- Compressive strength: 414 kPa (parallel) / 275 kPa (perpendicular) · Closed-cell content: ≥ 95% · Initial k-factor: 0.019–0.022 W/m·K
- PFAS-free: Yes

---

## Temperature Sensitivity

Viscosity follows the Arrhenius relationship using each material's activation energy. For a material with Ea ≈ 25,000 J/mol (close to Genfoam HD12), every ~10 °C increase reduces viscosity by roughly 25–35% — run the actual number for your material and temperature through the calculator rather than trusting a table, since the exact figure depends on the activation energy and reference viscosity of the specific material and blend you selected.

Higher temperature → lower viscosity → lower pressure drop, all else equal.

---

## Custom Materials

If your material isn't in the list above, select **Custom Material…** in the Material dropdown. You'll be asked for exactly four properties:

| Property | Range | Typical |
|---|---|---|
| Viscosity (cP) | 50–10,000 | 300–1000 for most PU systems |
| Density (kg/m³) | 900–1500 | ~1100–1120 for a typical mixed liquid |
| Flow Index (0–1) | 0.01–1.0 | 0.8–0.9 |
| Activation Energy (J/mol) | 1,000–100,000 | 20,000–35,000 |

There's no name/save/share step — custom values apply to that session's calculation. Environmental impact and cure/exotherm predictions aren't available for custom materials, since there's no data sheet behind them to calibrate against; the pressure, flow, and thermal calculations work exactly as they do for a catalogued material.

If you want a custom material to persist and appear in the dropdown for everyone, the right way is to add a row to `src/data/polyurethane_foam_database.csv` — see `src/data/database_data_dictionary.md` for the column format — rather than re-entering it as a custom material each session.

---

## Need More Info?

- **Full capabilities:** [CAPABILITIES.md](CAPABILITIES.md)
- **How to use:** [GETTING_STARTED.md](GETTING_STARTED.md)
- **Machines:** [MACHINE_SYSTEM_DOCUMENTATION.md](MACHINE_SYSTEM_DOCUMENTATION.md)
- **Full column reference:** `src/data/database_data_dictionary.md`
