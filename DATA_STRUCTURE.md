# Data Structure & Organization

This document explains how data is organized and stored in the Polyurethane Injection Optimizer.

## Directory Structure

```
Pu-optimizer-tool/
├── src/data/                          # Source data files
│   ├── polyurethane_foam_database.csv # Material properties database
│   ├── database_data_dictionary.md    # Schema documentation
│   └── product_selection_guide.md     # User guide for product selection
│
├── public/Dimensions database/        # Served static files (browser access)
│   ├── injection_pipe_database.csv    # Pipe specifications
│   ├── mold_dimensions_database.csv   # Mold specifications
│   ├── DATABASES_README.md            # Quick reference
│   └── QUICK_REFERENCE.md             # Field descriptions
│
├── docs/Dimensions database/          # GitHub Pages build artifacts
│   ├── injection_pipe_database.csv
│   ├── mold_dimensions_database.csv
│   ├── DATABASES_README.md
│   └── QUICK_REFERENCE.md
│
└── src/config/                        # Configuration constants
    ├── materialPresets.js             # Hardcoded material specs
    └── machineSpecs.js                # Hardcoded machine specs
```

## Data Files Overview

### Material Properties (`src/data/polyurethane_foam_database.csv`)

**Purpose**: Contains polyurethane foam material specifications

**Key Fields**:
- Material ID
- Material Name
- Density (kg/m³)
- Viscosity (cP) at reference temperature
- Flow Index (Power Law)
- Activation Energy (J/mol)
- Final Foam Density (kg/m³)

**Usage**:
- Loaded dynamically in `database_viewer.jsx`
- Accessible via database browser in UI
- Properties auto-populated when material selected

**Documentation**: See `src/data/database_data_dictionary.md`

### Pipe Database (`public/Dimensions database/injection_pipe_database.csv`)

**Purpose**: Standard injection pipe specifications for quick setup

**Key Fields**:
- Pipe ID
- Diameter (mm)
- Length (mm)
- Material
- Pressure Rating (bar)

**Usage**:
- Loaded via `loadPipeDatabase()` in `dimensionsDatabaseLoader.js`
- Used in Quick Setup feature
- Auto-suggests pipes based on selected mold

**Documentation**: See `public/Dimensions database/QUICK_REFERENCE.md`

### Mold Database (`public/Dimensions database/mold_dimensions_database.csv`)

**Purpose**: Standard mold dimensions for common production scenarios

**Key Fields**:
- Mold ID
- Shape (Rectangular, Cylindrical, Spherical)
- Dimensions (length, width, height, diameter, etc.)
- Volume (liters)
- Surface Area (cm²)
- Wall Thickness (mm)

**Usage**:
- Loaded via `loadMoldDatabase()` in `dimensionsDatabaseLoader.js`
- Used in Quick Setup and database browser
- Calculates material requirements automatically

**Documentation**: See `public/Dimensions database/DATABASES_README.md`

## Configuration Files

### Material Presets (`src/config/materialPresets.js`)

**Purpose**: Hardcoded material specifications for quick access without database loading

**Contents**:
```javascript
export const MATERIAL_PRESETS = {
  ecofoam_standard: {
    id: 'ecofoam_standard',
    name: 'Ecofoam Standard',
    density: 1120,              // kg/m³
    viscosity: 350,             // cP at 25°C
    specificGravity: 1.12,
    polyolDensity: 1.10,
    isoDensity: 1.23,
    // ... more properties
  },
  // ... other materials
};
```

**Usage**:
- Material selector dropdown
- Default properties when material selected from DB
- Validation of material ranges

**When to Update**:
- New material variants added
- Changes to material specifications confirmed
- Product line updates

### Machine Specifications (`src/config/machineSpecs.js`)

**Purpose**: Hardcoded machine specifications for selection UI

**Contents**:
```javascript
export const MACHINE_SPECS = {
  cannon_std_legacy: {
    id: 'cannon_std_legacy',
    name: 'Cannon STD Legacy',
    manufacturer: 'Cannon A-System',
    output: '90 kg/min',
    maxPressure: 6,
    tankCapacity: '10 L',
    // ... more properties
  },
  // ... other machines
};
```

**Usage**:
- Machine selector dropdown
- Validation of pressure limits
- Display of machine capabilities

**Machines Included**:
- Cannon A-System (5 variants)
- AMA Gusberti (2 variants)
- SAIP (1 variant)
- ISC Italy (2 variants)

**When to Update**:
- New machines added to product line
- Machine specifications change
- Capabilities update

## Data Loading Strategy

### Static Data (Hardcoded)
- Material presets in `materialPresets.js`
- Machine specifications in `machineSpecs.js`
- **Advantage**: No network delay, always available
- **Disadvantage**: Requires code update to change

### Dynamic Data (CSV Files)
- Pipe database from `public/Dimensions database/`
- Mold database from `public/Dimensions database/`
- Polyurethane materials from database viewer
- **Advantage**: Can be updated without code changes
- **Disadvantage**: Requires network fetch

### Loading Functions

Located in `src/utils/dimensionsDatabaseLoader.js`:

```javascript
async function loadPipeDatabase()
async function loadMoldDatabase()
async function getAllMaterialPresets()  // From config + CSV
function suggestPipeForMold(pipes, mold)
function getRecommendedMolds(molds, count)
function calculateMaterialRequirements(mold, batches)
```

## Data Access Patterns

### In React Components

```javascript
// Load databases on component mount
useEffect(() => {
  const pipes = await loadPipeDatabase();
  const molds = await loadMoldDatabase();
  // Use data...
}, []);

// Access hardcoded materials
import { MATERIAL_PRESETS } from '../config/materialPresets';
const material = MATERIAL_PRESETS.ecofoam_standard;

// Access machine specs
import { MACHINE_SPECS } from '../config/machineSpecs';
const machine = MACHINE_SPECS.cannon_std_legacy;
```

### In Calculation Engine

```javascript
// Pass material properties to Python calculator
const result = await calculator.calculate({
  density: material.density,
  viscosity: material.viscosity,
  flowIndex: material.flowIndex,
  // ...
});
```

## Adding New Data

### Adding a New Material

**Option 1: Hardcoded (Quick Access)**
1. Edit `src/config/materialPresets.js`
2. Add new object with all required properties
3. Update tests
4. Restart dev server

**Option 2: CSV Database (Dynamic)**
1. Edit `src/data/polyurethane_foam_database.csv`
2. Add row with complete material data
3. Material accessible via database viewer
4. No code restart needed

### Adding a New Machine

**Only Option: Hardcoded**
1. Edit `src/config/machineSpecs.js`
2. Add new machine object with specifications
3. Include: name, manufacturer, output, maxPressure, tankCapacity
4. Update `MACHINE_SYSTEM_DOCUMENTATION.md`
5. Update tests

### Adding Pipe/Mold Dimensions

1. Edit `public/Dimensions database/injection_pipe_database.csv` or `mold_dimensions_database.csv`
2. Add complete row with all required fields
3. Dimensions available in Quick Setup immediately
4. No code changes needed

## Data Validation

Input validation rules in `src/validation.js`:

```javascript
// Material density range
MATERIAL_DENSITY: { min: 900, max: 1500 }

// Pipe dimensions
PIPE_DIAMETER: { min: 1, max: 50 }   // mm
PIPE_LENGTH: { min: 50, max: 10000 }  // mm

// Temperatures
TEMPERATURE: { min: 5, max: 50 }      // °C

// Flow rate
FLOW_RATE: { min: 0.1, max: 200 }     // L/min
```

**Validation occurs**:
- On form input change (debounced)
- Before calculation execution
- In Python calculation engine

## Deployment

### Build Process

```bash
npm run build
```

Creates optimized build in `/docs` directory for GitHub Pages:
- Bundles all JavaScript
- Minifies CSS
- Copies static files (including CSV data from `public/`)

### Data Availability

- `public/` files are copied to build output
- CSV files accessible at deployment URL
- Hardcoded data bundled in JS

### Database Updates

To update CSV databases after deployment:
1. Edit files in `public/Dimensions database/`
2. Run `npm run build`
3. Push to GitHub (deploys to Pages)

## Performance Considerations

### Data Caching

- CSV files loaded once on component mount
- Results cached in React state
- Avoid repeated fetches

### Bundle Size Impact

- Material presets: ~2KB
- Machine specs: ~1KB
- CSV files: Fetched on demand (not bundled)

### Network Optimization

- CSV files served from GitHub Pages CDN
- Use `async/await` for data loading
- Provide loading indicators during fetch

## Related Documentation

- **Database Schemas**: See `src/data/database_data_dictionary.md`
- **Material Selection**: See `src/data/product_selection_guide.md`
- **Quick Reference**: See `public/Dimensions database/QUICK_REFERENCE.md`
- **Database Integration**: See [DATABASE_INTEGRATION.md](./DATABASE_INTEGRATION.md)
- **Machine Documentation**: See [MACHINE_SYSTEM_DOCUMENTATION.md](./MACHINE_SYSTEM_DOCUMENTATION.md)
