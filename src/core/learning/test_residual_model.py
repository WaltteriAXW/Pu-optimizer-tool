"""
Tests for the residual model.

The order here is deliberate: refusal is tested first and most thoroughly, because refusing
is what this module will actually do for months. A model trained on real production shots
cannot be tested at all yet — there are none — so what is pinned is the machinery and,
above all, the guard against producing a number from too little data.
"""

import pytest

from . import residual_model
from .residual_model import (
    MIN_LABELLED_SHOTS,
    NotEnoughData,
    extract_features,
    prepare_dataset,
    readiness,
    train,
)


def make_record(outcome='good', flow_rate=5.0, diameter=12.0, reynolds=57.5):
    """A stored record of the shape ShotRecordStore writes."""
    return {
        'id': f'{outcome}-{flow_rate}-{diameter}',
        'timestamp': '2026-08-21T00:00:00.000Z',
        'outcome': outcome,
        'notes': '',
        'parameters': {
            'pipe_length_mm': 500.0,
            'pipe_diameter_mm': diameter,
            'temperature_c': 25.0,
            'flow_rate_lpm': flow_rate,
        },
        'results': {
            'flow': {
                'reynolds_number': reynolds,
                'apparent_viscosity_cp': 447.6,
                'shear_rate_s_inv': 491.0,
            },
            'pressure': {'pressure_with_fittings_bar': 0.17},
            'thermal': {'current_viscosity_cp': 447.6},
        },
    }


class TestRefusing:
    """What the module does for as long as there is no dataset."""

    def test_an_empty_dataset_is_not_ready(self):
        state = readiness([])
        assert state['ready'] is False
        assert state['labelled'] == 0
        assert f'{MIN_LABELLED_SHOTS} more labelled shots needed' in state['reasons'][0]

    def test_training_on_nothing_raises_rather_than_returning_a_model(self):
        with pytest.raises(NotEnoughData):
            train([])

    def test_one_short_of_the_threshold_still_refuses(self):
        records = [
            make_record('good' if i % 2 else 'voids', flow_rate=5.0 + i)
            for i in range(MIN_LABELLED_SHOTS - 1)
        ]
        assert readiness(records)['ready'] is False
        with pytest.raises(NotEnoughData):
            train(records)

    def test_unrecorded_shots_do_not_count_toward_the_threshold(self):
        # A run is saved the moment it is calculated. Counting those would let the model
        # declare itself ready purely from people pressing the button.
        records = [make_record('unrecorded', flow_rate=float(i)) for i in range(500)]
        state = readiness(records)

        assert state['ready'] is False
        assert state['labelled'] == 0
        assert state['unlabelled'] == 500

    def test_all_one_outcome_is_refused_even_above_the_threshold(self):
        # Every part good means a model scores perfectly by always saying "good", which
        # teaches nothing and reads as an excellent result.
        records = [
            make_record('good', flow_rate=5.0 + i) for i in range(MIN_LABELLED_SHOTS + 10)
        ]
        state = readiness(records)

        assert state['ready'] is False
        assert any('same outcome' in reason for reason in state['reasons'])
        with pytest.raises(NotEnoughData):
            train(records)

    def test_the_shortfall_message_names_a_number_to_act_on(self):
        records = [
            make_record('good' if i % 2 else 'voids', flow_rate=5.0 + i) for i in range(12)
        ]
        state = readiness(records)
        assert '38 more labelled shots needed (12 of 50)' in state['reasons'][0]

    def test_readiness_needs_no_scikit_learn(self, monkeypatch):
        """
        The common case must not pull a package down. Blocking the import and calling
        readiness proves it is not reached.
        """
        import builtins

        real_import = builtins.__import__

        def blocked(name, *args, **kwargs):
            if name.startswith('sklearn'):
                raise AssertionError('readiness must not import scikit-learn')
            return real_import(name, *args, **kwargs)

        monkeypatch.setattr(builtins, '__import__', blocked)
        assert readiness([])['ready'] is False


class TestFeatures:
    def test_a_record_yields_one_value_per_named_feature(self):
        row = extract_features(make_record())
        assert row is not None
        assert len(row) == len(residual_model.FEATURE_NAMES)

    def test_the_physics_prediction_is_a_feature(self):
        # The whole design: the model sees what the physics said and learns where it is
        # wrong, rather than rediscovering the physics.
        assert 'reynolds_number' in residual_model.FEATURE_NAMES
        assert 'pressure_with_fittings_bar' in residual_model.FEATURE_NAMES

    def test_an_incomplete_record_is_dropped_not_filled_in(self):
        record = make_record()
        del record['results']['pressure']
        assert extract_features(record) is None

        data = prepare_dataset([record])
        assert data['labelled'] == 0
        assert data['incomplete'] == 1

    def test_outcomes_collapse_to_good_against_everything_else(self):
        data = prepare_dataset([
            make_record('good'),
            make_record('voids', flow_rate=6.0),
            make_record('scorch', flow_rate=7.0),
        ])
        assert data['labels'] == [1, 0, 0]
        assert data['good'] == 1
        assert data['bad'] == 2


class TestTraining:
    """
    That the path works mechanically, on records constructed for the purpose.

    This says nothing about whether a model would be any good on real shots — there are none
    yet, and there will not be for months. It says the code runs, splits, fits and scores.
    """

    @staticmethod
    def dataset(n=80):
        # A separable pattern so the fit has something to find: high flow goes bad.
        records = []
        for i in range(n):
            flow = 5.0 + i
            good = flow < 40
            records.append(
                make_record(
                    'good' if good else 'voids',
                    flow_rate=flow,
                    reynolds=10.0 * flow,
                )
            )
        return records

    def test_a_sufficient_dataset_trains(self):
        pytest.importorskip('sklearn')
        result = train(self.dataset())

        assert result['trained'] is True
        assert result['samples'] == 80
        assert result['held_out'] > 0
        assert 0.0 <= result['accuracy'] <= 1.0

    def test_it_reports_a_caveat_rather_than_a_bare_accuracy(self):
        pytest.importorskip('sklearn')
        result = train(self.dataset())

        assert 'caveat' in result
        assert str(result['held_out']) in result['caveat']

    def test_feature_importance_is_named_not_positional(self):
        pytest.importorskip('sklearn')
        result = train(self.dataset())

        assert set(result['feature_importance']) == set(residual_model.FEATURE_NAMES)

    def test_training_is_reproducible_for_a_given_seed(self):
        pytest.importorskip('sklearn')
        first = train(self.dataset(), random_state=7)
        second = train(self.dataset(), random_state=7)

        assert first['accuracy'] == second['accuracy']
