"""
Tests for reading a technical data sheet.

The rows below are what the browser's PDF reader returns for the fixture sheets built in
src/test/tdsFixtures.ts (cells with their x position, in points). No manufacturer's sheet is
in the repository; every product here is a made-up "Fixture Foam".
"""

import pytest

from .data_sheet import FIELDS, combine_components, read_data_sheet
from .material_database import blend_components
from ..modules.thermal import activation_energy_from_readings

LABEL, POLYOL, ISO = 56.7, 283.5, 425.2


def row(*cells, height=10.0):
    return {'cells': [{'text': text, 'x': x} for text, x in cells], 'height': height}


def title(text):
    return row((text, LABEL), height=16.0)


CLEAN_TABLE = [
    title('Fixture Foam CT Technical Data Sheet'),
    row(('Property', LABEL), ('Polyol', POLYOL), ('Isocyanate', ISO)),
    row(('Viscosity at 25 °C (cP)', LABEL), ('950', POLYOL), ('200', ISO)),
    row(('Specific gravity at 25 °C', LABEL), ('1.07', POLYOL), ('1.23', ISO)),
    row(('Mixing ratio by weight', LABEL), ('100', POLYOL), ('110', ISO)),
]

RANGE = [
    title('Fixture Foam R Product Data Sheet'),
    row(('Component A (Polyol)', LABEL)),
    row(('Viscosity at 25 °C: 900-1050 cP', LABEL)),
    row(('Specific gravity: 1.07', LABEL)),
    row(('Component B (Isocyanate)', LABEL)),
    row(('Viscosity at 25 °C: 180-220 cP', LABEL)),
    row(('Specific gravity: 1.23', LABEL)),
    row(('Mix ratio A:B by weight 100:110', LABEL)),
]

TOLERANCE = [
    title('Fixture Foam T'),
    row(('Polyol viscosity at 25 °C: 350 ± 50 cP', LABEL)),
    row(('Isocyanate viscosity at 25 °C: 200 ± 20 cP', LABEL)),
    row(('Polyol specific gravity: 1.12', LABEL)),
    row(('Isocyanate specific gravity: 1.23', LABEL)),
    row(('Mixing ratio (polyol : isocyanate) by weight 100 : 110', LABEL)),
]

TWO_TEMPERATURES = [
    title('Fixture Foam 2T Technical Data Sheet'),
    row(('Property', LABEL), ('Polyol', POLYOL), ('Isocyanate', ISO)),
    row(('Viscosity at 25 °C (cP)', LABEL), ('950', POLYOL), ('200', ISO)),
    row(('Viscosity at 40 °C (cP)', LABEL), ('420', POLYOL), ('110', ISO)),
    row(('Specific gravity at 25 °C', LABEL), ('1.07', POLYOL), ('1.23', ISO)),
    row(('Mixing ratio by weight', LABEL), ('100', POLYOL), ('110', ISO)),
]

MPAS_UNITS = [
    title('Fixture Foam M Technical Data Sheet'),
    row(('Component A', POLYOL), ('Component B', ISO)),
    row(('Viscosity, 25 °C (mPa·s)', LABEL), ('950', POLYOL), ('200', ISO)),
    row(('Density, 25 °C (kg/m³)', LABEL), ('1070', POLYOL), ('1230', ISO)),
    row(('Mixing ratio by weight', LABEL), ('100', POLYOL), ('110', ISO)),
]

MISSING_VALUE = [
    title('Fixture Foam MV Technical Data Sheet'),
    row(('Property', LABEL), ('Polyol', POLYOL), ('Isocyanate', ISO)),
    row(('Viscosity at 25 °C (cP)', LABEL), ('950', POLYOL)),
    row(('Specific gravity at 25 °C', LABEL), ('1.07', POLYOL), ('1.23', ISO)),
    row(('Mixing ratio by weight', LABEL), ('100', POLYOL), ('110', ISO)),
]


def catalogue_blend(polyol_cp, iso_cp, polyol_sg=1.07, iso_sg=1.23, parts=(100, 110)):
    return blend_components(polyol_cp, iso_cp, polyol_sg, iso_sg, *parts)


class TestCleanTable:
    def test_finds_every_value_with_its_line(self):
        result = read_data_sheet(CLEAN_TABLE)
        found = result['found']
        assert result['missing'] == []
        assert found['product_name']['value'] == 'Fixture Foam CT'
        assert found['polyol_viscosity'][0]['value_cp'] == 950
        assert found['polyol_viscosity'][0]['temp_c'] == 25
        assert found['iso_viscosity'][0]['value_cp'] == 200
        assert found['polyol_viscosity'][0]['line'] == 'Viscosity at 25 °C (cP)  950  200'
        assert found['polyol_specific_gravity']['value'] == 1.07
        assert found['iso_specific_gravity']['value'] == 1.23
        assert found['mix_ratio'][0] == {
            'polyol': 100, 'iso': 110, 'basis': 'weight', 'line': 'Mixing ratio by weight  100  110',
        }

    def test_combines_like_the_catalogue(self):
        combined = read_data_sheet(CLEAN_TABLE)['combined']
        expected = catalogue_blend(950, 200)
        assert combined['viscosity_cp'] == round(expected['viscosity_cp'], 1)
        assert combined['density_kg_m3'] == round(expected['density_kg_m3'], 1)
        assert combined['reference_temp_c'] == 25

    def test_flow_index_and_one_temperature_activation_energy_are_typical(self):
        combined = read_data_sheet(CLEAN_TABLE)['combined']
        assert (combined['flow_index'], combined['flow_index_source']) == (0.85, 'typical')
        assert (combined['activation_energy_j_mol'], combined['activation_energy_source']) == (25000.0, 'typical')
        assert combined['second_reading'] is None


class TestRange:
    def test_uses_the_midpoint_and_keeps_the_range(self):
        polyol = read_data_sheet(RANGE)['found']['polyol_viscosity'][0]
        assert polyol['value_cp'] == 975
        assert (polyol['low_cp'], polyol['high_cp']) == (900, 1050)
        assert polyol['display'] == '900–1050'

    def test_section_layout_and_component_letters(self):
        result = read_data_sheet(RANGE)
        assert result['missing'] == []
        assert result['found']['iso_viscosity'][0]['value_cp'] == 200
        assert result['combined']['viscosity_cp'] == round(catalogue_blend(975, 200)['viscosity_cp'], 1)

    def test_en_dash_range(self):
        rows = [row(('Polyol', LABEL)), row(('Viscosity at 25 °C: 900–1050 mPa·s', LABEL))]
        assert read_data_sheet(rows)['found']['polyol_viscosity'][0]['value_cp'] == 975


class TestTolerance:
    def test_uses_the_nominal_value_and_keeps_the_tolerance(self):
        polyol = read_data_sheet(TOLERANCE)['found']['polyol_viscosity'][0]
        assert polyol['value_cp'] == 350
        assert (polyol['low_cp'], polyol['high_cp']) == (300, 400)
        assert polyol['display'] == '350±50'

    def test_inline_layout_reads_everything(self):
        result = read_data_sheet(TOLERANCE)
        assert result['missing'] == []
        assert result['found']['polyol_specific_gravity']['value'] == 1.12


class TestTwoTemperatures:
    def test_reads_both_temperatures(self):
        polyol = read_data_sheet(TWO_TEMPERATURES)['found']['polyol_viscosity']
        assert [(r['value_cp'], r['temp_c']) for r in polyol] == [(950, 25), (420, 40)]

    def test_calculates_activation_energy_from_the_blend_at_each_temperature(self):
        combined = read_data_sheet(TWO_TEMPERATURES)['combined']
        at_25 = round(catalogue_blend(950, 200)['viscosity_cp'], 1)
        at_40 = round(catalogue_blend(420, 110)['viscosity_cp'], 1)
        expected = activation_energy_from_readings(at_25, 25, at_40, 40)['activation_energy_j_mol']
        assert combined['activation_energy_source'] == 'data_sheet'
        assert combined['activation_energy_j_mol'] == expected
        assert combined['second_reading'] == {'viscosity_cp': at_40, 'temp_c': 40}

    def test_two_readings_in_one_cell(self):
        rows = [
            row(('Polyol', LABEL)),
            row(('Viscosity: 950 mPa·s at 25 °C, 420 mPa·s at 40 °C', LABEL)),
        ]
        readings = read_data_sheet(rows)['found']['polyol_viscosity']
        assert [(r['value_cp'], r['temp_c']) for r in readings] == [(950, 25), (420, 40)]

    def test_readings_that_break_the_rules_keep_the_typical_value(self):
        # Thicker when warmer: not an activation energy, so it stays typical and says why
        rows = [r for r in TWO_TEMPERATURES]
        rows[3] = row(('Viscosity at 40 °C (cP)', LABEL), ('1200', POLYOL), ('300', ISO))
        combined = read_data_sheet(rows)['combined']
        assert combined['activation_energy_source'] == 'typical'
        assert any('lower at the higher temperature' in note for note in combined['notes'])


class TestUnits:
    def test_mpas_reads_as_cp(self):
        found = read_data_sheet(MPAS_UNITS)['found']
        assert found['polyol_viscosity'][0]['value_cp'] == 950

    def test_density_in_kg_per_m3_becomes_specific_gravity(self):
        found = read_data_sheet(MPAS_UNITS)['found']
        assert found['polyol_specific_gravity']['value'] == 1.07
        assert found['polyol_specific_gravity']['from_density'] is True
        assert read_data_sheet(MPAS_UNITS)['missing'] == []

    def test_pascal_seconds_are_converted(self):
        rows = [row(('Polyol', LABEL)), row(('Viscosity at 25 °C: 0.95 Pa·s', LABEL))]
        assert read_data_sheet(rows)['found']['polyol_viscosity'][0]['value_cp'] == pytest.approx(950)

    def test_a_viscosity_with_no_unit_is_not_read(self):
        rows = [row(('Polyol', LABEL)), row(('Viscosity at 25 °C: 950', LABEL))]
        assert 'polyol_viscosity' in read_data_sheet(rows)['missing']

    def test_test_conditions_are_not_read_as_viscosity(self):
        rows = [row(('Polyol', LABEL)), row(('Viscosity (Brookfield, spindle 3, 20 rpm) at 25 °C: 950 mPa·s', LABEL))]
        readings = read_data_sheet(rows)['found']['polyol_viscosity']
        assert [r['value_cp'] for r in readings] == [950]

    def test_decimal_comma(self):
        rows = [row(('Isocyanate', LABEL)), row(('Specific gravity: 1,23', LABEL))]
        assert read_data_sheet(rows)['found']['iso_specific_gravity']['value'] == 1.23


class TestMissingValue:
    def test_says_not_found_and_does_not_guess(self):
        result = read_data_sheet(MISSING_VALUE)
        assert result['missing'] == ['iso_viscosity']
        combined = result['combined']
        assert combined['viscosity_cp'] is None
        # What can be worked out still is: density needs no viscosity
        assert combined['density_kg_m3'] == round(catalogue_blend(950, 200)['density_kg_m3'], 1)
        assert any('both components' in note for note in combined['notes'])

    def test_an_empty_sheet_finds_nothing(self):
        result = read_data_sheet([])
        assert result['found'] == {}
        assert result['missing'] == list(FIELDS)


class TestMixRatio:
    def test_volume_ratio_is_converted_with_the_specific_gravities(self):
        rows = [r for r in CLEAN_TABLE]
        rows[4] = row(('Mixing ratio by volume', LABEL), ('100', POLYOL), ('100', ISO))
        combined = read_data_sheet(rows)['combined']
        assert combined['weight_ratio'] == [107.0, 123.0]

    def test_ratio_without_a_basis_is_not_used(self):
        rows = [r for r in CLEAN_TABLE]
        rows[4] = row(('Mixing ratio', LABEL), ('100', POLYOL), ('110', ISO))
        combined = read_data_sheet(rows)['combined']
        assert combined['weight_ratio'] is None
        assert combined['density_kg_m3'] is None
        assert any('by weight or by volume' in note for note in combined['notes'])

    def test_isocyanate_first_when_the_label_says_so(self):
        rows = [row(('Mix ratio iso : polyol by weight 110 : 100', LABEL))]
        ratio = read_data_sheet(rows)['found']['mix_ratio'][0]
        assert (ratio['polyol'], ratio['iso']) == (100, 110)

    def test_north_american_sides(self):
        # The A-side is the isocyanate there
        rows = [
            row(('A-side', LABEL)),
            row(('Viscosity at 25 °C: 200 cP', LABEL)),
            row(('B-side', LABEL)),
            row(('Viscosity at 25 °C: 950 cP', LABEL)),
        ]
        found = read_data_sheet(rows)['found']
        assert found['iso_viscosity'][0]['value_cp'] == 200
        assert found['polyol_viscosity'][0]['value_cp'] == 950


class TestFoamDensityIsNotTheLiquid:
    def test_free_rise_density_is_ignored(self):
        rows = [row(('Polyol', LABEL)), row(('Free rise density: 35 kg/m³', LABEL))]
        assert 'polyol_specific_gravity' in read_data_sheet(rows)['missing']


def test_combine_components_with_nothing():
    combined = combine_components({})
    assert combined['viscosity_cp'] is None
    assert combined['density_kg_m3'] is None
    assert combined['activation_energy_source'] == 'typical'
