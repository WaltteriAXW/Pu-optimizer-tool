/**
 * Utility for loading and running Python code in the browser via Pyodide
 */
import { loadPyodide, type PyodideInterface } from 'pyodide';

// Define interface for calculation parameters
export interface ProcessParameters {
  pipeLength: number;   // mm
  pipeThickness: number; // mm
  temperature: number;  // °C
  flowRate: number;     // m³/s
  viscosity?: number;   // cP
  density?: number;     // g/cm³
}

// Define interface for calculation results
export interface CalculationResults {
  required_pressure: number;     // kPa
  shear_rate: number;            // s⁻¹
  apparent_viscosity: number;    // Pa·s
  reynolds_number: number;       // dimensionless
  optimal_injection_time: number; // s
  pressure_profile: Array<{
    distance: number;            // mm
    pressure: number;            // kPa
  }>;
  flow_regime: 'laminar' | 'turbulent';
  warnings: string[];
}

// Error classes
export class PyodideError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PyodideError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Singleton Pyodide instance
let pyodide: PyodideInterface | null = null;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize Pyodide and load required packages
 */
export async function initializePyodide(): Promise<void> {
  if (pyodide) {
    return; // Already initialized
  }
  
  if (isInitializing) {
    return initializationPromise; // Wait for existing initialization
  }
  
  isInitializing = true;
  
  initializationPromise = (async () => {
    try {
      console.log('Loading Pyodide...');
      pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
      });
      
      console.log('Loading NumPy...');
      await pyodide.loadPackage("numpy");
      
      console.log('Loading calculator code...');
      // Load the polyurethane calculator code
      await pyodide.runPythonAsync(`
import numpy as np

class ValidationError(Exception):
    """Custom exception for input validation errors"""
    pass

class ProcessParameters:
    """Parameters for polyurethane injection process"""
    def __init__(self, pipe_length, pipe_thickness, temperature, flow_rate, 
                 viscosity=350.0, density=1.12):
        self.pipe_length = pipe_length
        self.pipe_thickness = pipe_thickness
        self.temperature = temperature
        self.flow_rate = flow_rate
        self.viscosity = viscosity
        self.density = density
    
    def validate(self):
        """Validate process parameters against constraints"""
        if self.pipe_length < 50:
            raise ValidationError("Pipe length must be at least 50mm")
        if self.pipe_thickness <= 0:
            raise ValidationError("Pipe thickness must be positive")
        if not (5 <= self.temperature <= 40):
            raise ValidationError("Temperature must be between 5°C and 40°C")
        if self.flow_rate <= 0:
            raise ValidationError("Flow rate must be positive")
        if self.viscosity <= 0:
            raise ValidationError("Viscosity must be positive")
        if self.density <= 0:
            raise ValidationError("Density must be positive")

class PolyurethaneCalculator:
    """Calculator for polyurethane injection parameters using fluid dynamics models"""
    
    def __init__(self):
        # Constants for Ecofoam materials
        self.activation_energy = 50000.0  # J/mol - Activation energy for Arrhenius equation
        self.gas_constant = 8.314  # J/(mol·K) - Universal gas constant
        self.power_law_index = 0.85  # Dimensionless - For shear-thinning behavior
    
    def _convert_to_kelvin(self, temp_celsius):
        """Convert temperature from Celsius to Kelvin"""
        return temp_celsius + 273.15
    
    def _calculate_shear_rate(self, flow_rate, radius):
        """Calculate shear rate for non-Newtonian fluid in pipe"""
        return (4 * flow_rate) / (np.pi * radius**3)
    
    def _calculate_temperature_factor(self, temperature):
        """Calculate temperature effect on viscosity using Arrhenius equation"""
        temp_k = self._convert_to_kelvin(temperature)
        ref_temp_k = self._convert_to_kelvin(25.0)  # Reference temperature 25°C
        
        return np.exp((self.activation_energy / self.gas_constant) * 
                      (1/temp_k - 1/ref_temp_k))
    
    def _calculate_apparent_viscosity(self, initial_viscosity, temperature, shear_rate):
        """Calculate apparent viscosity considering temperature and shear effects"""
        # Convert from cP to Pa·s
        base_viscosity = initial_viscosity * 0.001
        
        # Temperature effect (Arrhenius equation)
        temp_factor = self._calculate_temperature_factor(temperature)
        
        # Shear-thinning effect (Power Law model)
        shear_factor = shear_rate**(self.power_law_index - 1)
        
        return base_viscosity * temp_factor * shear_factor
    
    def _calculate_reynolds_number(self, flow_rate, radius, viscosity, density):
        """Calculate Reynolds number to determine flow regime"""
        velocity = flow_rate / (np.pi * radius**2)
        return (2 * radius * velocity * density) / viscosity
    
    def _calculate_pressure_drop(self, viscosity, flow_rate, length, radius):
        """Calculate pressure drop using modified Hagen-Poiseuille for Power Law fluid"""
        n = self.power_law_index
        return ((8 * viscosity * length * flow_rate) / 
                (np.pi * radius**4)) * ((3*n + 1)/(4*n))
    
    def _generate_pressure_profile(self, total_pressure, num_points, length):
        """Generate pressure profile along the pipe length"""
        points = []
        for i in range(num_points):
            distance = (i * length) / (num_points - 1)
            relative_position = distance / length
            pressure = total_pressure * (1 - relative_position)
            
            points.append({
                "distance": round(distance, 1),
                "pressure": round(pressure, 2)
            })
            
        return points
    
    def _generate_warnings(self, reynolds, shear_rate, viscosity):
        """Generate process warnings based on calculated parameters"""
        warnings = []
        
        if reynolds > 2300:
            warnings.append("Flow is turbulent (Re > 2300) - consider reducing flow rate")
            
        if shear_rate > 1000:
            warnings.append("High shear rate may affect material properties")
            
        if viscosity > 1.0:
            warnings.append("High viscosity may require increased pressure")
            
        return warnings
    
    def calculate(self, params):
        """Calculate polyurethane injection parameters"""
        # Validate input parameters
        params.validate()
        
        # Convert units to SI
        radius = params.pipe_thickness / 2000  # mm to m
        length = params.pipe_length / 1000  # mm to m
        density_kg_m3 = params.density * 1000  # g/cm³ to kg/m³
        
        # Calculate flow parameters
        shear_rate = self._calculate_shear_rate(params.flow_rate, radius)
        apparent_viscosity = self._calculate_apparent_viscosity(
            params.viscosity, params.temperature, shear_rate)
        reynolds_number = self._calculate_reynolds_number(
            params.flow_rate, radius, apparent_viscosity, density_kg_m3)
        
        # Calculate pressure drop
        pressure_drop = self._calculate_pressure_drop(
            apparent_viscosity, params.flow_rate, length, radius)
        
        # Convert pressure to kPa for display
        pressure_drop_kpa = pressure_drop / 1000
        
        # Generate pressure profile
        pressure_profile = self._generate_pressure_profile(
            pressure_drop_kpa, 20, params.pipe_length)
        
        # Calculate optimal injection time
        pipe_volume = np.pi * radius**2 * length  # m³
        injection_time = pipe_volume / params.flow_rate  # seconds
        
        # Determine flow regime
        flow_regime = "laminar" if reynolds_number < 2300 else "turbulent"
        
        # Generate warnings
        warnings = self._generate_warnings(
            reynolds_number, shear_rate, apparent_viscosity)
        
        # Prepare results
        results = {
            "required_pressure": round(pressure_drop_kpa, 2),  # kPa
            "shear_rate": round(shear_rate, 2),  # s⁻¹
            "apparent_viscosity": round(apparent_viscosity, 4),  # Pa·s
            "reynolds_number": round(reynolds_number, 2),
            "optimal_injection_time": round(injection_time, 2),  # s
            "pressure_profile": pressure_profile,
            "flow_regime": flow_regime,
            "warnings": warnings
        }
        
        return results

def calculate_environmental_impact(agent_type, annual_consumption):
    """Calculate environmental impact of switching to ecomate"""
    blowing_agent_data = {
        "HFC": {"gwp": 1430, "odp": 0, "lambda": 0.022, "cost": 4.50},
        "HCFC": {"gwp": 725, "odp": 0.07, "lambda": 0.023, "cost": 4.20},
        "Pentane": {"gwp": 5, "odp": 0, "lambda": 0.024, "cost": 3.80},
        "HFO": {"gwp": 1, "odp": 0, "lambda": 0.022, "cost": 5.20},
        "Ecomate": {"gwp": 0, "odp": 0, "lambda": 0.019, "cost": 3.95}
    }
    
    # Get properties
    current_agent = blowing_agent_data[agent_type]
    ecomate = blowing_agent_data["Ecomate"]
    
    # Calculate impact metrics
    co2_reduction = (current_agent["gwp"] * annual_consumption) / 1000  # tons
    thermal_improvement = ((current_agent["lambda"] - ecomate["lambda"]) / 
                           current_agent["lambda"]) * 100  # percentage
    cost_savings = (current_agent["cost"] - ecomate["cost"]) * annual_consumption  # currency
    
    return {
        "co2_reduction": round(co2_reduction, 2),
        "thermal_improvement": round(thermal_improvement, 2),
        "cost_savings": round(cost_savings, 2),
        "odp_reduction": current_agent["odp"] * annual_consumption
    }
      `);
      
      console.log('Pyodide initialization completed');
      isInitializing = false;
      
    } catch (err) {
      console.error('Pyodide initialization failed:', err);
      pyodide = null;
      isInitializing = false;
      throw new PyodideError(`Failed to initialize Pyodide: ${err.message}`);
    }
  })();
  
  return initializationPromise;
}

/**
 * Calculate polyurethane injection parameters
 * 
 * @param params - Process parameters
 * @returns Calculation results
 */
export async function calculateParameters(params: ProcessParameters): Promise<CalculationResults> {
  if (!pyodide) {
    await initializePyodide();
  }
  
  if (!pyodide) {
    throw new PyodideError('Pyodide not initialized');
  }
  
  try {
    // Set default values for optional parameters
    const viscosity = params.viscosity !== undefined ? params.viscosity : 350.0;
    const density = params.density !== undefined ? params.density : 1.12;
    
    // Create Python objects
    const pythonCode = `
try:
    # Create parameters object
    params = ProcessParameters(
        pipe_length=${params.pipeLength},
        pipe_thickness=${params.pipeThickness},
        temperature=${params.temperature},
        flow_rate=${params.flowRate},
        viscosity=${viscosity},
        density=${density}
    )
    
    # Create calculator and run calculation
    calculator = PolyurethaneCalculator()
    results = calculator.calculate(params)
    
except ValidationError as e:
    error = {"type": "ValidationError", "message": str(e)}
    results = None
except Exception as e:
    error = {"type": "CalcError", "message": str(e)}
    results = None
else:
    error = None
`;
    
    await pyodide.runPythonAsync(pythonCode);
    
    // Check for errors
    const error = pyodide.globals.get('error').toJs();
    if (error) {
      if (error.type === 'ValidationError') {
        throw new ValidationError(error.message);
      } else {
        throw new Error(error.message);
      }
    }
    
    // Get results and convert to JavaScript object
    const results = pyodide.globals.get('results').toJs();
    return results as CalculationResults;
    
  } catch (err) {
    if (err instanceof ValidationError) {
      throw err;
    }
    throw new Error(`Calculation error: ${err.message}`);
  }
}

/**
 * Calculate environmental impact
 * 
 * @param agentType - Current blowing agent type
 * @param annualConsumption - Annual consumption in kg
 * @returns Environmental impact metrics
 */
export async function calculateEnvironmentalImpact(
  agentType: string,
  annualConsumption: number
): Promise<any> {
  if (!pyodide) {
    await initializePyodide();
  }
  
  if (!pyodide) {
    throw new PyodideError('Pyodide not initialized');
  }
  
  try {
    const pythonCode = `
env_impact = calculate_environmental_impact("${agentType}", ${annualConsumption})
`;
    
    await pyodide.runPythonAsync(pythonCode);
    
    // Get results and convert to JavaScript object
    const results = pyodide.globals.get('env_impact').toJs();
    return results;
    
  } catch (err) {
    throw new Error(`Environmental impact calculation error: ${err.message}`);
  }
}
