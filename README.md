# Polyurethane Injection Optimizer

A browser-based tool for optimizing polyurethane injection processes using advanced fluid dynamics models.

## Features

- Real-time injection pressure calculation based on pipe geometry and material properties
- Temperature and shear-dependent viscosity modeling using Arrhenius and Power Law equations
- Environmental impact assessment for switching to eco-friendly blowing agents
- Production data logging and analysis
- Export capabilities for data, reports, and visualizations

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

## Usage

### Input Parameters

- **Pipe Length**: Length of the injection pipe in millimeters (minimum 50mm)
- **Pipe Thickness**: Thickness/diameter of the pipe in millimeters
- **Temperature**: Process temperature in Celsius (range: 5-40°C)
- **Flow Rate**: Volumetric flow rate in liters per second
- **Initial Viscosity**: Material viscosity in centipoise (cP) at 25°C
- **Density**: Material density in g/cm³

### Output Results

- **Required Injection Pressure**: Calculated optimal pressure in kPa
- **Optimal Injection Time**: Time required for injection in seconds
- **Apparent Viscosity**: Calculated viscosity considering temperature and shear effects
- **Reynolds Number**: Indicates flow regime (laminar: <2300, turbulent: >2300)
- **Pressure Profile**: Graph showing pressure distribution along the pipe length
- **Environmental Impact**: CO₂ reduction, thermal efficiency improvement, and cost savings

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

- **PolyurethaneCalculator**: Core Python class implementing fluid dynamics equations
- **PyodideLoader**: TypeScript utility for running Python in the browser
- **PolyurethaneOptimizer**: Main React component for the user interface
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

## Acknowledgments

- Built with React, Tailwind CSS, and shadcn/ui components
- Python calculations powered by Pyodide
- Visualizations created with Recharts
- Fluid dynamics equations based on established research in non-Newtonian fluid mechanics
