"""
ML Module - Machine Learning components for polyurethane optimization.

Exports:
- NNSurrogateCalculator: Fast neural network surrogate model
- MLEnsemble: Unified interface for all ML models
- ModelType: Enum of available model types
"""

from .nn_surrogate import (
    NNSurrogateCalculator,
    SimpleNeuralNetwork,
    NNPrediction,
    PredictionConfidence,
)

from .ml_ensemble import (
    MLEnsemble,
    ModelType,
    EnsemblePrediction,
    get_ensemble,
)

__all__ = [
    # NN Surrogate
    'NNSurrogateCalculator',
    'SimpleNeuralNetwork',
    'NNPrediction',
    'PredictionConfidence',
    # ML Ensemble
    'MLEnsemble',
    'ModelType',
    'EnsemblePrediction',
    'get_ensemble',
]
