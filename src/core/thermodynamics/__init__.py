"""
Heat transfer between the feed hose and the room.

- hose_heat_transfer: the overall hose-to-air coefficient, worked out from how the hose
  is built (wall material and thickness, lagging). Feeds the line thermal model.
"""

from .hose_heat_transfer import (
    HOSE_MATERIALS,
    INSULATION_MATERIALS,
    calculate_hose_heat_transfer,
)

__all__ = [
    'HOSE_MATERIALS',
    'INSULATION_MATERIALS',
    'calculate_hose_heat_transfer',
]
