import numpy as np
import json
import os
from datetime import datetime
from pathlib import Path

# Try to import ML module (optional dependency)
try:
    from process_optimizer_ml import get_ml_predictions
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    print("ML module not available - running without ML predictions")

class ValidationError(Exception):
    """Custom exception for input validation errors"""
    pass

# Polyurethane Machine Specifications - Two-Category System
# High-Pressure vs Low-Pressure Category System
MACHINE_SPECS = {
    "high_pressure": {
        "name": "High-Pressure (HP) System",
        "category": "High-Pressure",
        "output": "5-200+ kg/min",
        "output_range": {"min": 5, "max": 200},  # kg/min
        "max_pressure": 200.0,  # bar (typical max ~197 bar / 2800 PSI)
        "pressure_range": {"min": 100, "max": 200},  # bar
        "tank_capacity": "Variable",
        "feed_line_diameter_a": "4-8 mm",  # A component (tight lines, high shear)
        "feed_line_diameter_b": "4-8 mm",  # B component (symmetric for 1:1 ratio)
        "pump_type": "Axial piston / High-pressure gear / Variable displacement",
        "shear_rate_range": {"min": 2000, "max": 10000},  # s⁻¹
        "mix_head_type": "L-style / R-style / Dual-tilted injection (High-energy stream impingement)",
        "power_law_index": 0.65,  # n (typical 0.60-0.70)
        "activation_energy": 42500,  # J/mol (typical 35-50 kJ/mol)
        "laminar_flow_limit": 175,  # bar (up to 150-200 bar at max output)
        "application": "Rigid foam, integral skin, insulation, dense composites",
        "description": "Requires precise, fast mixing",
        "manufacturer": "Generic High-Pressure System"
    },
    "low_pressure": {
        "name": "Low-Pressure (LP) System",
        "category": "Low-Pressure",
        "output": "2-300+ kg/min",
        "output_range": {"min": 2, "max": 300},  # kg/min
        "max_pressure": 20.0,  # bar (gentle, controlled delivery)
        "pressure_range": {"min": 5, "max": 20},  # bar
        "tank_capacity": "Variable (Modular)",
        "feed_line_diameter_a": "10-16 mm",  # A component (larger lines reduce shear)
        "feed_line_diameter_b": "10-16 mm",  # B component (generous sizing)
        "pump_type": "Gear pump (external, fixed/variable displacement, e.g., KCB83.3 ~160 kg/min)",
        "shear_rate_range": {"min": 100, "max": 1500},  # s⁻¹
        "mix_head_type": "Mechanical mixer / Dynamic mix chamber (moving paddles/rotor, slower speeds)",
        "power_law_index": 0.70,  # n (typical 0.65-0.75)
        "activation_energy": 42500,  # J/mol (typical 35-50 kJ/mol)
        "laminar_flow_limit": 12.5,  # bar (up to 10-15 bar at max output)
        "application": "Flexible foam, elastomers, CASE (coatings/adhesives/sealants), high-viscosity casting",
        "description": "Handles higher viscosities with less agitation",
        "manufacturer": "Generic Low-Pressure System"
    }
}

# Material presets with complete properties
MATERIAL_PRESETS = {
    "ecofoam_standard": {
        "name": "Ecofoam Standard",
        "density": 1120,  # kg/m³
        "specific_gravity": 1.12,
        "viscosity": 350,  # cP at 25°C
        "flow_index": 0.85,
        "activation_energy": 25000,  # J/mol
        "polyol_sg": 1.12,
        "iso_sg": 1.23,
        "weight_ratio": [100, 110],  # Polyol:Isocyanate
        "final_density": 32  # kg/m³ for foam
    },
    "ecofoam_xhd": {
        "name": "Ecofoam XHD RC",
        "density": 1120,
        "specific_gravity": 1.12,
        "viscosity": 850,  # Higher viscosity
        "flow_index": 0.82,
        "activation_energy": 28000,
        "polyol_sg": 1.12,
        "iso_sg": 1.23,
        "weight_ratio": [100, 110],
        "final_density": 40  # kg/m³ for foam
    },
    "ecomate_spray_ec": {
        "name": "Ecomate Spray EC",
        "density": 1120,
        "specific_gravity": 1.12,
        "viscosity": 350,
        "flow_index": 0.88,
        "activation_energy": 24000,
        "polyol_sg": 1.12,
        "iso_sg": 1.23,
        "weight_ratio": [100, 110],
        "final_density": 32
    }
}

class PolyurethaneCalculator:
    """
    Enhanced calculator for polyurethane injection parameters

    Includes machine compatibility checking, material presets,
    mix ratio calculations, and improved accuracy
    """

    def __init__(self, material_preset="ecofoam_standard"):
        """
        Initialize calculator with material preset

        Args:
            material_preset: Key from MATERIAL_PRESETS dict
        """
        if material_preset in MATERIAL_PRESETS:
            preset = MATERIAL_PRESETS[material_preset]
            self.activation_energy = preset["activation_energy"]
            self.power_law_index = preset["flow_index"]
        else:
            # Default values
            self.activation_energy = 25000.0
            self.power_law_index = 0.85

        self.gas_constant = 8.314  # J/(mol·K) - Universal gas constant
        self.safety_factor = 1.5  # Safety multiplier for pressure

    def validate_inputs(self, pipe_length, pipe_diameter, temperature, flow_rate,
                      viscosity, density):
        """Validate input parameters against physical constraints"""
        if pipe_length < 50:
            raise ValidationError("Pipe length must be at least 50mm")
        if pipe_diameter <= 0:
            raise ValidationError("Pipe diameter must be positive")
        if not (5 <= temperature <= 50):
            raise ValidationError("Temperature must be between 5°C and 50°C")
        if flow_rate <= 0:
            raise ValidationError("Flow rate must be positive")
        if viscosity <= 0:
            raise ValidationError("Viscosity must be positive")
        if density <= 0:
            raise ValidationError("Density must be positive")

    def calculate(self, pipe_length, pipe_diameter, temperature, flow_rate_lpm,
                viscosity=350.0, density=1120, machine_type="low_pressure"):
        """
        Calculate polyurethane injection parameters with enhanced accuracy

        Args:
            pipe_length: Length of the injection pipe in mm
            pipe_diameter: Diameter of the pipe in mm (not thickness)
            temperature: Process temperature in °C
            flow_rate_lpm: Volumetric flow rate in L/min
            viscosity: Initial viscosity at 25°C in cP (default: 350.0)
            density: Material density in kg/m³ (default: 1120)
            machine_type: Key from MACHINE_SPECS dict

        Returns:
            Dictionary with comprehensive calculation results
        """
        try:
            # Convert flow rate from L/min to m³/s
            flow_rate = flow_rate_lpm / 60000  # L/min to m³/s

            # Validate inputs
            self.validate_inputs(pipe_length, pipe_diameter, temperature, flow_rate,
                               viscosity, density)

            # Convert units to SI
            radius = pipe_diameter / 2000  # mm to m
            length = pipe_length / 1000  # mm to m

            # Calculate shear rate at wall
            shear_rate = (4 * flow_rate) / (np.pi * radius**3)

            # Calculate temperature correction factor (Arrhenius equation)
            temp_k = temperature + 273.15  # Convert to Kelvin
            ref_temp_k = 25 + 273.15  # Reference temperature 25°C in Kelvin
            temp_factor = np.exp((self.activation_energy / self.gas_constant) *
                               (1/temp_k - 1/ref_temp_k))

            # Calculate apparent viscosity with Power Law and temperature correction
            base_viscosity = viscosity * 0.001  # Convert from cP to Pa·s
            corrected_viscosity = base_viscosity * temp_factor
            apparent_viscosity = corrected_viscosity * shear_rate**(self.power_law_index - 1)

            # Calculate flow velocity
            area = np.pi * radius**2
            velocity = flow_rate / area

            # Calculate Reynolds number
            reynolds = (density * velocity * pipe_diameter / 1000) / (corrected_viscosity)

            # Calculate pressure drop using modified Hagen-Poiseuille for Power Law fluids
            n = self.power_law_index
            pressure_drop = ((8 * apparent_viscosity * length * flow_rate) /
                          (np.pi * radius**4)) * ((3*n + 1)/(4*n))

            # Convert pressure to bar and kPa
            pressure_drop_kpa = pressure_drop / 1000
            pressure_drop_bar = pressure_drop_kpa / 100

            # Add atmospheric pressure and safety factor for total system pressure
            atmospheric_pressure_bar = 1.01325
            total_pressure_bar = atmospheric_pressure_bar + (pressure_drop_bar * self.safety_factor)

            # Generate pressure profile along pipe length
            pressure_profile = []
            for i in range(20):
                distance = (i * pipe_length) / 19
                pressure_frac = 1 - (distance / pipe_length)
                pressure = total_pressure_bar * pressure_frac
                pressure_profile.append({
                    "distance": round(distance, 1),
                    "pressure_bar": round(pressure, 3),
                    "pressure_kpa": round(pressure * 100, 2)
                })

            # Calculate optimal injection time
            pipe_volume = np.pi * radius**2 * length  # m³
            injection_time = pipe_volume / flow_rate  # seconds

            # Determine flow regime
            flow_regime = "laminar" if reynolds < 2300 else "turbulent"

            # Check machine compatibility
            machine_compatible = False
            machine_info = None
            if machine_type in MACHINE_SPECS:
                machine_info = MACHINE_SPECS[machine_type]
                machine_compatible = total_pressure_bar <= machine_info["max_pressure"]

            # Generate warnings and recommendations
            warnings = []
            recommendations = []

            if reynolds > 2300:
                warnings.append("Flow is turbulent (Re > 2300) - consider reducing flow rate")
                recommendations.append(f"Reduce flow rate below {(2300 * corrected_viscosity / (density * pipe_diameter / 1000)) * area * 60000:.1f} L/min for laminar flow")

            if shear_rate > 1000:
                warnings.append("High shear rate may affect material properties and cause degradation")
                recommendations.append("Consider increasing pipe diameter or reducing flow rate")

            if apparent_viscosity > 1.0:
                warnings.append("High apparent viscosity will require increased pressure")

            if velocity > 5.0:
                warnings.append("Very high flow velocity may cause turbulence and mixing issues")
                recommendations.append("Reduce flow rate or increase pipe diameter")

            if not machine_compatible and machine_info:
                warnings.append(f"Required pressure ({total_pressure_bar:.2f} bar) exceeds machine capacity ({machine_info['max_pressure']} bar)")
                recommendations.append("Reduce flow rate, increase pipe diameter, or increase temperature")

            # Get ML predictions if available
            ml_insights = None
            if ML_AVAILABLE:
                try:
                    ml_insights = get_ml_predictions(
                        pipe_length, pipe_diameter, temperature, flow_rate_lpm,
                        viscosity, density, self.power_law_index, self.activation_energy,
                        total_pressure_bar, reynolds
                    )
                    # Merge ML recommendations with existing ones
                    if ml_insights and ml_insights.get('trained'):
                        recommendations.extend(ml_insights.get('recommendations', []))
                except Exception as e:
                    print(f"ML prediction error: {e}")
                    ml_insights = {'trained': False, 'error': str(e)}

            # Prepare comprehensive results
            return {
                # Primary results
                "optimal_pressure_bar": round(total_pressure_bar, 2),
                "pressure_drop_bar": round(pressure_drop_bar, 2),
                "pressure_drop_kpa": round(pressure_drop_kpa, 2),

                # Flow characteristics
                "shear_rate": round(shear_rate, 2),  # s⁻¹
                "apparent_viscosity": round(apparent_viscosity, 4),  # Pa·s
                "reynolds_number": round(reynolds, 2),
                "flow_regime": flow_regime,
                "velocity": round(velocity, 3),  # m/s

                # Time and volume
                "optimal_injection_time": round(injection_time, 3),  # s
                "pipe_volume_liters": round(pipe_volume * 1000, 3),

                # Temperature effects
                "temperature_factor": round(temp_factor, 3),
                "corrected_viscosity": round(corrected_viscosity * 1000, 1),  # cP

                # Machine compatibility
                "machine_compatible": machine_compatible,
                "machine_info": machine_info,

                # Pressure profile
                "pressure_profile": pressure_profile,

                # Warnings and recommendations
                "warnings": warnings,
                "recommendations": recommendations,

                # ML Insights (if available)
                "ml_insights": ml_insights
            }

        except ValidationError as e:
            raise
        except Exception as e:
            raise Exception(f"Calculation error: {str(e)}")

    def calculate_mix_ratio(self, polyol_sg, iso_sg, weight_ratio, part_volume):
        """
        Calculate component requirements for mix ratio

        Args:
            polyol_sg: Polyol specific gravity
            iso_sg: Isocyanate specific gravity
            weight_ratio: List [polyol_parts, iso_parts] by weight
            part_volume: Part volume in liters

        Returns:
            Dictionary with component requirements
        """
        polyol_parts, iso_parts = weight_ratio
        total_weight_parts = polyol_parts + iso_parts

        # Calculate component densities (SG * 1000 = kg/m³)
        polyol_density = polyol_sg * 1000
        iso_density = iso_sg * 1000

        # Calculate volume fractions based on weight ratio
        polyol_volume_frac = (polyol_parts / polyol_density) / \
            ((polyol_parts / polyol_density) + (iso_parts / iso_density))
        iso_volume_frac = 1 - polyol_volume_frac

        # Calculate required volumes
        polyol_volume = part_volume * polyol_volume_frac
        iso_volume = part_volume * iso_volume_frac

        # Calculate required weights
        polyol_weight = polyol_volume * polyol_density / 1000  # kg
        iso_weight = iso_volume * iso_density / 1000  # kg
        total_weight = polyol_weight + iso_weight

        # Calculate theoretical mixed density
        theoretical_density = total_weight / part_volume * 1000  # kg/m³

        # Calculate volume ratio
        volume_ratio_polyol = round(polyol_volume / iso_volume * 100, 1) if iso_volume > 0 else 0

        return {
            "polyol_needed_kg": round(polyol_weight, 3),
            "polyol_needed_liters": round(polyol_volume, 3),
            "iso_needed_kg": round(iso_weight, 3),
            "iso_needed_liters": round(iso_volume, 3),
            "total_weight_kg": round(total_weight, 3),
            "theoretical_density": round(theoretical_density, 0),
            "volume_ratio": f"{volume_ratio_polyol}:100"
        }

    def log_production_run(self, parameters, results, quality_status="good",
                          quality_notes="", machine_type="unknown",
                          material_preset="unknown", log_file="production_log.json"):
        """
        Log production run data for ML model training and quality tracking

        Args:
            parameters: Dictionary with input parameters (pipe_length, pipe_diameter, etc.)
            results: Dictionary with calculation results
            quality_status: "good", "acceptable", "defective", or "failed"
            quality_notes: String describing any quality issues or observations
            machine_type: Machine type used for production
            material_preset: Material preset used
            log_file: Path to log file (default: production_log.json)

        Returns:
            Dictionary with log entry details
        """
        # Create logs directory if it doesn't exist
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        log_path = log_dir / log_file

        # Prepare log entry
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "quality_status": quality_status,
            "quality_notes": quality_notes,
            "machine_type": machine_type,
            "material_preset": material_preset,

            # Input parameters
            "parameters": {
                "pipe_length": parameters.get("pipe_length"),
                "pipe_diameter": parameters.get("pipe_diameter"),
                "temperature": parameters.get("temperature"),
                "flow_rate": parameters.get("flow_rate"),
                "viscosity": parameters.get("viscosity"),
                "density": parameters.get("density"),
                "flow_index": self.power_law_index,
                "activation_energy": self.activation_energy
            },

            # Calculation results
            "results": {
                "optimal_pressure_bar": results.get("optimal_pressure_bar"),
                "pressure_drop_bar": results.get("pressure_drop_bar"),
                "reynolds_number": results.get("reynolds_number"),
                "flow_regime": results.get("flow_regime"),
                "velocity": results.get("velocity"),
                "shear_rate": results.get("shear_rate"),
                "apparent_viscosity": results.get("apparent_viscosity"),
                "machine_compatible": results.get("machine_compatible"),
                "warnings_count": len(results.get("warnings", [])),
                "has_warnings": len(results.get("warnings", [])) > 0
            },

            # Warnings and recommendations
            "warnings": results.get("warnings", []),
            "recommendations": results.get("recommendations", [])
        }

        # Load existing logs or create new list
        logs = []
        if log_path.exists():
            try:
                with open(log_path, 'r') as f:
                    logs = json.load(f)
            except json.JSONDecodeError:
                print(f"Warning: Could not parse {log_path}, creating new log file")
                logs = []

        # Append new entry
        logs.append(log_entry)

        # Save updated logs
        with open(log_path, 'w') as f:
            json.dump(logs, f, indent=2)

        print(f"✓ Production run logged to {log_path} (Total entries: {len(logs)})")

        return {
            "logged": True,
            "log_file": str(log_path),
            "total_entries": len(logs),
            "entry_id": len(logs) - 1
        }

    def log_quality_issue(self, issue_type, description, parameters=None,
                         severity="medium", log_file="quality_issues.json"):
        """
        Log quality issues and defects for tracking and ML training

        Args:
            issue_type: Type of issue (e.g., "void", "short_shot", "flash", "surface_defect")
            description: Detailed description of the issue
            parameters: Dictionary with process parameters when issue occurred
            severity: "low", "medium", "high", or "critical"
            log_file: Path to quality issues log file

        Returns:
            Dictionary with log entry details
        """
        # Create logs directory if it doesn't exist
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        log_path = log_dir / log_file

        # Prepare log entry
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "issue_type": issue_type,
            "severity": severity,
            "description": description,
            "parameters": parameters or {}
        }

        # Load existing logs or create new list
        logs = []
        if log_path.exists():
            try:
                with open(log_path, 'r') as f:
                    logs = json.load(f)
            except json.JSONDecodeError:
                print(f"Warning: Could not parse {log_path}, creating new log file")
                logs = []

        # Append new entry
        logs.append(log_entry)

        # Save updated logs
        with open(log_path, 'w') as f:
            json.dump(logs, f, indent=2)

        print(f"⚠ Quality issue logged to {log_path} (Total issues: {len(logs)})")

        return {
            "logged": True,
            "log_file": str(log_path),
            "total_issues": len(logs),
            "issue_id": len(logs) - 1
        }

    def get_production_statistics(self, log_file="production_log.json"):
        """
        Get statistics from production logs

        Args:
            log_file: Path to log file

        Returns:
            Dictionary with production statistics
        """
        log_path = Path("logs") / log_file

        if not log_path.exists():
            return {
                "total_runs": 0,
                "message": "No production logs found"
            }

        try:
            with open(log_path, 'r') as f:
                logs = json.load(f)
        except json.JSONDecodeError:
            return {
                "total_runs": 0,
                "error": "Could not parse log file"
            }

        if not logs:
            return {
                "total_runs": 0,
                "message": "No production runs logged"
            }

        # Calculate statistics
        total_runs = len(logs)
        quality_counts = {
            "good": 0,
            "acceptable": 0,
            "defective": 0,
            "failed": 0
        }

        avg_pressure = 0
        avg_temperature = 0
        avg_reynolds = 0
        runs_with_warnings = 0

        for log in logs:
            quality_counts[log.get("quality_status", "unknown")] = \
                quality_counts.get(log.get("quality_status", "unknown"), 0) + 1

            results = log.get("results", {})
            params = log.get("parameters", {})

            avg_pressure += results.get("optimal_pressure_bar", 0)
            avg_temperature += params.get("temperature", 0)
            avg_reynolds += results.get("reynolds_number", 0)

            if results.get("has_warnings", False):
                runs_with_warnings += 1

        avg_pressure /= total_runs
        avg_temperature /= total_runs
        avg_reynolds /= total_runs

        success_rate = (quality_counts["good"] + quality_counts["acceptable"]) / total_runs * 100

        return {
            "total_runs": total_runs,
            "quality_distribution": quality_counts,
            "success_rate": round(success_rate, 1),
            "runs_with_warnings": runs_with_warnings,
            "averages": {
                "pressure_bar": round(avg_pressure, 2),
                "temperature_c": round(avg_temperature, 1),
                "reynolds_number": round(avg_reynolds, 2)
            },
            "date_range": {
                "first_run": logs[0].get("timestamp"),
                "last_run": logs[-1].get("timestamp")
            }
        }

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
        "odp_reduction": round(current_agent["odp"] * annual_consumption, 6)
    }

# Example usage and testing
if __name__ == "__main__":
    print("=== Polyurethane Injection Calculator - Enhanced Version ===\n")

    # Test with Ecofoam Standard
    calculator = PolyurethaneCalculator("ecofoam_standard")

    # Test parameters matching the math.js version
    pipe_length = 500  # mm
    pipe_diameter = 12  # mm
    temperature = 25  # °C
    flow_rate_lpm = 5  # L/min
    viscosity = 350  # cP
    density = 1120  # kg/m³
    machine = "low_pressure"

    print(f"Test Parameters:")
    print(f"  Pipe: {pipe_length}mm length × {pipe_diameter}mm diameter")
    print(f"  Temperature: {temperature}°C")
    print(f"  Flow rate: {flow_rate_lpm} L/min")
    print(f"  Material: Ecofoam Standard ({viscosity} cP, {density} kg/m³)")
    print(f"  Machine: {MACHINE_SPECS[machine]['name']}\n")

    # Calculate parameters
    result = calculator.calculate(
        pipe_length, pipe_diameter, temperature, flow_rate_lpm,
        viscosity, density, machine
    )

    # Print results
    print("=== Calculation Results ===")
    print(f"Optimal Injection Pressure: {result['optimal_pressure_bar']} bar")
    print(f"Pressure Drop: {result['pressure_drop_bar']} bar ({result['pressure_drop_kpa']} kPa)")
    print(f"Flow Regime: {result['flow_regime']}")
    print(f"Reynolds Number: {result['reynolds_number']}")
    print(f"Flow Velocity: {result['velocity']} m/s")
    print(f"Apparent Viscosity: {result['apparent_viscosity']} Pa·s")
    print(f"Shear Rate: {result['shear_rate']} s⁻¹")
    print(f"Injection Time: {result['optimal_injection_time']} s")
    print(f"Pipe Volume: {result['pipe_volume_liters']} L")

    if result['machine_info']:
        print(f"\nMachine Compatibility:")
        print(f"  Machine: {result['machine_info']['name']}")
        print(f"  Max Pressure: {result['machine_info']['max_pressure']} bar")
        print(f"  Compatible: {'✓ Yes' if result['machine_compatible'] else '✗ No'}")

    if result['warnings']:
        print(f"\nWarnings:")
        for warning in result['warnings']:
            print(f"  ⚠ {warning}")

    if result['recommendations']:
        print(f"\nRecommendations:")
        for rec in result['recommendations']:
            print(f"  → {rec}")

    # Test mix ratio calculator
    print("\n=== Mix Ratio Calculation ===")
    mix_result = calculator.calculate_mix_ratio(
        polyol_sg=1.12,
        iso_sg=1.23,
        weight_ratio=[100, 110],
        part_volume=1.0  # 1 liter
    )

    print(f"For 1.0 L part volume:")
    print(f"  Polyol needed: {mix_result['polyol_needed_kg']} kg ({mix_result['polyol_needed_liters']} L)")
    print(f"  Isocyanate needed: {mix_result['iso_needed_kg']} kg ({mix_result['iso_needed_liters']} L)")
    print(f"  Total weight: {mix_result['total_weight_kg']} kg")
    print(f"  Theoretical density: {mix_result['theoretical_density']} kg/m³")
    print(f"  Volume ratio: {mix_result['volume_ratio']}")

    # Test environmental impact
    print("\n=== Environmental Impact ===")
    env_impact = calculate_environmental_impact("HFC", 5000)
    print(f"Switching from HFC to Ecomate (5000 kg/year):")
    print(f"  CO₂ reduction: {env_impact['co2_reduction']} tons/year")
    print(f"  Thermal improvement: {env_impact['thermal_improvement']}%")
    print(f"  Cost savings: €{env_impact['cost_savings']}/year")
