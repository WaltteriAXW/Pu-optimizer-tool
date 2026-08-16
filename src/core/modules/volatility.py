"""
Blowing agent volatility check for the feed line.

A physically-blown polyurethane system carries its blowing agent dissolved in the polyol.
Two things keep it dissolved: staying below its boiling point, and keeping the line pressure
above its vapour pressure. Lose either and the agent flashes out of solution — the foam
loses density consistency and the pump cavitates.

This matters in normal operation, not just at extremes: ecomate® is methyl formate, boiling
at 31.5 °C, and data sheets specify polyol temperatures of 25-30 °C.

Water-blown systems are reported as having no volatile agent rather than as passing a check,
because there is nothing here for them to pass.
"""

from typing import Any, Dict, Optional

from ..data.blowing_agents import (
    ATMOSPHERIC_PRESSURE_BAR,
    MARGINAL_TEMPERATURE_MARGIN_C,
    get_blowing_agent,
)

# Status values
STATUS_NOT_VOLATILE = 'not_volatile'
STATUS_UNKNOWN_AGENT = 'unknown_agent'
STATUS_NO_DATA = 'no_boiling_point_data'
STATUS_OK = 'ok'
STATUS_MARGINAL = 'marginal'
STATUS_FLASH_RISK = 'flash_risk'


def check_blowing_agent_volatility(
    blowing_agent: Optional[str],
    temperature_c: float,
    line_pressure_bar: float = 0.0,
) -> Dict[str, Any]:
    """
    Check whether the blowing agent stays in solution at these conditions.

    Args:
        blowing_agent: The Blowing_Agent text from the material database
        temperature_c: Process temperature of the material (°C)
        line_pressure_bar: Gauge pressure in the line (bar), used for the vapour-pressure
            margin when constants are available

    Returns:
        Dict with status, a human-readable message, and the numbers behind them. Fields
        that could not be evaluated are None, never a stand-in value.
    """
    agent = get_blowing_agent(blowing_agent)

    if agent is None:
        return {
            'status': STATUS_UNKNOWN_AGENT,
            'agent': blowing_agent or 'Unknown',
            'is_volatile': None,
            'boiling_point_c': None,
            'temperature_margin_c': None,
            'vapour_pressure_bar': None,
            'pressure_margin_bar': None,
            'warning': None,
            'message': (
                f'Blowing agent "{blowing_agent}" is not recognised, so its volatility was '
                'not evaluated.'
            ),
        }

    base = {
        'agent': agent.name,
        'is_volatile': agent.is_volatile,
        'boiling_point_c': agent.boiling_point_c,
        'temperature_margin_c': None,
        'vapour_pressure_bar': None,
        'pressure_margin_bar': None,
        'warning': None,
    }

    # Chemically blown: nothing to flash off
    if not agent.is_volatile:
        return {
            **base,
            'status': STATUS_NOT_VOLATILE,
            'message': (
                f'{agent.name} — chemically blown, so there is no dissolved volatile agent '
                'and no flash-off limit on temperature.'
            ),
        }

    # Volatile but we have no sourced boiling point
    if agent.boiling_point_c is None:
        return {
            **base,
            'status': STATUS_NO_DATA,
            'message': (
                f'{agent.name} is volatile, but no boiling point is on file for it, so the '
                'flash-off risk was not evaluated.'
            ),
        }

    margin_c = agent.boiling_point_c - temperature_c

    # Vapour pressure margin, when constants are available
    vapour_pressure = agent.vapour_pressure_bar(temperature_c)
    pressure_margin = None
    if vapour_pressure is not None:
        absolute_line_pressure = line_pressure_bar + ATMOSPHERIC_PRESSURE_BAR
        pressure_margin = absolute_line_pressure - vapour_pressure

    result = {
        **base,
        'temperature_margin_c': margin_c,
        'vapour_pressure_bar': vapour_pressure,
        'pressure_margin_bar': pressure_margin,
    }

    if margin_c <= 0:
        return {
            **result,
            'status': STATUS_FLASH_RISK,
            'warning': (
                f'{temperature_c:.1f} °C is at or above the boiling point of {agent.name} '
                f'({agent.boiling_point_c:.1f} °C). The blowing agent will flash out of '
                'solution unless the line stays pressurised — expect density variation and '
                'pump cavitation.'
            ),
            'message': f'Above the {agent.boiling_point_c:.1f} °C boiling point of {agent.name}.',
        }

    if margin_c <= MARGINAL_TEMPERATURE_MARGIN_C:
        return {
            **result,
            'status': STATUS_MARGINAL,
            'warning': (
                f'{temperature_c:.1f} °C is only {margin_c:.1f} °C below the boiling point '
                f'of {agent.name} ({agent.boiling_point_c:.1f} °C). Keep the line '
                'pressurised and watch for temperature drift.'
            ),
            'message': f'{margin_c:.1f} °C below the boiling point of {agent.name}.',
        }

    return {
        **result,
        'status': STATUS_OK,
        'message': (
            f'{margin_c:.1f} °C below the {agent.boiling_point_c:.1f} °C boiling point of '
            f'{agent.name}.'
        ),
    }


__all__ = [
    'STATUS_NOT_VOLATILE',
    'STATUS_UNKNOWN_AGENT',
    'STATUS_NO_DATA',
    'STATUS_OK',
    'STATUS_MARGINAL',
    'STATUS_FLASH_RISK',
    'check_blowing_agent_volatility',
]
