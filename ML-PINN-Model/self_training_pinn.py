"""
Self-Training Physics-Informed Neural Network
Combines prediction and online learning in a single system
"""

import json
import numpy as np
from datetime import datetime
from pathlib import Path
import os


class SelfTrainingPINN:
    """
    Physics-Informed Neural Network with online learning capability
    Can predict and learn from feedback simultaneously
    """
    
    def __init__(self, input_dim=6, hidden_layers=[32, 16], output_targets=['pressure', 'reynolds', 'velocity'],
                 learning_rate=0.001, physics_weight=0.3, model_path='pinn_model.json'):
        """
        Initialize self-training PINN
        
        Args:
            input_dim: Number of input features
            hidden_layers: List of hidden layer sizes
            output_targets: List of output target names
            learning_rate: Learning rate for online learning
            physics_weight: Weight for physics loss (0-1)
            model_path: Path to save/load model
        """
        self.input_dim = input_dim
        self.hidden_layers = hidden_layers
        self.output_targets = output_targets
        self.learning_rate = learning_rate
        self.physics_weight = physics_weight
        self.model_path = model_path
        
        # Training statistics
        self.training_count = 0
        self.total_error = 0.0
        self.feedback_history = []
        
        # Try to load existing model
        if os.path.exists(model_path):
            self.load_model(model_path)
        else:
            self._initialize_new_model()
    
    def _initialize_new_model(self):
        """Initialize new model with random weights"""
        print(f"Initializing new model: [{self.input_dim}] → {self.hidden_layers} → [1] per target")
        
        self.models = {}
        for target in self.output_targets:
            self.models[target] = self._create_network()
        
        self.metadata = {
            'version': '2.1-selftraining',
            'created': datetime.now().isoformat(),
            'training_count': 0,
            'input_dim': self.input_dim,
            'hidden_layers': self.hidden_layers,
            'learning_rate': self.learning_rate,
            'physics_weight': self.physics_weight
        }
    
    def _create_network(self):
        """Create a single neural network"""
        weights = []
        biases = []
        
        layer_sizes = [self.input_dim] + self.hidden_layers + [1]
        for i in range(len(layer_sizes) - 1):
            # Xavier initialization
            w = np.random.randn(layer_sizes[i+1], layer_sizes[i]) * np.sqrt(2.0 / layer_sizes[i])
            b = np.zeros((layer_sizes[i+1], 1))
            weights.append(w)
            biases.append(b)
        
        return {'weights': weights, 'biases': biases}
    
    def _forward(self, x, model):
        """Forward pass through network"""
        x = x.reshape(-1, 1)
        activations = [x]
        
        # Hidden layers with tanh
        for i in range(len(model['weights']) - 1):
            x = np.dot(model['weights'][i], x) + model['biases'][i]
            activations.append(x)
            x = np.tanh(x)
            activations.append(x)
        
        # Output layer (linear)
        x = np.dot(model['weights'][-1], x) + model['biases'][-1]
        activations.append(x)
        
        return x, activations
    
    def _backward(self, x, y_true, activations, model):
        """Backward pass - compute gradients"""
        # Output layer gradient
        dz = activations[-1] - y_true.reshape(-1, 1)
        
        weight_grads = []
        bias_grads = []
        
        # Backpropagate through layers
        for i in range(len(model['weights']) - 1, -1, -1):
            if i == 0:
                a_prev = activations[0]
            else:
                a_prev = activations[2*i]
            
            dw = np.dot(dz, a_prev.T)
            db = dz
            
            weight_grads.insert(0, dw)
            bias_grads.insert(0, db)
            
            # Propagate gradient to previous layer
            if i > 0:
                dz = np.dot(model['weights'][i].T, dz)
                # Apply tanh derivative
                dz = dz * (1 - np.tanh(activations[2*i - 1]) ** 2)
        
        return weight_grads, bias_grads
    
    def normalize_inputs(self, pipe_length, pipe_diameter, temperature, flow_rate, viscosity, density):
        """Normalize inputs to [0, 1] range"""
        normalized = [
            (pipe_length - 50) / (800 - 50),
            (pipe_diameter - 5) / (60 - 5),
            (temperature - 10) / (60 - 10),
            (flow_rate - 2) / (20 - 2),
            (viscosity - 350) / (850 - 350),
            (density - 1120) / 1.0 if density != 1120 else 0.0
        ]
        return np.array(normalized)
    
    def denormalize_outputs(self, outputs):
        """Denormalize outputs from [0, 1] range to physical units"""
        return {
            'pressure': float(outputs[0] * (7.99 - 1.01) + 1.01),
            'reynolds': float(outputs[1] * (547 - 1) + 1),
            'velocity': float(outputs[2] * (16.98 - 0.01) + 0.01)
        }
    
    def normalize_output(self, value, target_type):
        """Normalize a single output value"""
        ranges = {
            'pressure': (1.01, 7.99),
            'reynolds': (1, 547),
            'velocity': (0.01, 16.98)
        }
        min_val, max_val = ranges[target_type]
        return (value - min_val) / (max_val - min_val)
    
    def predict(self, pipe_length, pipe_diameter, temperature, flow_rate, viscosity, density):
        """
        Make prediction for given inputs
        
        Returns:
            dict with predictions, confidence, physics check, recommendations
        """
        # Normalize inputs
        x_norm = self.normalize_inputs(pipe_length, pipe_diameter, temperature, 
                                       flow_rate, viscosity, density)
        
        # Get predictions for each target
        predictions_norm = []
        for target in self.output_targets:
            pred, _ = self._forward(x_norm, self.models[target])
            predictions_norm.append(pred[0, 0])
        
        # Denormalize
        predictions = self.denormalize_outputs(predictions_norm)
        
        # Calculate confidence
        confidence = self._calculate_confidence(pipe_length, pipe_diameter, temperature,
                                               flow_rate, viscosity, density)
        
        # Physics validation
        physics_check = self._physics_validation(
            pipe_length, pipe_diameter, temperature, flow_rate, 
            viscosity, density, predictions['pressure']
        )
        
        # Generate recommendations
        recommendations = self._generate_recommendations(predictions, confidence, physics_check)
        
        return {
            'predictions': {
                'required_pressure_bar': predictions['pressure'],
                'reynolds_number': predictions['reynolds'],
                'velocity_ms': predictions['velocity']
            },
            'confidence': confidence,
            'physics_check': physics_check,
            'recommendations': recommendations,
            'training_count': self.training_count,
            'model_version': self.metadata.get('version', 'unknown')
        }
    
    def train_from_feedback(self, pipe_length, pipe_diameter, temperature, flow_rate, 
                           viscosity, density, actual_pressure, actual_reynolds=None, 
                           actual_velocity=None):
        """
        Update model based on actual measurements (online learning)
        
        Args:
            pipe_length, pipe_diameter, temperature, flow_rate, viscosity, density: Input parameters
            actual_pressure: Measured pressure (required)
            actual_reynolds: Measured Reynolds (optional)
            actual_velocity: Measured velocity (optional)
            
        Returns:
            dict with update statistics
        """
        # Normalize inputs
        x_norm = self.normalize_inputs(pipe_length, pipe_diameter, temperature,
                                       flow_rate, viscosity, density)
        
        # Store feedback
        feedback_entry = {
            'timestamp': datetime.now().isoformat(),
            'inputs': {
                'pipe_length': pipe_length,
                'pipe_diameter': pipe_diameter,
                'temperature': temperature,
                'flow_rate': flow_rate,
                'viscosity': viscosity,
                'density': density
            },
            'actual_values': {
                'pressure': actual_pressure,
                'reynolds': actual_reynolds,
                'velocity': actual_velocity
            }
        }
        
        update_stats = {}
        
        # Update pressure model (always, since it's required)
        if actual_pressure is not None:
            y_true_norm = self.normalize_output(actual_pressure, 'pressure')
            error = self._update_model('pressure', x_norm, y_true_norm)
            update_stats['pressure_error'] = error
            feedback_entry['pressure_error'] = error
        
        # Update Reynolds model (if provided)
        if actual_reynolds is not None:
            y_true_norm = self.normalize_output(actual_reynolds, 'reynolds')
            error = self._update_model('reynolds', x_norm, y_true_norm)
            update_stats['reynolds_error'] = error
            feedback_entry['reynolds_error'] = error
        
        # Update velocity model (if provided)
        if actual_velocity is not None:
            y_true_norm = self.normalize_output(actual_velocity, 'velocity')
            error = self._update_model('velocity', x_norm, y_true_norm)
            update_stats['velocity_error'] = error
            feedback_entry['velocity_error'] = error
        
        # Update statistics
        self.training_count += 1
        self.feedback_history.append(feedback_entry)
        
        # Keep only last 1000 feedback entries
        if len(self.feedback_history) > 1000:
            self.feedback_history = self.feedback_history[-1000:]
        
        # Auto-save every 10 feedbacks
        if self.training_count % 10 == 0:
            self.save_model()
        
        update_stats['training_count'] = self.training_count
        update_stats['average_pressure_error'] = self._calculate_average_error('pressure')
        
        return update_stats
    
    def _update_model(self, target, x_norm, y_true_norm):
        """Update a single model with one training example"""
        model = self.models[target]
        
        # Forward pass
        pred, activations = self._forward(x_norm, model)
        
        # Calculate error
        error = abs(pred[0, 0] - y_true_norm) * 100  # Percentage error
        
        # Backward pass
        weight_grads, bias_grads = self._backward(x_norm, np.array([y_true_norm]), 
                                                  activations, model)
        
        # Update weights (gradient descent)
        for i in range(len(model['weights'])):
            model['weights'][i] -= self.learning_rate * weight_grads[i]
            model['biases'][i] -= self.learning_rate * bias_grads[i]
        
        return float(error)
    
    def _calculate_average_error(self, target):
        """Calculate average error for a target from recent feedback"""
        if not self.feedback_history:
            return None
        
        error_key = f'{target}_error'
        errors = [f.get(error_key) for f in self.feedback_history if error_key in f]
        
        if not errors:
            return None
        
        return float(np.mean(errors))
    
    def _calculate_confidence(self, pipe_length, pipe_diameter, temperature, 
                             flow_rate, viscosity, density):
        """Calculate prediction confidence"""
        penalties = []
        
        # Temperature range confidence
        if 20 <= temperature <= 30:
            temp_conf = 100
        elif 10 <= temperature <= 60:
            if temperature < 20:
                temp_conf = 70 + (temperature - 10) * 3
            else:
                temp_conf = 70 + (60 - temperature) * 1
        else:
            temp_conf = 30
        penalties.append(temp_conf)
        
        # Flow rate confidence
        if 2 <= flow_rate <= 15:
            flow_conf = 100
        elif flow_rate <= 20:
            flow_conf = 70
        else:
            flow_conf = 40
        penalties.append(flow_conf)
        
        # Diameter confidence
        if 5 <= pipe_diameter <= 60:
            diam_conf = 100
        else:
            diam_conf = 50
        penalties.append(diam_conf)
        
        # Length confidence
        if 50 <= pipe_length <= 800:
            length_conf = 100
        else:
            length_conf = 60
        penalties.append(length_conf)
        
        # Boost confidence if we have training data
        base_confidence = int(np.mean(penalties))
        
        if self.training_count > 100:
            base_confidence = min(100, base_confidence + 10)
        elif self.training_count > 50:
            base_confidence = min(100, base_confidence + 5)
        
        return base_confidence
    
    def _physics_validation(self, pipe_length, pipe_diameter, temperature, flow_rate,
                           viscosity, density, ml_pressure):
        """Validate prediction against physics equations"""
        # Convert units
        L = pipe_length / 1000  # mm to m
        D = pipe_diameter / 1000  # mm to m
        Q = flow_rate / 60000  # L/min to m³/s
        mu = viscosity / 1000  # mPa·s to Pa·s
        rho = density  # kg/m³
        
        # Calculate velocity
        A = np.pi * (D / 2) ** 2
        v = Q / A if A > 0 else 0
        
        # Calculate Reynolds
        Re = (rho * v * D / mu) if mu > 0 else 0
        
        # Hagen-Poiseuille for laminar flow
        if Re < 2300:
            physics_pressure_pa = (128 * mu * L * Q) / (np.pi * D ** 4) if D > 0 else 0
            physics_pressure_bar = physics_pressure_pa / 100000
        else:
            f = 0.316 / (Re ** 0.25) if Re > 0 else 0.02
            physics_pressure_pa = f * (L / D) * (rho * v ** 2 / 2) if D > 0 else 0
            physics_pressure_bar = physics_pressure_pa / 100000
        
        deviation_pct = abs(ml_pressure - physics_pressure_bar) / physics_pressure_bar * 100 if physics_pressure_bar > 0 else 0
        is_consistent = deviation_pct < 50
        
        return {
            'physics_pressure_bar': float(physics_pressure_bar),
            'ml_pressure_bar': float(ml_pressure),
            'deviation_pct': float(deviation_pct),
            'physics_consistent': bool(is_consistent),
            'reynolds_number': float(Re),
            'flow_regime': 'laminar' if Re < 2300 else 'turbulent'
        }
    
    def _generate_recommendations(self, predictions, confidence, physics_check):
        """Generate actionable recommendations"""
        recs = []
        
        pressure = predictions['pressure']
        reynolds = predictions['reynolds']
        
        if pressure > 5:
            recs.append("⚠️ High pressure (>5 bar). Consider: increasing diameter, reducing flow, or increasing temperature.")
        elif pressure > 3:
            recs.append("⚡ Moderate pressure (3-5 bar). Monitor quality.")
        else:
            recs.append("✓ Safe pressure (<3 bar).")
        
        if reynolds > 2300:
            recs.append("⚠️ Turbulent flow (Re > 2300). May cause mixing issues.")
        elif reynolds > 1000:
            recs.append("⚡ Transitional flow. Slight turbulence possible.")
        else:
            recs.append("✓ Laminar flow - optimal for polyurethane.")
        
        if confidence < 50:
            recs.append("⚠️ Low confidence. Parameters outside typical range.")
        
        if not physics_check['physics_consistent']:
            recs.append(f"⚠️ ML deviates {physics_check['deviation_pct']:.1f}% from physics. Use hybrid approach.")
        
        if self.training_count < 10:
            recs.append(f"📊 Model has only {self.training_count} training examples. Provide feedback to improve.")
        
        return recs
    
    def save_model(self, path=None):
        """Save model to JSON file"""
        if path is None:
            path = self.model_path
        
        # Convert numpy arrays to lists for JSON serialization
        models_serializable = {}
        for target, model in self.models.items():
            models_serializable[target] = {
                'weights': [w.tolist() for w in model['weights']],
                'biases': [b.tolist() for b in model['biases']]
            }
        
        # Update metadata
        self.metadata['training_count'] = self.training_count
        self.metadata['last_updated'] = datetime.now().isoformat()
        self.metadata['average_pressure_error'] = self._calculate_average_error('pressure')
        
        data = {
            'metadata': self.metadata,
            **models_serializable
        }
        
        # Save to file
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)
        
        return path
    
    def load_model(self, path):
        """Load model from JSON file"""
        with open(path, 'r') as f:
            data = json.load(f)
        
        self.metadata = data.get('metadata', {})
        self.training_count = self.metadata.get('training_count', 0)
        
        # Load models
        self.models = {}
        for target in self.output_targets:
            if target in data:
                model_data = data[target]
                self.models[target] = {
                    'weights': [np.array(w) for w in model_data['weights']],
                    'biases': [np.array(b) for b in model_data['biases']]
                }
        
        print(f"Loaded model from {path} (training_count: {self.training_count})")
    
    def get_statistics(self):
        """Get training statistics"""
        stats = {
            'training_count': self.training_count,
            'model_version': self.metadata.get('version'),
            'created': self.metadata.get('created'),
            'last_updated': self.metadata.get('last_updated'),
            'learning_rate': self.learning_rate,
            'physics_weight': self.physics_weight
        }
        
        # Calculate average errors from recent feedback
        for target in self.output_targets:
            avg_error = self._calculate_average_error(target)
            if avg_error is not None:
                stats[f'{target}_avg_error_pct'] = round(avg_error, 2)
        
        return stats
    
    def export_training_data(self, output_path='training_data.json'):
        """Export all feedback history for analysis"""
        with open(output_path, 'w') as f:
            json.dump(self.feedback_history, f, indent=2)
        
        return output_path


# Global instance for easy access
_global_pinn = None

def get_pinn(model_path='pinn_model.json', **kwargs):
    """Get or create global PINN instance"""
    global _global_pinn
    if _global_pinn is None:
        _global_pinn = SelfTrainingPINN(model_path=model_path, **kwargs)
    return _global_pinn


def predict(pipe_length, pipe_diameter, temperature, flow_rate, viscosity, density):
    """Convenience function for prediction"""
    pinn = get_pinn()
    return pinn.predict(pipe_length, pipe_diameter, temperature, flow_rate, viscosity, density)


def provide_feedback(pipe_length, pipe_diameter, temperature, flow_rate, viscosity, density,
                    actual_pressure, actual_reynolds=None, actual_velocity=None):
    """Convenience function for providing feedback"""
    pinn = get_pinn()
    return pinn.train_from_feedback(
        pipe_length, pipe_diameter, temperature, flow_rate, viscosity, density,
        actual_pressure, actual_reynolds, actual_velocity
    )


if __name__ == "__main__":
    print("Self-Training PINN - Ready for use")
    print("\nUsage:")
    print("  from self_training_pinn import SelfTrainingPINN")
    print("  pinn = SelfTrainingPINN()")
    print("  result = pinn.predict(...)")
    print("  pinn.train_from_feedback(..., actual_pressure=measured_value)")
