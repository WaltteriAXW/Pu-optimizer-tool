"""
Phase 4 Tier 4: Inverse Optimization - Target-Based Parameter Finding.

Solves the inverse problem: given target outcomes, find required parameters.

Examples:
- Target: Outlet temperature 38°C → Find required inlet temperature
- Target: Pressure drop < 2 bar → Find required pipe diameter
- Target: Flow rate 15 LPM with laminar flow → Find required viscosity

Uses constrained optimization with gradient-free methods suitable for
non-differentiable constraints and discontinuous domains.

Author: Phase 4 Tier 4
"""

from dataclasses import dataclass
from typing import Dict, Callable, List, Optional, Tuple
from enum import Enum
import math


class OptimizationObjective(Enum):
    """Types of inverse optimization objectives"""
    MINIMIZE = "minimize"
    MAXIMIZE = "maximize"
    TARGET = "target"  # Get as close as possible to target value


@dataclass
class ParameterBounds:
    """Bounds for a parameter in optimization"""
    name: str
    min_value: float
    max_value: float
    current_value: float = None
    step_size: float = 1.0  # For grid search
    allow_continuous: bool = True


@dataclass
class TargetSpecification:
    """Target outcome specification"""
    parameter_name: str  # e.g., "outlet_temperature_c"
    objective: OptimizationObjective
    target_value: Optional[float] = None  # For TARGET objective
    tolerance: float = 0.1  # Acceptable deviation


@dataclass
class OptimizationResult:
    """Result of inverse optimization"""
    success: bool
    target: TargetSpecification
    optimal_parameters: Dict[str, float]
    predicted_outcome: float
    error: float
    iterations: int
    computation_time_s: float
    feasible: bool
    alternatives: List[Tuple[Dict[str, float], float]] = None  # Alternative solutions


class InverseOptimizer:
    """
    Inverse optimization engine for parameter finding.

    Solves: Given target outcome, find parameters that achieve it.
    """

    def __init__(self, forward_model: Callable):
        """
        Initialize inverse optimizer.

        Args:
            forward_model: Function that takes parameters dict and returns outcome dict
                          signature: forward_model(params) -> {"outlet_temperature_c": 38.4, ...}
        """
        self.forward_model = forward_model
        self.evaluation_count = 0

    def optimize(
        self,
        base_parameters: Dict[str, float],
        target: TargetSpecification,
        variable_parameters: Dict[str, ParameterBounds],
        max_iterations: int = 1000,
        tolerance: float = 0.01,
    ) -> OptimizationResult:
        """
        Find parameters to achieve target outcome.

        Args:
            base_parameters: Current/baseline parameters
            target: Target specification (what to optimize for)
            variable_parameters: Which parameters can be varied and their bounds
            max_iterations: Maximum optimization iterations
            tolerance: Convergence tolerance

        Returns:
            OptimizationResult with optimal parameters
        """
        import time
        start_time = time.time()

        self.evaluation_count = 0
        best_params = dict(base_parameters)
        best_error = float('inf')
        iteration = 0

        # Use Nelder-Mead-like optimization (derivative-free)
        # Initial simplex
        simplex = self._create_initial_simplex(base_parameters, variable_parameters)

        for iteration in range(max_iterations):
            # Evaluate all simplex points
            evaluations = []
            for params in simplex:
                try:
                    outcome = self.forward_model(params)
                    predicted = outcome.get(target.parameter_name, 0)
                    error = self._calculate_error(predicted, target)
                    evaluations.append((params, predicted, error))
                    self.evaluation_count += 1
                except Exception as e:
                    evaluations.append((params, 0, float('inf')))

            # Sort by error
            evaluations.sort(key=lambda x: x[2])

            # Check convergence
            if evaluations[0][2] < best_error:
                best_error = evaluations[0][2]
                best_params = dict(evaluations[0][0])

            if best_error < tolerance:
                break

            # Reflection step (simplified)
            if len(simplex) > 1:
                simplex = self._reflect_simplex(
                    simplex,
                    [e[2] for e in evaluations],
                    variable_parameters
                )

        computation_time = time.time() - start_time

        # Verify solution
        try:
            outcome = self.forward_model(best_params)
            predicted_outcome = outcome.get(target.parameter_name, 0)
            final_error = self._calculate_error(predicted_outcome, target)
        except:
            predicted_outcome = 0
            final_error = float('inf')

        return OptimizationResult(
            success=best_error < tolerance * 10,
            target=target,
            optimal_parameters=best_params,
            predicted_outcome=predicted_outcome,
            error=final_error,
            iterations=iteration + 1,
            computation_time_s=computation_time,
            feasible=final_error < tolerance * 100,
        )

    def optimize_multi_objective(
        self,
        base_parameters: Dict[str, float],
        targets: List[TargetSpecification],
        variable_parameters: Dict[str, ParameterBounds],
        weights: Optional[Dict[str, float]] = None,
        max_iterations: int = 2000,
    ) -> OptimizationResult:
        """
        Optimize for multiple objectives simultaneously.

        Args:
            base_parameters: Current parameters
            targets: List of target specifications
            variable_parameters: Parameters that can vary
            weights: Weight for each objective (default: equal)
            max_iterations: Maximum iterations

        Returns:
            OptimizationResult (uses combined error metric)
        """
        if weights is None:
            weights = {t.parameter_name: 1.0 for t in targets}

        import time
        start_time = time.time()

        self.evaluation_count = 0
        best_params = dict(base_parameters)
        best_combined_error = float('inf')

        # Genetic algorithm-like approach for multi-objective
        population = self._create_population(base_parameters, variable_parameters, 20)

        for iteration in range(max_iterations):
            # Evaluate population
            fitness_scores = []
            for params in population:
                try:
                    outcome = self.forward_model(params)
                    combined_error = 0
                    for target in targets:
                        predicted = outcome.get(target.parameter_name, 0)
                        error = self._calculate_error(predicted, target)
                        weight = weights.get(target.parameter_name, 1.0)
                        combined_error += weight * error
                    fitness_scores.append((params, combined_error))
                    self.evaluation_count += 1
                except:
                    fitness_scores.append((params, float('inf')))

            # Select best
            fitness_scores.sort(key=lambda x: x[1])
            if fitness_scores[0][1] < best_combined_error:
                best_combined_error = fitness_scores[0][1]
                best_params = dict(fitness_scores[0][0])

            # Breeding (crossover)
            best_candidates = fitness_scores[:5]
            population = [p[0] for p in best_candidates]
            for _ in range(15):
                parent1, parent2 = best_candidates[0][0], best_candidates[1][0]
                child = self._crossover(parent1, parent2, variable_parameters)
                population.append(child)

            # Check convergence
            if best_combined_error < 0.01:
                break

        computation_time = time.time() - start_time

        # Verify solution
        try:
            outcome = self.forward_model(best_params)
            predicted = {t.parameter_name: outcome.get(t.parameter_name, 0) for t in targets}
        except:
            predicted = {t.parameter_name: 0 for t in targets}

        return OptimizationResult(
            success=best_combined_error < 0.1,
            target=targets[0],  # Return first target info
            optimal_parameters=best_params,
            predicted_outcome=None,  # Multi-objective
            error=best_combined_error,
            iterations=iteration + 1,
            computation_time_s=computation_time,
            feasible=best_combined_error < 1.0,
        )

    def _create_initial_simplex(
        self,
        base_parameters: Dict[str, float],
        variable_parameters: Dict[str, ParameterBounds],
    ) -> List[Dict[str, float]]:
        """Create initial simplex for Nelder-Mead"""
        simplex = [dict(base_parameters)]

        for param_name, bounds in variable_parameters.items():
            perturbation = dict(base_parameters)
            step = bounds.step_size if bounds.allow_continuous else (bounds.max_value - bounds.min_value) / 10
            perturbation[param_name] = min(
                bounds.max_value,
                max(bounds.min_value, base_parameters.get(param_name, bounds.min_value) + step)
            )
            simplex.append(perturbation)

        return simplex

    def _reflect_simplex(
        self,
        simplex: List[Dict[str, float]],
        errors: List[float],
        variable_parameters: Dict[str, ParameterBounds],
        alpha: float = 1.0,
    ) -> List[Dict[str, float]]:
        """Reflect simplex toward best point"""
        # Find worst point
        worst_idx = errors.index(max(errors))

        # Compute centroid of other points
        other_points = [p for i, p in enumerate(simplex) if i != worst_idx]
        centroid = {}
        for key in other_points[0].keys():
            centroid[key] = sum(p[key] for p in other_points) / len(other_points)

        # Reflect worst point
        new_point = {}
        for key, bounds in variable_parameters.items():
            if key in centroid and key in simplex[worst_idx]:
                reflected = centroid[key] + alpha * (centroid[key] - simplex[worst_idx][key])
                new_point[key] = max(bounds.min_value, min(bounds.max_value, reflected))
            else:
                new_point[key] = simplex[worst_idx].get(key, bounds.min_value)

        # Replace worst with reflected
        simplex[worst_idx] = new_point
        return simplex

    def _create_population(
        self,
        base_parameters: Dict[str, float],
        variable_parameters: Dict[str, ParameterBounds],
        population_size: int,
    ) -> List[Dict[str, float]]:
        """Create initial population for genetic algorithm"""
        import random
        population = [dict(base_parameters)]

        for _ in range(population_size - 1):
            individual = dict(base_parameters)
            for param_name, bounds in variable_parameters.items():
                individual[param_name] = random.uniform(bounds.min_value, bounds.max_value)
            population.append(individual)

        return population

    def _crossover(
        self,
        parent1: Dict[str, float],
        parent2: Dict[str, float],
        variable_parameters: Dict[str, ParameterBounds],
    ) -> Dict[str, float]:
        """Crossover two parents to create child"""
        import random
        child = {}
        for key in parent1.keys():
            if random.random() < 0.5:
                child[key] = parent1[key]
            else:
                child[key] = parent2[key]

            # Bounds check
            if key in variable_parameters:
                bounds = variable_parameters[key]
                child[key] = max(bounds.min_value, min(bounds.max_value, child[key]))

        return child

    def _calculate_error(
        self,
        predicted: float,
        target: TargetSpecification,
    ) -> float:
        """Calculate error metric"""
        if target.objective == OptimizationObjective.TARGET:
            return abs(predicted - target.target_value)
        elif target.objective == OptimizationObjective.MINIMIZE:
            return predicted  # Lower is better
        elif target.objective == OptimizationObjective.MAXIMIZE:
            return -predicted  # Higher is better
        return 0


def create_temperature_target_optimizer(forward_model: Callable) -> InverseOptimizer:
    """Create optimizer for temperature targeting"""
    return InverseOptimizer(forward_model)


def create_pressure_target_optimizer(forward_model: Callable) -> InverseOptimizer:
    """Create optimizer for pressure targeting"""
    return InverseOptimizer(forward_model)


def create_flow_target_optimizer(forward_model: Callable) -> InverseOptimizer:
    """Create optimizer for flow rate targeting"""
    return InverseOptimizer(forward_model)
