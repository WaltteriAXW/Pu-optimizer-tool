"""
Tests for the material database — the single source of truth for materials.

These cover the two properties the database has to hold: a malformed row is refused
rather than silently shifting every column after it, and a material can be added by
appending one row with no code change.

The expected viscosity and density figures are the ones the TypeScript loader produced
before the derivation moved here, so a drift between the two halves of the application
shows up as a failure.
"""

import math

import pytest

from .material_database import (
    MaterialDatabaseError,
    derive_environmental,
    derive_physics,
    get_material,
    list_material_keys,
    load_materials,
    parse_measurement,
    _parse,
)

# Mixed-liquid properties expected for each catalogued material.
# viscosity (cP), density (kg/m³)
EXPECTED_MIXED = {
    'genfoam_hd12': (447.6, 1148.6),
    'genfoam_hd20': (447.6, 1148.6),
    'ecomate_spray': (264.5, 1175.0),
    'ecofoam_xhd_rc': (412.1, 1175.0),
}


class TestCellParsing:
    """Data sheet cells come in several shapes."""

    def test_plain_number(self):
        assert parse_measurement('350') == 350.0

    def test_range_gives_midpoint(self):
        assert parse_measurement('900-1050') == 975.0

    def test_tolerance_gives_nominal(self):
        assert parse_measurement('200±20') == 200.0

    def test_empty_stays_missing(self):
        # A missing measurement must not become a plausible-looking number
        assert parse_measurement('') is None
        assert parse_measurement(None) is None
        assert parse_measurement('   ') is None

    def test_unparseable_stays_missing(self):
        assert parse_measurement('E (d0)') is None


class TestDerivedPhysics:
    """The liquid being pumped is a blend of both components."""

    @pytest.mark.parametrize('key,expected', EXPECTED_MIXED.items())
    def test_mixed_properties_match_the_reference_values(self, key, expected):
        material = get_material(key)
        expected_viscosity, expected_density = expected

        assert material['viscosity'] == pytest.approx(expected_viscosity, abs=0.1)
        assert material['density'] == pytest.approx(expected_density, abs=0.1)

    def test_mixed_viscosity_lies_between_the_components(self):
        for key in list_material_keys():
            material = get_material(key)
            polyol = parse_measurement(material['raw']['Polyol_Viscosity_cP'])
            iso = parse_measurement(material['raw']['Isocyanate_Viscosity_cP'])

            assert min(polyol, iso) <= material['viscosity'] <= max(polyol, iso)

    def test_mixed_density_lies_between_the_components(self):
        for key in list_material_keys():
            material = get_material(key)
            polyol = material['polyol_sg'] * 1000
            iso = material['iso_sg'] * 1000

            assert min(polyol, iso) <= material['density'] <= max(polyol, iso)

    def test_liquid_density_is_not_the_foam_density(self):
        """The pumped liquid is ~1150 kg/m³; the cured foam is far lighter."""
        for key in list_material_keys():
            material = get_material(key)
            assert material['density'] > 900
            assert material['final_density'] < material['density']

    def test_every_material_has_the_properties_the_physics_needs(self):
        for key in list_material_keys():
            material = get_material(key)
            assert material['viscosity'] > 0
            assert material['density'] > 0
            assert 0 < material['flow_index'] <= 1
            assert material['activation_energy'] > 0
            assert material['reference_temp_c'] > 0


class TestEnvironmentalProfile:
    def test_catalogued_materials_declare_no_gwp_or_odp(self):
        for key in list_material_keys():
            profile = get_material(key)['environmental']
            assert profile['gwp_per_kg'] == 0
            assert profile['is_eco_friendly'] is True

    def test_blowing_agent_comes_from_the_sheet(self):
        assert get_material('genfoam_hd12')['environmental']['blowing_agent'] == 'Water-blown'
        assert get_material('ecomate_spray')['environmental']['blowing_agent'] == 'ecomate®'

    def test_pfas_free_is_only_claimed_where_stated(self):
        assert get_material('ecomate_spray')['environmental']['pfas_free'] is True
        assert get_material('genfoam_hd12')['environmental']['pfas_free'] is False


class TestReactionData:
    """The data the cure kinetics model is calibrated against."""

    def test_every_material_states_cream_and_gel_times(self):
        for key in list_material_keys():
            reaction = get_material(key)['reaction']
            assert reaction['cream_time_s'] is not None
            assert reaction['gel_time_s'] is not None
            assert reaction['gel_time_s'] > reaction['cream_time_s']

    def test_gel_window_is_the_stated_range(self):
        reaction = get_material('genfoam_hd12')['reaction']
        assert reaction['gel_time_min_s'] == 130
        assert reaction['gel_time_max_s'] == 140
        assert reaction['gel_time_s'] == 135


class TestMalformedRowsAreRefused:
    """A short or long row shifts every column after it. Refuse it loudly."""

    def _header(self):
        material = get_material('genfoam_hd12')
        return ','.join(material['raw'].keys())

    def test_row_with_too_few_fields(self):
        csv_text = self._header() + '\nnew_key,Broken Product,too,few\n'
        with pytest.raises(MaterialDatabaseError, match='Broken Product'):
            _parse(csv_text)

    def test_row_with_no_material_key(self):
        columns = len(self._header().split(','))
        row = ','.join([''] + ['Nameless Product'] + [''] * (columns - 2))
        with pytest.raises(MaterialDatabaseError, match='Material_Key'):
            _parse(self._header() + '\n' + row + '\n')

    def test_material_missing_a_required_property(self):
        header = self._header().split(',')
        row = [''] * len(header)
        row[header.index('Material_Key')] = 'incomplete'
        row[header.index('Product_Name')] = 'Incomplete Product'
        with pytest.raises(MaterialDatabaseError, match='Incomplete Product'):
            _parse(self._header() + '\n' + ','.join(row) + '\n')


class TestAddingAMaterial:
    """Adding a polyol must be a one-row edit."""

    def test_appended_row_is_picked_up_with_sane_physics(self):
        hd12 = get_material('genfoam_hd12')
        header = list(hd12['raw'].keys())
        row = dict(hd12['raw'])
        row['Material_Key'] = 'test_new_polyol'
        row['Product_Name'] = 'Test New Polyol'
        row['Polyol_Viscosity_cP'] = '600'
        row['Isocyanate_Viscosity_cP'] = '150'
        row['Flow_Index'] = '0.9'
        row['Activation_Energy_J_mol'] = '27000'

        csv_text = (
            ','.join(header)
            + '\n'
            + ','.join(f'"{row[column]}"' for column in header)
            + '\n'
        )
        materials = _parse(csv_text)

        assert 'test_new_polyol' in materials
        added = materials['test_new_polyol']
        assert 900 < added['density'] < 1300
        assert 150 < added['viscosity'] < 600
        assert added['flow_index'] == 0.9
        assert added['activation_energy'] == 27000


class TestLookup:
    def test_unknown_key_returns_none(self):
        assert get_material('no_such_material') is None

    def test_database_is_cached(self):
        assert load_materials() is load_materials()
