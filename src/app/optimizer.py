"""
Machine Learning Process Optimizer for Polyurethane Injection
Uses scikit-learn and XGBoost for intelligent parameter optimization and quality prediction
Enhanced with feature engineering, ensemble methods, and comprehensive evaluation
"""

import numpy as np
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, GradientBoostingRegressor, VotingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.calibration import CalibratedClassifierCV
import json
import os
from datetime import datetime
from pathlib import Path
import pickle

# XGBoost for improved performance
try:
    from xgboost import XGBClassifier, XGBRegressor
    XGBOOST_AVAILABLE = True
except ImportError:
    print("Warning: XGBoost not available. Install with: pip install xgboost>=1.7.0")
    XGBOOST_AVAILABLE = False

# Model evaluation
try:
    from model_evaluator import ModelEvaluator
    EVALUATOR_AVAILABLE = True
except ImportError:
    print("Warning: ModelEvaluator not available")
    EVALUATOR_AVAILABLE = False


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
        Generate physics-based training data using validated process models
        Creates realistic process scenarios for continuous model adaptation
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

    def create_engineered_features(self, training_data):
        """
        Create advanced engineered features for better ML performance

        Adds:
        - Interaction terms (temperature × viscosity, pipe geometry ratios)
        - Domain-specific features (temperature deviation from optimal)
        - Polynomial features (squared terms for non-linear relationships)

        Args:
            training_data: List of training data dictionaries

        Returns:
            np.array: Engineered feature matrix with 13 features
        """
        features_list = []

        for d in training_data:
            # Base features (8)
            base = [
                d['pipe_length'],
                d['pipe_diameter'],
                d['temperature'],
                d['flow_rate'],
                d['viscosity'],
                d['density'],
                d['required_pressure'],
                d['reynolds_number']
            ]

            # Interaction features (3)
            temp_viscosity = d['temperature'] * d['viscosity']  # Temperature-viscosity coupling
            geometry_ratio = d['pipe_length'] / (d['pipe_diameter'] + 1e-6)  # L/D ratio
            flow_viscosity = d['flow_rate'] * d['viscosity']  # Shear stress indicator

            interactions = [temp_viscosity, geometry_ratio, flow_viscosity]

            # Temperature deviation from optimal (25°C) - 2 features
            temp_dev = abs(d['temperature'] - 25.0)
            temp_dev_squared = (d['temperature'] - 25.0) ** 2

            temp_features = [temp_dev, temp_dev_squared]

            # Combine all features (8 + 3 + 2 = 13 features)
            all_features = base + interactions + temp_features
            features_list.append(all_features)

        return np.array(features_list)

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

        # Use engineered features for quality prediction
        print("Creating engineered features...")
        X_quality_engineered = self.create_engineered_features(training_data)

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
        X_quality_scaled = self.quality_scaler.fit_transform(X_quality_engineered)

        # Train parameter optimizer (predicts optimal temp and flow)
        print("Training parameter optimizer...")
        self.parameter_optimizer = {
            'temperature': RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42),
            'flow_rate': RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
        }
        self.parameter_optimizer['temperature'].fit(X_param_scaled, y_temp)
        self.parameter_optimizer['flow_rate'].fit(X_param_scaled, y_flow)

        # Train quality classifier with XGBoost ensemble
        print("Training quality classifier with XGBoost ensemble...")

        if XGBOOST_AVAILABLE:
            # XGBoost with regularization
            xgb_clf = XGBClassifier(
                n_estimators=200,
                max_depth=6,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                reg_alpha=0.1,
                reg_lambda=1.0,
                random_state=42,
                eval_metric='logloss'
            )

            # RandomForest for diversity
            rf_clf = RandomForestClassifier(
                n_estimators=150,
                max_depth=12,
                min_samples_split=5,
                min_samples_leaf=2,
                max_features='sqrt',
                random_state=42
            )

            # Voting ensemble
            ensemble = VotingClassifier(
                estimators=[('xgb', xgb_clf), ('rf', rf_clf)],
                voting='soft',
                weights=[0.6, 0.4]
            )

            # Calibrate probabilities for better confidence estimates
            self.quality_classifier = CalibratedClassifierCV(
                ensemble, method='sigmoid', cv=3
            )
        else:
            # Fallback to RandomForest if XGBoost not available
            print("  Using RandomForest (XGBoost not available)")
            self.quality_classifier = RandomForestClassifier(
                n_estimators=150, max_depth=12, random_state=42
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

        # Comprehensive model evaluation
        metrics = {
            'n_samples': len(training_data),
            'n_features': X_quality_scaled.shape[1]
        }

        if EVALUATOR_AVAILABLE:
            print("\n" + "="*70)
            print("MODEL EVALUATION WITH CROSS-VALIDATION")
            print("="*70)

            evaluator = ModelEvaluator()

            # Evaluate quality classifier
            quality_report = evaluator.evaluate_classifier(
                self.quality_classifier,
                X_quality_scaled,
                y_quality,
                cv=5,
                model_name="Quality Classifier (XGBoost Ensemble)" if XGBOOST_AVAILABLE else "Quality Classifier (RandomForest)"
            )
            evaluator.print_report(quality_report)

            # Store evaluation results
            metrics['quality_classifier'] = quality_report['metrics']

            # Evaluate pressure predictor
            pressure_report = evaluator.evaluate_regressor(
                self.pressure_predictor,
                X_quality_scaled[:, :6],
                y_pressure,
                cv=5,
                model_name="Pressure Predictor (GradientBoosting)"
            )
            evaluator.print_report(pressure_report)
            metrics['pressure_predictor'] = pressure_report['metrics']

        else:
            # Basic evaluation if ModelEvaluator not available
            train_score = self.quality_classifier.score(X_quality_scaled, y_quality)
            metrics['quality_accuracy'] = train_score
            print(f"Quality classifier training accuracy: {train_score:.4f}")

        return metrics

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

    def _create_engineered_features_single(self, pipe_length, pipe_diameter, temperature,
                                          flow_rate, viscosity, density, required_pressure,
                                          reynolds_number):
        """Create engineered features for a single prediction"""
        # Base features
        base = [pipe_length, pipe_diameter, temperature, flow_rate,
                viscosity, density, required_pressure, reynolds_number]

        # Interactions
        temp_viscosity = temperature * viscosity
        geometry_ratio = pipe_length / (pipe_diameter + 1e-6)
        flow_viscosity = flow_rate * viscosity

        interactions = [temp_viscosity, geometry_ratio, flow_viscosity]

        # Temperature deviation from optimal (25°C)
        temp_dev = abs(temperature - 25.0)
        temp_dev_squared = (temperature - 25.0) ** 2

        temp_features = [temp_dev, temp_dev_squared]

        # Combine all features
        all_features = base + interactions + temp_features
        return np.array([all_features])

    def predict_quality(self, pipe_length, pipe_diameter, temperature, flow_rate,
                       viscosity, density, required_pressure, reynolds_number):
        """Predict if parameters will produce a good part"""

        if not self.is_trained:
            return None

        # Create engineered features
        X = self._create_engineered_features_single(
            pipe_length, pipe_diameter, temperature, flow_rate,
            viscosity, density, required_pressure, reynolds_number
        )
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

        # Create engineered features
        X = self._create_engineered_features_single(
            pipe_length, pipe_diameter, temperature, flow_rate,
            viscosity, density, required_pressure, reynolds_number
        )
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

    def log_production_data(self, parameters, results, actual_quality_outcome=None,
                           actual_defects=None, notes="", log_file="ml_training_data.json"):
        """
        Log production data for continuous ML model training

        Args:
            parameters: Dictionary with all input parameters
            results: Dictionary with calculation/prediction results
            actual_quality_outcome: Actual quality result ("good", "acceptable", "defective", "failed")
            actual_defects: Dictionary with actual defect occurrences
            notes: Additional notes about the production run
            log_file: Path to training data log file

        Returns:
            Dictionary with log status
        """
        # Create logs directory if it doesn't exist
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        log_path = log_dir / log_file

        # Prepare training data entry
        training_entry = {
            "timestamp": datetime.now().isoformat(),
            "notes": notes,

            # Input parameters
            "pipe_length": parameters.get("pipe_length"),
            "pipe_diameter": parameters.get("pipe_diameter"),
            "temperature": parameters.get("temperature"),
            "flow_rate": parameters.get("flow_rate"),
            "viscosity": parameters.get("viscosity"),
            "density": parameters.get("density"),
            "flow_index": parameters.get("flow_index"),
            "activation_energy": parameters.get("activation_energy"),

            # Calculated/predicted results
            "required_pressure": results.get("optimal_pressure_bar") or results.get("required_pressure"),
            "reynolds_number": results.get("reynolds_number"),
            "flow_regime": results.get("flow_regime"),
            "shear_rate": results.get("shear_rate"),
            "velocity": results.get("velocity"),

            # Predicted quality (if available)
            "predicted_quality": results.get("quality_prediction", {}).get("is_good_part"),
            "predicted_defects": results.get("defect_risks"),

            # Actual outcomes (for supervised learning)
            "actual_quality_outcome": actual_quality_outcome,
            "actual_quality_score": 1.0 if actual_quality_outcome == "good" else
                                   0.7 if actual_quality_outcome == "acceptable" else
                                   0.3 if actual_quality_outcome == "defective" else 0.0,
            "actual_defects": actual_defects or {},

            # Whether this is labeled data (has actual outcomes)
            "is_labeled": actual_quality_outcome is not None
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
        logs.append(training_entry)

        # Save updated logs
        with open(log_path, 'w') as f:
            json.dump(logs, f, indent=2)

        labeled_count = sum(1 for log in logs if log.get("is_labeled", False))

        print(f"✓ Process data recorded to {log_path}")
        print(f"  System learning database updated")

        return {
            "logged": True,
            "log_file": str(log_path),
            "total_entries": len(logs),
            "labeled_entries": labeled_count,
            "ready_for_retraining": labeled_count >= 50
        }

    def load_production_data_for_training(self, log_file="ml_training_data.json",
                                         min_labeled_samples=50):
        """
        Load production data and convert to training format

        Args:
            log_file: Path to training data log file
            min_labeled_samples: Minimum number of labeled samples required

        Returns:
            List of training data dictionaries or None if insufficient data
        """
        log_path = Path("logs") / log_file

        if not log_path.exists():
            print(f"No training data found at {log_path}")
            return None

        try:
            with open(log_path, 'r') as f:
                logs = json.load(f)
        except json.JSONDecodeError:
            print(f"Error: Could not parse {log_path}")
            return None

        # Filter for labeled data only
        labeled_logs = [log for log in logs if log.get("is_labeled", False)]

        if len(labeled_logs) < min_labeled_samples:
            print(f"Insufficient labeled data: {len(labeled_logs)} < {min_labeled_samples}")
            return None

        # Convert to training data format
        training_data = []
        for log in labeled_logs:
            # Calculate optimal parameters based on actual outcome
            quality_score = log.get("actual_quality_score", 0.5)

            # If production was good, use actual parameters as "optimal"
            # If production was bad, adjust parameters slightly (simple heuristic)
            optimal_temperature = log["temperature"]
            optimal_flow_rate = log["flow_rate"]

            if quality_score < 0.5:
                # Bad outcome - suggest modifications
                optimal_temperature = np.clip(log["temperature"] + np.random.normal(0, 3), 15, 45)
                optimal_flow_rate = np.clip(log["flow_rate"] + np.random.normal(0, 5), 5, 100)

            # Extract defect probabilities from actual defects
            actual_defects = log.get("actual_defects", {})
            void_probability = 0.8 if actual_defects.get("voids", False) else 0.1
            short_shot_probability = 0.8 if actual_defects.get("short_shot", False) else 0.1
            flash_probability = 0.8 if actual_defects.get("flash", False) else 0.1
            surface_defect_probability = 0.8 if actual_defects.get("surface_defects", False) else 0.1

            training_data.append({
                # Input features
                'pipe_length': log["pipe_length"],
                'pipe_diameter': log["pipe_diameter"],
                'temperature': log["temperature"],
                'flow_rate': log["flow_rate"],
                'viscosity': log["viscosity"],
                'density': log["density"],
                'flow_index': log["flow_index"],
                'activation_energy': log["activation_energy"],

                # Calculated outputs
                'required_pressure': log["required_pressure"],
                'reynolds_number': log["reynolds_number"],
                'quality_score': quality_score,
                'is_good_part': quality_score > 0.6,

                # Defect probabilities from actual data
                'void_probability': void_probability,
                'short_shot_probability': short_shot_probability,
                'flash_probability': flash_probability,
                'surface_defect_probability': surface_defect_probability,

                # Optimal parameters
                'optimal_temperature': optimal_temperature,
                'optimal_flow_rate': optimal_flow_rate,
            })

        print(f"✓ Process data prepared for model adaptation")
        return training_data

    def retrain_with_production_data(self, production_log_file="ml_training_data.json",
                                    combine_with_synthetic=True, min_labeled_samples=50):
        """
        Retrain ML models using accumulated production data

        Args:
            production_log_file: Path to production training data log
            combine_with_synthetic: Whether to combine with synthetic data
            min_labeled_samples: Minimum labeled samples required for retraining

        Returns:
            Dictionary with retraining results and metrics
        """
        # Load production data
        production_data = self.load_production_data_for_training(
            production_log_file, min_labeled_samples
        )

        if production_data is None:
            return {
                "success": False,
                "message": f"Insufficient production data (need at least {min_labeled_samples} labeled samples)"
            }

        # Optionally combine with physics-based data
        training_data = production_data.copy()
        if combine_with_synthetic:
            physics_data = self.generate_synthetic_training_data(
                n_samples=max(500, len(production_data) * 2)
            )
            training_data.extend(physics_data)
            print(f"Enhanced with physics-based process models")

        # Train models
        print("\n=== Retraining ML Models with Production Data ===")
        metrics = self.train_models(training_data)

        # Save the retrained models
        self.save_models(f"models_retrained_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pkl")

        return {
            "success": True,
            "production_samples": len(production_data),
            "synthetic_samples": len(physics_data) if combine_with_synthetic else 0,
            "total_samples": len(training_data),
            "metrics": metrics,
            "retrained_at": datetime.now().isoformat()
        }

    def save_models(self, filename="ml_models.pkl"):
        """
        Save trained models and scalers to file

        Args:
            filename: Name of file to save models to

        Returns:
            Dictionary with save status
        """
        if not self.is_trained:
            return {
                "success": False,
                "message": "Models not trained yet"
            }

        # Create models directory if it doesn't exist
        models_dir = Path("models")
        models_dir.mkdir(exist_ok=True)
        model_path = models_dir / filename

        # Package all models and scalers
        model_package = {
            "parameter_optimizer": self.parameter_optimizer,
            "quality_classifier": self.quality_classifier,
            "defect_predictor": self.defect_predictor,
            "pressure_predictor": self.pressure_predictor,
            "param_scaler": self.param_scaler,
            "quality_scaler": self.quality_scaler,
            "defect_scaler": self.defect_scaler,
            "pressure_scaler": self.pressure_scaler,
            "training_data_size": len(self.training_data),
            "saved_at": datetime.now().isoformat()
        }

        # Save to file
        with open(model_path, 'wb') as f:
            pickle.dump(model_package, f)

        file_size = model_path.stat().st_size / 1024  # KB

        print(f"✓ Models saved to {model_path} ({file_size:.1f} KB)")

        return {
            "success": True,
            "model_file": str(model_path),
            "file_size_kb": round(file_size, 1),
            "training_data_size": len(self.training_data)
        }

    def load_models(self, filename="ml_models.pkl"):
        """
        Load pre-trained models from file

        Args:
            filename: Name of file to load models from

        Returns:
            Dictionary with load status
        """
        model_path = Path("models") / filename

        if not model_path.exists():
            return {
                "success": False,
                "message": f"Model file not found: {model_path}"
            }

        # Load model package
        with open(model_path, 'rb') as f:
            model_package = pickle.load(f)

        # Restore all models and scalers
        self.parameter_optimizer = model_package["parameter_optimizer"]
        self.quality_classifier = model_package["quality_classifier"]
        self.defect_predictor = model_package["defect_predictor"]
        self.pressure_predictor = model_package["pressure_predictor"]
        self.param_scaler = model_package["param_scaler"]
        self.quality_scaler = model_package["quality_scaler"]
        self.defect_scaler = model_package["defect_scaler"]
        self.pressure_scaler = model_package["pressure_scaler"]
        self.is_trained = True

        print(f"✓ Models loaded from {model_path}")
        print(f"  Model ready for predictions")
        print(f"  Last updated: {model_package['saved_at']}")

        return {
            "success": True,
            "model_file": str(model_path),
            "training_data_size": model_package["training_data_size"],
            "saved_at": model_package["saved_at"]
        }

    def get_training_statistics(self, production_log_file="ml_training_data.json"):
        """
        Get statistics about available training data

        Args:
            production_log_file: Path to production training data log

        Returns:
            Dictionary with training data statistics
        """
        log_path = Path("logs") / production_log_file

        if not log_path.exists():
            return {
                "total_entries": 0,
                "labeled_entries": 0,
                "ready_for_training": False,
                "message": "No training data found"
            }

        try:
            with open(log_path, 'r') as f:
                logs = json.load(f)
        except json.JSONDecodeError:
            return {
                "error": "Could not parse training data file"
            }

        labeled_logs = [log for log in logs if log.get("is_labeled", False)]

        # Quality distribution
        quality_distribution = {
            "good": 0,
            "acceptable": 0,
            "defective": 0,
            "failed": 0
        }

        for log in labeled_logs:
            outcome = log.get("actual_quality_outcome")
            if outcome in quality_distribution:
                quality_distribution[outcome] += 1

        # Defect analysis
        defect_counts = {
            "voids": 0,
            "short_shot": 0,
            "flash": 0,
            "surface_defects": 0
        }

        for log in labeled_logs:
            defects = log.get("actual_defects", {})
            for defect_type in defect_counts.keys():
                if defects.get(defect_type, False):
                    defect_counts[defect_type] += 1

        return {
            "total_entries": len(logs),
            "labeled_entries": len(labeled_logs),
            "unlabeled_entries": len(logs) - len(labeled_logs),
            "ready_for_training": len(labeled_logs) >= 50,
            "quality_distribution": quality_distribution,
            "defect_counts": defect_counts,
            "date_range": {
                "first_entry": logs[0].get("timestamp") if logs else None,
                "last_entry": logs[-1].get("timestamp") if logs else None
            }
        }


# Global instance
ml_optimizer = ProcessOptimizerML()


def initialize_ml_models():
    """Initialize and train ML models (call this once)"""
    print("Initializing ML models for process optimization...")
    metrics = ml_optimizer.train_models()
    print(f"✓ ML models initialized and ready")
    print(f"  Quality prediction accuracy: {metrics['quality_accuracy']*100:.1f}%")
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
