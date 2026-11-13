# PU Injection Optimizer

Physics-based calculator for polyurethane injection lines (pressure drop, laminar-flow margin, hose thermal drift, blowing-agent volatility, cure/exotherm). Python engine runs in the browser via Pyodide, behind a React/TypeScript UI. No backend. Live: https://waltteriaxw.github.io/Pu-optimizer-tool/

This product is in **sale-readiness mode**. The job is to make it stable, documented, verifiable and easy to hand over, not to grow it. See `.claude/rules/scope.md` before starting any feature work.

## Stack

- Python 3, standard library only for the engine (`src/core/`). numpy and scikit-learn are for tests and the residual model only.
- React 18, TypeScript, Vite, Tailwind. Pyodide 0.24.1.
- Vitest (unit), Playwright (e2e), pytest (Python). CI on GitHub Actions, deploy to GitHub Pages from `main`.

## Commands

```
npm ci                    # install
npm run dev               # local dev server
npm run build             # production build
npm run lint              # eslint
npm run type-check        # tsc --noEmit
npm test -- --run         # vitest, single run
npm run test:e2e          # playwright (run `npx playwright install chromium` once)
python -m pip install pytest numpy scikit-learn --break-system-packages
pytest src -q             # Python suite
```

CI runs all of the above and blocks the deploy on any failure. Run lint, type-check, unit tests and pytest before every commit.

## Map

- `src/core/` physics engine: `modules/` (pressure, flow, thermal, volatility, line_thermal), `rheology/`, `thermodynamics/` (hose), `kinetics/` (cure), `optimizers/` (operating window), `machines/`, `learning/` (residual model), `processors/calculation_processor.py` (orchestrator).
- `src/data/polyurethane_foam_database.csv` is the single material source for both UI and engine. Add a row, get a material.
- `src/services/` TypeScript bridge to Pyodide, history store, exports. `src/components/` UI.
- `src/theme.css`, `scripts/generate_theme.py` Stone & Forest brand tokens. `src/theme.test.ts` enforces contrast.
- Docs: `README.md`, `CAPABILITIES.md`, `ARCHITECTURE_PYTHON_FIRST.md`, `MATERIALS_GUIDE.md`, `LOGGING_GUIDE.md`.

## Rules

- Python is the single source of truth for calculations. Never reimplement physics in TypeScript.
- The browser loads Python from a hand-kept list in `src/services/PyodideBridge.ts`. After adding or removing a non-test `.py` file, update that list; `pythonModuleList.test.ts` fails if it drifts.
- Never invent data. No synthetic training data, no made-up material properties. Missing values display "not specified".
- Features not yet checked against a real machine (hose model, operating window, measured flow curves) stay labelled as estimates in UI, docs and exports.
- Pressure is bar in the engine, JSON, CSV and text report. psi is display-only.
- UI colour comes only from the role classes in `src/theme.css` via Tailwind (`bg-surface`, `text-ink-2`, ...). No hard-coded hex values, 44 px minimum targets.
- Work on a branch and open a PR. Do not push to `main`.
