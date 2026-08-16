"""
Tests for the blowing agent volatility check.

The case that matters: ecomate® is methyl formate, boiling at 31.5 °C, and the data sheets
specify polyol temperatures of 25-30 °C. The margin in normal operation is a couple of
degrees, so this has to be right at the boundary rather than only at extremes.
"""

import pytest

from ..data.blowing_agents import get_blowing_agent, normalise_agent_name
from .volatility import (
    STATUS_FLASH_RISK,
    STATUS_MARGINAL,
    STATUS_NOT_VOLATILE,
    STATUS_OK,
    STATUS_UNKNOWN_AGENT,
    check_blowing_agent_volatility,
)


class TestAgentLookup:
    @pytest.mark.parametrize('text,expected', [
        ('ecomate®', 'ecomate'),
        ('Ecomate', 'ecomate'),
        ('ecomate blown', 'ecomate'),
        ('Water-blown', 'water'),
        ('water', 'water'),
        ('Pentane', 'pentane'),
        ('HFO-1233zd', 'hfo'),
    ])
    def test_csv_text_resolves_to_an_agent(self, text, expected):
        assert normalise_agent_name(text) == expected

    def test_unrecognised_text_resolves_to_nothing(self):
        assert normalise_agent_name('some new agent') is None
        assert normalise_agent_name('') is None
        assert normalise_agent_name(None) is None

    def test_methyl_formate_boiling_point(self):
        agent = get_blowing_agent('ecomate®')
        assert agent.is_volatile is True
        assert agent.boiling_point_c == 31.5


class TestWaterBlown:
    """A chemically blown system has nothing to flash off."""

    @pytest.mark.parametrize('temperature_c', [5, 25, 50])
    def test_never_flags_at_any_temperature(self, temperature_c):
        result = check_blowing_agent_volatility('Water-blown', temperature_c)

        assert result['status'] == STATUS_NOT_VOLATILE
        assert result['warning'] is None

    def test_reports_no_volatile_agent_rather_than_a_pass(self):
        """'Passed a check' would be misleading — there is no check to pass."""
        result = check_blowing_agent_volatility('Water-blown', 25)

        assert result['status'] != STATUS_OK
        assert result['is_volatile'] is False
        assert 'no dissolved volatile agent' in result['message']


class TestPhysicallyBlown:
    """ecomate® at 31.5 °C, against data sheet polyol temperatures of 25-30 °C."""

    def test_comfortably_below_boiling(self):
        result = check_blowing_agent_volatility('ecomate®', 25)

        assert result['status'] == STATUS_OK
        assert result['temperature_margin_c'] == pytest.approx(6.5)
        assert result['warning'] is None

    def test_close_to_boiling_warns(self):
        result = check_blowing_agent_volatility('ecomate®', 28)

        assert result['status'] == STATUS_MARGINAL
        assert result['warning'] is not None
        assert '31.5' in result['warning']

    def test_above_boiling_flags_flash_risk(self):
        result = check_blowing_agent_volatility('ecomate®', 35)

        assert result['status'] == STATUS_FLASH_RISK
        assert result['temperature_margin_c'] < 0
        assert 'flash out of solution' in result['warning']

    def test_exactly_at_boiling_is_a_risk_not_a_pass(self):
        result = check_blowing_agent_volatility('ecomate®', 31.5)

        assert result['status'] == STATUS_FLASH_RISK

    def test_warning_names_the_agent_and_its_boiling_point(self):
        result = check_blowing_agent_volatility('ecomate®', 35)

        assert 'methyl formate' in result['warning']
        assert '31.5' in result['warning']


class TestUnevaluatedIsNotSafe:
    """Absent data must read as 'not evaluated', never as a pass."""

    def test_unknown_agent(self):
        result = check_blowing_agent_volatility('brand new agent', 25)

        assert result['status'] == STATUS_UNKNOWN_AGENT
        assert result['warning'] is None
        assert 'not evaluated' in result['message']

    def test_vapour_pressure_margin_is_none_without_sourced_constants(self):
        """No Antoine constants are on file, so the pressure margin is not evaluated.

        None here means unknown. It must never be read as zero or as adequate margin.
        """
        result = check_blowing_agent_volatility('ecomate®', 25, line_pressure_bar=5.0)

        assert result['vapour_pressure_bar'] is None
        assert result['pressure_margin_bar'] is None
