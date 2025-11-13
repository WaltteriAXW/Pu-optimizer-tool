"""
Comprehensive Model Evaluation Framework
Provides cross-validation, metrics reporting, and performance analysis
"""

from sklearn.model_selection import cross_validate, learning_curve
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
    mean_squared_error, mean_absolute_error, r2_score
)
import numpy as np


class ModelEvaluator:
    """Comprehensive model evaluation with cross-validation and metrics"""

    @staticmethod
    def evaluate_classifier(model, X, y, cv=5, model_name="Classifier"):
        """
        Cross-validation evaluation for classification models

        Args:
            model: Trained classifier
            X: Feature matrix
            y: Target labels
            cv: Number of cross-validation folds
            model_name: Name for reporting

        Returns:
            dict: Evaluation report with metrics
        """

        scoring = {
            'accuracy': 'accuracy',
            'precision': 'precision',
            'recall': 'recall',
            'f1': 'f1',
            'roc_auc': 'roc_auc'
        }

        try:
            results = cross_validate(
                model, X, y, cv=cv, scoring=scoring,
                return_train_score=True, n_jobs=-1
            )

            report = {
                'model': model_name,
                'model_type': 'classifier',
                'metrics': {}
            }

            for metric in scoring:
                test_scores = results[f'test_{metric}']
                train_scores = results[f'train_{metric}']

                test_mean = test_scores.mean()
                test_std = test_scores.std()
                train_mean = train_scores.mean()

                report['metrics'][metric] = {
                    'test_mean': round(test_mean, 4),
                    'test_std': round(test_std, 4),
                    'train_mean': round(train_mean, 4),
                    'overfitting': round(train_mean - test_mean, 4),
                    'test_scores': test_scores.tolist()
                }

            return report

        except Exception as e:
            return {
                'model': model_name,
                'error': str(e),
                'metrics': {}
            }

    @staticmethod
    def evaluate_regressor(model, X, y, cv=5, model_name="Regressor"):
        """
        Cross-validation evaluation for regression models

        Args:
            model: Trained regressor
            X: Feature matrix
            y: Target values
            cv: Number of cross-validation folds
            model_name: Name for reporting

        Returns:
            dict: Evaluation report with metrics
        """

        scoring = {
            'neg_mse': 'neg_mean_squared_error',
            'neg_mae': 'neg_mean_absolute_error',
            'r2': 'r2'
        }

        try:
            results = cross_validate(
                model, X, y, cv=cv, scoring=scoring,
                return_train_score=True, n_jobs=-1
            )

            report = {
                'model': model_name,
                'model_type': 'regressor',
                'metrics': {}
            }

            # Convert negative scores back to positive
            for metric in scoring:
                test_scores = results[f'test_{metric}']
                train_scores = results[f'train_{metric}']

                # Invert negative metrics
                if 'neg_' in metric:
                    test_scores = -test_scores
                    train_scores = -train_scores
                    metric_name = metric.replace('neg_', '')
                else:
                    metric_name = metric

                test_mean = test_scores.mean()
                test_std = test_scores.std()
                train_mean = train_scores.mean()

                report['metrics'][metric_name] = {
                    'test_mean': round(test_mean, 4),
                    'test_std': round(test_std, 4),
                    'train_mean': round(train_mean, 4),
                    'overfitting': round(abs(train_mean - test_mean), 4),
                    'test_scores': test_scores.tolist()
                }

            # Add RMSE
            if 'mse' in report['metrics']:
                rmse = np.sqrt(report['metrics']['mse']['test_mean'])
                report['metrics']['rmse'] = {
                    'test_mean': round(rmse, 4),
                    'test_std': 0.0,
                    'train_mean': 0.0,
                    'overfitting': 0.0
                }

            return report

        except Exception as e:
            return {
                'model': model_name,
                'error': str(e),
                'metrics': {}
            }

    @staticmethod
    def print_report(report):
        """
        Pretty print evaluation report

        Args:
            report: Evaluation report dict
        """
        print(f"\n{'='*70}")
        print(f"MODEL EVALUATION: {report['model']}")
        print(f"{'='*70}")

        if 'error' in report:
            print(f"\n❌ ERROR: {report['error']}")
            return

        model_type = report.get('model_type', 'unknown')
        print(f"Model Type: {model_type.upper()}")

        for metric, scores in report['metrics'].items():
            print(f"\n{metric.upper().replace('_', ' ')}:")
            print(f"  Train: {scores['train_mean']:.4f}")
            print(f"  Test:  {scores['test_mean']:.4f} ± {scores['test_std']:.4f}")

            overfitting = scores['overfitting']
            if overfitting > 0.1:
                print(f"  ⚠️  Overfitting detected: {overfitting:.4f}")
            elif overfitting > 0.05:
                print(f"  ⚡ Slight overfitting: {overfitting:.4f}")
            else:
                print(f"  ✓  Good generalization: {overfitting:.4f}")

        print(f"\n{'='*70}\n")

    @staticmethod
    def compare_models(reports):
        """
        Compare multiple model evaluation reports

        Args:
            reports: List of evaluation reports

        Returns:
            dict: Comparison summary
        """
        print(f"\n{'='*70}")
        print("MODEL COMPARISON")
        print(f"{'='*70}\n")

        # Extract common metrics
        all_metrics = set()
        for report in reports:
            all_metrics.update(report['metrics'].keys())

        for metric in sorted(all_metrics):
            print(f"\n{metric.upper().replace('_', ' ')}:")
            print(f"  {'Model':<30} {'Test Score':<15} {'Overfitting':<15}")
            print(f"  {'-'*60}")

            for report in reports:
                if metric in report['metrics']:
                    scores = report['metrics'][metric]
                    model_name = report['model'][:28]
                    test_score = f"{scores['test_mean']:.4f} ± {scores['test_std']:.4f}"
                    overfitting = f"{scores['overfitting']:.4f}"

                    print(f"  {model_name:<30} {test_score:<15} {overfitting:<15}")

        print(f"\n{'='*70}\n")

    @staticmethod
    def get_learning_curves(model, X, y, cv=5, train_sizes=None):
        """
        Generate learning curves to diagnose bias/variance

        Args:
            model: Model to evaluate
            X: Feature matrix
            y: Target values
            cv: Cross-validation folds
            train_sizes: Array of training set sizes to evaluate

        Returns:
            dict: Learning curve data
        """
        if train_sizes is None:
            train_sizes = np.linspace(0.1, 1.0, 10)

        try:
            train_sizes_abs, train_scores, test_scores = learning_curve(
                model, X, y, cv=cv, train_sizes=train_sizes,
                n_jobs=-1, random_state=42
            )

            return {
                'train_sizes': train_sizes_abs.tolist(),
                'train_scores_mean': train_scores.mean(axis=1).tolist(),
                'train_scores_std': train_scores.std(axis=1).tolist(),
                'test_scores_mean': test_scores.mean(axis=1).tolist(),
                'test_scores_std': test_scores.std(axis=1).tolist()
            }
        except Exception as e:
            print(f"Error generating learning curves: {e}")
            return None

    @staticmethod
    def get_feature_importance(model, feature_names=None):
        """
        Extract feature importance from model

        Args:
            model: Trained model with feature_importances_ attribute
            feature_names: List of feature names

        Returns:
            dict: Feature importance scores
        """
        try:
            # Handle ensemble models
            if hasattr(model, 'estimators_'):
                importances = model.feature_importances_
            elif hasattr(model, 'base_estimator'):
                importances = model.base_estimator.feature_importances_
            elif hasattr(model, 'feature_importances_'):
                importances = model.feature_importances_
            else:
                return None

            if feature_names is None:
                feature_names = [f'feature_{i}' for i in range(len(importances))]

            # Sort by importance
            indices = np.argsort(importances)[::-1]

            result = {
                'features': [feature_names[i] for i in indices],
                'importances': importances[indices].tolist()
            }

            return result

        except Exception as e:
            print(f"Error extracting feature importance: {e}")
            return None
