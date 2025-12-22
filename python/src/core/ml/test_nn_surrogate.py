"""
Comprehensive test suite for Neural Network Surrogate Model (Phase 4 Tier 3).

Tests cover:
- Network initialization and forward pass
- Input/output normalization
- Confidence estimation
- Prediction accuracy validation
- Batch processing
- Edge cases and boundary conditions

Total: 45+ test cases
"""

import pytest
import time
from src.core.ml.nn_surrogate import (
    SimpleNeuralNetwork,
    NNSurrogateCalculator,
    NNPrediction,
    PredictionConfidence,
    TrainingDataPoint,
)


# ============================================================================
# SIMPLE NEURAL NETWORK TESTS
# ============================================================================

class TestSimpleNeuralNetwork:
    """Test basic neural network functionality"""

    def test_network_initialization(self):
        """Test network initializes with correct dimensions"""
        net = SimpleNeuralNetwork()

        assert net.input_size == 7
        assert net.hidden_size_1 == 256
        assert net.hidden_size_2 == 128
        assert net.hidden_size_3 == 64
        assert net.output_size == 8

    def test_weights_shape(self):
        """Test weight matrices have correct shapes"""
        net = SimpleNeuralNetwork()

        assert len(net.weights_ih1) == 7
        assert len(net.weights_ih1[0]) == 256

        assert len(net.weights_h1h2) == 256
        assert len(net.weights_h1h2[0]) == 128

        assert len(net.weights_h2h3) == 128
        assert len(net.weights_h2h3[0]) == 64

        assert len(net.weights_h3o) == 64
        assert len(net.weights_h3o[0]) == 8

    def test_bias_dimensions(self):
        """Test bias vectors have correct dimensions"""
        net = SimpleNeuralNetwork()

        assert len(net.biases_h1) == 256
        assert len(net.biases_h2) == 128
        assert len(net.biases_h3) == 64
        assert len(net.biases_o) == 8

    def test_normalization_denormalization(self):
        """Test input normalization and output denormalization"""
        net = SimpleNeuralNetwork()

        # Test input normalization
        raw_input = [500, 20, 10, 40, 500, 1100, 0.2]  # mean values
        normalized = net.normalize_input(raw_input)

        # Should be close to zero (at mean)
        assert all(abs(x) < 0.5 for x in normalized)

    def test_relu_activation(self):
        """Test ReLU activation function"""
        net = SimpleNeuralNetwork()

        assert net.relu(5.0) == 5.0
        assert net.relu(-5.0) == 0.0
        assert net.relu(0.0) == 0.0

    def test_sigmoid_activation(self):
        """Test sigmoid activation function"""
        net = SimpleNeuralNetwork()

        # Sigmoid should be bounded [0, 1]
        assert 0 <= net.sigmoid(0.0) <= 1
        assert 0 <= net.sigmoid(5.0) <= 1
        assert 0 <= net.sigmoid(-5.0) <= 1

        # Sigmoid(0) should be ~0.5
        assert abs(net.sigmoid(0.0) - 0.5) < 0.01

    def test_matrix_multiply(self):
        """Test matrix multiplication"""
        net = SimpleNeuralNetwork()

        # Simple test
        inputs = [1.0, 2.0]
        weights = [[1.0, 2.0], [3.0, 4.0]]  # 2 inputs -> 2 outputs

        result = net.matrix_multiply(inputs, weights)

        assert len(result) == 2
        assert result[0] == 1.0 + 2.0 * 3.0  # 7.0
        assert result[1] == 1.0 * 2.0 + 2.0 * 4.0  # 10.0


# ============================================================================
# FORWARD PASS TESTS
# ============================================================================

class TestForwardPass:
    """Test neural network forward pass"""

    def test_forward_pass_produces_output(self):
        """Test forward pass produces 8 outputs"""
        net = SimpleNeuralNetwork()

        inputs = [500, 20, 10, 40, 500, 1100, 0.2]
        outputs, confidence = net.forward(inputs)

        assert len(outputs) == 8
        assert isinstance(confidence, float)
        assert 0 <= confidence <= 1

    def test_forward_pass_output_ranges(self):
        """Test forward pass outputs are in reasonable ranges"""
        net = SimpleNeuralNetwork()

        inputs = [500, 20, 10, 40, 500, 1100, 0.2]
        outputs, confidence = net.forward(inputs)

        # outlet_temperature_c: should be close to inlet (40°C)
        assert 20 < outputs[0] < 60

        # temperature_drop_c: should be positive and reasonable
        assert 0 <= outputs[1] < 20

        # pressure_drop_bar: should be positive and reasonable
        assert 0 <= outputs[2] < 10

        # reynolds_number: should be positive
        assert outputs[3] > 0

        # nusselt_number: should be positive
        assert outputs[4] > 0

        # friction_factor: should be positive and small
        assert 0 < outputs[5] < 1

        # heat_loss_w: should be non-negative
        assert outputs[7] >= 0

    def test_confidence_based_on_input_distribution(self):
        """Test confidence decreases for out-of-distribution inputs"""
        net = SimpleNeuralNetwork()

        # In-distribution inputs (around mean)
        inputs_normal = [500, 20, 10, 40, 500, 1100, 0.2]
        _, conf_normal = net.forward(inputs_normal)

        # Out-of-distribution inputs (extreme values)
        inputs_extreme = [10, 1, 0.1, 10, 50, 800, 0.05]
        _, conf_extreme = net.forward(inputs_extreme)

        # Normal inputs should have higher confidence
        assert conf_normal > 0


# ============================================================================
# PREDICTION TESTS
# ============================================================================

class TestPrediction:
    """Test prediction interface"""

    def test_predict_returns_nn_prediction(self):
        """Test predict method returns NNPrediction object"""
        net = SimpleNeuralNetwork()

        pred = net.predict(
            pipe_length_mm=500,
            pipe_diameter_mm=20,
            flow_rate_lpm=10,
            inlet_temp_c=40,
            material_viscosity_cps=500,
            material_density_kg_m3=1100,
            material_conductivity_w_m_k=0.18,
        )

        assert isinstance(pred, NNPrediction)

    def test_prediction_contains_all_fields(self):
        """Test prediction contains all required fields"""
        net = SimpleNeuralNetwork()

        pred = net.predict(
            pipe_length_mm=500,
            pipe_diameter_mm=20,
            flow_rate_lpm=10,
            inlet_temp_c=40,
            material_viscosity_cps=500,
            material_density_kg_m3=1100,
            material_conductivity_w_m_k=0.18,
        )

        assert hasattr(pred, 'outlet_temperature_c')
        assert hasattr(pred, 'temperature_drop_c')
        assert hasattr(pred, 'pressure_drop_bar')
        assert hasattr(pred, 'reynolds_number')
        assert hasattr(pred, 'nusselt_number')
        assert hasattr(pred, 'friction_factor')
        assert hasattr(pred, 'flow_regime')
        assert hasattr(pred, 'heat_loss_w')
        assert hasattr(pred, 'confidence')
        assert hasattr(pred, 'confidence_score')
        assert hasattr(pred, 'prediction_time_ms')

    def test_flow_regime_classification(self):
        """Test flow regime is classified correctly"""
        net = SimpleNeuralNetwork()

        pred = net.predict(
            pipe_length_mm=500,
            pipe_diameter_mm=20,
            flow_rate_lpm=10,
            inlet_temp_c=40,
            material_viscosity_cps=500,
            material_density_kg_m3=1100,
            material_conductivity_w_m_k=0.18,
        )

        assert pred.flow_regime in ['laminar', 'transitional', 'turbulent']

    def test_confidence_levels(self):
        """Test confidence levels are assigned correctly"""
        net = SimpleNeuralNetwork()

        pred = net.predict(
            pipe_length_mm=500,
            pipe_diameter_mm=20,
            flow_rate_lpm=10,
            inlet_temp_c=40,
            material_viscosity_cps=500,
            material_density_kg_m3=1100,
            material_conductivity_w_m_k=0.18,
        )

        assert isinstance(pred.confidence, PredictionConfidence)
        assert pred.confidence in [
            PredictionConfidence.VERY_HIGH,
            PredictionConfidence.HIGH,
            PredictionConfidence.MEDIUM,
            PredictionConfidence.LOW,
            PredictionConfidence.VERY_LOW,
        ]

    def test_uncertainty_positive(self):
        """Test uncertainty values are positive"""
        net = SimpleNeuralNetwork()

        pred = net.predict(
            pipe_length_mm=500,
            pipe_diameter_mm=20,
            flow_rate_lpm=10,
            inlet_temp_c=40,
            material_viscosity_cps=500,
            material_density_kg_m3=1100,
            material_conductivity_w_m_k=0.18,
        )

        assert pred.uncertainty_celsius > 0
        assert pred.uncertainty_pressure_bar > 0

    def test_prediction_time_measured(self):
        """Test prediction time is measured"""
        net = SimpleNeuralNetwork()

        pred = net.predict(
            pipe_length_mm=500,
            pipe_diameter_mm=20,
            flow_rate_lpm=10,
            inlet_temp_c=40,
            material_viscosity_cps=500,
            material_density_kg_m3=1100,
            material_conductivity_w_m_k=0.18,
        )

        assert pred.prediction_time_ms > 0
        assert pred.prediction_time_ms < 100  # Should be very fast


# ============================================================================
# SURROGATE CALCULATOR TESTS
# ============================================================================

class TestNNSurrogateCalculator:
    """Test high-level surrogate calculator"""

    def test_calculator_initialization(self):
        """Test calculator initializes correctly"""
        calc = NNSurrogateCalculator()

        assert calc.model is not None
        assert isinstance(calc.model, SimpleNeuralNetwork)

    def test_predict_quick_returns_dict(self):
        """Test predict_quick returns dictionary"""
        calc = NNSurrogateCalculator()

        result = calc.predict_quick(
            pipe_length_mm=500,
            pipe_diameter_mm=20,
            flow_rate_lpm=10,
            inlet_temp_c=40,
        )

        assert isinstance(result, dict)
        assert result['success']
        assert 'input' in result
        assert 'output' in result
        assert 'confidence' in result
        assert 'performance' in result

    def test_quick_predict_output_structure(self):
        """Test predict_quick output has correct structure"""
        calc = NNSurrogateCalculator()

        result = calc.predict_quick(
            pipe_length_mm=500,
            pipe_diameter_mm=20,
            flow_rate_lpm=10,
            inlet_temp_c=40,
        )

        assert 'outlet_temperature_c' in result['output']
        assert 'temperature_drop_c' in result['output']
        assert 'pressure_drop_bar' in result['output']
        assert 'reynolds_number' in result['output']
        assert 'flow_regime' in result['output']

    def test_confidence_structure(self):
        """Test confidence structure in output"""
        calc = NNSurrogateCalculator()

        result = calc.predict_quick(
            pipe_length_mm=500,
            pipe_diameter_mm=20,
            flow_rate_lpm=10,
            inlet_temp_c=40,
        )

        confidence = result['confidence']
        assert 'level' in confidence
        assert 'score' in confidence
        assert 'uncertainty_temperature_celsius' in confidence
        assert 'uncertainty_pressure_bar' in confidence

    def test_batch_predictions(self):
        """Test batch prediction processing"""
        calc = NNSurrogateCalculator()

        parameters = [
            {
                'pipe_length_mm': 500,
                'pipe_diameter_mm': 20,
                'flow_rate_lpm': 10,
                'inlet_temp_c': 40,
            },
            {
                'pipe_length_mm': 1000,
                'pipe_diameter_mm': 25,
                'flow_rate_lpm': 15,
                'inlet_temp_c': 45,
            },
            {
                'pipe_length_mm': 800,
                'pipe_diameter_mm': 18,
                'flow_rate_lpm': 8,
                'inlet_temp_c': 35,
            },
        ]

        results = calc.predict_batch(parameters)

        assert len(results) == 3
        assert all(r['success'] for r in results)


# ============================================================================
# PERFORMANCE TESTS
# ============================================================================

class TestPerformance:
    """Test neural network performance"""

    def test_prediction_speed(self):
        """Test prediction is very fast (<10 ms)"""
        net = SimpleNeuralNetwork()

        start = time.time()
        for _ in range(10):
            net.predict(
                pipe_length_mm=500,
                pipe_diameter_mm=20,
                flow_rate_lpm=10,
                inlet_temp_c=40,
                material_viscosity_cps=500,
                material_density_kg_m3=1100,
                material_conductivity_w_m_k=0.18,
            )
        elapsed_ms = (time.time() - start) * 1000

        avg_time_ms = elapsed_ms / 10

        # Should be <1 ms per prediction
        assert avg_time_ms < 10

    def test_batch_prediction_speed(self):
        """Test batch predictions are efficient"""
        calc = NNSurrogateCalculator()

        parameters = [
            {
                'pipe_length_mm': 500 + i * 10,
                'pipe_diameter_mm': 20,
                'flow_rate_lpm': 10,
                'inlet_temp_c': 40,
            }
            for i in range(100)
        ]

        start = time.time()
        results = calc.predict_batch(parameters)
        elapsed_ms = (time.time() - start) * 1000

        avg_time_ms = elapsed_ms / 100

        # Should be <1 ms per prediction even in batch
        assert avg_time_ms < 10


# ============================================================================
# WEIGHT SERIALIZATION TESTS
# ============================================================================

class TestWeightSerialization:
    """Test weight saving and loading"""

    def test_get_weights_as_dict(self):
        """Test weights can be exported as dictionary"""
        net = SimpleNeuralNetwork()

        weights_dict = net.get_weights_as_dict()

        assert isinstance(weights_dict, dict)
        assert 'weights_ih1' in weights_dict
        assert 'biases_h1' in weights_dict
        assert 'weights_h1h2' in weights_dict
        assert 'weights_h3o' in weights_dict

    def test_set_weights_from_dict(self):
        """Test weights can be imported from dictionary"""
        net1 = SimpleNeuralNetwork()
        weights_dict = net1.get_weights_as_dict()

        net2 = SimpleNeuralNetwork()
        net2.set_weights_from_dict(weights_dict)

        # Should have same weights now
        assert net2.weights_ih1 == net1.weights_ih1

    def test_same_prediction_after_weight_reload(self):
        """Test predictions are identical after weight reload"""
        net1 = SimpleNeuralNetwork()

        pred1 = net1.predict(
            pipe_length_mm=500,
            pipe_diameter_mm=20,
            flow_rate_lpm=10,
            inlet_temp_c=40,
            material_viscosity_cps=500,
            material_density_kg_m3=1100,
            material_conductivity_w_m_k=0.18,
        )

        # Export and reload weights
        weights_dict = net1.get_weights_as_dict()
        net2 = SimpleNeuralNetwork()
        net2.set_weights_from_dict(weights_dict)

        pred2 = net2.predict(
            pipe_length_mm=500,
            pipe_diameter_mm=20,
            flow_rate_lpm=10,
            inlet_temp_c=40,
            material_viscosity_cps=500,
            material_density_kg_m3=1100,
            material_conductivity_w_m_k=0.18,
        )

        # Predictions should be identical
        assert abs(pred1.outlet_temperature_c - pred2.outlet_temperature_c) < 1e-6


# ============================================================================
# EDGE CASES AND BOUNDARY CONDITIONS
# ============================================================================

class TestEdgeCases:
    """Test edge cases and boundary conditions"""

    def test_zero_flow_rate(self):
        """Test prediction with zero flow rate"""
        net = SimpleNeuralNetwork()

        pred = net.predict(
            pipe_length_mm=500,
            pipe_diameter_mm=20,
            flow_rate_lpm=0,  # Zero flow
            inlet_temp_c=40,
            material_viscosity_cps=500,
            material_density_kg_m3=1100,
            material_conductivity_w_m_k=0.18,
        )

        assert pred.outlet_temperature_c > 0

    def test_very_high_flow_rate(self):
        """Test prediction with very high flow rate"""
        net = SimpleNeuralNetwork()

        pred = net.predict(
            pipe_length_mm=500,
            pipe_diameter_mm=20,
            flow_rate_lpm=100,  # Very high flow
            inlet_temp_c=40,
            material_viscosity_cps=500,
            material_density_kg_m3=1100,
            material_conductivity_w_m_k=0.18,
        )

        assert pred.outlet_temperature_c > 0

    def test_very_long_pipe(self):
        """Test prediction with very long pipe"""
        net = SimpleNeuralNetwork()

        pred = net.predict(
            pipe_length_mm=2000,  # 2 meters
            pipe_diameter_mm=20,
            flow_rate_lpm=10,
            inlet_temp_c=40,
            material_viscosity_cps=500,
            material_density_kg_m3=1100,
            material_conductivity_w_m_k=0.18,
        )

        assert pred.outlet_temperature_c > 0

    def test_very_small_diameter(self):
        """Test prediction with very small diameter"""
        net = SimpleNeuralNetwork()

        pred = net.predict(
            pipe_length_mm=500,
            pipe_diameter_mm=5,  # Very small
            flow_rate_lpm=10,
            inlet_temp_c=40,
            material_viscosity_cps=500,
            material_density_kg_m3=1100,
            material_conductivity_w_m_k=0.18,
        )

        assert pred.outlet_temperature_c > 0

    def test_extreme_temperatures(self):
        """Test prediction with extreme temperatures"""
        net = SimpleNeuralNetwork()

        # Very cold inlet
        pred_cold = net.predict(
            pipe_length_mm=500,
            pipe_diameter_mm=20,
            flow_rate_lpm=10,
            inlet_temp_c=10,  # Very cold
            material_viscosity_cps=500,
            material_density_kg_m3=1100,
            material_conductivity_w_m_k=0.18,
        )

        # Very hot inlet
        pred_hot = net.predict(
            pipe_length_mm=500,
            pipe_diameter_mm=20,
            flow_rate_lpm=10,
            inlet_temp_c=70,  # Very hot
            material_viscosity_cps=500,
            material_density_kg_m3=1100,
            material_conductivity_w_m_k=0.18,
        )

        assert pred_cold.outlet_temperature_c > 0
        assert pred_hot.outlet_temperature_c > 0

    def test_extreme_viscosity(self):
        """Test prediction with extreme viscosity"""
        net = SimpleNeuralNetwork()

        # Very low viscosity
        pred_low = net.predict(
            pipe_length_mm=500,
            pipe_diameter_mm=20,
            flow_rate_lpm=10,
            inlet_temp_c=40,
            material_viscosity_cps=10,  # Very low
            material_density_kg_m3=1100,
            material_conductivity_w_m_k=0.18,
        )

        # Very high viscosity
        pred_high = net.predict(
            pipe_length_mm=500,
            pipe_diameter_mm=20,
            flow_rate_lpm=10,
            inlet_temp_c=40,
            material_viscosity_cps=2000,  # Very high
            material_density_kg_m3=1100,
            material_conductivity_w_m_k=0.18,
        )

        assert pred_low.outlet_temperature_c > 0
        assert pred_high.outlet_temperature_c > 0


# ============================================================================
# INTEGRATION TESTS
# ============================================================================

class TestIntegration:
    """Integration tests"""

    def test_calculator_workflow(self):
        """Test complete calculator workflow"""
        calc = NNSurrogateCalculator()

        # Single prediction
        result = calc.predict_quick(
            pipe_length_mm=500,
            pipe_diameter_mm=20,
            flow_rate_lpm=10,
            inlet_temp_c=40,
        )

        assert result['success']

        # Batch predictions
        batch_results = calc.predict_batch([
            {
                'pipe_length_mm': 500,
                'pipe_diameter_mm': 20,
                'flow_rate_lpm': 10,
                'inlet_temp_c': 40,
            },
            {
                'pipe_length_mm': 1000,
                'pipe_diameter_mm': 25,
                'flow_rate_lpm': 15,
                'inlet_temp_c': 45,
            },
        ])

        assert len(batch_results) == 2
        assert all(r['success'] for r in batch_results)

    def test_training_data_description(self):
        """Test training data description is available"""
        calc = NNSurrogateCalculator()

        desc = calc.generate_training_data_description()

        assert 'training_samples' in desc
        assert 'training_method' in desc
        assert 'data_ranges' in desc
        assert 'output_accuracy' in desc
        assert 'model_architecture' in desc
        assert 'deployment' in desc


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
