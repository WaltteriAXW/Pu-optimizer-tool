# Polyurethane Optimizer - New Features Implementation

## Date: 2025-10-25

## Overview
This implementation adds two major features to the Polyurethane Injection Optimizer:
1. **Mold Geometry System** - Proper injection time calculation based on mold dimensions
2. **Training Data Persistence** - Save and store process results for ML model training

---

## 1. Mold Geometry System

### Problem Solved
Previously, injection time was calculated based on **pipe volume only**, which is incorrect. The pipe is only for pressure calculation.
**Injection time should be based on mold cavity volume** and injection configuration.

### Implementation

#### Python Calculator (`src/polyurethane_calculator.py`)

Added two new methods to `PolyurethaneCalculator` class:

1. **`calculate_mold_volume(mold_shape, dimensions)`**
   - Supports 4 mold shapes:
     - `panel`: Rectangular (length × width × height in mm)
     - `cylinder`: Cylindrical (diameter × height in mm)
     - `sphere`: Spherical (diameter in mm)
     - `custom`: Direct volume input (liters)
   - Returns volume in liters

2. **`calculate_injection_time(mold_volume_liters, flow_rate_lpm, injection_type, num_injection_points)`**
   - Injection types:
     - `single_point`: Full flow path, 85% efficiency
     - `two_point`: 40% faster, 90% efficiency
     - `multi_point`: Scales with √(num_points), 92% efficiency
   - Returns:
     - `fill_time_seconds`: Cavity filling time
     - `packing_time_seconds`: Material packing time (15% of fill time)
     - `total_injection_time_seconds`: Total injection cycle
     - `efficiency`: Process efficiency percentage

#### Updated `calculate()` Method
- Added parameters:
  - `mold_shape`
  - `mold_dimensions`
  - `injection_type`
  - `num_injection_points`
- Returns new fields:
  - `mold_volume_liters`
  - `mold_shape`
  - `mold_dimensions`
  - `injection_timing` (dict with fill/packing/total times)
  - `pipe_volume_liters` (for reference only)

### UI Component (`src/polyurethane_optimizer_component.jsx`)

#### New State Variables
```javascript
const [moldShape, setMoldShape] = useState('panel');
const [injectionType, setInjectionType] = useState('single_point');
const [numInjectionPoints, setNumInjectionPoints] = useState(1);
const [moldDimensions, setMoldDimensions] = useState({
  length: 1500,  // mm
  width: 500,    // mm
  height: 20     // mm
});
```

#### New UI Card: "Mold Geometry & Injection Configuration"
Added after Process Parameters card, includes:
- Mold shape selector (Panel, Cylinder, Sphere, Custom)
- Injection type selector (Single Point, Two Point, Multi-Point)
- Number of injection points (for multi-point)
- Dynamic dimension inputs based on selected shape:
  - **Panel**: Length, Width, Height (mm)
  - **Cylinder**: Diameter, Height (mm)
  - **Sphere**: Diameter (mm)
  - **Custom**: Volume (liters)

#### Updated Calculation Logic
- Added mold volume calculation in JavaScript for client-side preview
- Injection time now based on mold volume, not pipe volume
- Pipe dimensions only affect pressure calculation (laminar flow requirement)
- Results include:
  - `mold_volume_liters`
  - `injection_timing` object with fill, packing, and total times
  - Efficiency percentage

### Example
For a **panel mold 1500×500×20mm**:
- Mold volume = 1.5 × 0.5 × 0.02 = 0.015 m³ = **15 liters**
- Single point injection at 5 L/min:
  - Base fill time = 15 / 5 = 3 minutes
  - Corrected for efficiency (85%) = 3.53 minutes
  - Packing time (15%) = 0.53 minutes
  - **Total injection time ≈ 4.06 minutes (244 seconds)**

---

## 2. Training Data Persistence System

### Problem Solved
The ML model only used **synthetic data** generated from physics equations. There was no way to:
- Save actual process results
- Record part quality (good/bad)
- Learn from real production data
- Build a database of historical processes

### Implementation

#### New File: `src/training_data_storage.ts`

TypeScript module for managing training data in browser localStorage.

**Interface: `ProcessEntry`**
```typescript
interface ProcessEntry {
  id: string;
  timestamp: number;

  // Input parameters
  pipeLength, pipeDiameter, temperature, flowRate, viscosity, density

  // Mold parameters
  moldShape, moldDimensions, injectionType, numInjectionPoints

  // Machine and material
  machineType, materialPreset

  // Calculated results
  optimalPressure, reynoldsNumber, injectionTime, moldVolume

  // Quality feedback (user input)
  partQuality: 'good' | 'bad' | 'acceptable' | null;
  defectsObserved: string[];
  notes: string;
}
```

**Functions:**
- `getTrainingData()` - Load all entries from localStorage
- `saveProcessEntry(entry)` - Save new process with automatic ID and timestamp
- `updateEntryQuality(id, quality, defects, notes)` - Add quality feedback
- `getTrainingStats()` - Get statistics (total entries, good/bad parts, etc.)
- `exportTrainingData()` - Export to JSON for backup
- `importTrainingData(jsonString)` - Import from JSON
- `clearTrainingData()` - Clear all data
- `getMLTrainingData()` - Get only entries with quality feedback (for ML training)

**Storage:**
- Uses browser localStorage
- Max 1000 entries (prevents storage overflow)
- Data persists across sessions
- Can be exported/imported for backup

#### UI Component Updates

**New State Variables:**
```javascript
const [showSaveDialog, setShowSaveDialog] = useState(false);
const [partQuality, setPartQuality] = useState('good');
const [defectsObserved, setDefectsObserved] = useState([]);
const [processNotes, setProcessNotes] = useState('');
const [trainingStats, setTrainingStats] = useState(null);
```

**New Functions:**
- `saveProcessResult()` - Save current process to training data
- `useEffect` to load training stats on component mount
- Auto-update stats after saving

**New Imports:**
```javascript
import { Save, Database, Package } from 'lucide-react';
import { saveProcessEntry, getTrainingStats, exportTrainingData, getMLTrainingData } from './training_data_storage';
```

### Usage Flow
1. User enters parameters and runs calculation
2. User observes actual process/part quality
3. User clicks "Save Process Result" button (TO BE ADDED)
4. Dialog appears with quality feedback form:
   - Part Quality: Good / Acceptable / Bad
   - Defects Observed: Checkboxes (voids, short shot, flash, surface defects)
   - Notes: Free text
5. Data saved to localStorage
6. ML model can be retrained with real data

### Future ML Integration
When the ML model is updated to use this data:
```javascript
const realTrainingData = getMLTrainingData();
// Send to Python ML model for retraining
// Model learns from actual process results instead of synthetic data
```

---

## Still To Be Implemented

### High Priority
1. **"Save Process Result" Button & Dialog**
   - Add button to results section
   - Create modal/dialog for quality feedback
   - Checkboxes for defect types
   - Text area for notes

2. **Training Data Display**
   - Show training stats in UI (total entries, good/bad ratio)
   - Export button to download training data JSON
   - Import button to load training data

3. **Results Display Update**
   - Show mold volume prominently
   - Display injection timing breakdown (fill + packing + total)
   - Show injection efficiency percentage
   - Clarify that pipe volume is for pressure only

### Medium Priority
4. **ML Model Retraining**
   - Update `process_optimizer_ml.py` to accept real training data
   - Replace synthetic data generation with loaded real data
   - Add function to retrain model with new entries

5. **Data Visualization**
   - Chart showing training data distribution
   - Quality trends over time
   - Process parameter correlations

### Low Priority
6. **Data Export/Import UI**
   - Button to export all training data to JSON file
   - Button to import training data from JSON
   - Share training data between users/machines

---

## Testing Recommendations

### Mold Geometry
1. Test each mold shape:
   - Panel: 1500×500×20mm = 15L
   - Cylinder: 200mm diameter × 500mm height = 15.7L
   - Sphere: 300mm diameter = 14.1L
   - Custom: 15L direct input

2. Test injection types:
   - Single point: Slowest, lowest efficiency
   - Two point: 40% faster
   - Multi-point (4 points): ~50% faster

3. Verify injection time calculation:
   - Should be based on mold volume
   - Should vary with injection type
   - Should not change when pipe dimensions change

### Training Data
1. Save multiple entries
2. Verify persistence (reload page)
3. Test export/import
4. Check stats calculations
5. Verify localStorage limits (1000 entries)

---

## Technical Notes

- **Why two calculation implementations?**
  - Python (`polyurethane_calculator.py`): For future Pyodide integration (ML backend)
  - JavaScript (`polyurethane_optimizer_component.jsx`): Current client-side calculations
  - Both implement same logic for consistency

- **localStorage limits:**
  - Most browsers: 5-10 MB per domain
  - 1000 entries ≈ 1-2 MB (safe limit)
  - Consider IndexedDB for larger datasets

- **Why not database?**
  - Client-side app (no backend)
  - localStorage sufficient for prototype
  - Easy to export/backup JSON
  - Future: Could add backend API

---

## Files Modified

1. `src/polyurethane_calculator.py` - Added mold geometry methods
2. `src/polyurethane_optimizer_component.jsx` - Added mold UI and calculations
3. `src/training_data_storage.ts` - NEW FILE for training data management

## Files to be Modified (Next Steps)

1. `src/polyurethane_optimizer_component.jsx` - Add Save dialog and results display
2. `src/process_optimizer_ml.py` - Integrate real training data
