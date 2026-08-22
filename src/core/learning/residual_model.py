"""
Learning where the physics and the parts disagree.

This deliberately does NOT predict pressure, temperature or flow — the physics already
computes those, and a model fitted to their output can only reproduce them. What it predicts
is the outcome the physics cannot know: whether the part came out good, given the inputs and
what the physics said would happen. That residual is the only thing worth learning.

It is also why this module refuses to answer for a long time. A model needs shots that people
have actually looked at, and those accumulate at the rate parts are made. The module this
replaces claimed in its docstring to be "Trained on 5000+ synthetic samples" while its weights
were random and no training code existed anywhere in the file. Refusing is not a limitation
here; it is the correct answer until the data exists.

scikit-learn is available in the Pyodide distribution but is NOT loaded at boot — the caller
loads it on demand, so the calculation path stays package-free.
"""

from typing import Any, Dict, List, Optional

# Below this many labelled shots, any model is fitting noise. Chosen so that the smaller
# outcome classes have some chance of being represented at all, not from a power calculation —
# it is a floor against nonsense, not a guarantee of significance.
MIN_LABELLED_SHOTS = 50

# Held out to score the model. With a dataset this small a single split is noisy, so the
# score is reported as indicative rather than as a claim.
TEST_FRACTION = 0.25

GOOD_OUTCOME = 'good'


class NotEnoughData(Exception):
    """Raised rather than returning a model fitted to too few shots."""

    def __init__(self, labelled: int, required: int = MIN_LABELLED_SHOTS):
        self.labelled = labelled
        self.required = required
        super().__init__(
            f'{labelled} labelled shots; {required} needed. '
            f'Record how {required - labelled} more parts came out.'
        )


def extract_features(record: Dict[str, Any]) -> Optional[List[float]]:
    """
    The inputs a person controls, plus what the physics predicted from them.

    Including the physics output is the point: the model sees the prediction and learns where
    it goes wrong, rather than rediscovering it. A record missing any of these is dropped —
    imputing a plausible value would be inventing a shot that never happened.
    """
    params = record.get('parameters') or {}
    results = record.get('results') or {}
    flow = results.get('flow') or {}
    pressure = results.get('pressure') or {}
    thermal = results.get('thermal') or {}

    values = [
        params.get('pipe_length_mm'),
        params.get('pipe_diameter_mm'),
        params.get('temperature_c'),
        params.get('flow_rate_lpm'),
        flow.get('reynolds_number'),
        flow.get('apparent_viscosity_cp'),
        flow.get('shear_rate_s_inv'),
        pressure.get('pressure_with_fittings_bar'),
        thermal.get('current_viscosity_cp') or flow.get('apparent_viscosity_cp'),
    ]

    if any(v is None or isinstance(v, bool) for v in values):
        return None
    try:
        return [float(v) for v in values]
    except (TypeError, ValueError):
        return None


FEATURE_NAMES = [
    'pipe_length_mm',
    'pipe_diameter_mm',
    'temperature_c',
    'flow_rate_lpm',
    'reynolds_number',
    'apparent_viscosity_cp',
    'shear_rate_s_inv',
    'pressure_with_fittings_bar',
    'viscosity_at_temperature_cp',
]


def prepare_dataset(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Turn stored records into a feature matrix and labels, counting what was dropped.

    Reporting the drops matters: a dataset that looks large but is mostly unusable should say
    so rather than quietly training on a fraction of it.
    """
    features: List[List[float]] = []
    labels: List[int] = []
    unlabelled = 0
    incomplete = 0

    for record in records:
        outcome = record.get('outcome')
        if not outcome or outcome == 'unrecorded':
            unlabelled += 1
            continue

        row = extract_features(record)
        if row is None:
            incomplete += 1
            continue

        features.append(row)
        labels.append(1 if outcome == GOOD_OUTCOME else 0)

    return {
        'features': features,
        'labels': labels,
        'labelled': len(features),
        'unlabelled': unlabelled,
        'incomplete': incomplete,
        'good': sum(labels),
        'bad': len(labels) - sum(labels),
    }


def readiness(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Whether a model could be trained, and what is missing if not.

    Answering this without importing scikit-learn keeps the common case — being nowhere near
    enough data — free of a package download.
    """
    data = prepare_dataset(records)
    shortfall = max(0, MIN_LABELLED_SHOTS - data['labelled'])

    reasons = []
    if shortfall > 0:
        reasons.append(
            f'{shortfall} more labelled shots needed '
            f'({data["labelled"]} of {MIN_LABELLED_SHOTS})'
        )
    if data['labelled'] >= MIN_LABELLED_SHOTS and (data['good'] == 0 or data['bad'] == 0):
        # Everything good or everything bad teaches nothing: a model would score perfectly by
        # always answering the same way.
        reasons.append(
            'every recorded shot has the same outcome — a model needs both good and bad parts'
        )

    return {
        'ready': not reasons,
        'reasons': reasons,
        'labelled': data['labelled'],
        'unlabelled': data['unlabelled'],
        'incomplete': data['incomplete'],
        'good': data['good'],
        'bad': data['bad'],
        'required': MIN_LABELLED_SHOTS,
    }


def train(records: List[Dict[str, Any]], random_state: int = 0) -> Dict[str, Any]:
    """
    Fit a model on the recorded outcomes.

    Raises NotEnoughData rather than returning something that looks like a result. The caller
    is expected to have checked `readiness` first; this raises anyway, because the check being
    skipped is exactly how a model trained on nine samples ends up on screen.

    scikit-learn is imported here, not at module load, so importing this module costs nothing
    in the browser until someone actually asks for training.
    """
    state = readiness(records)
    if not state['ready']:
        raise NotEnoughData(state['labelled'])

    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, confusion_matrix

    data = prepare_dataset(records)
    X, y = data['features'], data['labels']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_FRACTION, random_state=random_state, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=200,
        min_samples_leaf=2,
        random_state=random_state,
        class_weight='balanced',
    )
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    return {
        'trained': True,
        'samples': len(y),
        'held_out': len(y_test),
        'accuracy': float(accuracy_score(y_test, predictions)),
        'confusion': confusion_matrix(y_test, predictions).tolist(),
        'feature_importance': dict(
            zip(FEATURE_NAMES, [float(v) for v in model.feature_importances_])
        ),
        # Said plainly because a single split of a few dozen samples is a weak estimate, and
        # an accuracy figure with no caveat invites more trust than it has earned.
        'caveat': (
            f'Scored on {len(y_test)} held-out shots. With a dataset this small the figure '
            f'moves substantially between splits — read it as a sign of life, not a '
            f'measure of accuracy.'
        ),
        'model': model,
    }
