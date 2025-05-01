from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional
import numpy as np

class ValidationError(Exception):
    """Custom exception for input validation errors"""
    pass

@dataclass
class ProcessParameters:
    """Parameters for polyurethane injection process"""
    pipe_length: float  # mm
    pipe_thickness: float  # mm
    temperature: float  # °C
    flow_rate: float  # m³/s
    viscosity: float = 350.0  # cP (at 25°C)
    density: float = 1.12  # g/cm³
    
    def validate(self) -> None:
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
    
    def _convert_to_kelvin(self, temp_celsius: float) -> float:
        """Convert temperature from Celsius to Kelvin"""
        return temp_celsius + 273.15
    
    def _calculate_shear_rate(self, flow_rate: float, radius: float) -> float:
        """Calculate shear rate for non-Newtonian fluid in pipe
        
        Args:
            flow_rate: Volumetric flow rate in m³/s
            radius: Pipe radius in m
            
        Returns:
            Shear rate in s⁻¹
        """
        return (4 * flow_rate) / (np.pi * radius**3)
    
    def _calculate_temperature_factor(self, temperature: float) -> float:
        """Calculate temperature effect on viscosity using Arrhenius equation
        
        Args:
            temperature: Process temperature in °C
            
        Returns:
            Temperature factor (dimensionless)
        """
        temp_k = self._convert_to_kelvin(temperature)
        ref_temp_k = self._convert_to_kelvin(25.0)  # Reference temperature 25°C
        
        return np.exp((self.activation_energy / self.gas_constant) * 
                      (1/temp_k - 1/ref_temp_k))
    
    def _calculate_apparent_viscosity(self, initial_viscosity: float, 
                                     temperature: float, 
                                     shear_rate: float) -> float:
        """Calculate apparent viscosity considering temperature and shear effects
        
        Args:
            initial_viscosity: Base viscosity at 25°C in cP
            temperature: Process temperature in °C
            shear_rate: Shear rate in s⁻¹
            
        Returns:
            Apparent viscosity in Pa·s
        """
        # Convert from cP to Pa·s
        base_viscosity = initial_viscosity * 0.001
        
        # Temperature effect (Arrhenius equation)
        temp_factor = self._calculate_temperature_factor(temperature)
        
        # Shear-thinning effect (Power Law model)
        shear_factor = shear_rate**(self.power_law_index - 1)
        
        return base_viscosity * temp_factor * shear_factor
    
    def _calculate_reynolds_number(self, flow_rate: float, radius: float, 
                                  viscosity: float, density: float) -> float:
        """Calculate Reynolds number to determine flow regime
        
        Args:
            flow_rate: Volumetric flow rate in m³/s
            radius: Pipe radius in m
            viscosity: Apparent viscosity in Pa·s
            density: Fluid density in kg/m³
            
        Returns:
            Reynolds number (dimensionless)
        """
        velocity = flow_rate / (np.pi * radius**2)
        return (2 * radius * velocity * density) / viscosity
    
    def _calculate_pressure_drop(self, viscosity: float, flow_rate: float, 
                              length: float, radius: float) -> float:
        """Calculate pressure drop using modified Hagen-Poiseuille for Power Law fluid
        
        Args:
            viscosity: Apparent viscosity in Pa·s
            flow_rate: Volumetric flow rate in m³/s
            length: Pipe length in m
            radius: Pipe radius in m
            
        Returns:
            Pressure drop in Pa
        """
        n = self.power_law_index
        return ((8 * viscosity * length * flow_rate) / 
                (np.pi * radius**4)) * ((3*n + 1)/(4*n))
    
    def _generate_pressure_profile(self, total_pressure: float, num_points: int, 
                                 length: float) -> List[Dict[str, float]]:
        """Generate pressure profile along the pipe length
        
        Args:
            total_pressure: Total pressure drop in kPa
            num_points: Number of points to generate
            length: Pipe length in mm
            
        Returns:
            List of pressure points with distance and pressure values
        """
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
    
    def _generate_warnings(self, reynolds: float, shear_rate: float, 
                        viscosity: float) -> List[str]:
        """Generate process warnings based on calculated parameters
        
        Args:
            reynolds: Reynolds number
            shear_rate: Shear rate in s⁻¹
            viscosity: Apparent viscosity in Pa·s
            
        Returns:
            List of warning messages
        """
        warnings = []
        
        if reynolds > 2300:
            warnings.append("Flow is turbulent (Re > 2300) - consider reducing flow rate")
            
        if shear_rate > 1000:
            warnings.append("High shear rate may affect material properties")
            
        if viscosity > 1.0:
            warnings.append("High viscosity may require increased pressure")
            
        return warnings
    
    def calculate(self, params: ProcessParameters) -> Dict:
        """Calculate polyurethane injection parameters
        
        Args:
            params: Process parameters
            
        Returns:
            Dictionary with calculation results
        """
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


# Environmental impact calculation functions
def calculate_environmental_impact(agent_type: str, annual_consumption: float) -> Dict:
    """Calculate environmental impact of switching to ecomate
    
    Args:
        agent_type: Current blowing agent type (HFC, HCFC, etc.)
        annual_consumption: Annual consumption in kg
        
    Returns:
        Dictionary with environmental impact metrics
    """
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


# Example usage and testing
if __name__ == "__main__":
    # Initialize calculator
    calculator = PolyurethaneCalculator()
    
    # Set test parameters
    test_params = ProcessParameters(
        pipe_length=100,
        pipe_thickness=20,
        temperature=25,
        flow_rate=0.001,
        viscosity=350,
        density=1.12
    )
    
    # Calculate injection parameters
    results = calculator.calculate(test_params)
    
    # Print results
    print(f"Required Injection Pressure: {results['required_pressure']} kPa")
    print(f"Shear Rate: {results['shear_rate']} s⁻¹")
    print(f"Apparent Viscosity: {results['apparent_viscosity']} Pa·s")
    print(f"Reynolds Number: {results['reynolds_number']}")
    print(f"Flow Regime: {results['flow_regime']}")
    print(f"Optimal Injection Time: {results['optimal_injection_time']} s")
    
    if results['warnings']:
        print("\nWarnings:")
        for warning in results['warnings']:
            print(f"- {warning}")
    
    # Test environmental impact calculation
    env_impact = calculate_environmental_impact("HFC", 5000)
    print("\nEnvironmental Impact:")
    print(f"CO₂ Reduction: {env_impact['co2_reduction']} tons/year")
    print(f"Thermal Efficiency Improvement: {env_impact['thermal_improvement']}%")
    print(f"Cost Savings: €{env_impact['cost_savings']}")
