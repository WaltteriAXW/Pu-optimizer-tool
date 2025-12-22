"""
Pressure Optimizer

Determines the REQUIRED and OPTIMAL machine pressure settings for given conditions.

REQUIRED PRESSURE: Minimum pressure needed to push fluid through the system
OPTIMAL PRESSURE: Pressure that minimizes defects/waste while achieving quality

Uses scipy.optimize with physics-based constraints to find optimal solutions.
"""

import math
from typing import Dict, Any, Tuple, Optional, List
from dataclasses import dataclass
from enum import Enum

try:
    from scipy.optimize import minimize, differential_evolution
    from scipy.constants import g as GRAVITY
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False


class PressureOptimizationObjective(Enum):
    """What are we optimizing for?"""
    MINIMUM_PRESSURE = "minimize_pressure"  # Lowest viable pressure
    QUALITY = "maximize_quality"  # Best surface finish, fewest voids
    EFFICIENCY = "maximize_efficiency"  # Minimize energy, heat, wear
    BALANCED = "balanced"  # Multi-objective balance


@dataclass
class OptimizationResult:
    """Result of pressure optimization"""
    success: bool
    objective: PressureOptimizationObjective

    # Optimal solution
    required_pressure_bar: float  # Minimum pressure needed
    optimal_pressure_bar: float  # Recommended operating pressure
    machine_pressure_setting: str  # "High Pressure (100-200 bar)" or "Low Pressure (8-20 bar)"

    # Quality metrics at optimal point
    shear_rate_optimal_s_inv: float
    apparent_viscosity_optimal_cp: float
    temperature_rise_optimal_c: float
    reynolds_number_optimal: float

    # Confidence & constraints
    constraint_violations: List[str]
    confidence_score: float  # 0-1, how confident in this result
    alternative_pressures: Dict[float, float]  # pressure_bar -> quality_score

    # Diagnostics
    iterations: int
    optimization_time_s: float
    messages: List[str]


class PressureOptimizer:
    """
    Optimization engine for polyurethane injection pressure

    Solves: Find pressure P such that:
    - F(P) is minimized (quality objective)
    - Subject to constraints:
      - P_min ≤ P ≤ P_max (machine capability)
      - γ̇ ≤ γ̇_max (avoid material degradation)
      - ΔT ≤ ΔT_max (avoid excessive heating)
      - Re within acceptable range (avoid turbulence or starvation)
    """

    def __init__(
        self,
        calculation_engine,  # Reference to main calculation engine
        max_shear_rate_s_inv: float = 10000,
        max_temperature_rise_c: float = 20,
        target_reynolds: float = 100,
        reynolds_tolerance: float = 50
    ):
        """
        Initialize optimizer

        Args:
            calculation_engine: Function that calculates results given pressure
            max_shear_rate_s_inv: Maximum acceptable shear rate
            max_temperature_rise_c: Maximum acceptable temperature rise
            target_reynolds: Target Reynolds number (laminar/turbulent boundary)
            reynolds_tolerance: Acceptable deviation from target
        """
        if not SCIPY_AVAILABLE:
            raise ImportError("scipy required for optimization. Install with: pip install scipy")

        self.calculate = calculation_engine
        self.max_shear_rate_s_inv = max_shear_rate_s_inv
        self.max_temperature_rise_c = max_temperature_rise_c
        self.target_reynolds = target_reynolds
        self.reynolds_tolerance = reynolds_tolerance

        self._iterations = 0
        self._start_time = 0

    # =========================================================================
    # MAIN OPTIMIZATION INTERFACE
    # =========================================================================

    def optimize(
        self,
        parameters: Dict[str, Any],
        objective: PressureOptimizationObjective = PressureOptimizationObjective.MINIMUM_PRESSURE,
        machine_type: str = "auto"  # "high_pressure", "low_pressure", or "auto" for best choice
    ) -> OptimizationResult:
        """
        Find optimal pressure for given conditions

        Args:
            parameters: Process parameters (pipe dimensions, material, temp, flow rate)
            objective: What to optimize for
            machine_type: Which machine type to target ("high_pressure", "low_pressure", "auto")

        Returns:
            OptimizationResult with recommended pressure and diagnostics
        """
        import time
        self._start_time = time.time()
        self._iterations = 0

        # Determine machine pressure range
        if machine_type == "auto":
            hp_result = self._optimize_machine_type(parameters, objective, "high_pressure")
            lp_result = self._optimize_machine_type(parameters, objective, "low_pressure")

            # Choose best result
            if hp_result.confidence_score > lp_result.confidence_score:
                result = hp_result
            else:
                result = lp_result
        else:
            result = self._optimize_machine_type(parameters, objective, machine_type)

        result.optimization_time_s = time.time() - self._start_time
        result.iterations = self._iterations

        return result

    # =========================================================================
    # INTERNAL OPTIMIZATION METHODS
    # =========================================================================

    def _optimize_machine_type(
        self,
        parameters: Dict[str, Any],
        objective: PressureOptimizationObjective,
        machine_type: str
    ) -> OptimizationResult:
        """Optimize for a specific machine type"""

        # Get machine constraints
        if machine_type == "high_pressure":
            p_min, p_max = 100, 200
            machine_label = "High Pressure (100-200 bar)"
        elif machine_type == "low_pressure":
            p_min, p_max = 8, 20
            machine_label = "Low Pressure (8-20 bar)"
        else:
            raise ValueError(f"Unknown machine type: {machine_type}")

        # Define objective function
        def objective_func(pressure_bar: float) -> float:
            """Return value to minimize (lower = better)"""
            return self._calculate_objective(
                pressure_bar,
                parameters,
                objective
            )

        # Define constraints
        constraints = []
        violations = []

        # Run optimization
        try:
            # Use differential evolution for global optimization
            bounds = [(p_min, p_max)]

            result = differential_evolution(
                objective_func,
                bounds,
                seed=42,
                maxiter=100,
                atol=0.1,
                tol=0.01
            )

            optimal_pressure = result.x[0]
            self._iterations = result.nit

            # Evaluate at optimal point
            optimal_results = self._evaluate_pressure(optimal_pressure, parameters)

            # Calculate required pressure (minimum viable)
            required_pressure = self._find_minimum_pressure(p_min, p_max, parameters)

            # Generate alternatives
            alternatives = self._generate_alternatives(
                p_min, p_max, parameters, optimal_pressure, num_alternatives=5
            )

            # Check constraints
            constraint_violations, confidence = self._check_constraints(
                optimal_pressure,
                optimal_results,
                parameters,
                machine_type
            )

            return OptimizationResult(
                success=result.success,
                objective=objective,
                required_pressure_bar=required_pressure,
                optimal_pressure_bar=optimal_pressure,
                machine_pressure_setting=machine_label,
                shear_rate_optimal_s_inv=optimal_results.get('shear_rate', 0),
                apparent_viscosity_optimal_cp=optimal_results.get('viscosity_cp', 0),
                temperature_rise_optimal_c=optimal_results.get('temperature_rise', 0),
                reynolds_number_optimal=optimal_results.get('reynolds_number', 0),
                constraint_violations=constraint_violations,
                confidence_score=confidence,
                alternative_pressures=alternatives,
                iterations=result.nit,
                optimization_time_s=0,
                messages=[str(result.message)]
            )

        except Exception as e:
            return OptimizationResult(
                success=False,
                objective=objective,
                required_pressure_bar=p_min,
                optimal_pressure_bar=p_min,
                machine_pressure_setting=machine_label,
                shear_rate_optimal_s_inv=0,
                apparent_viscosity_optimal_cp=0,
                temperature_rise_optimal_c=0,
                reynolds_number_optimal=0,
                constraint_violations=[str(e)],
                confidence_score=0,
                alternative_pressures={},
                iterations=0,
                optimization_time_s=0,
                messages=[f"Optimization failed: {str(e)}"]
            )

    def _calculate_objective(
        self,
        pressure_bar: float,
        parameters: Dict[str, Any],
        objective: PressureOptimizationObjective
    ) -> float:
        """Calculate objective function value (to minimize)"""
        self._iterations += 1

        results = self._evaluate_pressure(pressure_bar, parameters)

        if objective == PressureOptimizationObjective.MINIMUM_PRESSURE:
            # Minimize pressure while staying viable
            viability = self._viability_score(results)
            return pressure_bar + (1 - viability) * 500  # Penalize non-viable

        elif objective == PressureOptimizationObjective.QUALITY:
            # Maximize quality (minimize defects)
            return self._defect_score(results)  # Lower score = fewer defects

        elif objective == PressureOptimizationObjective.EFFICIENCY:
            # Minimize energy, heat, wear
            return self._energy_score(results, pressure_bar)

        elif objective == PressureOptimizationObjective.BALANCED:
            # Multi-objective: pressure + quality + efficiency
            p_score = pressure_bar / 200  # Normalize to 0-1
            q_score = self._defect_score(results) / 100
            e_score = self._energy_score(results, pressure_bar) / 1000

            return 0.3 * p_score + 0.5 * q_score + 0.2 * e_score

        return 0

    def _viability_score(self, results: Dict[str, Any]) -> float:
        """Score how viable a pressure setting is (0-1)"""
        score = 1.0

        # Penalize if shear rate too high
        if results.get('shear_rate', 0) > self.max_shear_rate_s_inv:
            score *= 0.5

        # Penalize if temperature rise too high
        if results.get('temperature_rise', 0) > self.max_temperature_rise_c:
            score *= 0.7

        # Penalize if Reynolds number way off target
        re = results.get('reynolds_number', 0)
        if abs(re - self.target_reynolds) > self.reynolds_tolerance * 2:
            score *= 0.8

        return max(score, 0.0)

    def _defect_score(self, results: Dict[str, Any]) -> float:
        """Score quality (lower = better)"""
        score = 0

        # Shear heating causes voids
        temp_rise = results.get('temperature_rise', 0)
        score += 10 * (temp_rise / self.max_temperature_rise_c) ** 2

        # Excessive shear rate causes degradation
        shear_rate = results.get('shear_rate', 0)
        if shear_rate > self.max_shear_rate_s_inv:
            score += 50

        # Too low shear causes mixing problems
        if shear_rate < 100:
            score += 20

        # Reynolds number deviation
        re = results.get('reynolds_number', 0)
        if re > 4000:  # Turbulent
            score += 30
        elif re < 10:  # Too laminar
            score += 15

        return score

    def _energy_score(self, results: Dict[str, Any], pressure_bar: float) -> float:
        """Score energy efficiency (lower = better)"""
        # Higher pressure = more energy
        pressure_energy = pressure_bar ** 1.5

        # Temperature rise = wasted energy
        temp_energy = (results.get('temperature_rise', 0) ** 2) * 5

        # Excessive shear = viscous dissipation
        shear_energy = (results.get('shear_rate', 0) / 1000) ** 2

        return pressure_energy + temp_energy + shear_energy

    def _find_minimum_pressure(
        self,
        p_min: float,
        p_max: float,
        parameters: Dict[str, Any]
    ) -> float:
        """Find minimum pressure to overcome flow resistance"""
        # Binary search for minimum viable pressure
        for pressure in [p_min, p_min + (p_max - p_min) * 0.1, p_min + (p_max - p_min) * 0.2]:
            results = self._evaluate_pressure(pressure, parameters)
            if self._viability_score(results) > 0.5:
                return pressure

        return p_min

    def _evaluate_pressure(
        self,
        pressure_bar: float,
        parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Evaluate results for a given pressure"""
        try:
            # Call the calculation engine with this pressure
            results = self.calculate(parameters, pressure_override_bar=pressure_bar)
            return results
        except Exception:
            return {
                'shear_rate': 0,
                'viscosity_cp': 0,
                'temperature_rise': 999,
                'reynolds_number': 0
            }

    def _check_constraints(
        self,
        pressure_bar: float,
        results: Dict[str, Any],
        parameters: Dict[str, Any],
        machine_type: str
    ) -> Tuple[List[str], float]:
        """Check if constraints are satisfied"""
        violations = []
        confidence = 1.0

        # Machine pressure range
        if machine_type == "high_pressure" and not (100 <= pressure_bar <= 200):
            violations.append(f"Pressure {pressure_bar:.1f} outside high-pressure range (100-200)")
            confidence *= 0.8
        elif machine_type == "low_pressure" and not (8 <= pressure_bar <= 20):
            violations.append(f"Pressure {pressure_bar:.1f} outside low-pressure range (8-20)")
            confidence *= 0.8

        # Shear rate constraint
        if results.get('shear_rate', 0) > self.max_shear_rate_s_inv:
            violations.append(f"Shear rate {results['shear_rate']:.0f} exceeds maximum {self.max_shear_rate_s_inv}")
            confidence *= 0.6

        # Temperature rise constraint
        if results.get('temperature_rise', 0) > self.max_temperature_rise_c:
            violations.append(f"Temperature rise {results['temperature_rise']:.1f}°C exceeds maximum {self.max_temperature_rise_c}°C")
            confidence *= 0.5

        # Reynolds number sanity
        re = results.get('reynolds_number', 0)
        if re < 0.1 or re > 100000:
            violations.append(f"Reynolds number {re:.1f} outside reasonable range")
            confidence *= 0.7

        return violations, confidence

    def _generate_alternatives(
        self,
        p_min: float,
        p_max: float,
        parameters: Dict[str, Any],
        optimal_pressure: float,
        num_alternatives: int = 5
    ) -> Dict[float, float]:
        """Generate alternative pressure settings with quality scores"""
        alternatives = {}

        pressures = [
            p_min,
            p_min + (p_max - p_min) * 0.25,
            p_min + (p_max - p_min) * 0.5,
            p_min + (p_max - p_min) * 0.75,
            p_max
        ]

        for pressure in pressures:
            results = self._evaluate_pressure(pressure, parameters)
            quality_score = 100 - self._defect_score(results)
            alternatives[round(pressure, 1)] = round(quality_score, 1)

        return alternatives
