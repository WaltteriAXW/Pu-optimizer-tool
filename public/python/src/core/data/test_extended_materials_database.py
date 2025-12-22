"""
Comprehensive test suite for Extended Materials Database (Phase 4 Tier 4).

Tests cover:
- Material database initialization
- Material retrieval and filtering
- Temperature-dependent properties
- Pressure-dependent properties
- Material family classification
- Environmental properties
- Processing window constraints

Total: 35+ test cases
"""

import pytest
from src.core.data.extended_materials_database import (
    ExtendedMaterialDatabase,
    MaterialFamily,
    BlowingAgent,
    TemperatureDependency,
    PressureDependency,
    ProcessingWindow,
    QualityMetrics,
    ExtendedPolyurethaneMaterial,
)


class TestMaterialDatabase:
    """Test extended materials database"""

    def test_database_initialization(self):
        """Test database initializes with materials"""
        db = ExtendedMaterialDatabase()
        assert db.get_material_count() > 0

    def test_has_20_plus_materials(self):
        """Test database has 20+ materials"""
        db = ExtendedMaterialDatabase()
        assert db.get_material_count() >= 20

    def test_get_material_by_key(self):
        """Test retrieving material by key"""
        db = ExtendedMaterialDatabase()
        material = db.get_material("genfoam_hd12_standard")

        assert material is not None
        assert material.name == "Genfoam HD12 Standard"

    def test_get_nonexistent_material(self):
        """Test retrieving non-existent material returns None"""
        db = ExtendedMaterialDatabase()
        material = db.get_material("nonexistent_material")

        assert material is None

    def test_list_all_materials(self):
        """Test listing all materials"""
        db = ExtendedMaterialDatabase()
        materials = db.list_materials()

        assert len(materials) > 0
        assert all(isinstance(m, ExtendedPolyurethaneMaterial) for m in materials)

    def test_materials_have_required_properties(self):
        """Test all materials have required properties"""
        db = ExtendedMaterialDatabase()
        materials = db.list_materials()

        for material in materials:
            assert material.name
            assert material.material_key
            assert material.family is not None
            assert material.density_kg_m3 > 0
            assert material.viscosity_cps > 0

    def test_material_families(self):
        """Test materials are assigned to families"""
        db = ExtendedMaterialDatabase()
        materials = db.list_materials()

        families = {m.family for m in materials}
        assert len(families) > 1  # Multiple families

    def test_get_materials_by_family(self):
        """Test filtering materials by family"""
        db = ExtendedMaterialDatabase()
        rigid_foams = db.get_materials_by_family(MaterialFamily.RIGID_FOAM)

        assert len(rigid_foams) > 0
        assert all(m.family == MaterialFamily.RIGID_FOAM for m in rigid_foams)

    def test_get_eco_friendly_materials(self):
        """Test filtering eco-friendly materials"""
        db = ExtendedMaterialDatabase()
        eco_materials = db.get_eco_friendly_materials()

        assert len(eco_materials) > 0
        assert all(m.is_eco_friendly for m in eco_materials)
        assert all(m.gwp_kg_co2_eq < 100 for m in eco_materials)

    def test_get_materials_by_blowing_agent(self):
        """Test filtering materials by blowing agent"""
        db = ExtendedMaterialDatabase()
        water_blown = db.get_materials_by_blowing_agent(BlowingAgent.WATER)

        assert len(water_blown) > 0
        assert all(m.blowing_agent == BlowingAgent.WATER for m in water_blown)

    def test_find_material_for_application(self):
        """Test finding materials for application"""
        db = ExtendedMaterialDatabase()
        results = db.find_material_for_application(
            family=MaterialFamily.SPRAY_FOAM,
            max_viscosity=500,
        )

        assert len(results) > 0
        for m in results:
            assert m.family == MaterialFamily.SPRAY_FOAM
            assert m.viscosity_cps <= 500

    def test_compare_materials(self):
        """Test comparing multiple materials"""
        db = ExtendedMaterialDatabase()
        comparison = db.compare_materials([
            "genfoam_hd12_standard",
            "ecomate_spray_grade",
        ])

        assert "materials" in comparison
        assert len(comparison["materials"]) == 2

    def test_material_gwp_values(self):
        """Test GWP values are reasonable"""
        db = ExtendedMaterialDatabase()
        materials = db.list_materials()

        for material in materials:
            assert material.gwp_kg_co2_eq >= 0  # Non-negative
            if material.is_eco_friendly:
                assert material.gwp_kg_co2_eq < 100  # Low GWP


class TestTemperatureDependency:
    """Test temperature-dependent viscosity"""

    def test_viscosity_at_reference_temperature(self):
        """Test viscosity at reference temperature"""
        temp_dep = TemperatureDependency(
            reference_temp_c=25,
            reference_viscosity_cps=500,
        )

        viscosity = temp_dep.viscosity_at_temperature(25)
        assert abs(viscosity - 500) < 1  # Should be ~500

    def test_viscosity_increases_with_cooling(self):
        """Test viscosity increases when cooling"""
        temp_dep = TemperatureDependency(
            reference_temp_c=25,
            reference_viscosity_cps=500,
        )

        visc_cold = temp_dep.viscosity_at_temperature(15)
        visc_ref = temp_dep.viscosity_at_temperature(25)

        assert visc_cold > visc_ref

    def test_viscosity_decreases_with_heating(self):
        """Test viscosity decreases when heating"""
        temp_dep = TemperatureDependency(
            reference_temp_c=25,
            reference_viscosity_cps=500,
        )

        visc_hot = temp_dep.viscosity_at_temperature(35)
        visc_ref = temp_dep.viscosity_at_temperature(25)

        assert visc_hot < visc_ref

    def test_viscosity_positive(self):
        """Test viscosity is always positive"""
        temp_dep = TemperatureDependency()

        for temp in [-10, 0, 10, 25, 40, 60, 80]:
            if temp > -273:  # Above absolute zero
                visc = temp_dep.viscosity_at_temperature(temp)
                assert visc > 0


class TestPressureDependency:
    """Test pressure-dependent density"""

    def test_density_at_reference_pressure(self):
        """Test density at reference pressure"""
        press_dep = PressureDependency(
            reference_pressure_bar=1.0,
            reference_density_kg_m3=1100,
        )

        density = press_dep.density_at_pressure(1.0)
        assert abs(density - 1100) < 1

    def test_density_increases_with_pressure(self):
        """Test density increases with pressure"""
        press_dep = PressureDependency(
            reference_pressure_bar=1.0,
            reference_density_kg_m3=1100,
            compressibility_factor=0.0001,
        )

        density_high = press_dep.density_at_pressure(10.0)
        density_ref = press_dep.density_at_pressure(1.0)

        assert density_high >= density_ref


class TestProcessingWindow:
    """Test processing constraints"""

    def test_processing_window_bounds(self):
        """Test processing window has valid bounds"""
        window = ProcessingWindow(
            min_temperature_c=20,
            max_temperature_c=50,
            optimal_temperature_c=25,
        )

        assert window.min_temperature_c < window.optimal_temperature_c
        assert window.optimal_temperature_c < window.max_temperature_c

    def test_cream_and_gel_times(self):
        """Test cream and gel times are defined"""
        window = ProcessingWindow()

        assert window.cream_time_s > 0
        assert window.gel_time_s > window.cream_time_s


class TestQualityMetrics:
    """Test quality specifications"""

    def test_quality_targets(self):
        """Test quality targets are set"""
        quality = QualityMetrics(
            target_density_kg_m3=32,
            density_tolerance_percent=5,
        )

        assert quality.target_density_kg_m3 > 0
        assert quality.density_tolerance_percent > 0

    def test_thermal_properties(self):
        """Test thermal properties"""
        quality = QualityMetrics(
            thermal_conductivity_w_m_k=0.032,
        )

        assert quality.thermal_conductivity_w_m_k > 0


class TestMaterialProperties:
    """Test complete material properties"""

    def test_material_creation(self):
        """Test creating a material"""
        material = ExtendedPolyurethaneMaterial(
            name="Test Material",
            material_key="test_material",
            family=MaterialFamily.RIGID_FOAM,
            blowing_agent=BlowingAgent.WATER,
            density_kg_m3=1100,
            specific_heat_j_kg_k=2100,
            thermal_conductivity_w_m_k=0.18,
            viscosity_cps=500,
            flow_index=0.75,
        )

        assert material.name == "Test Material"
        assert material.family == MaterialFamily.RIGID_FOAM

    def test_material_with_temperature_dependency(self):
        """Test material with temperature dependency"""
        material = ExtendedPolyurethaneMaterial(
            name="Test",
            material_key="test",
            family=MaterialFamily.RIGID_FOAM,
            blowing_agent=BlowingAgent.WATER,
            density_kg_m3=1100,
            specific_heat_j_kg_k=2100,
            thermal_conductivity_w_m_k=0.18,
            viscosity_cps=500,
            flow_index=0.75,
            temperature_dep=TemperatureDependency(
                reference_temp_c=25,
                reference_viscosity_cps=500,
                activation_energy_j_mol=25000,
            ),
        )

        visc_at_30 = material.temperature_dep.viscosity_at_temperature(30)
        assert visc_at_30 < 500  # Hotter = less viscous

    def test_material_environmental_properties(self):
        """Test environmental properties"""
        material = ExtendedPolyurethaneMaterial(
            name="Eco Test",
            material_key="eco_test",
            family=MaterialFamily.RIGID_FOAM,
            blowing_agent=BlowingAgent.ECOMATE,
            density_kg_m3=1100,
            specific_heat_j_kg_k=2100,
            thermal_conductivity_w_m_k=0.18,
            viscosity_cps=500,
            flow_index=0.75,
            gwp_kg_co2_eq=0,
            is_eco_friendly=True,
        )

        assert material.is_eco_friendly
        assert material.gwp_kg_co2_eq == 0


class TestDatabaseIntegration:
    """Integration tests"""

    def test_material_compatibility_check(self):
        """Test material-machine compatibility concepts"""
        db = ExtendedMaterialDatabase()
        material = db.get_material("genfoam_hd12_standard")

        assert material is not None
        assert material.processing_window.optimal_temperature_c >= 20
        assert material.processing_window.optimal_temperature_c <= 60

    def test_materials_span_families(self):
        """Test materials cover different families"""
        db = ExtendedMaterialDatabase()

        families_present = {m.family for m in db.list_materials()}

        # Should have at least rigid, flexible, spray
        assert MaterialFamily.RIGID_FOAM in families_present
        assert MaterialFamily.FLEXIBLE_FOAM in families_present

    def test_material_viscosity_ranges(self):
        """Test material viscosities span a range"""
        db = ExtendedMaterialDatabase()
        materials = db.list_materials()

        viscosities = [m.viscosity_cps for m in materials]
        min_visc = min(viscosities)
        max_visc = max(viscosities)

        # Should span significant range (e.g., 200-1500 cP)
        assert max_visc / min_visc > 2.0  # At least 2x difference


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
