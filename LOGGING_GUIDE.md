# Production Logging & Shot Dataset Guide

This describes how the app records production runs and how the optional residual-learning model works. There's no separate Python API for this — it's entirely a browser feature, driven from the **History** sidebar and its **Shot dataset** panel.

If you're looking for a `logging_example.py`, a `logs/` directory, or a `process_optimizer_ml.py` with `retrain_with_production_data()` — that described an earlier version of this project and was removed along with the synthetic-data ML models (see `CAPABILITIES.md` → "What Changed"). What replaced it is simpler and described below.

---

## How Runs Are Saved

Every time you click **Run Simulation**, the result is saved automatically to `localStorage` in your browser — there's no server, so this is per-browser, per-machine storage. Nothing is sent anywhere. You'll see it appear at the top of the **History** sidebar.

At the moment it's saved, a run's outcome is `unrecorded` — the physics predicted something, but nobody has said yet whether the part it produced was actually good.

## Recording an Outcome

Open **History**, find the run, and use the **"How did the part come out?"** dropdown on that entry:

- Good part
- Voids
- Short shot
- Scorch / burn
- Surface defect
- Other problem

This is the one piece of information the physics engine cannot supply on its own, and it's the only thing that turns a saved calculation into training data. A run left as "Not yet recorded" is just history — it's never used for training.

## Moving Data Between Machines

Since the app has no backend, a shot recorded on one machine only exists in that machine's browser. The **Shot dataset** panel (top of the History sidebar) has:

- **Export** — downloads every saved run (recorded or not) as a JSON file
- **Import** — merges a JSON file exported elsewhere into your local set

Import is de-duplicated by record ID, so importing the same file twice is harmless. If the same run exists on both sides with different outcomes recorded, your local copy's outcome wins — an older import can't silently overwrite a verdict someone recorded locally since.

This is how you'd pool shots recorded by different operators or machines into one dataset for training.

## Training the Residual Model

The **Shot dataset** panel shows how many labelled shots you have and, once there are enough, a **Train on recorded shots** button.

- **Threshold:** 50 labelled shots, with at least one "good" and at least one "bad" outcome among them. Below that, the panel states the shortfall plainly (e.g. "12 labelled shots; 50 needed. Record how 38 more parts came out.") rather than training on too little data or showing a synthetic confidence number.
- **What it trains:** not a from-scratch quality predictor — a model of the *residual*, i.e. where the physics prediction and what actually happened diverge. The idea is to let the tool learn where its own physics model is wrong for your specific materials, machines, and conditions, rather than replacing the physics with a black box.
- **Cost:** training pulls in scikit-learn (a few megabytes), fetched only when you press Train — not on page load, and not just because you opened the panel.
- **Result:** accuracy on a held-out split of your own labelled shots, a confusion matrix, feature importances, and a caveat string describing the model's limits — shown directly in the panel after training completes.

There's no persistence of a trained model between sessions today, and no automatic retraining — you train on demand from whatever's currently in your local (or imported) dataset.

## Practical Notes

- Recording outcomes accurately matters more than recording a lot of them — a handful of carefully labelled "voids" runs is more useful than fifty runs all marked "good" by default.
- If you're pooling data across a team, agree on what counts as each outcome (e.g. where the line is between "surface defect" and "other") before merging datasets — the model can't correct for inconsistent labelling.
- Exported files aren't validated for physics correctness on import, only for having the right shape — an export from an older version of the app is still accepted.

## See Also

- `src/services/ShotRecordStore.ts` — the storage and export/import logic
- `src/services/ResidualModelService.ts` — readiness check and training call
- `src/core/learning/residual_model.py` — the actual model (`MIN_LABELLED_SHOTS = 50`)
- `src/components/DatasetPanel.tsx` — the UI described above
