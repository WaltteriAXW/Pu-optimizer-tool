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

Custom-material fields (viscosity, density, flow index, activation energy) have their own ranges — see [Custom Materials](#custom-materials) below.

A value outside range produces a message like:

```
Pipe length must be at least 50 mm
Pipe diameter must not exceed 200 mm
```

A non-numeric value produces `"Temperature must be a valid number"` (or the equivalent for the field in question).

## Unknown Material

If `material_key` doesn't match anything in the database and none of the four custom-material fields (viscosity, density, flow index, activation energy) were supplied, calculation fails with:

```
No material properties available (tried: material_key "xyz" not in the database
(available: genfoam_hd12, genfoam_hd20, ecomate_spray, ecofoam_xhd_rc))
```

In the UI this situation doesn't actually arise — the Material dropdown is populated straight from the database, plus a **Custom Material…** option, so there's no way to type an arbitrary unrecognised key. This check exists for anyone calling the Python engine directly.

## Machine Compatibility Warnings

These aren't validation errors (the calculation still completes) — they're returned in the result's `warnings` list and shown in the **Attention Needed** panel. Examples: turbulent flow, high shear rate (>5000 s⁻¹), pressure drop above 150 bar, viscosity more than doubling at process temperature, or the required pressure falling outside the selected machine's range.

---

## Custom Materials

Select **Custom Material…** at the bottom of the Material dropdown. Four fields appear:

| Property | Range | Unit |
|---|---|---|
| Viscosity | 50 – 10,000 | cP |
| Density | 900 – 1,500 | kg/m³ |
| Flow Index | 0.01 – 1.0 | (dimensionless) |
| Activation Energy | 1,000 – 100,000 | J/mol |

That's the entire custom-material workflow — no name, no save step, no storage backend choice. The four values you enter are used directly for that calculation, in place of a database lookup. Switching back to a catalogued material clears them, so a leftover custom value can't silently carry over and override a real material's properties.

**What custom materials don't get:** environmental impact (GWP/eco-friendliness) and cure/exotherm prediction both require a data sheet with reaction and blowing-agent data behind them — since a custom material has neither, those sections of the results are simply omitted rather than showing invented numbers.

**Want it to persist and appear in the dropdown for everyone**, instead of re-entering it each session? Add a row to `src/data/polyurethane_foam_database.csv` — see `src/data/database_data_dictionary.md` for the column reference. That CSV is the actual source of truth the database-backed materials are drawn from; there's no in-app material library or save feature beyond it.

---

## See Also

- [MATERIALS_GUIDE.md](MATERIALS_GUIDE.md) — the 4 catalogued materials and their real specs
- [CAPABILITIES.md](CAPABILITIES.md) — what the calculation covers
- `src/core/validation/__init__.py` — the actual validation function
- `src/constants.ts` / `src/constants.py` — the shared range definitions
