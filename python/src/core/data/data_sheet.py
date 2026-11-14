"""
Reading a two-component polyurethane technical data sheet (TDS).

The browser extracts the text of the PDF (pdfjs-dist) and sends it here as rows of cells,
each cell with its horizontal position. This module finds the values the custom material form
needs, keeps the exact line each came from so the user can check it, and combines the two
components exactly the way the catalogue does (``blend_components``).

It is an aid, not an authority. Nothing here fills the form: the user sees every value with
its source line, and "Not found" for the rest, and confirms. A value that is not found stays
empty; nothing is guessed. English-language sheets only.

Units: viscosity in cP (mPa·s is the same unit; Pa·s is converted), temperatures in °C,
specific gravity dimensionless (a density in kg/m³ or g/cm³ is converted).
"""

import math
import re
from typing import Any, Dict, List, Optional, Tuple

from .material_database import blend_components
from ..modules.thermal import activation_energy_from_readings, DEFAULT_ACTIVATION_ENERGY_J_MOL

POLYOL, ISO = 'polyol', 'iso'

# The values the form needs, in the order they are shown
FIELDS = (
    'product_name',
    'polyol_viscosity',
    'iso_viscosity',
    'polyol_specific_gravity',
    'iso_specific_gravity',
    'mix_ratio',
)

TYPICAL_FLOW_INDEX = 0.85

_NUM = r'(\d+(?:[.,]\d+)?)'
_DASH = '‐‑‒–—−'


# ============================================================================
# TEXT HELPERS
# ============================================================================

def _normalise(text: str) -> str:
    """One spelling for the symbols data sheets write many ways."""
    text = text.replace(' ', ' ')
    for dash in _DASH:
        text = text.replace(dash, '-')
    text = text.replace('+/-', '±').replace('+-', '±')
    text = re.sub(r'mPa\s*[·.∙•\s]?\s*s\b', 'mPa·s', text, flags=re.IGNORECASE)
    text = re.sub(r'\bPa\s*[·.∙•]\s*s\b', 'Pa·s', text)
    text = re.sub(r'[°º]\s*C\b', '°C', text)
    text = re.sub(r'\bdeg\.?\s*C\b', '°C', text, flags=re.IGNORECASE)
    return re.sub(r'\s+', ' ', text).strip()


def _to_float(token: str) -> float:
    # A comma followed by exactly three digits separates thousands (1,050); otherwise it is
    # a decimal comma (1,07)
    if re.fullmatch(r'\d{1,3}(,\d{3})+', token):
        return float(token.replace(',', ''))
    return float(token.replace(',', '.'))


_MEASUREMENT = re.compile(
    _NUM + r'\s*(?:(-)\s*' + _NUM + r'|±\s*' + _NUM + r')?'
)
_TEMPERATURE = re.compile(r'(-?\d+(?:[.,]\d+)?)\s*°C')


def _measurements(text: str) -> List[Dict[str, Any]]:
    """
    Every number in the text that is not a temperature, as a value with its range: a plain
    number, a range ("900-1050", the midpoint), or a tolerance ("350±50", the nominal value).
    """
    temperature_spans = [m.span() for m in _TEMPERATURE.finditer(text)]
    found = []
    for match in _MEASUREMENT.finditer(text):
        if any(start <= match.start() < end for start, end in temperature_spans):
            continue
        low_token, dash, high_token, tolerance_token = match.groups()
        low = _to_float(low_token)
        if dash and high_token:
            high = _to_float(high_token)
            if high <= low:
                continue
            found.append({
                'value': (low + high) / 2.0, 'low': low, 'high': high,
                'display': f'{low_token}–{high_token}', 'start': match.start(), 'end': match.end(),
            })
        elif tolerance_token:
            tolerance = _to_float(tolerance_token)
            found.append({
                'value': low, 'low': low - tolerance, 'high': low + tolerance,
                'display': f'{low_token}±{tolerance_token}', 'start': match.start(), 'end': match.end(),
            })
        else:
            found.append({
                'value': low, 'low': None, 'high': None, 'display': low_token,
                'start': match.start(), 'end': match.end(),
            })
    return found


def _temperatures(text: str) -> List[Tuple[float, int]]:
    return [(_to_float(m.group(1)), m.start()) for m in _TEMPERATURE.finditer(text)]


def _component_in(text: str) -> Optional[str]:
    """
    Which component a heading or column names. "Component A" and "Part A" are the polyol and
    "B" the isocyanate, as in Europe; "A-side" is the isocyanate and "B-side" the polyol, as in
    North America. Explicit words (polyol, isocyanate) win.
    """
    lower = text.lower()
    polyol = bool(re.search(r'\bpolyols?\b|\bresin\b|\bpolyol blend\b', lower))
    iso = bool(re.search(r'\biso(cyanate)?s?\b|\bmdi\b|\bhardener\b|\bpmdi\b', lower))
    if polyol and not iso:
        return POLYOL
    if iso and not polyol:
        return ISO
    if polyol and iso:
        return None
    if re.search(r'\b(component|part|comp\.?)\s*a\b', lower) or re.search(r'\bb[\s-]*side\b|\bside\s*b\b', lower):
        return POLYOL
    if re.search(r'\b(component|part|comp\.?)\s*b\b', lower) or re.search(r'\ba[\s-]*side\b|\bside\s*a\b', lower):
        return ISO
    return None


def _property_in(label: str) -> Optional[str]:
    lower = label.lower()
    if 'ratio' in lower and ('mix' in lower or 'blend' in lower or 'weight' in lower or 'volume' in lower):
        return 'mix_ratio'
    if 'viscosity' in lower or 'brookfield' in lower:
        return 'viscosity'
    if 'specific gravity' in lower or 'relative density' in lower or re.search(r'\bs\.?g\.?\b', lower) or 'density' in lower:
        if any(word in lower for word in ('foam', 'core', 'free rise', 'free-rise', 'moulded', 'molded', 'applied', 'in place')):
            return None  # the cured foam, not the liquid
        return 'specific_gravity'
    return None


# ============================================================================
# READING
# ============================================================================

def _rows(raw_rows: List[Any]) -> List[Dict[str, Any]]:
    """Normalise rows from the browser: each a list of cells, a cell {text, x} or a string."""
    rows = []
    for raw in raw_rows or []:
        cells = raw.get('cells') if isinstance(raw, dict) else raw
        normalised = []
        for i, cell in enumerate(cells or []):
            if isinstance(cell, dict):
                text, x = cell.get('text', ''), cell.get('x', float(i))
            else:
                text, x = str(cell), float(i)
            text = _normalise(str(text))
            if text:
                normalised.append({'text': text, 'x': float(x)})
        if normalised:
            height = raw.get('height') if isinstance(raw, dict) else None
            rows.append({
                'cells': normalised,
                'line': '  '.join(c['text'] for c in normalised),
                'height': float(height) if isinstance(height, (int, float)) else None,
            })
    return rows


_UNIT_AFTER = re.compile(r'\s*(?:mPa·s|cps?\b|centipoise|Pa·s)', re.IGNORECASE)


def _viscosity_unit_factor(text: str) -> Optional[float]:
    if re.search(r'\bmPa·s\b|\bcps?\b|\bcentipoise\b', text, flags=re.IGNORECASE):
        return 1.0
    if re.search(r'\bPa·s\b', text):
        return 1000.0
    return None


def _sg_from(value: float, text: str) -> Optional[float]:
    """A specific gravity, from either a specific gravity or a density."""
    lower = text.lower()
    if 'kg/m' in lower or value > 100:
        value = value / 1000.0
    return value if 0.5 <= value <= 2.5 else None


def _ratio_from(text: str) -> Optional[Tuple[float, float, str]]:
    match = re.search(_NUM + r'\s*[:/]\s*' + _NUM, text)
    if not match:
        return None
    return _to_float(match.group(1)), _to_float(match.group(2)), match.group(0)


def _ratio_basis(text: str) -> Optional[str]:
    lower = text.lower()
    if re.search(r'\bweight\b|\bwt\.?\b|\bpbw\b|\bmass\b|\bby w\b', lower):
        return 'weight'
    if re.search(r'\bvolume\b|\bvol\.?\b|\bpbv\b', lower):
        return 'volume'
    return None


def _ratio_order(label: str) -> Tuple[str, str]:
    """Which component the first number belongs to. Polyol first unless the label says otherwise."""
    lower = label.lower()
    iso_at = min([i for i in (lower.find('iso'), lower.find('a-side'), lower.find('a side'), lower.find('mdi')) if i >= 0], default=-1)
    polyol_at = min([i for i in (lower.find('polyol'), lower.find('resin'), lower.find('b-side'), lower.find('b side')) if i >= 0], default=-1)
    if iso_at >= 0 and (polyol_at < 0 or iso_at < polyol_at):
        return ISO, POLYOL
    return POLYOL, ISO


def read_data_sheet(raw_rows: List[Any]) -> Dict[str, Any]:
    """
    Find the custom-material values on a data sheet.

    Args:
        raw_rows: The sheet's text as rows, top to bottom. Each row is a list of cells
            ({'text': str, 'x': float}, or plain strings) or {'cells': [...], 'height': float}.

    Returns:
        Dict with 'found' (field -> value(s) with the exact 'line' each came from), 'missing'
        (fields not found) and the combined values the form would use ('combined').
    """
    rows = _rows(raw_rows)
    viscosity: Dict[str, List[Dict[str, Any]]] = {POLYOL: [], ISO: []}
    gravity: Dict[str, Dict[str, Any]] = {}
    ratios: List[Dict[str, Any]] = []
    product_name: Optional[Dict[str, Any]] = None

    columns: Dict[str, float] = {}  # component -> x of its column, from a table header
    section: Optional[str] = None   # component named by the last heading

    for row in rows:
        cells, line = row['cells'], row['line']
        label = cells[0]['text']
        label_has_number = bool(_measurements(label)) or bool(_ratio_from(label))

        # A product name stated outright
        if product_name is None and re.match(r'(product|trade)\s*name\b', label, flags=re.IGNORECASE):
            value = ' '.join(c['text'] for c in cells[1:]).strip() or re.sub(
                r'^(product|trade)\s*name\s*[:\-]?\s*', '', label, flags=re.IGNORECASE)
            if value:
                product_name = {'value': value, 'line': line}
            continue

        # A table header names both components in separate cells
        header = {_component_in(c['text']): c['x'] for c in cells if _component_in(c['text'])}
        if POLYOL in header and ISO in header and not any(_measurements(c['text']) for c in cells):
            columns = header
            continue

        prop = _property_in(label) or (_property_in(line) if not label_has_number else None)

        # A heading for one component's section
        if prop is None:
            component = _component_in(line)
            if component and not any(_measurements(c['text']) for c in cells):
                section = component
                columns = {} if len(cells) == 1 else columns
            continue

        if prop == 'mix_ratio':
            basis = _ratio_basis(line)
            parsed = _ratio_from(' '.join(c['text'] for c in cells))
            if parsed:
                first, second = _ratio_order(label)
                parts = {first: parsed[0], second: parsed[1]}
            elif columns:
                parts = _by_column(cells[1:], columns, lambda text: (_measurements(text) or [None])[0])
                parts = {k: v['value'] for k, v in parts.items() if v}
                if len(parts) != 2:
                    continue
            else:
                continue
            ratios.append({'polyol': parts[POLYOL], 'iso': parts[ISO], 'basis': basis, 'line': line})
            continue

        # Viscosity and specific gravity: which component does each value belong to?
        inline = _component_in(label)
        if columns and not inline:
            targets = _by_column(cells[1:], columns, lambda text: text)
        else:
            component = inline or section
            if not component:
                continue
            value_cells = cells[1:] if len(cells) > 1 else cells
            targets = {component: ' '.join(c['text'] for c in value_cells)}

        for component, text in targets.items():
            if text is None:
                continue
            if prop == 'viscosity':
                factor = _viscosity_unit_factor(text) or _viscosity_unit_factor(line)
                if factor is None:
                    continue  # no unit stated anywhere on the line: not read
                viscosity[component].extend(_viscosity_readings(text, line, factor))
            elif prop == 'specific_gravity' and component not in gravity:
                for value in _measurements(text):
                    sg = _sg_from(value['value'], line)
                    if sg is not None:
                        gravity[component] = {
                            'value': round(sg, 4), 'display': value['display'],
                            'from_density': not math.isclose(sg, value['value']),
                            'line': line,
                        }
                        break

    if product_name is None:
        product_name = _title(rows)

    found: Dict[str, Any] = {}
    if product_name:
        found['product_name'] = product_name
    for component, field in ((POLYOL, 'polyol_viscosity'), (ISO, 'iso_viscosity')):
        if viscosity[component]:
            found[field] = _dedupe(viscosity[component])
    for component, field in ((POLYOL, 'polyol_specific_gravity'), (ISO, 'iso_specific_gravity')):
        if component in gravity:
            found[field] = gravity[component]
    if ratios:
        found['mix_ratio'] = ratios

    return {
        'found': found,
        'missing': [field for field in FIELDS if field not in found],
        'combined': combine_components(found),
    }


def _by_column(cells: List[Dict[str, Any]], columns: Dict[str, float], read) -> Dict[str, Any]:
    """Give each value cell to the header column nearest it."""
    result: Dict[str, Any] = {}
    for cell in cells:
        if not _measurements(cell['text']) and not _ratio_from(cell['text']):
            continue
        component = min(columns, key=lambda c: abs(columns[c] - cell['x']))
        if component not in result:
            result[component] = read(cell['text'])
    return result


def _viscosity_readings(text: str, line: str, factor: float) -> List[Dict[str, Any]]:
    """
    Viscosity values in a cell, each with its temperature: the one written beside it
    ("950 mPa·s at 25 °C"), or the one in the row label ("Viscosity at 25 °C").
    """
    values = _measurements(text)
    # Where a unit sits right after some numbers, only those are viscosities: the others are
    # test conditions such as "spindle 3, 20 rpm"
    with_unit = [v for v in values if _UNIT_AFTER.match(text, v['end'])]
    if with_unit:
        values = with_unit
    temps_here = _temperatures(text)
    temps_line = _temperatures(line)
    readings = []
    for value in values:
        if value['value'] <= 0:
            continue
        temp = None
        after = [t for t, at in temps_here if at > value['start']]
        if after and len(temps_here) >= len(values):
            temp = after[0]
        elif len(temps_line) == 1:
            temp = temps_line[0][0]
        elif len(temps_here) == 1:
            temp = temps_here[0][0]
        readings.append({
            'value_cp': value['value'] * factor,
            'low_cp': value['low'] * factor if value['low'] is not None else None,
            'high_cp': value['high'] * factor if value['high'] is not None else None,
            'display': value['display'],
            'temp_c': temp,
            'line': line,
        })
    return readings


def _dedupe(readings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """One reading per temperature: the first one on the sheet."""
    seen, result = set(), []
    for reading in readings:
        if reading['temp_c'] in seen:
            continue
        seen.add(reading['temp_c'])
        result.append(reading)
    return result


def _title(rows: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    The product name from the sheet's title: the largest text near the top, without the words
    "technical data sheet". A guess the user sees with its line, so not used when the title is
    only those words.
    """
    candidates = [r for r in rows[:8] if not any(_measurements(c['text']) for c in r['cells'][1:])]
    if not candidates:
        return None
    sized = [r for r in candidates if r['height']]
    row = max(sized, key=lambda r: r['height']) if sized else candidates[0]
    name = re.sub(
        r'\b(technical|product)\s+data\s+sheet\b|\bTDS\b|\bdata\s+sheet\b|[-–:|]+\s*$',
        '', row['line'], flags=re.IGNORECASE,
    ).strip(' -–:|')
    return {'value': name, 'line': row['line']} if len(name) >= 2 else None


# ============================================================================
# COMBINING
# ============================================================================

def combine_components(found: Dict[str, Any]) -> Dict[str, Any]:
    """
    The mixed liquid the form needs, combined like the catalogue (``blend_components``).

    Mixed viscosity at a temperature both components were measured at (25 °C if there, else
    the lowest shared one). Activation energy from the same blend at a second shared
    temperature, with the Arrhenius formula; otherwise the typical value. Flow index is always
    the typical value: a data sheet doesn't give one.
    """
    notes: List[str] = []
    polyol_v = found.get('polyol_viscosity') or []
    iso_v = found.get('iso_viscosity') or []
    polyol_sg = (found.get('polyol_specific_gravity') or {}).get('value')
    iso_sg = (found.get('iso_specific_gravity') or {}).get('value')

    weight_parts = _weight_parts(found.get('mix_ratio') or [], polyol_sg, iso_sg, notes)

    result: Dict[str, Any] = {
        'viscosity_cp': None,
        'reference_temp_c': None,
        'density_kg_m3': None,
        'weight_ratio': [round(p, 4) for p in weight_parts] if weight_parts else None,
        'flow_index': TYPICAL_FLOW_INDEX,
        'flow_index_source': 'typical',
        'activation_energy_j_mol': DEFAULT_ACTIVATION_ENERGY_J_MOL,
        'activation_energy_source': 'typical',
        'second_reading': None,
        'notes': notes,
    }

    if polyol_sg and iso_sg and weight_parts:
        result['density_kg_m3'] = round(
            blend_components(1.0, 1.0, polyol_sg, iso_sg, *weight_parts)['density_kg_m3'], 1
        )
    else:
        notes.append('Density needs both specific gravities and the mix ratio.')

    polyol_by_t = {r['temp_c']: r['value_cp'] for r in polyol_v}
    iso_by_t = {r['temp_c']: r['value_cp'] for r in iso_v}
    shared = sorted(t for t in polyol_by_t if t in iso_by_t and t is not None)
    if not shared and None in polyol_by_t and None in iso_by_t:
        shared = [None]

    if not (polyol_sg and iso_sg and weight_parts):
        notes.append('Viscosity needs both specific gravities and the mix ratio to blend the two components.')
        return result
    if not shared:
        if polyol_v and iso_v:
            notes.append('The two viscosities are not given at the same temperature, so they cannot be combined.')
        else:
            notes.append('Viscosity needs a value for both components.')
        return result

    def mixed_at(t):
        return blend_components(polyol_by_t[t], iso_by_t[t], polyol_sg, iso_sg, *weight_parts)['viscosity_cp']

    reference = 25.0 if 25.0 in shared else shared[0]
    result['viscosity_cp'] = round(mixed_at(reference), 1)
    result['reference_temp_c'] = reference
    if reference is None:
        notes.append('The data sheet does not say which temperature the viscosities are at.')
        return result

    others = [t for t in shared if t is not None and t != reference]
    if not others:
        notes.append('Viscosity is given at one temperature only, so the activation energy is the typical value.')
        return result

    second = max(others, key=lambda t: abs(t - reference))
    second_viscosity = round(mixed_at(second), 1)
    activation = activation_energy_from_readings(result['viscosity_cp'], reference, second_viscosity, second)
    if activation['error']:
        notes.append(f'Activation energy not calculated: {activation["error"]} It is the typical value.')
        return result
    result['activation_energy_j_mol'] = activation['activation_energy_j_mol']
    result['activation_energy_source'] = 'data_sheet'
    result['second_reading'] = {'viscosity_cp': second_viscosity, 'temp_c': second}
    return result


def _weight_parts(ratios, polyol_sg, iso_sg, notes) -> Optional[Tuple[float, float]]:
    """Parts by weight. A volume ratio is converted with the two specific gravities."""
    by_weight = [r for r in ratios if r['basis'] == 'weight']
    if by_weight:
        return by_weight[0]['polyol'], by_weight[0]['iso']
    by_volume = [r for r in ratios if r['basis'] == 'volume']
    if by_volume:
        if polyol_sg and iso_sg:
            return by_volume[0]['polyol'] * polyol_sg, by_volume[0]['iso'] * iso_sg
        notes.append('The mix ratio is by volume; converting it to weight needs both specific gravities.')
        return None
    if ratios:
        notes.append('The data sheet does not say whether the mix ratio is by weight or by volume.')
    return None


__all__ = ['read_data_sheet', 'combine_components', 'FIELDS']
