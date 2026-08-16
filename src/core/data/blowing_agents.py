"""
Physical constants for foam blowing agents.

This is a table of SUBSTANCE properties, not product data. It does not reintroduce the
per-material duplication that was removed in favour of the CSV: the boiling point of methyl
formate is a property of methyl formate, identical for every formulation that uses it, and
belongs with the substance rather than repeated on every product row. Products name their
agent in the CSV's Blowing_Agent column; this module turns that name into physics.

Why this matters: a physically-blown system carries its blowing agent dissolved in the
polyol. Above the agent's boiling point, at atmospheric pressure, it comes out of solution —
losing blowing agent, varying the foam density and cavitating the pump. ecomate® is methyl
formate, which boils at 31.5 °C, and technical data sheets routinely specify polyol
temperatures of 25-30 °C, so the margin in normal operation is a couple of degrees.

Chemically-blown (water-blown) systems have no volatile agent at all: water reacts with
isocyanate to make CO2 rather than boiling, so there is no flash-off temperature to respect.
That is reported as its own state, never as "passed a check".

VAPOUR PRESSURE DATA IS DELIBERATELY ABSENT. The quantitative check — does line pressure
exceed the agent's vapour pressure at process temperature — needs Antoine constants or an
enthalpy of vaporisation, and no authoritative source for them was reachable when this was
written. Rather than invent constants, the field is left as None and the quantitative check
reports "not evaluated". Fill in `antoine` from a primary source (NIST WebBook gives A, B, C
for log10(P/bar) = A - B/(T/K + C)) to switch it on; nothing else needs to change.

Sources:
- Methyl formate boiling point 31.5 °C: UNDP, "Methyl formate as blowing agent in the
  manufacture of polyurethane foam"; corroborated by ChemicalBook CAS 107-31-3.
"""

import math
from typing import Any, Dict, Optional

# Standard atmospheric pressure
ATMOSPHERIC_PRESSURE_BAR = 1.01325

# How close to the boiling point counts as uncomfortably close (°C)
MARGINAL_TEMPERATURE_MARGIN_C = 5.0


class BlowingAgent:
    """
    A blowing agent's physical behaviour.

    Attributes:
        name: Display name of the substance
        is_volatile: False for chemically-blown systems (water), which never flash off
        boiling_point_c: Normal boiling point at 1 atm, None when not volatile
        antoine: Optional (A, B, C) for log10(P/bar) = A - B/(T/K + C), or None when no
            sourced constants are available. Absent constants mean the quantitative
            vapour-pressure check reports "not evaluated" rather than a pass.
        source: Where the numbers came from
    """

    def __init__(
        self,
        name: str,
        is_volatile: bool,
        boiling_point_c: Optional[float] = None,
        antoine: Optional[tuple] = None,
        source: str = '',
    ):
        self.name = name
        self.is_volatile = is_volatile
        self.boiling_point_c = boiling_point_c
        self.antoine = antoine
        self.source = source

    def vapour_pressure_bar(self, temperature_c: float) -> Optional[float]:
        """
        Vapour pressure at a temperature, or None when no sourced constants exist.

        None means "not evaluated". It must never be treated as zero or as a pass.
        """
        if not self.is_volatile or self.antoine is None:
            return None

        a, b, c = self.antoine
        temp_k = temperature_c + 273.15
        denominator = temp_k + c
        if denominator <= 0:
            return None

        return math.pow(10.0, a - (b / denominator))

    def to_dict(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'is_volatile': self.is_volatile,
            'boiling_point_c': self.boiling_point_c,
            'has_vapour_pressure_data': self.antoine is not None,
            'source': self.source,
        }


# Keyed by a normalised form of the CSV's Blowing_Agent text.
BLOWING_AGENTS: Dict[str, BlowingAgent] = {
    'water': BlowingAgent(
        name='Water (CO₂ generated in situ)',
        is_volatile=False,
        source='Chemically blown: water reacts with isocyanate to form CO2 and urea, so '
               'there is no dissolved volatile agent and no flash-off temperature.',
    ),
    'ecomate': BlowingAgent(
        name='ecomate® (methyl formate)',
        is_volatile=True,
        boiling_point_c=31.5,
        antoine=None,  # Needs sourced constants; see module docstring
        source='UNDP, methyl formate as a blowing agent; ChemicalBook CAS 107-31-3.',
    ),
    'pentane': BlowingAgent(
        name='Pentane',
        is_volatile=True,
        boiling_point_c=None,  # Isomer-dependent (n-, iso-, cyclo-); needs a source
        antoine=None,
        source='Boiling point depends on the isomer; supply a value before relying on this.',
    ),
    'hfc': BlowingAgent(
        name='HFC',
        is_volatile=True,
        boiling_point_c=None,
        antoine=None,
        source='Grade-dependent; supply a value before relying on this.',
    ),
    'hfo': BlowingAgent(
        name='HFO',
        is_volatile=True,
        boiling_point_c=None,
        antoine=None,
        source='Grade-dependent; supply a value before relying on this.',
    ),
}


def normalise_agent_name(blowing_agent: Optional[str]) -> Optional[str]:
    """
    Map the CSV's free text onto a key in BLOWING_AGENTS.

    The CSV says things like "Water-blown" and "ecomate®"; matching is done on a lowercased
    substring so a new row saying "ecomate" or "Ecomate blown" resolves the same way.
    """
    text = (blowing_agent or '').strip().lower()
    if not text:
        return None

    for key in ('ecomate', 'pentane', 'hfo', 'hfc'):
        if key in text:
            return key

    if 'water' in text:
        return 'water'

    return None


def get_blowing_agent(blowing_agent: Optional[str]) -> Optional[BlowingAgent]:
    """Look up an agent by the CSV's text, or None when it is not recognised."""
    key = normalise_agent_name(blowing_agent)
    return BLOWING_AGENTS.get(key) if key else None


__all__ = [
    'ATMOSPHERIC_PRESSURE_BAR',
    'MARGINAL_TEMPERATURE_MARGIN_C',
    'BlowingAgent',
    'BLOWING_AGENTS',
    'normalise_agent_name',
    'get_blowing_agent',
]
