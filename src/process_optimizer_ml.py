"""
Machine Learning Process Optimizer for Polyurethane Injection
Uses scikit-learn for intelligent parameter optimization and quality prediction
"""

import numpy as np
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import json


class ProcessOptimizerML:
    """
    ML-based process optimizer for polyurethane injection molding
    Predicts optimal parameters and quality outcomes
    """

    def __init__(self):
        # Models for different predictions
        self.parameter_optimizer = None  # Predicts optimal parameters
        self.quality_classifier = None   # Predicts good/bad parts
        self.defect_predictor = None     # Predicts defect probabilities
        self.pressure_predictor = None   # Predicts required pressure

        # Scalers for feature normalization
        self.param_scaler = StandardScaler()
        self.quality_scaler = StandardScaler()
        self.defect_scaler = StandardScaler()
        self.pressure_scaler = StandardScaler()

        # Training data storage
        self.training_data = []
        self.is_trained = False

    def generate_synthetic_training_data(self, n_samples=1000):
        """
        Generate synthetic training data based on physics models and expert knowledge
        This creates realistic process scenarios until real data is available
        """
        np.random.seed(42)

        training_data = []

        for _ in range(n_samples):
            # Input features
            pipe_length = np.random.uniform(5, 100)  # meters
            pipe_diameter = np.random.uniform(0.01, 0.05)  # meters
            temperature = np.random.uniform(15, 45)  # Celsius
            flow_rate = np.random.uniform(5, 100)  # L/min
            viscosity = np.random.uniform(200, 600)  # cP
            density = np.random.uniform(1050, 1200)  # kg/m³

            # Material properties
            flow_index = np.random.uniform(0.75, 0.95)
            activation_energy = np.random.uniform(20000, 35000)  # J/mol

            # Calculate physics-based outputs
            # Hagen-Poiseuille for pressure (simplified)
            velocity = (flow_rate / 60000) / (np.pi * (pipe_diameter/2)**2)
            reynolds = (density * velocity * pipe_diameter) / (viscosity / 1000)

            # Temperature correction (Arrhenius)
            temp_k = temperature + 273.15
            viscosity_corrected = viscosity * np.exp(activation_energy / 8.314 * (1/temp_k - 1/298.15))

            # Pressure calculation with non-Newtonian correction
            pressure_loss = (8 * viscosity_corrected/1000 * pipe_length * velocity) / (np.pi * (pipe_diameter/2)**4)
            pressure_loss *= (1 / flow_index)  # Power law correction
            safety_factor = 1.5
            required_pressure = (pressure_loss / 100000 + 1.01325) * safety_factor  # bar

            # Quality factors
            # Good parts need: moderate pressure, right temp range, good flow
            quality_score = 0

            # Temperature in optimal range (20-35°C)
            if 20 <= temperature <= 35:
                quality_score += 0.3
            elif 15 <= temperature < 20 or 35 < temperature <= 40:
                quality_score += 0.15

            # Pressure not too high (< 5 bar is good)
            if required_pressure < 4:
                quality_score += 0.3
            elif 4 <= required_pressure < 5:
                quality_score += 0.2
            elif 5 <= required_pressure < 6:
                quality_score += 0.1

            # Flow rate in good range
            if 20 <= flow_rate <= 60:
                quality_score += 0.2
            elif 10 <= flow_rate < 20 or 60 < flow_rate <= 80:
                quality_score += 0.1

            # Reynolds number - avoid extreme turbulence
            if reynolds < 2300:  # Laminar is good
                quality_score += 0.2
            elif 2300 <= reynolds < 4000:  # Transition is okay
                quality_score += 0.1

            # Add some randomness for realism
            quality_score += np.random.normal(0, 0.1)
            quality_score = np.clip(quality_score, 0, 1)

            # Binary quality (good if score > 0.6)
            is_good_part = quality_score > 0.6

            # Defect probabilities
            void_probability = max(0, min(1, 0.5 - quality_score + np.random.normal(0, 0.1)))
            short_shot_probability = max(0, min(1,
                0.7 if required_pressure > 6 or flow_rate < 15 else 0.1 + np.random.normal(0, 0.05)))
            flash_probability = max(0, min(1,
                0.6 if required_pressure > 5.5 and flow_rate > 70 else 0.1 + np.random.normal(0, 0.05)))
            surface_defect_probability = max(0, min(1,
                0.5 if temperature < 18 or temperature > 38 else 0.15 + np.random.normal(0, 0.05)))

            # Optimal parameters (what parameters would give best results)
            optimal_temperature = 25 + np.random.normal(0, 2)  # Around 25°C
            optimal_flow_rate = 40 + np.random.normal(0, 5)  # Around 40 L/min

            training_data.append({
                # Input features
                'pipe_length': pipe_length,
                'pipe_diameter': pipe_diameter,
                'temperature': temperature,
                'flow_rate': flow_rate,
                'viscosity': viscosity,
                'density': density,
                'flow_index': flow_index,
                'activation_energy': activation_energy,

                # Calculated outputs
                'required_pressure': required_pressure,
                'reynolds_number': reynolds,
                'quality_score': quality_score,
                'is_good_part': is_good_part,

                # Defect probabilities
                'void_probability': void_probability,
                'short_shot_probability': short_shot_probability,
                'flash_probability': flash_probability,
                'surface_defect_probability': surface_defect_probability,

                # Optimal parameters
                'optimal_temperature': optimal_temperature,
                'optimal_flow_rate': optimal_flow_rate,
            })

        return training_data

    def train_models(self, training_data=None):
        """Train all ML models on the provided or generated data"""

        if training_data is None:
            training_data = self.generate_synthetic_training_data(1000)

        self.training_data = training_data

        # Prepare feature matrices
        X_param = np.array([[
            d['pipe_length'], d['pipe_diameter'], d['viscosity'],
            d['density'], d['flow_index'], d['activation_energy']
        ] for d in training_data])

        X_quality = np.array([[
            d['pipe_length'], d['pipe_diameter'], d['temperature'],
            d['flow_rate'], d['viscosity'], d['density'],
            d['required_pressure'], d['reynolds_number']
        ] for d in training_data])

        # Target variables
        y_quality = np.array([d['is_good_part'] for d in training_data])
        y_temp = np.array([d['optimal_temperature'] for d in training_data])
        y_flow = np.array([d['optimal_flow_rate'] for d in training_data])
        y_pressure = np.array([d['required_pressure'] for d in training_data])

        y_defects = np.array([[
            d['void_probability'],
            d['short_shot_probability'],
            d['flash_probability'],
            d['surface_defect_probability']
        ] for d in training_data])

        # Scale features
        X_param_scaled = self.param_scaler.fit_transform(X_param)
        X_quality_scaled = self.quality_scaler.fit_transform(X_quality)

        # Train parameter optimizer (predicts optimal temp and flow)
        print("Training parameter optimizer...")
        self.parameter_optimizer = {
            'temperature': RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42),
            'flow_rate': RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
        }
        self.parameter_optimizer['temperature'].fit(X_param_scaled, y_temp)
        self.parameter_optimizer['flow_rate'].fit(X_param_scaled, y_flow)

        # Train quality classifier
        print("Training quality classifier...")
        self.quality_classifier = RandomForestClassifier(
            n_estimators=100, max_depth=10, random_state=42
        )
        self.quality_classifier.fit(X_quality_scaled, y_quality)

        # Train defect predictor
        print("Training defect predictor...")
        self.defect_predictor = {
            'voids': RandomForestRegressor(n_estimators=50, max_depth=8, random_state=42),
            'short_shot': RandomForestRegressor(n_estimators=50, max_depth=8, random_state=42),
            'flash': RandomForestRegressor(n_estimators=50, max_depth=8, random_state=42),
            'surface': RandomForestRegressor(n_estimators=50, max_depth=8, random_state=42)
        }
        self.defect_predictor['voids'].fit(X_quality_scaled, y_defects[:, 0])
        self.defect_predictor['short_shot'].fit(X_quality_scaled, y_defects[:, 1])
        self.defect_predictor['flash'].fit(X_quality_scaled, y_defects[:, 2])
        self.defect_predictor['surface'].fit(X_quality_scaled, y_defects[:, 3])

        # Train pressure predictor (faster gradient boosting)
        print("Training pressure predictor...")
        self.pressure_predictor = GradientBoostingRegressor(
            n_estimators=50, max_depth=5, random_state=42
        )
        self.pressure_predictor.fit(X_quality_scaled[:, :6], y_pressure)  # Use first 6 features

        self.is_trained = True
        print("All models trained successfully!")

        # Calculate and return training metrics
        train_score = self.quality_classifier.score(X_quality_scaled, y_quality)
        return {
            'quality_accuracy': train_score,
            'n_samples': len(training_data)
        }

    def predict_optimal_parameters(self, pipe_length, pipe_diameter, viscosity,
                                   density, flow_index, activation_energy):
        """Predict optimal temperature and flow rate for given conditions"""

        if not self.is_trained:
            return None

        X = np.array([[pipe_length, pipe_diameter, viscosity, density, flow_index, activation_energy]])
        X_scaled = self.param_scaler.transform(X)

        optimal_temp = self.parameter_optimizer['temperature'].predict(X_scaled)[0]
        optimal_flow = self.parameter_optimizer['flow_rate'].predict(X_scaled)[0]

        return {
            'optimal_temperature': round(optimal_temp, 1),
            'optimal_flow_rate': round(optimal_flow, 1)
        }

    def predict_quality(self, pipe_length, pipe_diameter, temperature, flow_rate,
                       viscosity, density, required_pressure, reynolds_number):
        """Predict if parameters will produce a good part"""

        if not self.is_trained:
            return None

        X = np.array([[pipe_length, pipe_diameter, temperature, flow_rate,
                      viscosity, density, required_pressure, reynolds_number]])
        X_scaled = self.quality_scaler.transform(X)

        prediction = self.quality_classifier.predict(X_scaled)[0]
        probability = self.quality_classifier.predict_proba(X_scaled)[0]

        return {
            'is_good_part': bool(prediction),
            'confidence': round(max(probability) * 100, 1),
            'good_probability': round(probability[1] * 100, 1) if len(probability) > 1 else 0
        }

    def predict_defects(self, pipe_length, pipe_diameter, temperature, flow_rate,
                       viscosity, density, required_pressure, reynolds_number):
        """Predict probability of various defects"""

        if not self.is_trained:
            return None

        X = np.array([[pipe_length, pipe_diameter, temperature, flow_rate,
                      viscosity, density, required_pressure, reynolds_number]])
        X_scaled = self.quality_scaler.transform(X)

        void_prob = max(0, min(100, self.defect_predictor['voids'].predict(X_scaled)[0] * 100))
        short_shot_prob = max(0, min(100, self.defect_predictor['short_shot'].predict(X_scaled)[0] * 100))
        flash_prob = max(0, min(100, self.defect_predictor['flash'].predict(X_scaled)[0] * 100))
        surface_prob = max(0, min(100, self.defect_predictor['surface'].predict(X_scaled)[0] * 100))

        return {
            'void_risk': round(void_prob, 1),
            'short_shot_risk': round(short_shot_prob, 1),
            'flash_risk': round(flash_prob, 1),
            'surface_defect_risk': round(surface_prob, 1),
            'overall_risk': round((void_prob + short_shot_prob + flash_prob + surface_prob) / 4, 1)
        }

    def get_ml_insights(self, pipe_length, pipe_diameter, temperature, flow_rate,
                       viscosity, density, flow_index, activation_energy,
                       required_pressure, reynolds_number):
        """Get comprehensive ML insights for current parameters"""

        if not self.is_trained:
            return {
                'trained': False,
                'message': 'ML models not trained yet'
            }

        # Get all predictions
        optimal_params = self.predict_optimal_parameters(
            pipe_length, pipe_diameter, viscosity, density, flow_index, activation_energy
        )

        quality = self.predict_quality(
            pipe_length, pipe_diameter, temperature, flow_rate,
            viscosity, density, required_pressure, reynolds_number
        )

        defects = self.predict_defects(
            pipe_length, pipe_diameter, temperature, flow_rate,
            viscosity, density, required_pressure, reynolds_number
        )

        # Generate recommendations
        recommendations = []

        # Temperature recommendations
        temp_diff = temperature - optimal_params['optimal_temperature']
        if abs(temp_diff) > 3:
            if temp_diff > 0:
                recommendations.append(
                    f"Consider reducing temperature by {abs(temp_diff):.1f}°C to {optimal_params['optimal_temperature']:.1f}°C for better results"
                )
            else:
                recommendations.append(
                    f"Consider increasing temperature by {abs(temp_diff):.1f}°C to {optimal_params['optimal_temperature']:.1f}°C for better results"
                )

        # Flow rate recommendations
        flow_diff = flow_rate - optimal_params['optimal_flow_rate']
        if abs(flow_diff) > 5:
            if flow_diff > 0:
                recommendations.append(
                    f"Consider reducing flow rate by {abs(flow_diff):.1f} L/min to {optimal_params['optimal_flow_rate']:.1f} L/min"
                )
            else:
                recommendations.append(
                    f"Consider increasing flow rate by {abs(flow_diff):.1f} L/min to {optimal_params['optimal_flow_rate']:.1f} L/min"
                )

        # Defect-specific recommendations
        if defects['void_risk'] > 30:
            recommendations.append("High void risk detected - check material degassing and reduce injection speed")
        if defects['short_shot_risk'] > 30:
            recommendations.append("Short shot risk detected - increase injection pressure or reduce viscosity")
        if defects['flash_risk'] > 30:
            recommendations.append("Flash risk detected - reduce injection pressure or check mold clamping")
        if defects['surface_defect_risk'] > 30:
            recommendations.append("Surface defect risk - optimize temperature and ensure proper mold release")

        if not recommendations:
            recommendations.append("Parameters are within optimal range - good process setup!")

        return {
            'trained': True,
            'optimal_parameters': optimal_params,
            'quality_prediction': quality,
            'defect_risks': defects,
            'recommendations': recommendations
        }


# Global instance
ml_optimizer = ProcessOptimizerML()


def initialize_ml_models():
    """Initialize and train ML models (call this once)"""
    print("Initializing ML models for process optimization...")
    metrics = ml_optimizer.train_models()
    print(f"ML models trained with {metrics['n_samples']} samples")
    print(f"Quality classifier accuracy: {metrics['quality_accuracy']*100:.1f}%")
    return metrics


def get_ml_predictions(pipe_length, pipe_diameter, temperature, flow_rate,
                      viscosity, density, flow_index, activation_energy,
                      required_pressure, reynolds_number):
    """Get ML predictions and insights"""
    return ml_optimizer.get_ml_insights(
        pipe_length, pipe_diameter, temperature, flow_rate,
        viscosity, density, flow_index, activation_energy,
        required_pressure, reynolds_number
    )
