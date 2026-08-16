"""
Comprehensive Test Suite for Polyurethane Kinetics Module

Tests all kinetics models:
- Phase 1: Reaction kinetics (Avrami, Kamal-Sourour) and Castro-Macosko
- Phase 2: Thermal reaction (exotherm, lumped thermal)
- Phase 3: Foam kinetics (rise, density, cell size)

Run with: pytest src/core/kinetics/test_kinetics.py -v
"""

import pytest
import math
from typing import Dict

# Import kinetics modules
from .reaction_kinetics import (
    CureKinetics,
    CureKineticsParameters,
    AvramiModel,
    KamalSourourModel,
    CureModel,
    calculate_cure_state,
    calculate_gel_time,
    calculate_cream_time,
    calibrate_from_experimental,
)

from .viscosity_conversion import (
    CastroMacoskoModel,
    ViscosityConversionParameters,
    calculate_reactive_viscosity,
    calculate_processing_window,
    estimate_fill_time_limit,
    calculate_average_viscosity_during_fill,
)

from .thermal_reaction import (
    ExothermModel,
    LumpedThermalModel,
    ThermalReactionParameters,
    ScorchRisk,
    calculate_exotherm_rise,
    calculate_core_temperature,
    predict_scorch_risk,
    calculate_optimal_mold_temp,
)

from .foam_kinetics import (
    FoamRiseModel,
    DensityDistributionModel,
    CellNucleationModel,
    FoamKineticsParameters,
    calculate_foam_rise,
    calculate_density_profile,
    predict_cell_size,
    calculate_mold_fill_time,
    estimate_foam_part_weight,
)


# =============================================================================
# Phase 1: Reaction Kinetics Tests
# =============================================================================

class TestAvramiModel:
    """Tests for Avrami cure kinetics model"""

    @pytest.fixture
    def params(self):
        return CureKineticsParameters(
            avrami_k=0.001,
            avrami_n=2.0,
            gel_conversion=0.65,
        )

    @pytest.fixture
    def model(self, params):
        return AvramiModel(params)

    def test_initial_conversion_is_zero(self, model):
        """Conversion at t=0 should be 0"""
        alpha = model.conversion(0, 25.0)
        assert alpha == 0.0

    def test_conversion_increases_with_time(self, model):
        """Conversion should increase with time"""
        alpha_10 = model.conversion(10, 25.0)
        alpha_50 = model.conversion(50, 25.0)
        alpha_100 = model.conversion(100, 25.0)

        assert alpha_10 < alpha_50 < alpha_100

    def test_conversion_bounded_0_to_1(self, model):
        """Conversion should stay between 0 and 1"""
        for t in [0, 10, 100, 1000, 10000]:
            alpha = model.conversion(t, 25.0)
            assert 0 <= alpha <= 1

    def test_temperature_affects_rate(self, model):
        """Higher temperature should give faster conversion"""
        alpha_25 = model.conversion(50, 25.0)
        alpha_40 = model.conversion(50, 40.0)

        # Higher temp = faster reaction = higher conversion at same time
        assert alpha_40 > alpha_25

    def test_gel_time_calculation(self, model):
        """Gel time should be when conversion reaches gel_conversion"""
        gel_time = model.gel_time(25.0)
        alpha_at_gel = model.conversion(gel_time, 25.0)

        assert abs(alpha_at_gel - 0.65) < 0.02  # Within 2%


class TestKamalSourourModel:
    """Tests for Kamal-Sourour autocatalytic cure model"""

    @pytest.fixture
    def params(self):
        # Calibrated to the Genfoam HD12 data sheet: cream 50-60 s, gel 130-140 s.
        # Rate constants picked out of the air put the gel point thousands of seconds
        # away from any real system, which makes every assertion below meaningless.
        return CureKineticsParameters.calibrated_to_gel_time(
            gel_time_s=135.0,
            cream_time_s=55.0,
            m=1.0,
            n=1.5,
            activation_energy_k1=50000,
            activation_energy_k2=45000,
            gel_conversion=0.65,
        )

    @pytest.fixture
    def model(self, params):
        return KamalSourourModel(params)

    def test_initial_rate_is_positive(self, model):
        """Even at α=0, there should be some reaction rate (k1 term)"""
        rate = model.conversion_rate(0.0, 25.0)
        assert rate > 0

    def test_rate_increases_initially(self, model):
        """Autocatalytic: rate should increase as reaction proceeds"""
        rate_0 = model.conversion_rate(0.0, 25.0)
        rate_20 = model.conversion_rate(0.2, 25.0)
        rate_40 = model.conversion_rate(0.4, 25.0)

        # Rate should increase initially (autocatalytic effect)
        assert rate_20 > rate_0
        assert rate_40 > rate_20

    def test_rate_decreases_near_completion(self, model):
        """Rate should decrease as reaction nears completion"""
        rate_60 = model.conversion_rate(0.6, 25.0)
        rate_90 = model.conversion_rate(0.9, 25.0)

        assert rate_90 < rate_60

    def test_conversion_reaches_target(self, model):
        """Integration should reach target conversion"""
        alpha, history = model.integrate_cure(500, 25.0)

        assert alpha > 0.9  # Should reach high conversion

    def test_gel_time_reasonable(self, model):
        """Gel time should be in reasonable range"""
        gel_time = model.gel_time(25.0)

        # Should be between 10s and 1000s for typical PU
        assert 10 < gel_time < 1000


class TestCureKinetics:
    """Tests for unified CureKinetics interface"""

    @pytest.fixture
    def params(self):
        return CureKineticsParameters(
            gel_time_ref_s=150,
            cream_time_ref_s=50,
        )

    def test_cure_state_at_zero(self, params):
        """Cure state at t=0"""
        state = calculate_cure_state(0, 25.0, params)

        assert state.conversion == 0
        assert not state.is_gelled
        assert state.time_to_gel_s > 0

    def test_processing_window(self, params):
        """Processing window should have reasonable values"""
        kinetics = CureKinetics(params, CureModel.KAMAL_SOUROUR)
        window = kinetics.processing_window(25.0)

        assert window['cream_time_s'] > 0
        assert window['gel_time_s'] > window['cream_time_s']
        assert window['demold_time_s'] > window['gel_time_s']

    def test_calibration_from_experimental(self):
        """Calibration should produce consistent results"""
        params = calibrate_from_experimental(
            cream_time_s=10,
            gel_time_s=30,
            reference_temp_c=25,
        )

        assert params.cream_time_ref_s == 10
        assert params.gel_time_ref_s == 30


# =============================================================================
# Phase 1: Viscosity-Conversion Tests (Castro-Macosko)
# =============================================================================

class TestCastroMacoskoModel:
    """Tests for Castro-Macosko viscosity-conversion coupling"""

    @pytest.fixture
    def visc_params(self):
        return ViscosityConversionParameters(
            A=2.0,
            B=2.5,
            gel_conversion=0.65,
            initial_viscosity_pa_s=0.5,
        )

    @pytest.fixture
    def cure_params(self):
        return CureKineticsParameters()

    @pytest.fixture
    def model(self, visc_params, cure_params):
        return CastroMacoskoModel(visc_params, cure_params)

    def test_initial_viscosity(self, model, visc_params):
        """At α=0, viscosity should be initial viscosity"""
        visc = model.viscosity_from_conversion(0, 25.0)

        # Should be close to initial (within 10% for temp correction)
        assert abs(visc - visc_params.initial_viscosity_pa_s) / visc_params.initial_viscosity_pa_s < 0.1

    def test_viscosity_increases_with_conversion(self, model):
        """Viscosity should increase as conversion increases"""
        visc_0 = model.viscosity_from_conversion(0.0, 25.0)
        visc_20 = model.viscosity_from_conversion(0.2, 25.0)
        visc_40 = model.viscosity_from_conversion(0.4, 25.0)

        assert visc_20 > visc_0
        assert visc_40 > visc_20

    def test_viscosity_diverges_at_gel(self, model, visc_params):
        """Viscosity should be very high near gel point"""
        visc_near_gel = model.viscosity_from_conversion(0.64, 25.0)

        # Should be much higher than initial
        assert visc_near_gel > visc_params.initial_viscosity_pa_s * 10

    def test_viscosity_ratio(self, model):
        """Viscosity ratio should equal η/η₀"""
        conversion = 0.3
        visc = model.viscosity_from_conversion(conversion, 25.0)
        ratio = model.viscosity_ratio(conversion, 25.0)
        eta_0 = model._arrhenius_viscosity(25.0)

        assert abs(ratio - visc/eta_0) < 0.01

    def test_time_based_viscosity(self, model):
        """Time-based viscosity should increase over time"""
        visc_0 = model.viscosity_from_time(0, 25.0)
        visc_30 = model.viscosity_from_time(30, 25.0)
        visc_60 = model.viscosity_from_time(60, 25.0)

        assert visc_30 > visc_0
        assert visc_60 > visc_30


class TestProcessingWindow:
    """Tests for processing window calculations"""

    def test_processing_window_structure(self):
        """Processing window should have all required fields"""
        window = calculate_processing_window(25.0)

        assert 'initial_viscosity_pa_s' in window.__dict__
        assert 'gel_time_s' in window.__dict__
        assert 'work_time_s' in window.__dict__
        assert window.gel_time_s > 0

    def test_temperature_affects_window(self):
        """Higher temperature = shorter processing window"""
        window_25 = calculate_processing_window(25.0)
        window_40 = calculate_processing_window(40.0)

        assert window_40.gel_time_s < window_25.gel_time_s


class TestFillTimeLimit:
    """Tests for fill time limit estimation"""

    def test_fill_time_returns_result(self):
        """Should return valid result"""
        result = estimate_fill_time_limit(
            pipe_length_mm=500,
            pipe_diameter_mm=10,
            flow_rate_lpm=1.0,
            temperature_c=25.0,
        )

        assert 'max_fill_time_s' in result
        assert 'initial_pressure_bar' in result


# =============================================================================
# Phase 2: Thermal Reaction Tests
# =============================================================================

class TestExothermModel:
    """Tests for exotherm calculations"""

    @pytest.fixture
    def params(self):
        return ThermalReactionParameters(
            heat_of_reaction_j_kg=100000,
            specific_heat_j_kg_k=1800,
            density_kg_m3=1100,
        )

    @pytest.fixture
    def model(self, params):
        return ExothermModel(params)

    def test_adiabatic_rise_formula(self, model, params):
        """ΔT = ΔH / Cp for full conversion"""
        rise = model.adiabatic_temperature_rise(1.0)
        expected = params.heat_of_reaction_j_kg / params.specific_heat_j_kg_k

        assert abs(rise - expected) < 0.1

    def test_partial_conversion_rise(self, model):
        """Partial conversion should give proportional rise"""
        rise_50 = model.adiabatic_temperature_rise(0.5)
        rise_100 = model.adiabatic_temperature_rise(1.0)

        assert abs(rise_50 - rise_100 * 0.5) < 0.1

    def test_convenience_function(self):
        """Convenience function should work"""
        rise = calculate_exotherm_rise(
            heat_of_reaction_j_kg=100000,
            specific_heat_j_kg_k=2000,
            conversion=1.0,
        )

        assert rise == 50.0  # 100000 / 2000


class TestLumpedThermalModel:
    """Tests for lumped thermal model"""

    @pytest.fixture
    def thermal_params(self):
        return ThermalReactionParameters(
            heat_of_reaction_j_kg=100000,
            part_thickness_mm=20,
            mold_temperature_c=40,
            initial_temp_c=25,
        )

    @pytest.fixture
    def cure_params(self):
        return CureKineticsParameters()

    @pytest.fixture
    def model(self, thermal_params, cure_params):
        return LumpedThermalModel(thermal_params, cure_params)

    def test_biot_number_calculated(self, model):
        """Biot number should be calculated"""
        bi = model.biot_number()
        assert bi > 0

    def test_simulation_runs(self, model):
        """Simulation should complete without error"""
        history = model.simulate_cure(300)

        assert len(history) > 0
        assert history[-1]['conversion'] > 0

    def test_temperature_rises(self, model):
        """Temperature should rise during cure"""
        history = model.simulate_cure(300)

        initial_temp = history[0]['temperature_c']
        max_temp = max(h['temperature_c'] for h in history)

        assert max_temp > initial_temp


class TestScorchPrediction:
    """Tests for scorch risk prediction"""

    def test_thin_part_low_risk(self):
        """Thin parts should have low scorch risk"""
        result = predict_scorch_risk(
            part_thickness_mm=5,
            mold_temp_c=40,
        )

        assert result['scorch_risk'] in ['low', 'moderate']

    def test_thick_part_higher_risk(self):
        """Thick parts should have higher scorch risk"""
        thin = predict_scorch_risk(part_thickness_mm=10)
        thick = predict_scorch_risk(part_thickness_mm=50)

        # Thick parts should have higher peak temp
        assert thick['peak_temperature_c'] > thin['peak_temperature_c']


# =============================================================================
# Phase 3: Foam Kinetics Tests
# =============================================================================

class TestFoamRiseModel:
    """Tests for foam rise kinetics"""

    @pytest.fixture
    def params(self):
        return FoamKineticsParameters(
            cream_time_s=10,
            rise_time_constant_s=30,
            free_rise_density_kg_m3=40,
            initial_density_kg_m3=1100,
        )

    @pytest.fixture
    def model(self, params):
        return FoamRiseModel(params)

    def test_no_rise_before_cream(self, model):
        """No rise before cream time"""
        h = model.height_fraction(5, 25.0)
        assert h == 0

    def test_rise_after_cream(self, model):
        """Rise should occur after cream time"""
        h = model.height_fraction(20, 25.0)
        assert h > 0

    def test_rise_approaches_one(self, model):
        """Height fraction should approach 1"""
        h = model.height_fraction(200, 25.0)
        assert h > 0.9

    def test_density_decreases(self, model, params):
        """Density should decrease as foam rises"""
        d_before = model.current_density(5, 25.0)
        d_after = model.current_density(100, 25.0)

        assert d_before > d_after
        assert d_after < params.initial_density_kg_m3


class TestDensityDistribution:
    """Tests for foam density distribution"""

    @pytest.fixture
    def params(self):
        return FoamKineticsParameters(
            skin_density_kg_m3=800,
            core_density_kg_m3=35,
            skin_thickness_mm=2,
        )

    @pytest.fixture
    def model(self, params):
        return DensityDistributionModel(params)

    def test_skin_density_at_surface(self, model, params):
        """Density at surface should be skin density"""
        rho = model.density_at_depth(0, 20)

        # Should be close to skin density
        assert abs(rho - params.skin_density_kg_m3) < 50

    def test_core_density_in_center(self, model, params):
        """Density in center should approach core density"""
        rho = model.density_at_depth(10, 20)  # Center of 20mm part

        # Should be close to core density
        assert abs(rho - params.core_density_kg_m3) < 50

    def test_average_density_between(self, model, params):
        """Average density should be between skin and core"""
        avg = model.average_density(20)

        assert params.core_density_kg_m3 < avg < params.skin_density_kg_m3


class TestCellNucleation:
    """Tests for cell nucleation model"""

    @pytest.fixture
    def params(self):
        return FoamKineticsParameters(
            surface_tension_n_m=0.025,
            supersaturation_pa=500000,
        )

    @pytest.fixture
    def model(self, params):
        return CellNucleationModel(params)

    def test_nucleation_density_positive(self, model):
        """Nucleation density should be positive"""
        n = model.nucleation_density(25.0)
        assert n > 0

    def test_cell_diameter_reasonable(self, model):
        """Cell diameter should be in reasonable range"""
        d = model.predict_cell_diameter(25.0, 40.0)

        # Typical foam cells are 50-500 μm
        assert 50 < d < 1000

    def test_thermal_conductivity_calculated(self, model):
        """Thermal conductivity should be calculated"""
        k = model.thermal_conductivity(200, 40)

        # Typical foam k is 0.02-0.05 W/m·K
        assert 0.01 < k < 0.1


class TestFoamConvenienceFunctions:
    """Tests for foam convenience functions"""

    def test_calculate_foam_rise(self):
        """Foam rise convenience function"""
        result = calculate_foam_rise(
            time_s=50,
            cream_time_s=10,
            rise_time_constant_s=30,
        )

        assert 'height_fraction' in result
        assert 0 < result['height_fraction'] < 1

    def test_calculate_density_profile(self):
        """Density profile convenience function"""
        profile = calculate_density_profile(part_thickness_mm=20)

        assert len(profile) > 0
        assert all('density_kg_m3' in p for p in profile)

    def test_predict_cell_size(self):
        """Cell size prediction convenience function"""
        result = predict_cell_size(temperature_c=25.0)

        assert 'cell_diameter_um' in result
        assert result['cell_diameter_um'] > 0

    def test_mold_fill_time(self):
        """Mold fill time calculation"""
        result = calculate_mold_fill_time(
            mold_height_mm=100,
            pour_height_mm=10,
            expansion_ratio=15,
        )

        assert 'fill_time_s' in result
        assert result['will_fill']

    def test_foam_part_weight(self):
        """Foam part weight estimation"""
        result = estimate_foam_part_weight(
            length_mm=100,
            width_mm=100,
            thickness_mm=20,
        )

        assert 'weight_kg' in result
        assert result['weight_kg'] > 0


# =============================================================================
# Integration Tests
# =============================================================================

class TestIntegration:
    """Integration tests for complete kinetics workflow"""

    def test_complete_cure_workflow(self):
        """Test complete cure calculation workflow"""
        # Calibrated to the Genfoam HD12 data sheet gel time
        params = CureKineticsParameters.calibrated_to_gel_time(
            gel_time_s=135.0,
            cream_time_s=55.0,
            gel_conversion=0.65,
        )

        # Initialize models
        cure = CureKinetics(params, CureModel.KAMAL_SOUROUR)

        # Get cure state over time
        states = []
        for t in [0, 10, 30, 60, 120]:
            state = cure.get_cure_state(t, 25.0)
            states.append(state)

        # Verify progression
        conversions = [s.conversion for s in states]
        assert conversions == sorted(conversions)  # Should increase
        assert states[0].conversion == 0
        assert states[-1].conversion > 0.5

    def test_reactive_viscosity_workflow(self):
        """Test reactive viscosity calculation workflow"""
        result = calculate_reactive_viscosity(
            time_s=30,
            temperature_c=25.0,
            initial_viscosity_pa_s=0.5,
        )

        assert result['viscosity_pa_s'] > 0.5  # Should increase
        assert result['conversion'] > 0

    def test_exotherm_and_scorch_workflow(self):
        """Test thermal calculation workflow"""
        result = calculate_core_temperature(
            part_thickness_mm=30,
            mold_temp_c=40,
        )

        assert 'peak_temperature_c' in result
        assert 'scorch_risk' in result
        assert result['peak_temperature_c'] > 40  # Should rise above mold

    def test_foam_rise_and_fill_workflow(self):
        """Test foam rise and mold fill workflow"""
        # Calculate rise state
        rise = calculate_foam_rise(
            time_s=60,
            cream_time_s=10,
            rise_time_constant_s=30,
        )

        # Calculate mold fill
        fill = calculate_mold_fill_time(
            mold_height_mm=150,
            pour_height_mm=10,
            cream_time_s=10,
            rise_time_constant_s=30,
        )

        assert rise['height_fraction'] > 0.5
        assert fill['will_fill']


# =============================================================================
# Edge Case Tests
# =============================================================================

class TestEdgeCases:
    """Tests for edge cases and boundary conditions"""

    def test_zero_time(self):
        """Handle zero time correctly"""
        state = calculate_cure_state(0, 25.0)
        assert state.conversion == 0

    def test_very_long_time(self):
        """Handle very long times"""
        state = calculate_cure_state(10000, 25.0)
        assert state.conversion > 0.99

    def test_low_temperature(self):
        """Handle low temperatures"""
        state = calculate_cure_state(100, 5.0)
        # Should still work, just slower reaction

    def test_high_temperature(self):
        """Handle high temperatures"""
        state = calculate_cure_state(10, 80.0)
        # Should work, fast reaction

    def test_near_gel_viscosity(self):
        """Viscosity near gel should be very high but not infinite"""
        visc_params = ViscosityConversionParameters(gel_conversion=0.65)
        cure_params = CureKineticsParameters()
        model = CastroMacoskoModel(visc_params, cure_params)

        visc = model.viscosity_from_conversion(0.64, 25.0)
        assert visc < float('inf')
        assert visc > 10  # Should be high


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
