# Polyurethane Injection Optimizer

A professional browser-based tool for optimizing polyurethane injection processes using advanced fluid dynamics models. Built with an industrial-grade "Mission Control" user interface designed for factory floor operations.

## ✨ Key Features

### Core Functionality
- **Real-time injection pressure calculation** based on pipe geometry and material properties
- **Temperature and shear-dependent viscosity modeling** using Arrhenius and Power Law equations
- **Machine compatibility checking** against Italian injection molding machine specifications
- **3D mold visualization** with real-time flow simulation and particle systems
- **Environmental impact assessment** for switching to eco-friendly blowing agents

### Industrial Design System
- **Mission Control HMI Interface**: Fixed-screen Bento Box layout optimized for no-scroll operation
- **Dark Slate + Neon Cyan** industrial color palette for reduced eye strain
- **Monospace data displays** (JetBrains Mono) for precision readability
- **Responsive design**: Seamless experience from factory terminals to mobile devices
- **Real-time telemetry cards** with status-based color coding (emerald/amber/rose)

### Recipe Management System
- **Save parameter configurations** with custom names for different molds
- **Quick-load recipes** for Standard Operating Procedures (SOPs)
- **Persistent storage** using localStorage - recipes survive browser restarts
- **Export/Import** capabilities for sharing configurations across teams

### PDF Report Generation
- **Professional setup sheets** for ISO 9001 compliance
- **Complete documentation**: machine settings, process parameters, optimization results
- **Signature lines** for operator/QA approval
- **Unique report IDs** and timestamps for traceability

### Production Management
- **Production data logging** and analysis
- **Database viewer** for historical data
- **ML-powered predictions** using Random Forest and Gradient Boosting models
- **Export capabilities** for data, reports, and visualizations

## Physics & Mathematical Models

This tool implements the following physical models:

- **Modified Hagen-Poiseuille Equation**: Adapted for non-Newtonian fluids to calculate pressure drop
- **Arrhenius Equation**: Models temperature-dependent viscosity
- **Power Law Model**: Accounts for shear-thinning behavior of polyurethane
- **Reynolds Number**: Determines flow regime (laminar vs. turbulent)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/polyurethane-optimizer.git
cd polyurethane-optimizer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## 🎨 User Interface: "Mission Control" Design

The interface follows industrial HMI (Human-Machine Interface) principles:

### Bento Box Layout
- **Fixed-screen**: 100vh height, no scrolling of main view
- **3-column grid**:
  - **Left (25%)**: Parameter controls with custom scrollbar
  - **Center (50%)**: 3D mold visualization (fixed, no scroll)
  - **Right (25%)**: Live telemetry and results
- **Responsive**: Stacks vertically on mobile devices

### Color System
- **Background**: Slate-950 (#020617) - Deep industrial void
- **Surfaces**: Slate-900 (#0f172a) - Control panels
- **Primary**: Cyan-400 (#22d3ee) - Active elements and data
- **Status Colors**:
  - Emerald-400: Normal/safe values
  - Amber-400: Warnings/caution
  - Rose-500: Errors/critical states

### Typography
- **UI Labels**: Inter (sans-serif) - Clean, professional
- **Data Values**: JetBrains Mono (monospace) - Aligned precision numbers

## Usage

### Quick Start

1. **Select Machine**: Choose your injection molding machine from the dropdown
2. **Select Material**: Pick material preset (Ecofoam, Isocyanate, etc.)
3. **Adjust Parameters**: Use sliders for pipe dimensions, temperature, flow rate
4. **View Results**: Live telemetry appears in right panel
5. **Save Recipe**: Click "RECIPES" button to save configuration
6. **Export Report**: Click "EXPORT PDF" for ISO-compliant documentation

### Input Parameters

- **Machine**: Italian injection molding machine specifications
- **Material**: Pre-configured material presets with viscosity/density
- **Pipe Length**: Distance from machine to mold (50-2000mm)
- **Pipe Diameter**: Internal diameter of injection pipe (4-50mm)
- **Temperature**: Process temperature (5-50°C)
- **Flow Rate**: Volumetric flow rate (0.1-50 L/min)
- **Density**: Material density (500-2000 kg/m³)
- **Viscosity**: Material viscosity at 25°C (100-2000 cP)

### Output Results

- **Machine Compatibility**: ✓ Compatible / ✗ Not Compatible status
- **Required Pressure**: Calculated optimal injection pressure (bar)
- **Pressure Drop**: Pressure loss through pipe system (bar)
- **Flow Regime**: Laminar or Turbulent classification
- **Reynolds Number**: Flow regime indicator (<2300 = laminar)
- **Flow Velocity**: Material velocity through pipe (m/s)
- **Injection Time**: Total time for mold filling (seconds)
- **Warnings & Recommendations**: Real-time process guidance

### Environmental Impact Calculator

Compare the environmental impact of different blowing agents:
- Global Warming Potential (GWP)
- Ozone Depletion Potential (ODP)
- Thermal conductivity
- Cost savings

### Production Logging

The application automatically logs all calculations to help track and analyze production data:
- View recent production logs
- Export logs as CSV
- Generate production analysis reports

## Technical Implementation

### Architecture

The application uses a hybrid architecture:
- React frontend with TypeScript for the UI
- Python calculation engine running in the browser via Pyodide
- Local storage for saving production logs and user preferences

### Key Components

#### Core Components
- **PolyurethaneCalculator**: Core Python class implementing fluid dynamics equations
- **PyodideLoader**: TypeScript utility for running Python in the browser via WebAssembly
- **PolyurethaneOptimizer**: Main React component with Bento Box layout

#### Industrial UI Components
- **IndustrialInput**: Dark slate input fields with monospace cyan text and unit badges
- **TelemetryCard**: Digital gauge-style displays with status-based color coding
- **RecipeManager**: Recipe save/load/delete interface with localStorage persistence
- **MoldVisualization3D**: Real-time 3D mold and flow visualization using React Three Fiber

#### Utilities
- **generateReport**: PDF generation for ISO 9001 compliant setup sheets
- **useRecipeStore**: Zustand store with persistence middleware for recipe management
- **Data Export Utilities**: Functions for exporting data and generating reports

### Python Calculation Engine

The Python engine implements:
1. Unit conversions between display units and SI units
2. Viscosity calculations using Arrhenius and Power Law models
3. Pressure drop calculation using modified Hagen-Poiseuille
4. Reynolds number calculation for flow regime determination
5. Warning generation based on calculated parameters

### Browser Integration

Python calculations run directly in the browser using Pyodide, which:
- Loads a WebAssembly build of the Python interpreter
- Includes NumPy for mathematical operations
- Provides seamless integration between JavaScript and Python

## Default Material Properties

### Ecofoam EC
- Viscosity: 350 cP (at 25°C)
- Density: 1.12 g/cm³

### Ecofoam XHD RC
- Viscosity: 850 cP (at 25°C)
- Density: 1.12 g/cm³

### Isocyanate
- Viscosity: 200 cP (at 25°C)
- Density: 1.23 g/cm³

## Blowing Agent Comparison

| Blowing Agent | GWP | ODP | λ Value (W/m·K) | Notes |
|---------------|-----|-----|----------------|-------|
| ecomate® | 0 | 0 | 0.019 | EPA SNAP approved, VOC exempt |
| HFO | <1 | 0 | 0.022 | Higher cost, limited availability |
| HFC | 1,430 | 0 | 0.022 | Being phased out globally |
| HCFC | 725 | 0.07 | 0.023 | Banned in many regions |
| Pentane | <5 | 0 | 0.024 | Flammable, requires safety systems |

## Troubleshooting

### Common Issues

- **Calculation Errors**: Check that input parameters are within valid ranges
- **Python Environment Errors**: Refresh the page to reinitialize Pyodide
- **Performance Issues**: Large calculations may take time, especially on slower devices

### Browser Compatibility

This application requires a modern browser with WebAssembly support:
- Chrome/Edge (version 79+)
- Firefox (version 72+)
- Safari (version 14+)

## License

MIT License - See LICENSE file for details

## 🛠️ Technology Stack

### Frontend
- **React 18** - Component-based UI framework
- **Tailwind CSS** - Utility-first styling with industrial design system
- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe JavaScript

### State Management & Storage
- **Zustand** - Lightweight state management with persistence
- **LocalStorage** - Recipe and settings persistence

### Visualization
- **React Three Fiber** - 3D graphics using Three.js
- **@react-three/drei** - Useful helpers for R3F
- **Recharts** - Data visualization charts

### Computation
- **Pyodide** - Python runtime in WebAssembly
- **NumPy** - Scientific computing in Python

### PDF Generation
- **jsPDF** - Client-side PDF generation for reports

### UI Components
- **Lucide React** - Icon library
- **shadcn/ui** - Accessible component primitives

## 📝 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Industrial design system inspired by aerospace HMI interfaces
- Fluid dynamics equations based on established research in non-Newtonian fluid mechanics
- Italian injection molding machine specifications provided by industry partners
- Ecomate® and Ecofoam® are registered trademarks of their respective manufacturers
