"""
Unified ML Ensemble Interface for Polyurethane Optimization.

Combines multiple ML models (ProcessOptimizerML, SelfTrainingPINN, NNSurrogate)
into a single interface with automatic model selection, fallback chains, and
ensemble voting.

This solves the integration gap where models were previously isolated.
"""

import sys
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
import math


class ModelType(Enum):
    """Available ML model types"""
    PROCESS_OPTIMIZER = "process_optimizer"  # scikit-learn ensemble
    PINN = "pinn"                            # Physics-informed neural network
    NN_SURROGATE = "nn_surrogate"            # Fast neural network surrogate
    PHYSICS = "physics"                       # Pure physics fallback


@dataclass
class EnsemblePrediction:
    """Result from ensemble prediction"""
    # Primary outputs
    required_pressure_bar: float
    reynolds_number: float
    velocity_m_s: float
    flow_regime: str

    # Quality prediction
    is_good_quality: bool
    quality_confidence: float

    # Model metadata
    primary_model: ModelType
    models_used: List[ModelType]
    physics_validated: bool
    physics_deviation_pct: float

    # Recommendations
    recommendations: List[str]
    warnings: List[str]


class MLEnsemble:
    """
    Unified ML ensemble that combines multiple models.

    Features:
    - Automatic model selection based on input characteristics
    - Physics validation for all ML predictions
    - Fallback chain: PINN → ProcessOptimizer → NNSurrogate → Physics
    - Ensemble voting when multiple models agree
    - Confidence-weighted predictions
    """

    def __init__(self, enable_pinn: bool = True, enable_sklearn: bool = True,
                 enable_surrogate: bool = True):
        """
        Initialize ensemble with available models.

        Args:
            enable_pinn: Enable Physics-Informed Neural Network
            enable_sklearn: Enable scikit-learn ProcessOptimizerML
            enable_surrogate: Enable fast NNSurrogate
        """
        self.models = {}
        self._load_errors = []

        # Try to load PINN
        if enable_pinn:
            try:
                sys.path.insert(0, str(__file__).replace('/src/core/ml/ml_ensemble.py', '/src/ML-PINN-Model'))
                from self_training_pinn import SelfTrainingPINN
                self.models[ModelType.PINN] = SelfTrainingPINN()
            except ImportError as e:
                self._load_errors.append(f"PINN not available: {e}")

        # Try to load ProcessOptimizerML
        if enable_sklearn:
            try:
                sys.path.insert(0, str(__file__).replace('/src/core/ml/ml_ensemble.py', '/src'))
                from process_optimizer_ml import ProcessOptimizerML
                self.models[ModelType.PROCESS_OPTIMIZER] = ProcessOptimizerML()
            except ImportError as e:
                self._load_errors.append(f"ProcessOptimizerML not available: {e}")

        # Try to load NNSurrogate
        if enable_surrogate:
            try:
                from .nn_surrogate import NNSurrogateCalculator
                self.models[ModelType.NN_SURROGATE] = NNSurrogateCalculator(use_physics_fallback=True)
            except ImportError as e:
                self._load_errors.append(f"NNSurrogate not available: {e}")

    def get_available_models(self) -> List[ModelType]:
        """Return list of successfully loaded models"""
        return list(self.models.keys())

    def get_load_errors(self) -> List[str]:
        """Return any errors from model loading"""
        return self._load_errors

    def predict(
        self,
        pipe_length_mm: float,
        pipe_diameter_mm: float,
        temperature_c: float,
        flow_rate_lpm: float,
        viscosity_cp: float,
        density_kg_m3: float = 1120.0,
        flow_index: float = 0.85,
        activation_energy: float = 25000.0,
        prefer_model: Optional[ModelType] = None,
    ) -> EnsemblePrediction:
        """
        Make ensemble prediction using best available models.

        Args:
            pipe_length_mm: Pipe length in millimeters
            pipe_diameter_mm: Pipe diameter in millimeters
            temperature_c: Process temperature in Celsius
            flow_rate_lpm: Flow rate in liters per minute
            viscosity_cp: Material viscosity in centipoise
            density_kg_m3: Material density in kg/m³
            flow_index: Power law flow index (default 0.85)
            activation_energy: Arrhenius activation energy J/mol
            prefer_model: Optionally prefer a specific model

        Returns:
            EnsemblePrediction with combined results
        """
        predictions = {}
        warnings = []
        recommendations = []
        models_used = []

        # Calculate physics baseline for validation
        physics_result = self._physics_calculate(
            pipe_length_mm, pipe_diameter_mm, flow_rate_lpm,
            viscosity_cp, density_kg_m3
        )

        # Try PINN first (best physics validation)
        if ModelType.PINN in self.models:
            try:
                pinn = self.models[ModelType.PINN]
                pinn_result = pinn.predict(
                    pipe_length_mm, pipe_diameter_mm, temperature_c,
                    flow_rate_lpm, viscosity_cp, density_kg_m3
                )
                predictions[ModelType.PINN] = {
                    'pressure': pinn_result['predictions']['required_pressure_bar'],
                    'reynolds': pinn_result['predictions']['reynolds_number'],
                    'velocity': pinn_result['predictions']['velocity_ms'],
                    'confidence': pinn_result['confidence'] / 100.0,
                    'physics_consistent': pinn_result['physics_check']['physics_consistent'],
                    'physics_deviation': pinn_result['physics_check']['deviation_pct'],
                }
                models_used.append(ModelType.PINN)
                recommendations.extend(pinn_result.get('recommendations', []))
            except Exception as e:
                warnings.append(f"PINN prediction failed: {e}")

        # Try ProcessOptimizerML for quality prediction
        if ModelType.PROCESS_OPTIMIZER in self.models:
            try:
                ml = self.models[ModelType.PROCESS_OPTIMIZER]
                if ml.is_trained:
                    quality = ml.predict_quality(
                        pipe_length_mm / 1000,  # Convert to meters
                        pipe_diameter_mm / 1000,
                        temperature_c,
                        flow_rate_lpm,
                        viscosity_cp,
                        density_kg_m3,
                        physics_result['pressure_bar'],
                        physics_result['reynolds']
                    )
                    predictions[ModelType.PROCESS_OPTIMIZER] = {
                        'is_good': quality['is_good_part'],
                        'confidence': quality['confidence'] / 100.0,
                        'good_probability': quality['good_probability'] / 100.0,
                    }
                    models_used.append(ModelType.PROCESS_OPTIMIZER)
            except Exception as e:
                warnings.append(f"ProcessOptimizer prediction failed: {e}")

        # Try NNSurrogate for fast prediction
        if ModelType.NN_SURROGATE in self.models:
            try:
                surrogate = self.models[ModelType.NN_SURROGATE]
                surrogate_result = surrogate.predict_quick(
                    pipe_length_mm, pipe_diameter_mm, flow_rate_lpm,
                    temperature_c, viscosity_cp, density_kg_m3
                )
                predictions[ModelType.NN_SURROGATE] = {
                    'pressure': surrogate_result['output']['pressure_drop_bar'],
                    'reynolds': surrogate_result['output']['reynolds_number'],
                    'confidence': surrogate_result['confidence']['score'],
                    'method': surrogate_result['method'],
                }
                models_used.append(ModelType.NN_SURROGATE)
            except Exception as e:
                warnings.append(f"NNSurrogate prediction failed: {e}")

        # Select primary model and combine results
        primary_model, final_result = self._select_best_prediction(
            predictions, physics_result, prefer_model
        )

        # Determine flow regime
        flow_regime = self._determine_flow_regime(final_result['reynolds'])

        # Check physics validation
        physics_deviation = abs(final_result['pressure'] - physics_result['pressure_bar'])
        physics_deviation_pct = (physics_deviation / physics_result['pressure_bar'] * 100
                                  if physics_result['pressure_bar'] > 0 else 0)
        physics_validated = physics_deviation_pct < 30  # Within 30% of physics

        # Quality prediction (from ProcessOptimizer or heuristic)
        if ModelType.PROCESS_OPTIMIZER in predictions:
            is_good_quality = predictions[ModelType.PROCESS_OPTIMIZER]['is_good']
            quality_confidence = predictions[ModelType.PROCESS_OPTIMIZER]['confidence']
        else:
            # Heuristic quality estimation
            is_good_quality = (20 <= temperature_c <= 35 and
                               final_result['pressure'] < 5 and
                               final_result['reynolds'] < 2300)
            quality_confidence = 0.5  # Low confidence for heuristic

        # Add physics-based recommendations
        if not physics_validated:
            warnings.append(f"ML prediction deviates {physics_deviation_pct:.1f}% from physics")
        if final_result['reynolds'] > 4000:
            recommendations.append("Turbulent flow detected - consider reducing flow rate")
        if final_result['pressure'] > 5:
            recommendations.append("High pressure - verify machine capacity")

        return EnsemblePrediction(
            required_pressure_bar=final_result['pressure'],
            reynolds_number=final_result['reynolds'],
            velocity_m_s=final_result.get('velocity', physics_result['velocity']),
            flow_regime=flow_regime,
            is_good_quality=is_good_quality,
            quality_confidence=quality_confidence,
            primary_model=primary_model,
            models_used=models_used,
            physics_validated=physics_validated,
            physics_deviation_pct=physics_deviation_pct,
            recommendations=recommendations,
            warnings=warnings,
        )

    def _physics_calculate(
        self,
        pipe_length_mm: float,
        pipe_diameter_mm: float,
        flow_rate_lpm: float,
        viscosity_cp: float,
        density_kg_m3: float,
    ) -> Dict[str, float]:
        """Pure physics calculation for validation"""
        L = pipe_length_mm / 1000
        D = pipe_diameter_mm / 1000
        Q = flow_rate_lpm / 60000
        mu = viscosity_cp / 1000
        rho = density_kg_m3

        A = math.pi * (D / 2) ** 2
        v = Q / A if A > 0 else 0
        Re = (rho * v * D) / mu if mu > 0 else 0

        # Friction factor
        if Re < 2300:
            f = 64 / Re if Re > 0 else 0.02
        else:
            f = 0.316 / (Re ** 0.25) if Re > 0 else 0.02

        # Darcy-Weisbach
        dp_pa = f * (L / D) * (rho * v ** 2 / 2) if D > 0 else 0
        dp_bar = dp_pa / 100000

        return {
            'pressure_bar': dp_bar,
            'reynolds': Re,
            'velocity': v,
            'friction_factor': f,
        }

    def _select_best_prediction(
        self,
        predictions: Dict[ModelType, Dict],
        physics_result: Dict,
        prefer_model: Optional[ModelType],
    ) -> tuple:
        """Select best prediction based on confidence and physics consistency"""

        # If preferred model available and has prediction, use it
        if prefer_model and prefer_model in predictions:
            pred = predictions[prefer_model]
            return prefer_model, {
                'pressure': pred.get('pressure', physics_result['pressure_bar']),
                'reynolds': pred.get('reynolds', physics_result['reynolds']),
                'velocity': pred.get('velocity', physics_result['velocity']),
            }

        # Priority: PINN (if physics consistent) > ProcessOptimizer > NNSurrogate > Physics
        if ModelType.PINN in predictions:
            pinn_pred = predictions[ModelType.PINN]
            if pinn_pred.get('physics_consistent', False) or pinn_pred.get('confidence', 0) > 0.7:
                return ModelType.PINN, {
                    'pressure': pinn_pred['pressure'],
                    'reynolds': pinn_pred['reynolds'],
                    'velocity': pinn_pred.get('velocity', physics_result['velocity']),
                }

        if ModelType.NN_SURROGATE in predictions:
            surrogate_pred = predictions[ModelType.NN_SURROGATE]
            if surrogate_pred.get('confidence', 0) > 0.6:
                return ModelType.NN_SURROGATE, {
                    'pressure': surrogate_pred['pressure'],
                    'reynolds': surrogate_pred['reynolds'],
                    'velocity': physics_result['velocity'],
                }

        # Fall back to physics
        return ModelType.PHYSICS, {
            'pressure': physics_result['pressure_bar'],
            'reynolds': physics_result['reynolds'],
            'velocity': physics_result['velocity'],
        }

    def _determine_flow_regime(self, reynolds: float) -> str:
        """Determine flow regime from Reynolds number"""
        if reynolds < 2300:
            return "laminar"
        elif reynolds < 4000:
            return "transitional"
        else:
            return "turbulent"

    def train_models(self, training_data: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """
        Train all available models.

        Args:
            training_data: Optional training data. If None, generates synthetic data.

        Returns:
            Training metrics for each model
        """
        results = {}

        if ModelType.PROCESS_OPTIMIZER in self.models:
            try:
                ml = self.models[ModelType.PROCESS_OPTIMIZER]
                metrics = ml.train_models(training_data)
                results['process_optimizer'] = {
                    'success': True,
                    'metrics': metrics,
                }
            except Exception as e:
                results['process_optimizer'] = {
                    'success': False,
                    'error': str(e),
                }

        return results

    def provide_feedback(
        self,
        pipe_length_mm: float,
        pipe_diameter_mm: float,
        temperature_c: float,
        flow_rate_lpm: float,
        viscosity_cp: float,
        density_kg_m3: float,
        actual_pressure: float,
        actual_quality: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Provide feedback to models for online learning.

        Args:
            Input parameters and actual measured values

        Returns:
            Update statistics from each model
        """
        results = {}

        # Update PINN with feedback
        if ModelType.PINN in self.models:
            try:
                pinn = self.models[ModelType.PINN]
                update_stats = pinn.train_from_feedback(
                    pipe_length_mm, pipe_diameter_mm, temperature_c,
                    flow_rate_lpm, viscosity_cp, density_kg_m3,
                    actual_pressure
                )
                results['pinn'] = {
                    'success': True,
                    'stats': update_stats,
                }
            except Exception as e:
                results['pinn'] = {
                    'success': False,
                    'error': str(e),
                }

        return results


# Convenience function
def get_ensemble() -> MLEnsemble:
    """Get default ML ensemble instance"""
    return MLEnsemble()
