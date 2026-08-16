"""
Material database — the single source of truth for polyurethane materials.

Reads src/data/polyurethane_foam_database.csv. Adding a material means appending one
row to that file; no code here needs to change.

The properties the physics needs describe the MIXED LIQUID travelling down the line, and
neither component gives them on its own, so both are blended here:

  density   volume-additive mixing of the two specific gravities at the weight mix ratio
            ρ = 1 / (w_p/ρ_p + w_i/ρ_i)

  viscosity logarithmic blending on volume fractions (the Arrhenius blending rule for
            miscible liquids)
            ln η = φ_p·ln η_p + φ_i·ln η_i

The density of the cured foam is a different quantity entirely and is reported separately
as final_density_kg_m3.

The TypeScript layer reads the same CSV, but only for the material names shown in the
dropdown. These derivations exist in one place, here.
"""

import csv
import math
import os
from typing import Any, Dict, List, Optional

# Where the database lives. In the browser Pyodide writes the repo tree into its virtual
# filesystem at '/', so the absolute path works there; the relative paths let the same
# module run under pytest and plain Python from the repo.
_CSV_CANDIDATE_PATHS = (
    '/src/data/polyurethane_foam_database.csv',
    os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'polyurethane_foam_database.csv'),
    'src/data/polyurethane_foam_database.csv',
)

# Assumed when a row does not state the temperature its viscosities were measured at.
DEFAULT_REFERENCE_TEMP_C = 25.0


class MaterialDatabaseError(Exception):
    """Raised when the material database is missing, malformed, or incomplete."""


_cache: Optional[Dict[str, Dict[str, Any]]] = None


# ============================================================================
# CELL PARSING
# ============================================================================

def parse_measurement(value: Optional[str]) -> Optional[float]:
    """
    Parse a data sheet cell written as a plain number, a range ("900-1050") or a
    tolerance ("200±20"). Ranges give their midpoint, tolerances their nominal value.

    Returns None for an empty or unparseable cell, so a missing measurement stays
    visibly missing instead of turning into a plausible-looking number.
    """
    text = (value or '').strip()
    if not text:
        return None

    if '±' in text:
        text = text.split('±')[0].strip()

    try:
        return float(text)
    except ValueError:
        pass

    # A range, e.g. "900-1050". Guard against a leading minus sign.
    parts = [p for p in text.split('-') if p.strip()]
    if len(parts) == 2:
        try:
            low, high = float(parts[0]), float(parts[1])
        except ValueError:
            return None
        return (low + high) / 2.0

    return None


def _require(row: Dict[str, str], column: str, product: str) -> float:
    value = parse_measurement(row.get(column))
    if value is None:
        raise MaterialDatabaseError(
            f'Material "{product}" is missing a valid {column}.'
        )
    return value


def _require_positive(row: Dict[str, str], column: str, product: str) -> float:
    value = _require(row, column, product)
    if value <= 0:
        raise MaterialDatabaseError(
            f'Material "{product}" has a non-positive {column} ({value}).'
        )
    return value


# ============================================================================
# DERIVATION
# ============================================================================

def derive_physics(row: Dict[str, str]) -> Dict[str, float]:
    """Blend the two components into the properties of the liquid being pumped."""
    name = row.get('Product_Name') or row.get('Material_Key') or 'unknown'

    polyol_viscosity = _require_positive(row, 'Polyol_Viscosity_cP', name)
    iso_viscosity = _require_positive(row, 'Isocyanate_Viscosity_cP', name)
    polyol_sg = _require_positive(row, 'Polyol_Specific_Gravity', name)
    iso_sg = _require_positive(row, 'Isocyanate_Specific_Gravity', name)
    polyol_parts = _require(row, 'Mix_Ratio_Weight_Polyol', name)
    iso_parts = _require(row, 'Mix_Ratio_Weight_Iso', name)

    total_parts = polyol_parts + iso_parts
    if total_parts <= 0:
        raise MaterialDatabaseError(f'Material "{name}" has a zero total mix ratio.')

    polyol_density = polyol_sg * 1000.0
    iso_density = iso_sg * 1000.0

    # Mass fractions from the weight mix ratio
    polyol_mass_fraction = polyol_parts / total_parts
    iso_mass_fraction = iso_parts / total_parts

    # Specific volumes give both the mixed density and the volume fractions
    polyol_specific_volume = polyol_mass_fraction / polyol_density
    iso_specific_volume = iso_mass_fraction / iso_density
    total_specific_volume = polyol_specific_volume + iso_specific_volume

    density = 1.0 / total_specific_volume
    polyol_volume_fraction = polyol_specific_volume / total_specific_volume
    iso_volume_fraction = iso_specific_volume / total_specific_volume

    viscosity = math.exp(
        polyol_volume_fraction * math.log(polyol_viscosity)
        + iso_volume_fraction * math.log(iso_viscosity)
    )

    reference_temp = parse_measurement(row.get('Viscosity_Reference_Temp_C'))

    return {
        'viscosity': viscosity,
        'density': density,
        'reference_temp_c': reference_temp if reference_temp is not None else DEFAULT_REFERENCE_TEMP_C,
        'flow_index': _require_positive(row, 'Flow_Index', name),
        'activation_energy': _require_positive(row, 'Activation_Energy_J_mol', name),
        'polyol_sg': polyol_sg,
        'iso_sg': iso_sg,
        'weight_ratio': [polyol_parts, iso_parts],
        'final_density': derive_final_foam_density(row),
    }


def derive_final_foam_density(row: Dict[str, str]) -> float:
    """
    Density of the cured foam — not the liquid. Prefers the stated applied density,
    then the free-rise range, then the molded range.
    """
    applied = parse_measurement(row.get('Overall_Applied_Density_kg_m3'))
    if applied is not None and applied > 0:
        return applied

    for low_col, high_col in (
        ('Free_Rise_Density_kg_m3_Min', 'Free_Rise_Density_kg_m3_Max'),
        ('Molded_Density_kg_m3_Min', 'Molded_Density_kg_m3_Max'),
    ):
        low = parse_measurement(row.get(low_col))
        high = parse_measurement(row.get(high_col))
        if low is not None and high is not None:
            return (low + high) / 2.0
        if low is not None:
            return low
        if high is not None:
            return high

    return 0.0


def derive_environmental(row: Dict[str, str]) -> Dict[str, Any]:
    """
    Environmental characteristics as declared on the data sheet.

    The sheets record GWP and ODP as Yes/No presence flags rather than figures, so a
    product declared free of both contributes zero.
    """
    def is_no(value: Optional[str]) -> bool:
        return (value or '').strip().lower() == 'no'

    def is_yes(value: Optional[str]) -> bool:
        return (value or '').strip().lower() == 'yes'

    has_gwp = not is_no(row.get('GWP'))
    has_odp = not is_no(row.get('ODP'))

    return {
        'blowing_agent': row.get('Blowing_Agent') or 'Unknown',
        'gwp_per_kg': 0.0 if not has_gwp else None,
        'is_eco_friendly': (not has_gwp) and (not has_odp),
        'pfas_free': is_yes(row.get('PFAS_Free')),
    }


def derive_reaction(row: Dict[str, str]) -> Dict[str, Optional[float]]:
    """
    Reaction behaviour from the data sheet, used to calibrate the cure kinetics model.

    Times are the midpoints of the stated windows; the windows themselves are kept so
    tests can check the model gels inside the range the sheet actually claims.
    """
    cream_min = parse_measurement(row.get('Cream_Time_s_Min'))
    cream_max = parse_measurement(row.get('Cream_Time_s_Max'))
    gel_min = parse_measurement(row.get('Gel_Time_s_Min'))
    gel_max = parse_measurement(row.get('Gel_Time_s_Max'))
    tack_min = parse_measurement(row.get('Tack_Free_Time_s_Min'))
    tack_max = parse_measurement(row.get('Tack_Free_Time_s_Max'))

    free_rise = _midpoint(
        parse_measurement(row.get('Free_Rise_Density_kg_m3_Min')),
        parse_measurement(row.get('Free_Rise_Density_kg_m3_Max')),
    )

    # Thermal properties of the reaction. None where the data sheet states nothing — the
    # exotherm model then falls back to a literature-typical value and says so, rather
    # than presenting an assumption as a measurement.
    heat_of_reaction_kj_kg = parse_measurement(row.get('Heat_Of_Reaction_kJ_kg'))
    peak_exotherm_c = parse_measurement(row.get('Peak_Exotherm_C'))
    specific_heat = parse_measurement(row.get('Specific_Heat_J_kg_K'))

    return {
        'heat_of_reaction_j_kg': heat_of_reaction_kj_kg * 1000 if heat_of_reaction_kj_kg else None,
        'specific_heat_j_kg_k': specific_heat,
        'peak_exotherm_c': peak_exotherm_c,
        'cream_time_s': _midpoint(cream_min, cream_max),
        'cream_time_min_s': cream_min,
        'cream_time_max_s': cream_max,
        'gel_time_s': _midpoint(gel_min, gel_max),
        'gel_time_min_s': gel_min,
        'gel_time_max_s': gel_max,
        'tack_free_time_s': _midpoint(tack_min, tack_max),
        'tack_free_time_min_s': tack_min,
        'tack_free_time_max_s': tack_max,
        'free_rise_density_kg_m3': free_rise,
        'mold_temp_min_c': parse_measurement(row.get('Mold_Substrate_Temp_C_Min')),
        'mold_temp_max_c': parse_measurement(row.get('Mold_Substrate_Temp_C_Max')),
    }


def _midpoint(low: Optional[float], high: Optional[float]) -> Optional[float]:
    if low is not None and high is not None:
        return (low + high) / 2.0
    return low if low is not None else high


# ============================================================================
# LOADING
# ============================================================================

def _read_csv_text() -> str:
    tried = []
    for path in _CSV_CANDIDATE_PATHS:
        normalized = os.path.normpath(path)
        tried.append(normalized)
        if os.path.exists(normalized):
            with open(normalized, 'r', encoding='utf-8') as handle:
                return handle.read()

    raise MaterialDatabaseError(
        'Material database CSV not found. Looked in: ' + ', '.join(tried)
    )


def _parse(csv_text: str) -> Dict[str, Dict[str, Any]]:
    lines = [line for line in csv_text.replace('\r\n', '\n').replace('\r', '\n').split('\n') if line.strip()]
    if not lines:
        raise MaterialDatabaseError('Material database is empty.')

    reader = csv.reader(lines)
    rows = list(reader)
    header = [column.strip() for column in rows[0]]

    materials: Dict[str, Dict[str, Any]] = {}

    for index, values in enumerate(rows[1:], start=2):
        # A short or long row silently shifts every column after it, which is exactly how
        # foam densities once ended up being read as viscosities. Refuse it instead.
        if len(values) != len(header):
            product = values[1] if len(values) > 1 else f'row {index}'
            raise MaterialDatabaseError(
                f'Material database row "{product}" has {len(values)} fields but the '
                f'header has {len(header)}. Every row must have exactly one field per column.'
            )

        row = dict(zip(header, values))
        key = (row.get('Material_Key') or '').strip()
        if not key:
            product = row.get('Product_Name') or f'row {index}'
            raise MaterialDatabaseError(
                f'Material database row "{product}" is missing a Material_Key.'
            )

        reaction = derive_reaction(row)
        material: Dict[str, Any] = {
            'key': key,
            'name': row.get('Product_Name') or key,
            'raw': row,
            'environmental': derive_environmental(row),
            'reaction': reaction,
        }
        material.update(derive_physics(row))
        materials[key] = material

    if not materials:
        raise MaterialDatabaseError('Material database contains no materials.')

    return materials


def load_materials(force_reload: bool = False) -> Dict[str, Dict[str, Any]]:
    """All materials, keyed by Material_Key. Parsed once and cached."""
    global _cache
    if _cache is None or force_reload:
        _cache = _parse(_read_csv_text())
    return _cache


def get_material(material_key: str) -> Optional[Dict[str, Any]]:
    """A single material, or None when the key is not in the database."""
    return load_materials().get(material_key)


def list_material_keys() -> List[str]:
    return list(load_materials().keys())


def gel_time_window_s(material_key: str) -> Optional[tuple]:
    """The (min, max) gel time the data sheet states, or None when it states none."""
    material = get_material(material_key)
    if material is None:
        return None
    reaction = material['reaction']
    low, high = reaction['gel_time_min_s'], reaction['gel_time_max_s']
    if low is None and high is None:
        return None
    return (low if low is not None else high, high if high is not None else low)


__all__ = [
    'MaterialDatabaseError',
    'DEFAULT_REFERENCE_TEMP_C',
    'parse_measurement',
    'derive_physics',
    'derive_final_foam_density',
    'derive_environmental',
    'derive_reaction',
    'load_materials',
    'get_material',
    'list_material_keys',
    'gel_time_window_s',
]
