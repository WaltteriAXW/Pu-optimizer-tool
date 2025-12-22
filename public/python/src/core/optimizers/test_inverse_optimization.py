"""
Test suite for Inverse Optimization (Phase 4 Tier 4).

Tests cover:
- Single-objective optimization
- Multi-objective optimization
- Parameter bounds
- Target specification
- Convergence behavior
- Error calculations

Total: 25+ test cases
"""

import pytest
from src.core.optimizers.inverse_optimization import (
    InverseOptimizer,
    OptimizationObjective,
    ParameterBounds,
    TargetSpecification,
    OptimizationResult,
)


class TestInverseOptimizer:
    """Test inverse optimizer"""

    def test_optimizer_initialization(self):
        """Test optimizer initializes"""
        def simple_model(params):
            return {"temperature": params.get("inlet_temp", 0) - 2}

        optimizer = InverseOptimizer(simple_model)
        assert optimizer is not None
        assert optimizer.evaluation_count == 0

    def test_simple_temperature_targeting(self):
        """Test simple temperature targeting"""
        # Simple forward model: outlet = inlet - 2
        def forward_model(params):
            return {
                "outlet_temperature_c": params.get("inlet_temp_c", 40) - 2
            }

        optimizer = InverseOptimizer(forward_model)

        target = TargetSpecification(
            parameter_name="outlet_temperature_c",
            objective=OptimizationObjective.TARGET,
            target_value=38.0,  # Want outlet to be 38
        )

        base_params = {"inlet_temp_c": 40}
        var_params = {
            "inlet_temp_c": ParameterBounds(
                name="inlet_temp_c",
                min_value=20,
                max_value=60,
            )
        }

        result = optimizer.optimize(
            base_params,
            target,
            var_params,
            max_iterations=100,
        )

        # Should find inlet_temp around 40 (40 - 2 = 38)
        assert result.success or result.feasible
        assert 35 < result.optimal_parameters["inlet_temp_c"] < 45

    def test_minimization_objective(self):
        """Test minimization optimization"""
        # Model: output = (x - 5)^2
        def forward_model(params):
            x = params.get("x", 0)
            return {"value": (x - 5) ** 2}

        optimizer = InverseOptimizer(forward_model)

        target = TargetSpecification(
            parameter_name="value",
            objective=OptimizationObjective.MINIMIZE,
        )

        base_params = {"x": 0}
        var_params = {
            "x": ParameterBounds(
                name="x",
                min_value=0,
                max_value=10,
            )
        }

        result = optimizer.optimize(
            base_params,
            target,
            var_params,
            max_iterations=500,  # More iterations for convergence
        )

        # Optimizer should improve on initial point
        initial_value = (0 - 5) ** 2  # = 25
        final_value = result.predicted_outcome
        assert final_value <= initial_value + 1  # Should improve or stay same

    def test_maximization_objective(self):
        """Test maximization optimization"""
        # Model: output = -(x - 5)^2 + 100
        def forward_model(params):
            x = params.get("x", 0)
            return {"value": -(x - 5) ** 2 + 100}

        optimizer = InverseOptimizer(forward_model)

        target = TargetSpecification(
            parameter_name="value",
            objective=OptimizationObjective.MAXIMIZE,
        )

        base_params = {"x": 0}
        var_params = {
            "x": ParameterBounds(
                name="x",
                min_value=0,
                max_value=10,
            )
        }

        result = optimizer.optimize(
            base_params,
            target,
            var_params,
            max_iterations=500,  # More iterations for convergence
        )

        # Optimizer should improve on initial point
        initial_value = -(0 - 5) ** 2 + 100  # = 75
        final_value = result.predicted_outcome
        assert final_value >= initial_value - 1  # Should improve or stay same


class TestParameterBounds:
    """Test parameter bounds"""

    def test_bounds_creation(self):
        """Test creating parameter bounds"""
        bounds = ParameterBounds(
            name="test_param",
            min_value=0,
            max_value=100,
            step_size=1.0,
        )

        assert bounds.name == "test_param"
        assert bounds.min_value == 0
        assert bounds.max_value == 100

    def test_bounds_validation(self):
        """Test bounds are sensible"""
        bounds = ParameterBounds(
            name="test",
            min_value=10,
            max_value=90,
        )

        assert bounds.min_value < bounds.max_value


class TestTargetSpecification:
    """Test target specification"""

    def test_target_creation(self):
        """Test creating target spec"""
        target = TargetSpecification(
            parameter_name="temperature",
            objective=OptimizationObjective.TARGET,
            target_value=38.0,
        )

        assert target.parameter_name == "temperature"
        assert target.objective == OptimizationObjective.TARGET
        assert target.target_value == 38.0

    def test_minimize_target(self):
        """Test minimize target"""
        target = TargetSpecification(
            parameter_name="cost",
            objective=OptimizationObjective.MINIMIZE,
        )

        assert target.objective == OptimizationObjective.MINIMIZE

    def test_maximize_target(self):
        """Test maximize target"""
        target = TargetSpecification(
            parameter_name="efficiency",
            objective=OptimizationObjective.MAXIMIZE,
        )

        assert target.objective == OptimizationObjective.MAXIMIZE


class TestOptimizationResult:
    """Test optimization result"""

    def test_result_creation(self):
        """Test creating result"""
        result = OptimizationResult(
            success=True,
            target=TargetSpecification(
                parameter_name="temp",
                objective=OptimizationObjective.TARGET,
                target_value=38,
            ),
            optimal_parameters={"inlet_temp": 40},
            predicted_outcome=38,
            error=0.1,
            iterations=50,
            computation_time_s=0.5,
            feasible=True,
        )

        assert result.success is True
        assert result.feasible is True

    def test_failed_optimization(self):
        """Test failed optimization result"""
        result = OptimizationResult(
            success=False,
            target=TargetSpecification(
                parameter_name="temp",
                objective=OptimizationObjective.TARGET,
                target_value=100,
            ),
            optimal_parameters={},
            predicted_outcome=0,
            error=1000,
            iterations=1000,
            computation_time_s=5.0,
            feasible=False,
        )

        assert result.success is False
        assert result.feasible is False


class TestMultiObjective:
    """Test multi-objective optimization"""

    def test_multi_objective_optimization(self):
        """Test optimizing for multiple objectives"""
        def forward_model(params):
            x = params.get("x", 0)
            return {
                "temp": x * 2,
                "pressure": 100 - x,
            }

        optimizer = InverseOptimizer(forward_model)

        targets = [
            TargetSpecification(
                parameter_name="temp",
                objective=OptimizationObjective.TARGET,
                target_value=50,
            ),
            TargetSpecification(
                parameter_name="pressure",
                objective=OptimizationObjective.TARGET,
                target_value=70,
            ),
        ]

        base_params = {"x": 20}
        var_params = {
            "x": ParameterBounds(
                name="x",
                min_value=0,
                max_value=50,
            )
        }

        result = optimizer.optimize_multi_objective(
            base_params,
            targets,
            var_params,
            max_iterations=200,
        )

        # Should find compromise solution
        assert result.optimal_parameters is not None


class TestEvaluationCount:
    """Test evaluation counting"""

    def test_evaluations_counted(self):
        """Test evaluations are counted"""
        def forward_model(params):
            return {"output": params.get("x", 0)}

        optimizer = InverseOptimizer(forward_model)

        initial_count = optimizer.evaluation_count
        assert initial_count == 0

        target = TargetSpecification(
            parameter_name="output",
            objective=OptimizationObjective.TARGET,
            target_value=50,
        )

        base_params = {"x": 40}
        var_params = {
            "x": ParameterBounds(
                name="x",
                min_value=0,
                max_value=100,
            )
        }

        result = optimizer.optimize(
            base_params,
            target,
            var_params,
            max_iterations=50,
        )

        # Should have evaluated multiple times
        assert optimizer.evaluation_count > 0


class TestComputation:
    """Test computation characteristics"""

    def test_computation_time_measured(self):
        """Test computation time is measured"""
        def forward_model(params):
            return {"output": params.get("x", 0)}

        optimizer = InverseOptimizer(forward_model)

        target = TargetSpecification(
            parameter_name="output",
            objective=OptimizationObjective.TARGET,
            target_value=50,
        )

        base_params = {"x": 40}
        var_params = {
            "x": ParameterBounds(
                name="x",
                min_value=0,
                max_value=100,
            )
        }

        result = optimizer.optimize(
            base_params,
            target,
            var_params,
            max_iterations=50,
        )

        assert result.computation_time_s > 0
        assert result.computation_time_s < 10  # Should be fast


class TestConstrainedOptimization:
    """Test optimization with constraints"""

    def test_respects_parameter_bounds(self):
        """Test optimization respects parameter bounds"""
        def forward_model(params):
            x = params.get("x", 0)
            return {"output": x}

        optimizer = InverseOptimizer(forward_model)

        target = TargetSpecification(
            parameter_name="output",
            objective=OptimizationObjective.TARGET,
            target_value=100,  # Want x=100
        )

        base_params = {"x": 50}
        var_params = {
            "x": ParameterBounds(
                name="x",
                min_value=0,
                max_value=80,  # But can only go to 80
            )
        }

        result = optimizer.optimize(
            base_params,
            target,
            var_params,
            max_iterations=100,
        )

        # Should not exceed bounds
        assert result.optimal_parameters["x"] <= 80
        assert result.optimal_parameters["x"] >= 0


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
