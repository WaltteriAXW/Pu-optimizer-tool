"""
Tests for Polyurethane Materials Database

Validates all material specifications and database functionality.
"""

import pytest
from . import materials_database
from .materials_database import (
    MaterialDatabase,
    get_material,
    list_materials,
    BlowingAgent,
    GENFOAM_HD12,
    GENFOAM_HD20,
    ECOMATE_SPRAY,
    ECOFOAM_XHD_RC
)


class TestMaterialDefinitions:
    """Test individual material specifications"""

    def test_genfoam_hd12_properties(self):
        """Verify Genfoam HD12 specification"""
        mat = GENFOAM_HD12

        # Component viscosities
        assert 900 <= mat.polyol.viscosity_cps <= 1050
        assert mat.isocyanate.viscosity_cps == 200

        # Specific gravities
        assert mat.polyol.specific_gravity == 1.07
        assert mat.isocyanate.specific_gravity == 1.23

        # Reaction characteristics
        assert 50 <= mat.reaction_characteristics.cream_time_s <= 60
        assert 130 <= mat.reaction_characteristics.gel_time_s <= 140
        assert 195 <= mat.reaction_characteristics.free_rise_density_kg_m3 <= 215

        # Environmental - water-blown = zero GWP
        assert mat.environmental_properties.gwp_kg_co2_eq == 0
        assert mat.environmental_properties.odp == 0
        assert mat.blowing_agent == BlowingAgent.WATER

    def test_genfoam_hd20_properties(self):
        """Verify Genfoam HD20 specification"""
        mat = GENFOAM_HD20

        # Higher density than HD12
        assert 290 <= mat.reaction_characteristics.free_rise_density_kg_m3 <= 315
        assert mat.reaction_characteristics.free_rise_density_kg_m3 > GENFOAM_HD12.reaction_characteristics.free_rise_density_kg_m3

        # Same component viscosities as HD12
        assert mat.polyol.viscosity_cps == GENFOAM_HD12.polyol.viscosity_cps

        # Zero GWP (water-blown)
        assert mat.environmental_properties.gwp_kg_co2_eq == 0

    def test_ecomate_spray_properties(self):
        """Verify Ecomate Spray specification"""
        mat = ECOMATE_SPRAY

        # Ultra-low polyol viscosity (spray grade)
        assert 280 <= mat.polyol.viscosity_cps <= 320

        # Very fast reaction (spray application)
        assert 1 <= mat.reaction_characteristics.cream_time_s <= 5
        assert 7 <= mat.reaction_characteristics.gel_time_s <= 13

        # Very low density (spray foam)
        assert 28.8 <= mat.reaction_characteristics.free_rise_density_kg_m3 <= 32.0

        # Zero GWP (ecomate® blown)
        assert mat.environmental_properties.gwp_kg_co2_eq == 0
        assert mat.blowing_agent == BlowingAgent.ECOMATE

        # Processing temperature range
        assert mat.processing_conditions.polyol_temp_min_c == 25
        assert mat.processing_conditions.polyol_temp_max_c == 30

    def test_ecofoam_xhd_rc_properties(self):
        """Verify Ecofoam XHD RC (rigid cell) specification"""
        mat = ECOFOAM_XHD_RC

        # High viscosity polyol
        assert 800 <= mat.polyol.viscosity_cps <= 900

        # Moderate reaction time
        assert 8 <= mat.reaction_characteristics.cream_time_s <= 12
        assert 28 <= mat.reaction_characteristics.gel_time_s <= 32

        # Higher foam density for rigid properties
        assert 40.0 <= mat.reaction_characteristics.free_rise_density_kg_m3 <= 45.0

        # Very high compressive strength
        assert mat.polymer_properties.compressive_strength_parallel_kpa == 414
        assert mat.polymer_properties.compressive_strength_perpendicular_kpa == 275

        # Very high closed cell content
        assert mat.polymer_properties.closed_cell_content_percent == 95

        # Zero GWP (ecomate® blown)
        assert mat.environmental_properties.gwp_kg_co2_eq == 0

        # Requires hot mold
        assert mat.processing_conditions.mold_temp_min_c == 35
        assert mat.processing_conditions.mold_temp_max_c == 45


class TestReactionCharacteristics:
    """Test reaction kinetics data"""

    def test_reaction_time_ordering(self):
        """Cream time should be less than gel time"""
        materials = [GENFOAM_HD12, GENFOAM_HD20, ECOMATE_SPRAY, ECOFOAM_XHD_RC]

        for mat in materials:
            assert mat.reaction_characteristics.cream_time_s < mat.reaction_characteristics.gel_time_s

    def test_spray_vs_molding_reactions(self):
        """Spray foams should have much faster reaction than molded foams"""
        spray = ECOMATE_SPRAY
        molding = ECOFOAM_XHD_RC

        # Spray should be 3-4x faster
        assert spray.reaction_characteristics.cream_time_s < molding.reaction_characteristics.cream_time_s
        assert spray.reaction_characteristics.gel_time_s < molding.reaction_characteristics.gel_time_s

    def test_foam_density_vs_reaction(self):
        """Higher foam density generally correlates with different reaction profile"""
        hd12_density = GENFOAM_HD12.reaction_characteristics.free_rise_density_kg_m3
        hd20_density = GENFOAM_HD20.reaction_characteristics.free_rise_density_kg_m3

        # HD20 has higher density
        assert hd20_density > hd12_density


class TestRheologicalProperties:
    """Test rheological model parameters"""

    def test_flow_index_range(self):
        """Flow index should be between 0 (perfect plastic) and 1 (Newtonian)"""
        materials = [GENFOAM_HD12, GENFOAM_HD20, ECOMATE_SPRAY, ECOFOAM_XHD_RC]

        for mat in materials:
            assert 0 < mat.flow_index < 1
            assert mat.flow_index >= 0.70  # Polyurethanes typically 0.70-0.90

    def test_consistency_coefficient_positive(self):
        """Consistency coefficient (K) must be positive"""
        materials = [GENFOAM_HD12, GENFOAM_HD20, ECOMATE_SPRAY, ECOFOAM_XHD_RC]

        for mat in materials:
            assert mat.consistency_coefficient_pa_s > 0

    def test_spray_has_lower_consistency(self):
        """Spray foam should have lower consistency coefficient"""
        spray = ECOMATE_SPRAY
        other = ECOFOAM_XHD_RC

        # Spray should be more fluid
        assert spray.consistency_coefficient_pa_s < other.consistency_coefficient_pa_s

    def test_activation_energy_realistic(self):
        """Activation energy for polyurethanes typically 15,000-40,000 J/mol"""
        materials = [GENFOAM_HD12, GENFOAM_HD20, ECOMATE_SPRAY, ECOFOAM_XHD_RC]

        for mat in materials:
            assert 15000 <= mat.activation_energy_j_mol <= 40000


class TestEnvironmentalProperties:
    """Test environmental impact metrics"""

    def test_zero_gwp_materials(self):
        """Ecomate® and water-blown should be zero GWP"""
        zero_gwp = [GENFOAM_HD12, GENFOAM_HD20, ECOMATE_SPRAY, ECOFOAM_XHD_RC]

        for mat in zero_gwp:
            assert mat.environmental_properties.gwp_kg_co2_eq == 0
            assert mat.environmental_properties.odp == 0

    def test_ecomate_biodegradability(self):
        """ecomate® materials should be biodegradable"""
        eco_materials = [ECOMATE_SPRAY, ECOFOAM_XHD_RC]

        for mat in eco_materials:
            assert mat.environmental_properties.biodegradable
            assert mat.environmental_properties.pfas_free
            assert not mat.environmental_properties.aquatic_toxicity


class TestProcessingConditions:
    """Test processing temperature and conditions"""

    def test_temperature_ranges_valid(self):
        """Temperature min should be less than max"""
        materials = [GENFOAM_HD12, GENFOAM_HD20, ECOMATE_SPRAY, ECOFOAM_XHD_RC]

        for mat in materials:
            assert mat.processing_conditions.polyol_temp_min_c <= mat.processing_conditions.polyol_temp_max_c
            assert mat.processing_conditions.isocyanate_temp_min_c <= mat.processing_conditions.isocyanate_temp_max_c

    def test_genfoam_processing_temp(self):
        """Genfoam should process at room temperature"""
        mat = GENFOAM_HD12
        assert mat.processing_conditions.polyol_temp_min_c == 22
        assert mat.processing_conditions.polyol_temp_max_c == 25

    def test_ecomate_spray_processing_temp(self):
        """Ecomate spray requires slightly elevated temperature"""
        mat = ECOMATE_SPRAY
        assert mat.processing_conditions.polyol_temp_min_c == 25
        assert mat.processing_conditions.polyol_temp_max_c == 30

    def test_xhd_requires_hot_mold(self):
        """XHD RC requires hot mold for processing"""
        mat = ECOFOAM_XHD_RC
        assert mat.processing_conditions.mold_temp_min_c == 35
        assert mat.processing_conditions.mold_temp_max_c == 45

    def test_spray_substrate_conditions(self):
        """Spray foam has specific substrate conditions"""
        mat = ECOMATE_SPRAY
        assert mat.processing_conditions.substrate_temp_min_c == 5
        assert mat.processing_conditions.substrate_temp_max_c == 40
        assert mat.processing_conditions.substrate_humidity_max_percent == 20


class TestStorageConditions:
    """Test storage requirements"""

    def test_storage_temp_ranges(self):
        """Storage temperature min < max"""
        materials = [GENFOAM_HD12, GENFOAM_HD20, ECOMATE_SPRAY, ECOFOAM_XHD_RC]

        for mat in materials:
            assert mat.storage_conditions.storage_temp_min_c < mat.storage_conditions.storage_temp_max_c

    def test_shelf_life_reasonable(self):
        """Shelf life should be reasonable (3-12 months)"""
        materials = [GENFOAM_HD12, GENFOAM_HD20, ECOMATE_SPRAY, ECOFOAM_XHD_RC]

        for mat in materials:
            assert 3 <= mat.storage_conditions.polyol_shelf_life_months <= 12
            assert 3 <= mat.storage_conditions.isocyanate_shelf_life_months <= 12

    def test_genfoam_remixing(self):
        """Genfoam requires polyol remixing every 3 months"""
        mat = GENFOAM_HD12
        assert mat.storage_conditions.re_mix_polyol_months == 3

    def test_spray_shorter_shelf_life(self):
        """Spray grade components typically have shorter shelf life"""
        spray = ECOMATE_SPRAY
        rigid = ECOFOAM_XHD_RC

        # Spray polyol: 3 months
        assert spray.storage_conditions.polyol_shelf_life_months == 3
        # Rigid polyol: 6 months
        assert rigid.storage_conditions.polyol_shelf_life_months == 6


class TestDatabaseFunctionality:
    """Test MaterialDatabase class methods"""

    def test_get_material_by_key(self):
        """Get material by key should work"""
        mat = MaterialDatabase.get_material('genfoam_hd12')
        assert mat is not None
        assert mat.name == "Genfoam HD12"

    def test_get_nonexistent_material(self):
        """Getting nonexistent material should return None"""
        mat = MaterialDatabase.get_material('nonexistent_material')
        assert mat is None

    def test_list_materials(self):
        """List materials should return all materials"""
        materials = MaterialDatabase.list_materials()
        assert len(materials) == 4
        assert 'genfoam_hd12' in materials
        assert 'genfoam_hd20' in materials
        assert 'ecomate_spray' in materials
        assert 'ecofoam_xhd_rc' in materials

    def test_get_material_by_name(self):
        """Get material by display name"""
        mat = MaterialDatabase.get_material_by_name("Genfoam HD12")
        assert mat is not None
        assert mat.material_key == 'genfoam_hd12'

    def test_get_materials_by_blowing_agent(self):
        """Get materials by blowing agent type"""
        water_blown = MaterialDatabase.get_materials_by_blowing_agent(BlowingAgent.WATER)
        assert len(water_blown) == 2
        assert 'genfoam_hd12' in water_blown
        assert 'genfoam_hd20' in water_blown

        ecomate_blown = MaterialDatabase.get_materials_by_blowing_agent(BlowingAgent.ECOMATE)
        assert len(ecomate_blown) == 2
        assert 'ecomate_spray' in ecomate_blown
        assert 'ecofoam_xhd_rc' in ecomate_blown

    def test_get_zero_gwp_materials(self):
        """Get all zero-GWP materials"""
        zero_gwp = MaterialDatabase.get_zero_gwp_materials()
        assert len(zero_gwp) == 4  # All current materials are zero GWP

    def test_compare_materials(self):
        """Compare multiple materials"""
        comparison = MaterialDatabase.compare_materials(['genfoam_hd12', 'ecomate_spray'])
        assert 'genfoam_hd12' in comparison
        assert 'ecomate_spray' in comparison
        assert 'name' in comparison['genfoam_hd12']
        assert 'polyol_viscosity_cps' in comparison['genfoam_hd12']

    def test_convenience_functions(self):
        """Test convenience access functions"""
        mat = get_material('genfoam_hd20')
        assert mat.name == "Genfoam HD20"

        materials = list_materials()
        assert len(materials) == 4


class TestThermalProperties:
    """Test thermal insulation properties"""

    def test_k_factor_ranges(self):
        """Initial k-factor should be realistic"""
        materials = [GENFOAM_HD12, GENFOAM_HD20, ECOMATE_SPRAY, ECOFOAM_XHD_RC]

        for mat in materials:
            # Initial k-factor: 0.019-0.022 W/m·K typical
            assert 0.015 <= mat.thermal_properties.initial_k_factor_w_m_k <= 0.025

    def test_declared_lambda_values(self):
        """Declared lambda (long-term k-factor) should be realistic"""
        materials = [GENFOAM_HD12, GENFOAM_HD20, ECOMATE_SPRAY, ECOFOAM_XHD_RC]

        for mat in materials:
            if mat.thermal_properties.declared_lambda_thin_w_m_k:
                assert mat.thermal_properties.declared_lambda_thin_w_m_k >= mat.thermal_properties.initial_k_factor_w_m_k

    def test_gas_lambda_values(self):
        """Blowing gas conductivity should be reasonable"""
        water_blown = GENFOAM_HD12
        ecomate_blown = ECOMATE_SPRAY

        # Water has higher conductivity (~30 mW/m·K)
        assert water_blown.thermal_properties.gas_lambda_mw_m_k == 30.0

        # ecomate® has lower conductivity (~10.7 mW/m·K)
        assert ecomate_blown.thermal_properties.gas_lambda_mw_m_k == 10.7

    def test_xhd_better_insulation(self):
        """XHD should have better insulation than spray"""
        spray = ECOMATE_SPRAY
        rigid = ECOFOAM_XHD_RC

        # Rigid should have lower (better) lambda
        spray_lambda = spray.thermal_properties.declared_lambda_thin_w_m_k
        rigid_lambda = rigid.thermal_properties.declared_lambda_thin_w_m_k

        # Rigid cells should provide better insulation
        assert rigid_lambda <= spray_lambda or rigid_lambda < 0.027


class TestCompressiveStrength:
    """Test mechanical properties"""

    def test_xhd_high_strength(self):
        """XHD should have high compressive strength"""
        mat = ECOFOAM_XHD_RC

        # Very high compressive strength
        assert mat.polymer_properties.compressive_strength_parallel_kpa == 414  # 60 psi
        assert mat.polymer_properties.compressive_strength_perpendicular_kpa == 275  # 40 psi

    def test_spray_specified_strength(self):
        """Spray foam has specified strength"""
        mat = ECOMATE_SPRAY

        # Moderate compressive strength
        assert mat.polymer_properties.compressive_strength_parallel_kpa == 276  # 40 psi
        assert mat.polymer_properties.compressive_strength_perpendicular_kpa == 166  # 24 psi

    def test_anisotropic_properties(self):
        """Foam should be stronger parallel to rise direction"""
        mat = ECOFOAM_XHD_RC

        # Parallel > perpendicular due to cell alignment
        assert mat.polymer_properties.compressive_strength_parallel_kpa > mat.polymer_properties.compressive_strength_perpendicular_kpa


class TestDimensionalStability:
    """Test dimensional stability under extreme conditions"""

    def test_cold_stability(self):
        """Stability at extreme cold (-20°C to -62°C)"""
        materials = [GENFOAM_HD12, GENFOAM_HD20, ECOMATE_SPRAY, ECOFOAM_XHD_RC]

        for mat in materials:
            assert mat.polymer_properties.dimensional_stability_cold_percent <= 1.0

    def test_hot_stability(self):
        """Stability at elevated temperature (54°C to 80°C)"""
        materials = [GENFOAM_HD12, GENFOAM_HD20, ECOMATE_SPRAY, ECOFOAM_XHD_RC]

        for mat in materials:
            assert mat.polymer_properties.dimensional_stability_hot_percent <= 1.0

    def test_xhd_excellent_stability(self):
        """XHD has excellent dimensional stability"""
        mat = ECOFOAM_XHD_RC

        assert mat.polymer_properties.dimensional_stability_cold_percent < 0.5
        assert mat.polymer_properties.dimensional_stability_hot_percent < 1.0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
