"""
Data modules for polyurethane materials.

- material_database: the material database CSV, the single source of truth for every
  material the optimizer offers. Adding a material means appending one row to
  src/data/polyurethane_foam_database.csv.
"""

from .material_database import (
    MaterialDatabaseError,
    derive_environmental,
    derive_physics,
    derive_reaction,
    gel_time_window_s,
    get_material,
    list_material_keys,
    load_materials,
    parse_measurement,
)

__all__ = [
    'MaterialDatabaseError',
    'derive_environmental',
    'derive_physics',
    'derive_reaction',
    'gel_time_window_s',
    'get_material',
    'list_material_keys',
    'load_materials',
    'parse_measurement',
]
