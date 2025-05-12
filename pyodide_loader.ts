/**
 * Improved Pyodide loader for PolyurethaneCalculator
 * 
 * This module handles loading Pyodide and the Python calculator code,
 * then provides functions to call the Python code from JavaScript.
 */
import { loadPyodide } from 'pyodide';

// Types for calculation parameters and results
export interface ProcessParameters {
  pipeLength: number;   // mm
  pipeThickness: number; // mm
  temperature: number;  // °C
  flowRate: number;     // m³/s
  viscosity?: number;   // cP
  density?: number;     // g/cm³
}

export interface PressurePoint {
  distance: number;     // mm
  pressure: number;     // kPa
}

export interface CalculationResults {
  required_pressure: number;     // kPa
  shear_rate: number;            // s⁻¹
  apparent_viscosity: number;    // Pa·s
  reynolds_number: number;       // dimensionless
  optimal_injection_time: number; // s
  pressure_profile: PressurePoint[];
  flow_regime: 'laminar' | 'turbulent';
  warnings: string[];
}

export interface EnvironmentalImpact {
  co2_reduction: number;        // tons/year
  thermal_improvement: number;  // percentage
  cost_savings: number;         // currency
  odp_reduction: number;        // ODP units
}

// Custom error types
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
let pyodide: any = null;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;
let calculatorCode: string | null = null;

/**
 * Get the Python calculator code
 * In a production environment, this would fetch from a file
 */
function getPythonCalculatorCode(): string {
  // This is a simplified version that returns the code directly
  // In production, you would fetch this from a file
  return `
import numpy as np

class ValidationError(Exception):
    """Custom exception for input validation errors"""
    pass

class PolyurethaneCalculator:
    """
    Calculator for polyurethane injection parameters optimized for Pyodide
    """
    
    def __init__(self):
        """Initialize calculator with constants for Ecofoam materials"""
        # Constants for fluid dynamics calculations
        self.activation_energy = 50000.0  # J/mol - Activation energy for Arrhenius equation
        self.gas_constant = 8.314  # J/(mol·K) - Universal gas constant
        self.power_law_index = 0.85  # Dimensionless - For shear-thinning behavior
    
    def validate_inputs(self, pipe_length, pipe_thickness, temperature, flow_rate, 
                      viscosity, density):
        """Validate input parameters against physical constraints"""
        if pipe_length < 50:
            raise ValidationError("Pipe length must be at least 50mm")
        if pipe_thickness <= 0:
            raise ValidationError("Pipe thickness must be positive")
        if not (5 <= temperature <= 40):
            raise ValidationError("Temperature must be between 5°C and 40°C")
        if flow_rate <= 0:
            raise ValidationError("Flow rate must be positive")
        if viscosity <= 0:
            raise ValidationError("Viscosity must be positive")
        if density <= 0:
            raise ValidationError("Density must be positive")
    
    def calculate(self, pipe_length, pipe_thickness, temperature, flow_rate, 
                viscosity=350.0, density=1.12):
        """Calculate polyurethane injection parameters"""
        try:
            # Validate inputs
            self.validate_inputs(pipe_length, pipe_thickness, temperature, flow_rate, 
                               viscosity, density)
            
            # Convert units to SI
            radius = pipe_thickness / 2000  # mm to m
            length = pipe_length / 1000  # mm to m
            density_kg_m3 = density * 1000  # g/cm³ to kg/m³
            
            # Calculate shear rate
            shear_rate = (4 * flow_rate) / (np.pi * radius**3)
            
            # Calculate temperature factor (Arrhenius equation)
            temp_k = temperature + 273.15  # Convert to Kelvin
            ref_temp_k = 25 + 273.15  # Reference temperature 25°C in Kelvin
            temp_factor = np.exp((self.activation_energy / self.gas_constant) * 
                               (1/temp_k - 1/ref_temp_k))
            
            # Calculate apparent viscosity with Power Law model
            base_viscosity = viscosity * 0.001  # Convert from cP to Pa·s
            apparent_viscosity = base_viscosity * temp_factor * shear_rate**(self.power_law_index - 1)
            
            # Calculate Reynolds number
            velocity = flow_rate / (np.pi * radius**2)
            reynolds = (2 * radius * velocity * density_kg_m3) / apparent_viscosity
            
            # Calculate pressure drop using modified Hagen-Poiseuille
            n = self.power_law_index
            pressure_drop = ((8 * apparent_viscosity * length * flow_rate) / 
                          (np.pi * radius**4)) * ((3*n + 1)/(4*n))
            
            # Convert pressure to kPa for display
            pressure_drop_kpa = pressure_drop / 1000
            
            # Generate pressure profile
            pressure_profile = []
            for i in range(20):
                distance = (i * pipe_length) / 19
                pressure = pressure_drop_kpa * (1 - distance/pipe_length)
                pressure_profile.append({
                    "distance": round(distance, 1),
                    "pressure": round(pressure, 2)
                })
            
            # Calculate optimal injection time
            pipe_volume = np.pi * radius**2 * length  # m³
            injection_time = pipe_volume / flow_rate  # seconds
            
            # Determine flow regime
            flow_regime = "laminar" if reynolds < 2300 else "turbulent"
            
            # Generate warnings
            warnings = []
            if reynolds > 2300:
                warnings.append("Flow is turbulent (Re > 2300) - consider reducing flow rate")
            if shear_rate > 1000:
                warnings.append("High shear rate may affect material properties")
            if apparent_viscosity > 1.0:
                warnings.append("High viscosity may require increased pressure")
            
            # Prepare results
            return {
                "required_pressure": round(pressure_drop_kpa, 2),  # kPa
                "shear_rate": round(shear_rate, 2),  # s⁻¹
                "apparent_viscosity": round(apparent_viscosity, 4),  # Pa·s
                "reynolds_number": round(reynolds, 2),
                "optimal_injection_time": round(injection_time, 2),  # s
                "pressure_profile": pressure_profile,
                "flow_regime": flow_regime,
                "warnings": warnings
            }
            
        except ValidationError as e:
            # Re-raise validation errors
            raise
        except Exception as e:
            # Provide more context for other errors
            raise Exception(f"Calculation error: {str(e)}")

# Environmental impact calculation function
def calculate_environmental_impact(agent_type, annual_consumption):
    """
    Calculate environmental impact of switching to ecomate
    """
    # Blowing agent data
    blowing_agent_data = {
        "HFC": {"gwp": 1430, "odp": 0, "lambda": 0.022, "cost": 4.50},
        "HCFC": {"gwp": 725, "odp": 0.07, "lambda": 0.023, "cost": 4.20},
        "Pentane": {"gwp": 5, "odp": 0, "lambda": 0.024, "cost": 3.80},
        "HFO": {"gwp": 1, "odp": 0, "lambda": 0.022, "cost": 5.20},
        "Ecomate": {"gwp": 0, "odp": 0, "lambda": 0.019, "cost": 3.95}
    }
    
    # Get properties of current agent and ecomate
    current_agent = blowing_agent_data.get(agent_type, blowing_agent_data["HFC"])
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
`
}

/**
 * Initialize Pyodide and load the calculator code
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
      
      // Check if window is available (client-side only)
      if (typeof window === 'undefined') {
        console.log('Window not available, skipping Pyodide load');
        isInitializing = false;
        return;
      }
      
      // Try to load Pyodide
      try {
        pyodide = await loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
        });
        
        console.log('Loading NumPy...');
        await pyodide.loadPackage("numpy");
        
        console.log('Loading calculator code...');
        // Load the polyurethane calculator code
        calculatorCode = getPythonCalculatorCode();
        await pyodide.runPython(calculatorCode);
        
        console.log('Pyodide initialization completed successfully');
      } catch (err) {
        console.error('Failed to load Pyodide:', err);
        pyodide = null;
        throw err;
      }
      
    } catch (err) {
      console.error('Pyodide initialization failed:', err);
      pyodide = null;
      throw new PyodideError(`Failed to initialize Pyodide: ${err.message}`);
    } finally {
      isInitializing = false;
    }
  })();
  
  return initializationPromise;
}

/**
 * Fallback calculation when Pyodide fails
 */
export function calculateParametersFallback(params: ProcessParameters): CalculationResults {
  // Simplified calculations for fallback mode
  const radius = params.pipeThickness / 2000;
  const length = params.pipeLength / 1000;
  const viscosity = (params.viscosity || 350) * 0.001; // cP to Pa·s
  const density = (params.density || 1.12) * 1000; // g/cm³ to kg/m³
  
  // Constants for Power Law model
  const powerLawIndex = 0.85; // n value for polyurethane
  const activationEnergy = 50000; // J/mol
  const gasConstant = 8.314; // J/(mol·K)
  
  // Temperature effect (Arrhenius equation)
  const tempK = params.temperature + 273.15; // Convert to Kelvin
  const refTempK = 25 + 273.15; // 25°C reference in Kelvin
  const tempFactor = Math.exp((activationEnergy / gasConstant) * (1/tempK - 1/refTempK));
  
  // Calculate shear rate
  const shearRate = (4 * params.flowRate) / (Math.PI * Math.pow(radius, 3));
  
  // Calculate apparent viscosity with both temperature and shear effects
  const viscosityPas = viscosity * tempFactor * Math.pow(shearRate, powerLawIndex - 1);
  
  // Calculate Reynolds number
  const velocity = params.flowRate / (Math.PI * Math.pow(radius, 2));
  const reynolds = (2 * radius * velocity * density) / viscosityPas;
  
  // Calculate pressure drop using modified Hagen-Poiseuille for Power Law fluid
  const pressureDrop = ((8 * viscosityPas * length * params.flowRate) / 
                       (Math.PI * Math.pow(radius, 4))) * ((3*powerLawIndex + 1)/(4*powerLawIndex));
  
  // Convert pressure to kPa for display
  const pressureDropKpa = pressureDrop / 1000;
  
  // Generate pressure profile
  const pressureProfile = Array.from({length: 20}, (_, i) => {
    const distance = (i * params.pipeLength) / 19;
    const pressure = pressureDropKpa * (1 - distance/params.pipeLength);
    return { 
      distance: parseFloat(distance.toFixed(1)), 
      pressure: parseFloat(pressure.toFixed(2)) 
    };
  });
  
  // Calculate injection time
  const volume = Math.PI * Math.pow(radius, 2) * length;
  const injectionTime = volume / params.flowRate;
  
  // Determine flow regime
  const flowRegime = reynolds < 2300 ? 'laminar' : 'turbulent';
  
  // Generate warnings
  const warnings = [];
  if (reynolds > 2300) {
    warnings.push("Flow is turbulent (Re > 2300) - consider reducing flow rate");
  }
  if (shearRate > 1000) {
    warnings.push("High shear rate may affect material properties");
  }
  if (viscosityPas > 1.0) {
    warnings.push("High viscosity may require increased pressure");
  }
  
  // Add a note about using JavaScript fallback
  warnings.push("Using simplified JavaScript calculations (Pyodide not available)");
  
  return {
    required_pressure: parseFloat(pressureDropKpa.toFixed(2)),
    shear_rate: parseFloat(shearRate.toFixed(2)),
    apparent_viscosity: parseFloat(viscosityPas.toFixed(4)),
    reynolds_number: parseFloat(reynolds.toFixed(2)),
    optimal_injection_time: parseFloat(injectionTime.toFixed(2)),
    pressure_profile: pressureProfile,
    flow_regime: flowRegime,
    warnings: warnings
  };
}

/**
 * Calculate polyurethane injection parameters
 * 
 * @param params - Process parameters
 * @returns Calculation results
 */
export async function calculateParameters(params: ProcessParameters): Promise<CalculationResults> {
  try {
    if (!pyodide) {
      try {
        await initializePyodide();
      } catch (err) {
        console.warn('Pyodide initialization failed, using fallback mode:', err);
        return calculateParametersFallback(params);
      }
    }
    
    if (!pyodide) {
      console.log('Pyodide not available, using fallback calculations');
      return calculateParametersFallback(params);
    }
    
    // Set default values for optional parameters
    const viscosity = params.viscosity !== undefined ? params.viscosity : 350.0;
    const density = params.density !== undefined ? params.density : 1.12;
    
    // Create Python calculator and run calculation
    const pythonCode = `
try:
    # Create calculator
    calculator = PolyurethaneCalculator()
    
    # Run calculation
    results = calculator.calculate(
        pipe_length=${params.pipeLength},
        pipe_thickness=${params.pipeThickness},
        temperature=${params.temperature},
        flow_rate=${params.flowRate},
        viscosity=${viscosity},
        density=${density}
    )
    
except ValidationError as e:
    error = {"type": "ValidationError", "message": str(e)}
    results = None
except Exception as e:
    error = {"type": "CalcError", "message": str(e)}
    results = None
else:
    error = None
`;
    
    await pyodide.runPython(pythonCode);
    
    // Check for errors
    const error = pyodide.globals.get('error').toJs();
    if (error) {
      console.warn('Python calculation error:', error);
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
    
    console.error('Calculation error:', err);
    return calculateParametersFallback(params);
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
): Promise<EnvironmentalImpact> {
  try {
    if (!pyodide) {
      try {
        await initializePyodide();
      } catch (err) {
        console.warn('Pyodide initialization failed, using fallback environmental impact:', err);
        return calculateEnvironmentalImpactFallback(agentType, annualConsumption);
      }
    }
    
    if (!pyodide) {
      console.log('Pyodide not available, using fallback environmental impact');
      return calculateEnvironmentalImpactFallback(agentType, annualConsumption);
    }
    
    const pythonCode = `
try:
    env_impact = calculate_environmental_impact("${agentType}", ${annualConsumption})
except Exception as e:
    env_error = {"message": str(e)}
    env_impact = None
else:
    env_error = None
`;
    
    await pyodide.runPython(pythonCode);
    
    // Check for errors
    const error = pyodide.globals.get('env_error');
    if (error && !error.isNone()) {
      console.warn('Environment impact calculation error:', error.toJs());
      throw new Error(error.toJs().message);
    }
    
    // Get results and convert to JavaScript object
    const results = pyodide.globals.get('env_impact').toJs();
    return results as EnvironmentalImpact;
    
  } catch (err) {
    console.error('Environmental impact calculation error:', err);
    return calculateEnvironmentalImpactFallback(agentType, annualConsumption);
  }
}

/**
 * Fallback environmental impact calculation
 */
function calculateEnvironmentalImpactFallback(
  agentType: string,
  annualConsumption: number
): EnvironmentalImpact {
  // Blowing agent data
  const blowingAgentData: Record<string, any> = {
    "HFC": {"gwp": 1430, "odp": 0, "lambda": 0.022, "cost": 4.50},
    "HCFC": {"gwp": 725, "odp": 0.07, "lambda": 0.023, "cost": 4.20},
    "Pentane": {"gwp": 5, "odp": 0, "lambda": 0.024, "cost": 3.80},
    "HFO": {"gwp": 1, "odp": 0, "lambda": 0.022, "cost": 5.20},
    "Ecomate": {"gwp": 0, "odp": 0, "lambda": 0.019, "cost": 3.95}
  };
  
  // Get properties
  const currentAgent = blowingAgentData[agentType] || blowingAgentData["HFC"];
  const ecomate = blowingAgentData["Ecomate"];
  
  // Calculate impact metrics
  const co2Reduction = (currentAgent.gwp * annualConsumption) / 1000; // tons
  const thermalImprovement = ((currentAgent.lambda - ecomate.lambda) / 
                             currentAgent.lambda) * 100; // percentage
  const costSavings = (currentAgent.cost - ecomate.cost) * annualConsumption; // currency
  
  return {
    co2_reduction: parseFloat(co2Reduction.toFixed(2)),
    thermal_improvement: parseFloat(thermalImprovement.toFixed(2)),
    cost_savings: parseFloat(costSavings.toFixed(2)),
    odp_reduction: parseFloat((currentAgent.odp * annualConsumption).toFixed(6))
  };
}
