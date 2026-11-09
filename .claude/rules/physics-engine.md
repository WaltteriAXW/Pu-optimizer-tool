---
paths:
  - "src/core/**/*.py"
  - "src/data/**"
---
# Engine and data changes

- Every behaviour change needs a pytest case next to the module (`test_*.py`).
- Keep the engine standard-library only. numpy and scikit-learn must not be imported on the calculation path.
- State units in names or docstrings (`_mm`, `_bar`, `_c`, `_l_min`).
- Changing a result for an existing input is a breaking change for buyers' validation. Call it out in the PR description with before and after values.
- Material rows must come from a data sheet. Leave unknown fields empty, never guess.
