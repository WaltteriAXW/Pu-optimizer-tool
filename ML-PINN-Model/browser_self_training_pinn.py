"""
Browser-Compatible Self-Training PINN
Works in Pyodide for GitHub Pages integration
"""

import json
import numpy as np
from datetime import datetime


class BrowserPINN:
    """Lightweight PINN for browser use with self-training capability"""
    
    def __init__(self):
        self.models = None
        self.metadata = {}
        self.training_count = 0
        self.feedback_history = []
        self.learning_rate = 0.001
    
    def initialize(self, model_json_str):
        """Initialize from JSON string"""
        try:
            data = json.loads(model_json_str)
            self.metadata = data.get('metadata', {})
            self.training_count = self.metadata.get('training_count', 0)
            self.learning_rate = self.metadata.get('learning_rate', 0.001)
            
            # Load models
            self.models = {}
            for target in ['pressure', 'reynolds', 'velocity']:
                if target in data:
                    self.models[target] = {
                        'weights': [np.array(w) for w in data[target]['weights']],
                        'biases': [np.array(b) for b in data[target]['biases']]
                    }
            
            return True
        except Exception as e:
            print(f"Failed to initialize: {e}")
            return False
    
    def _forward(self, x, model):
        """Forward pass"""
        x = x.reshape(-1, 1)
        for i in range(len(model['weights']) - 1):
            x = np.tanh(np.dot(model['weights'][i], x) + model['biases'][i])
        x = np.dot(model['weights'][-1], x) + model['biases'][-1]
        return x.flatten()[0]
    
    def _backward_and_update(self, x, y_true, model):
        """Simplified backprop and weight update"""
        x = x.reshape(-1, 1)
        activations = [x]
        
        # Forward pass storing activations
        for i in range(len(model['weights']) - 1):
            z = np.dot(model['weights'][i], x) + model['biases'][i]
            activations.append(z)
            x = np.tanh(z)
            activations.append(x)
        
        z = np.dot(model['weights'][-1], x) + model['biases'][-1]
        activations.append(z)
        pred = z.flatten()[0]
        
        # Calculate error
        error = pred - y_true
        
        # Backprop (simplified for speed)
        dz = np.array([[error]])
        
        # Update output layer
        a_prev = activations[-2]
        model['weights'][-1] -= self.learning_rate * np.dot(dz, a_prev.T)
        model['biases'][-1] -= self.learning_rate * dz
        
        # Update hidden layers (simplified - only update last hidden layer for speed)
        if len(model['weights']) > 1:
            dz = np.dot(model['weights'][-1].T, dz)
            dz = dz * (1 - np.tanh(activations[-3]) ** 2)
            a_prev = activations[-4] if len(activations) > 4 else activations[0]
            model['weights'][-2] -= self.learning_rate * np.dot(dz, a_prev.T)
            model['biases'][-2] -= self.learning_rate * dz
        
        return abs(error) * 100
    
    def normalize_inputs(self, pipe_length, pipe_diameter, temperature, flow_rate, viscosity, density):
        """Normalize inputs"""
        return np.array([
            (pipe_length - 50) / (800 - 50),
            (pipe_diameter - 5) / (60 - 5),
            (temperature - 10) / (60 - 10),
            (flow_rate - 2) / (20 - 2),
            (viscosity - 350) / (850 - 350),
            (density - 1120) / 1.0 if density != 1120 else 0.0
        ])
    
    def denormalize_output(self, value, target_type):
        """Denormalize single output"""
        ranges = {
            'pressure': (1.01, 7.99),
            'reynolds': (1, 547),
            'velocity': (0.01, 16.98)
        }
        min_val, max_val = ranges[target_type]
        return value * (max_val - min_val) + min_val
    
    def normalize_output(self, value, target_type):
        """Normalize single output"""
        ranges = {
            'pressure': (1.01, 7.99),
            'reynolds': (1, 547),
            'velocity': (0.01, 16.98)
        }
        min_val, max_val = ranges[target_type]
        return (value - min_val) / (max_val - min_val)
    
    def predict(self, pipe_length, pipe_diameter, temperature, flow_rate, viscosity, density):
        """Make prediction"""
        if self.models is None:
            return {
                'trained': False,
                'error': 'Model not initialized'
            }
        
        x_norm = self.normalize_inputs(pipe_length, pipe_diameter, temperature,
                                       flow_rate, viscosity, density)
        
        predictions = {}
        for target, model in self.models.items():
            pred_norm = self._forward(x_norm, model)
            predictions[target] = self.denormalize_output(pred_norm, target)
        
        # Calculate confidence
        confidence = self._calculate_confidence(pipe_length, pipe_diameter, temperature,
                                               flow_rate, viscosity, density)
        
        # Physics check
        physics_check = self._physics_check(pipe_length, pipe_diameter, temperature,
                                            flow_rate, viscosity, density, predictions['pressure'])
        
        # Recommendations
        recommendations = self._generate_recommendations(predictions, confidence, physics_check)
        
        return {
            'trained': True,
            'predictions': {
                'required_pressure_bar': float(predictions['pressure']),
                'reynolds_number': float(predictions['reynolds']),
                'velocity_ms': float(predictions['velocity'])
            },
            'confidence': confidence,
            'physics_check': physics_check,
            'recommendations': recommendations,
            'training_count': self.training_count
        }
    
    def train(self, pipe_length, pipe_diameter, temperature, flow_rate, viscosity, density,
             actual_pressure, actual_reynolds=None, actual_velocity=None):
        """Update model with feedback"""
        if self.models is None:
            return {'error': 'Model not initialized'}
        
        x_norm = self.normalize_inputs(pipe_length, pipe_diameter, temperature,
                                       flow_rate, viscosity, density)
        
        stats = {}
        
        # Update pressure model
        if actual_pressure is not None:
            y_norm = self.normalize_output(actual_pressure, 'pressure')
            error = self._backward_and_update(x_norm, y_norm, self.models['pressure'])
            stats['pressure_error'] = float(error)
        
        # Update reynolds if provided
        if actual_reynolds is not None:
            y_norm = self.normalize_output(actual_reynolds, 'reynolds')
            error = self._backward_and_update(x_norm, y_norm, self.models['reynolds'])
            stats['reynolds_error'] = float(error)
        
        # Update velocity if provided
        if actual_velocity is not None:
            y_norm = self.normalize_output(actual_velocity, 'velocity')
            error = self._backward_and_update(x_norm, y_norm, self.models['velocity'])
            stats['velocity_error'] = float(error)
        
        self.training_count += 1
        
        # Store feedback
        self.feedback_history.append({
            'timestamp': datetime.now().isoformat(),
            'inputs': [pipe_length, pipe_diameter, temperature, flow_rate, viscosity, density],
            'actual_pressure': actual_pressure,
            'errors': stats
        })
        
        # Keep only last 100
        if len(self.feedback_history) > 100:
            self.feedback_history = self.feedback_history[-100:]
        
        stats['training_count'] = self.training_count
        
        return stats
    
    def export_model(self):
        """Export model as JSON string for saving"""
        if self.models is None:
            return None
        
        models_dict = {}
        for target, model in self.models.items():
            models_dict[target] = {
                'weights': [w.tolist() for w in model['weights']],
                'biases': [b.tolist() for b in model['biases']]
            }
        
        self.metadata['training_count'] = self.training_count
        self.metadata['last_updated'] = datetime.now().isoformat()
        
        data = {
            'metadata': self.metadata,
            **models_dict
        }
        
        return json.dumps(data)
    
    def _calculate_confidence(self, pipe_length, pipe_diameter, temperature,
                             flow_rate, viscosity, density):
        """Calculate confidence score"""
        penalties = []
        
        if 20 <= temperature <= 30:
            temp_conf = 100
        elif 10 <= temperature <= 60:
            temp_conf = 70 + min(30, (30 - abs(temperature - 25)) * 3)
        else:
            temp_conf = 30
        penalties.append(temp_conf)
        
        if 2 <= flow_rate <= 15:
            flow_conf = 100
        elif flow_rate <= 20:
            flow_conf = 70
        else:
            flow_conf = 40
        penalties.append(flow_conf)
        
        penalties.append(100 if 5 <= pipe_diameter <= 60 else 50)
        penalties.append(100 if 50 <= pipe_length <= 800 else 60)
        
        base_confidence = int(np.mean(penalties))
        
        # Boost for training
        if self.training_count > 100:
            base_confidence = min(100, base_confidence + 10)
        elif self.training_count > 50:
            base_confidence = min(100, base_confidence + 5)
        
        return base_confidence
    
    def _physics_check(self, pipe_length, pipe_diameter, temperature, flow_rate,
                      viscosity, density, ml_pressure):
        """Physics validation"""
        L = pipe_length / 1000
        D = pipe_diameter / 1000
        Q = flow_rate / 60000
        mu = viscosity / 1000
        rho = density
        
        A = np.pi * (D / 2) ** 2
        v = Q / A if A > 0 else 0
        Re = (rho * v * D / mu) if mu > 0 else 0
        
        if Re < 2300:
            physics_pressure_pa = (128 * mu * L * Q) / (np.pi * D ** 4) if D > 0 else 0
        else:
            f = 0.316 / (Re ** 0.25) if Re > 0 else 0.02
            physics_pressure_pa = f * (L / D) * (rho * v ** 2 / 2) if D > 0 else 0
        
        physics_pressure_bar = physics_pressure_pa / 100000
        deviation = abs(ml_pressure - physics_pressure_bar) / physics_pressure_bar * 100 if physics_pressure_bar > 0 else 0
        
        return {
            'physics_pressure_bar': float(physics_pressure_bar),
            'ml_pressure_bar': float(ml_pressure),
            'deviation_pct': float(deviation),
            'physics_consistent': bool(deviation < 50),
            'reynolds_number': float(Re),
            'flow_regime': 'laminar' if Re < 2300 else 'turbulent'
        }
    
    def _generate_recommendations(self, predictions, confidence, physics_check):
        """Generate recommendations"""
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
            recs.append("⚠️ Turbulent flow. May cause mixing issues.")
        elif reynolds > 1000:
            recs.append("⚡ Transitional flow.")
        else:
            recs.append("✓ Laminar flow - optimal.")
        
        if confidence < 50:
            recs.append("⚠️ Low confidence. Outside typical range.")
        
        if not physics_check['physics_consistent']:
            recs.append(f"⚠️ ML deviates {physics_check['deviation_pct']:.1f}% from physics.")
        
        if self.training_count < 10:
            recs.append(f"📊 Only {self.training_count} training examples. Provide feedback to improve.")
        
        return recs


# Global instance
_pinn = BrowserPINN()


def initialize_pinn(model_json_str):
    """Initialize PINN from JSON string"""
    return _pinn.initialize(model_json_str)


def get_prediction(pipe_length, pipe_diameter, temperature, flow_rate, viscosity, density):
    """Get prediction"""
    return _pinn.predict(pipe_length, pipe_diameter, temperature, flow_rate, viscosity, density)


def provide_feedback(pipe_length, pipe_diameter, temperature, flow_rate, viscosity, density,
                    actual_pressure, actual_reynolds=None, actual_velocity=None):
    """Provide feedback for training"""
    return _pinn.train(pipe_length, pipe_diameter, temperature, flow_rate, viscosity, density,
                      actual_pressure, actual_reynolds, actual_velocity)


def export_updated_model():
    """Export updated model as JSON"""
    return _pinn.export_model()


def get_training_stats():
    """Get training statistics"""
    return {
        'training_count': _pinn.training_count,
        'feedback_count': len(_pinn.feedback_history),
        'recent_feedback': _pinn.feedback_history[-10:] if _pinn.feedback_history else []
    }
