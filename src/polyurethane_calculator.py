import numpy as np

class ValidationError(Exception):
    """Custom exception for input validation errors"""
    pass

class PolyurethaneCalculator:
    """
    Calculator for polyurethane injection parameters optimized for Pyodide
    
    This version is streamlined for running in the browser via Pyodide
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
        """
        Calculate polyurethane injection parameters
        
        Args:
            pipe_length: Length of the injection pipe in mm
            pipe_thickness: Thickness/diameter of the pipe in mm
            temperature: Process temperature in °C
            flow_rate: Volumetric flow rate in m³/s
            viscosity: Initial viscosity at 25°C in cP (default: 350.0)
            density: Material density in g/cm³ (default: 1.12)
            
        Returns:
            Dictionary with calculation results
        """
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
    
    Args:
        agent_type: Current blowing agent type (HFC, HCFC, etc.)
        annual_consumption: Annual consumption in kg
        
    Returns:
        Dictionary with environmental impact metrics
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

# Example usage
if __name__ == "__main__":
    calculator = PolyurethaneCalculator()
    
    # Test parameters
    pipe_length = 100  # mm
    pipe_thickness = 20  # mm
    temperature = 25  # °C
    flow_rate = 0.001  # m³/s
    viscosity = 350  # cP
    density = 1.12  # g/cm³
    
    # Calculate parameters
    result = calculator.calculate(
        pipe_length, pipe_thickness, temperature, flow_rate, viscosity, density
    )
    
    # Print results
    print(f"Required pressure: {result['required_pressure']} kPa")
    print(f"Apparent viscosity: {result['apparent_viscosity']} Pa·s")
    print(f"Reynolds number: {result['reynolds_number']}")
    print(f"Flow regime: {result['flow_regime']}")
    
    # Calculate environmental impact
    env_impact = calculate_environmental_impact("HFC", 5000)
    print(f"CO₂ reduction: {env_impact['co2_reduction']} tons/year")
    print(f"Thermal improvement: {env_impact['thermal_improvement']}%")
