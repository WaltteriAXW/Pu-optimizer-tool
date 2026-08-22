"""
Learning from recorded shots.

Separate from core.modules because nothing here is physics: it exists to find where the
physics and the finished parts disagree. Nothing in this package is imported at boot, and
scikit-learn is loaded on demand inside train() rather than at module level.
"""

from .residual_model import (
    MIN_LABELLED_SHOTS,
    NotEnoughData,
    prepare_dataset,
    readiness,
    train,
)

__all__ = [
    'MIN_LABELLED_SHOTS',
    'NotEnoughData',
    'prepare_dataset',
    'readiness',
    'train',
]
