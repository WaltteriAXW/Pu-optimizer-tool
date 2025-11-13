# ML Improvements - Implementation Guide

## Files Generated

1. **ML_ANALYSIS_SUMMARY.md** - Executive summary (quick read)
2. **ML_ANALYSIS_DETAILED.md** - Complete analysis with 7 recommendations and code examples
3. **IMPLEMENTATION_GUIDE.md** - This file: step-by-step implementation

---

## Quick Start

### Step 1: Update Dependencies (5 minutes)

```bash
# Add to requirements.txt:
xgboost>=1.7.0
scikit-optimize>=0.9.0
```

### Step 2: Create Model Evaluator (30 minutes)

Create `src/model_evaluator.py` with comprehensive evaluation framework.

### Step 3: Update ProcessOptimizerML (1 hour)

Modify `src/process_optimizer_ml.py`:
1. Add feature engineering function
2. Replace RandomForest with XGBoost ensemble
3. Add evaluation metrics

### Step 4: Test & Measure (1 hour)

Run benchmarks before/after to measure improvement.

---

## Detailed Implementation Steps

### PART 1: Feature Engineering (HIGH IMPACT)

**File**: `src/process_optimizer_ml.py`

**Add this function**:
```python
def create_engineered_features(training_data):
    """Create advanced engineered features"""
    from sklearn.preprocessing import PolynomialFeatures
    
    features_list = []
    for d in training_data:
        # Raw features
        base = [
            d['pipe_length'], d['pipe_diameter'], d['temperature'],
            d['flow_rate'], d['viscosity'], d['density'],
            d['required_pressure'], d['reynolds_number']
        ]
        
        # Interactions
        interactions = [
            d['temperature'] * d['viscosity'],  # Temp-viscosity
            d['pipe_length'] / (d['pipe_diameter'] + 1e-6),  # Geometry
            d['flow_rate'] * d['viscosity'],  # Shear stress
        ]
        
        # Temperature deviations from optimal (25°C)
        temp_dev = [
            abs(d['temperature'] - 25.0),
            (d['temperature'] - 25.0) ** 2
        ]
        
        all_features = base + interactions + temp_dev
        features_list.append(all_features)
    
    return np.array(features_list)

# In train_models(), replace raw features with:
X_engineered = create_engineered_features(training_data)
X_quality_scaled = self.quality_scaler.fit_transform(X_engineered)
```

**Expected Impact**: +2-4% accuracy

---

### PART 2: XGBoost Ensemble (HIGH IMPACT)

**File**: `src/process_optimizer_ml.py`

**Replace this**:
```python
# OLD: Single RandomForest
self.quality_classifier = RandomForestClassifier(
    n_estimators=100, max_depth=10, random_state=42
)
self.quality_classifier.fit(X_quality_scaled, y_quality)
```

**With this**:
```python
# NEW: XGBoost + Ensemble
from xgboost import XGBClassifier
from sklearn.ensemble import VotingClassifier
from sklearn.calibration import CalibratedClassifierCV

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

# Calibrate probabilities
self.quality_classifier = CalibratedClassifierCV(
    ensemble, method='sigmoid', cv=5
)

self.quality_classifier.fit(X_quality_scaled, y_quality)
```

**Expected Impact**: +3-5% accuracy

---

### PART 3: Comprehensive Evaluation (HIGH IMPACT)

**File**: Create `src/model_evaluator.py`

```python
from sklearn.model_selection import cross_validate, learning_curve
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report
)
import numpy as np

class ModelEvaluator:
    """Comprehensive model evaluation"""
    
    @staticmethod
    def evaluate(model, X, y, cv=5, model_name=""):
        """Cross-validation evaluation"""
        
        scoring = {
            'accuracy': 'accuracy',
            'precision': 'precision',
            'recall': 'recall',
            'f1': 'f1',
            'roc_auc': 'roc_auc'
        }
        
        results = cross_validate(
            model, X, y, cv=cv, scoring=scoring,
            return_train_score=True
        )
        
        report = {
            'model': model_name,
            'metrics': {}
        }
        
        for metric in scoring:
            test_mean = results[f'test_{metric}'].mean()
            test_std = results[f'test_{metric}'].std()
            train_mean = results[f'train_{metric}'].mean()
            
            report['metrics'][metric] = {
                'test_mean': test_mean,
                'test_std': test_std,
                'train_mean': train_mean,
                'overfitting': train_mean - test_mean
            }
        
        return report
    
    @staticmethod
    def print_report(report):
        """Pretty print evaluation report"""
        print(f"\n{'='*60}")
        print(f"MODEL EVALUATION: {report['model']}")
        print(f"{'='*60}")
        
        for metric, scores in report['metrics'].items():
            print(f"\n{metric.upper()}:")
            print(f"  Train: {scores['train_mean']:.3f}")
            print(f"  Test:  {scores['test_mean']:.3f} ± {scores['test_std']:.3f}")
            
            overfitting = scores['overfitting']
            if overfitting > 0.1:
                print(f"  ⚠️ Overfitting: {overfitting:.3f}")
```

**Usage in train_models()**:
```python
from model_evaluator import ModelEvaluator

evaluator = ModelEvaluator()
eval_report = evaluator.evaluate(
    self.quality_classifier,
    X_quality_scaled,
    y_quality,
    cv=5,
    model_name="Quality Classifier"
)
evaluator.print_report(eval_report)

# Store for metrics tracking
self.last_evaluation = eval_report
```

**Expected Impact**: Reveals overfitting/underfitting; baseline for improvements

---

### PART 4: Hyperparameter Optimization (MEDIUM IMPACT)

**File**: Create `src/hyperparameter_optimizer.py`

```python
from skopt import gp_minimize
from skopt.space import Integer, Real
from sklearn.model_selection import cross_val_score
import warnings
warnings.filterwarnings('ignore')

class HyperparameterOptimizer:
    """Bayesian optimization for hyperparameters"""
    
    @staticmethod
    def optimize_xgboost(X, y, cv=5, n_calls=50):
        """Optimize XGBoost hyperparameters"""
        
        space = [
            Integer(100, 300, name='n_estimators'),
            Integer(3, 12, name='max_depth'),
            Real(0.01, 0.3, name='learning_rate'),
            Real(0.5, 1.0, name='subsample'),
            Real(0.5, 1.0, name='colsample_bytree'),
            Real(0.0, 1.0, name='reg_alpha'),
            Real(0.0, 2.0, name='reg_lambda'),
        ]
        
        def objective(params):
            from xgboost import XGBClassifier
            
            model = XGBClassifier(
                n_estimators=int(params[0]),
                max_depth=int(params[1]),
                learning_rate=params[2],
                subsample=params[3],
                colsample_bytree=params[4],
                reg_alpha=params[5],
                reg_lambda=params[6],
                random_state=42
            )
            
            scores = cross_val_score(
                model, X, y, cv=cv, scoring='f1'
            )
            return -scores.mean()  # Minimize negative F1
        
        result = gp_minimize(
            objective,
            space,
            n_calls=n_calls,
            n_initial_points=10,
            random_state=42,
            verbose=1
        )
        
        best = {
            'n_estimators': int(result.x[0]),
            'max_depth': int(result.x[1]),
            'learning_rate': result.x[2],
            'subsample': result.x[3],
            'colsample_bytree': result.x[4],
            'reg_alpha': result.x[5],
            'reg_lambda': result.x[6],
            'best_score': -result.fun
        }
        
        return best
```

**Usage**:
```python
from hyperparameter_optimizer import HyperparameterOptimizer

# Once per model training cycle
best_params = HyperparameterOptimizer.optimize_xgboost(
    X_quality_scaled, y_quality, cv=5, n_calls=50
)

print(f"Best params: {best_params}")

xgb_clf = XGBClassifier(**best_params, random_state=42)
```

**Expected Impact**: +2-3% accuracy

---

### PART 5: Drift Detection (MEDIUM IMPACT)

**File**: Modify `src/self_training_pinn.py`

**Add to SelfTrainingPINN class**:
```python
def __init__(self, ...):
    # ... existing code ...
    self.performance_history = deque(maxlen=100)
    self.drift_threshold = 0.15  # 15% error increase

def detect_drift(self):
    """Detect data drift in online learning"""
    
    if len(self.performance_history) < 20:
        return None
    
    recent = list(self.performance_history)[-10:]
    older = list(self.performance_history)[:-10]
    
    recent_avg = np.mean(recent)
    older_avg = np.mean(older)
    
    if older_avg > 0:
        drift_ratio = (recent_avg - older_avg) / older_avg
        
        if drift_ratio > self.drift_threshold:
            return {
                'detected': True,
                'magnitude': drift_ratio,
                'old_avg': older_avg,
                'new_avg': recent_avg,
                'action': 'TRIGGER_RETRAINING'
            }
    
    return {'detected': False}

def train_from_feedback(self, ...):
    # ... existing update code ...
    
    # Track error in history
    self.performance_history.append(error)
    
    # Check for drift
    drift_check = self.detect_drift()
    if drift_check['detected']:
        print(f"⚠️ DATA DRIFT: Error increased from "
              f"{drift_check['old_avg']:.2f}% to "
              f"{drift_check['new_avg']:.2f}%")
```

**Expected Impact**: Better model governance and automated retraining

---

## Testing & Validation

### Before/After Metrics

**Create a test script**:
```python
# test_ml_improvements.py

from src.process_optimizer_ml import ProcessOptimizerML
from src.model_evaluator import ModelEvaluator
import numpy as np

# Test parameters
test_cases = [
    {'pipe_length': 500, 'pipe_diameter': 12, 'temperature': 25,
     'flow_rate': 30, 'viscosity': 350, 'density': 1120},
    {'pipe_length': 800, 'pipe_diameter': 10, 'temperature': 28,
     'flow_rate': 40, 'viscosity': 350, 'density': 1120},
    # Add more test cases...
]

# Initialize models
ml = ProcessOptimizerML()

# Train (old method vs new method)
metrics_old = ml.train_models()  # Before improvements
metrics_new = ml.train_models()  # After improvements

print(f"\nAccuracy Improvement: "
      f"{(metrics_new['quality_accuracy'] - metrics_old['quality_accuracy'])*100:.1f}%")
```

### Key Metrics to Track

```
Before Implementation:
- Quality Accuracy: ?
- Cross-validation: N/A
- Feature Count: 8
- Best Model: RandomForest
- Evaluation Metrics: Accuracy only

After Phase 1:
- Quality Accuracy: +3-5%
- Cross-validation: 5-fold with F1, ROC-AUC
- Feature Count: 13+
- Best Model: XGBoost Ensemble
- Evaluation Metrics: Accuracy, Precision, Recall, F1, ROC-AUC

After Phase 2:
- Quality Accuracy: +5-8%
- Hyperparameters: Optimized
- Model Registry: Versioning enabled
- Drift Detection: Active
```

---

## Implementation Checklist

### Phase 1 - Quick Wins (Week 1)
- [ ] Update requirements.txt with xgboost, scikit-optimize
- [ ] Create src/model_evaluator.py
- [ ] Add feature engineering to train_models()
- [ ] Replace RandomForest with XGBoost ensemble
- [ ] Add cross-validation evaluation
- [ ] Run before/after benchmarks
- [ ] Document baseline metrics

### Phase 2 - Medium Improvements (Week 2-3)
- [ ] Create src/hyperparameter_optimizer.py
- [ ] Run Bayesian optimization for each model
- [ ] Add drift detection to PINN
- [ ] Create src/model_registry.py for versioning
- [ ] Implement model comparison functionality
- [ ] Update metrics tracking

### Phase 3 - Polish (Week 4+)
- [ ] Replace custom PINN with PyTorch (optional)
- [ ] Add UI visualization of metrics
- [ ] Implement automated retraining pipeline
- [ ] Add monitoring dashboard
- [ ] Complete A/B testing framework

---

## Common Pitfalls to Avoid

1. **Data Leakage**: Don't normalize on full dataset before train/test split
2. **Overfitting**: Monitor cross-validation gap; use regularization
3. **Class Imbalance**: Use stratified sampling and appropriate metrics
4. **Feature Scaling**: Tree models don't need scaling, but calibration does
5. **Hyperparameter Search**: Don't search too long; diminishing returns after 50 iterations

---

## Debugging Guide

### Model not improving?
1. Check feature engineering quality - are interactions meaningful?
2. Verify cross-validation isn't too strict
3. Ensure hyperparameter search space is appropriate
4. Check data quality - outliers? Missing values?

### High overfitting?
1. Increase regularization (reg_alpha, reg_lambda in XGBoost)
2. Reduce max_depth
3. Use more data
4. Add dropout (if using neural networks)

### Drift detected but retraining slow?
1. Reduce n_calls in Bayesian optimization
2. Use incremental learning (partial_fit)
3. Implement mini-batch training

---

## Resources

- Full analysis: ML_ANALYSIS_DETAILED.md
- Quick reference: ML_ANALYSIS_SUMMARY.md
- XGBoost docs: https://xgboost.readthedocs.io/
- scikit-learn: https://scikit-learn.org/stable/
- scikit-optimize: https://scikit-optimize.github.io/

---

## Support & Questions

For each recommendation, refer to:
1. **ML_ANALYSIS_DETAILED.md** - Detailed code examples
2. **This file** - Step-by-step implementation
3. **Test with small dataset first** - Validate before full rollout

---

Last Updated: 2024
Expected Effort: 40-60 hours for full implementation
Expected Improvement: 7-15% better model performance
