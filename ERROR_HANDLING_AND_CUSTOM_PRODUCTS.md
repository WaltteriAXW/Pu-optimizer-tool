# Validation, Errors & Custom Materials

How the app validates input and what happens with a material that isn't in the database. The app is a plain web form, not a conversational interface — if you've seen an earlier version of this doc describing a chat-style back-and-forth ("SYSTEM: Please provide...") or pluggable storage backends (PostgreSQL/cloud/etc.), that described a system this project never actually built. What's below is what the form and the Python engine actually do.

---

## Where Validation Happens

Two layers, both real:

1. **In the browser, as you type** (`CalculatorForm.tsx`) — each numeric field is checked against its range immediately, and an inline red message appears under the field. The **Run Simulation** button stays disabled while any field has an error, so you can't submit invalid input.
2. **In the Python engine, on calculate** (`src/core/validation/__init__.py`) — `validate_parameters()` re-checks the same required fields and ranges before any calculation runs, and returns a plain list of error strings. This is what actually gates the calculation regardless of the UI — the frontend check exists to give you feedback sooner, not as the only line of defense.

## Required Fields

`pipe_length_mm`, `pipe_diameter_mm`, `material_key`, `temperature_c`, `flow_rate_lpm`. Missing any of these produces `"Missing required parameter: <name>"`.

## Validation Ranges

These are shared between the browser and the Python engine (`VALIDATION_RANGES` in both `src/constants.ts` and `src/constants.py` — kept identical on purpose, since the two disagreeing used to mean the form silently rejected values the engine would have accepted):

| Field | Range | Unit |
|---|---|---|
| Pipe length | 50 – 10,000 | mm |
| Pipe diameter | 1 – 200 | mm |
| Temperature | 5 – 50 | °C |
| Flow rate | 0.1 – 200 | L/min |

Custom-material fields (viscosity, density, flow index, and the optional second viscosity reading) have their own rules — see [Custom Materials](#custom-materials) below.

A value outside range produces a message like:

```
Pipe length must be at least 50 mm
Pipe diameter must not exceed 200 mm
```

A non-numeric value produces `"Temperature must be a valid number"` (or the equivalent for the field in question).

## Unknown Material

If `material_key` doesn't match anything in the database and it isn't `custom` with the custom-material fields (viscosity, density, flow index) supplied, calculation fails with:

```
No material properties available (tried: material_key "xyz" not in the database
(available: genfoam_hd12, genfoam_hd20, ecomate_spray, ecofoam_xhd_rc))
```

In the UI this situation doesn't actually arise — the Material dropdown is populated straight from the database, plus a **Custom Material…** option, so there's no way to type an arbitrary unrecognised key. This check exists for anyone calling the Python engine directly.

## Machine Compatibility Warnings

These aren't validation errors (the calculation still completes) — they're returned in the result's `warnings` list and shown in the **Attention Needed** panel. Examples: turbulent flow, high shear rate (>5000 s⁻¹), pressure drop above 150 bar, viscosity more than doubling at process temperature, or the required pressure falling outside the selected machine's range.

---

## Custom Materials

Select **Custom Material…** at the bottom of the Material dropdown. These fields appear:

| Property | Range | Unit |
|---|---|---|
| Viscosity (at 25 °C) | 50 – 10,000 | cP |
| Second viscosity reading, optional | any value above zero | cP |
| Measured at, optional | at least 5 °C away from 25 °C | °C |
| Flow Index | 0.01 – 1.0 | (dimensionless) |
| Density | 900 – 1,500 | kg/m³ |
| Temperature sensitivity (activation energy) | read-only; 1,000 – 100,000 if entered manually | J/mol |

### Temperature sensitivity (activation energy)

You don't type the activation energy. It is shown read-only, and set one of three ways:

- **Calculated.** Fill in both the second viscosity reading and the temperature it was measured at. The Python engine works it out from your two readings, `Ea = R · ln(v₁ / v₂) / (1/T₁ − 1/T₂)` with T in kelvin and R = 8.314 J/(mol·K), where v₁ is the viscosity at 25 °C. It's rounded to the nearest 100 J/mol. The field says "Calculated from your two viscosity readings."
- **Typical value (an estimate).** Leave both empty and the typical 25,000 J/mol is used. It's labelled as an estimate on the form, in the results, and in the JSON, CSV, text report and PDF.
- **Entered by user.** "Enter value manually" under the field unlocks it, and "Use calculated value" (or "Use typical value") locks it again. A typed value must be between 1,000 and 100,000 J/mol, and it's marked "Entered by user" in the results and every export.

The second reading pairs with the power-law viscosity. With a measured flow curve (Carreau, Cross, Herschel–Bulkley) there's no single viscosity to pair it with, so those models use the typical value unless you enter one manually.

The second reading is refused, with the reason shown under it and the Run button held back, when:

| Problem | Message |
|---|---|
| Only one of the pair is filled in | "Enter both the second viscosity reading and its temperature, or leave both empty." |
| The temperature is within 5 °C of 25 °C | "The second temperature must differ from 25 °C by at least 5 °C." |
| The viscosity isn't lower at the higher temperature | "Viscosity must be lower at the higher temperature. Check the two readings." |
| The result falls outside 1,000 – 100,000 J/mol | "These readings give … J/mol, outside the expected range of 1,000–100,000 J/mol. Check the two readings." The value is never clamped into range. |

The engine applies the same rules if the parameters reach it directly (`viscosity_2_cp`, `viscosity_2_temp_c`), and refuses a second reading on a catalogued material.

**Saved runs and imported datasets** from before this change carry a typed `activation_energy_j_mol`. It's used exactly as before, so they calculate unchanged, and it's labelled "Entered by user".

That's the entire custom-material workflow — no name, no save step, no storage backend choice. The values you enter are used directly for that calculation, in place of a database lookup. Switching back to a catalogued material clears them, so a leftover custom value can't silently carry over and override a real material's properties.

**What custom materials don't get:** environmental impact (GWP/eco-friendliness) and cure/exotherm prediction both require a data sheet with reaction and blowing-agent data behind them — since a custom material has neither, those sections of the results are simply omitted rather than showing invented numbers.

**Want it to persist and appear in the dropdown for everyone**, instead of re-entering it each session? Add a row to `src/data/polyurethane_foam_database.csv` — see `src/data/database_data_dictionary.md` for the column reference. That CSV is the actual source of truth the database-backed materials are drawn from; there's no in-app material library or save feature beyond it.

---

## See Also

- [MATERIALS_GUIDE.md](MATERIALS_GUIDE.md) — the 4 catalogued materials and their real specs
- [CAPABILITIES.md](CAPABILITIES.md) — what the calculation covers
- `src/core/validation/__init__.py` — the actual validation function
- `src/constants.ts` / `src/constants.py` — the shared range definitions
