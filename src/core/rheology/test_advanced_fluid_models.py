"""
Tests for Advanced Non-Newtonian Fluid Models
"""

import math
import pytest
from advanced_fluid_models import (
    NonNewtonianFluidModel,
    RheologicalProperties
)


@pytest.fixture
def polyurethane_properties():
    """Standard polyurethane properties"""
    return RheologicalProperties(
        # Power Law
        consistency_coefficient_pa_s=0.85,
        flow_index=0.82,

        # Herschel-Bulkley
        yield_stress_pa=5.0,
        hb_consistency_pa_s=0.90,
        hb_flow_index=0.80,

        # Cross model
        zero_shear_viscosity_pa_s=0.85,
        infinite_shear_viscosity_pa_s=0.01,
        cross_k=0.1,
        cross_n=0.70,

        # Carreau model
        carreau_lambda=0.08,
        carreau_n=0.82,

        # Temperature effects
        activation_energy_j_mol=25000,
        reference_viscosity_pa_s=0.85,
        reference_temp_k=298.15,  # 25°C

        # Physical
        density_kg_m3=1120,
        specific_heat_j_kg_k=1500
    )


class TestPowerLawModel:
    """Test Power Law non-Newtonian model"""

    def test_power_law_shear_thinning(self, polyurethane_properties):
        """Higher shear rate should reduce viscosity"""
        model = NonNewtonianFluidModel(polyurethane_properties)

        eta_low = model.power_law_viscosity(100, 25)
        eta_high = model.power_law_viscosity(1000, 25)

        assert eta_high < eta_low, "Higher shear rate should decrease viscosity"
        assert eta_high > 0
        assert eta_low > 0

    def test_power_law_temperature_sensitivity(self, polyurethane_properties):
        """Higher temperature should reduce viscosity"""
        model = NonNewtonianFluidModel(polyurethane_properties)

        eta_25 = model.power_law_viscosity(500, 25)
        eta_35 = model.power_law_viscosity(500, 35)

        assert eta_35 < eta_25, "Higher temperature should decrease viscosity"

    def test_power_law_zero_shear(self, polyurethane_properties):
        """At zero shear rate, should return consistency coefficient"""
        model = NonNewtonianFluidModel(polyurethane_properties)
        eta = model.power_law_viscosity(0, 25)
        assert eta == polyurethane_properties.consistency_coefficient_pa_s

    def test_power_law_negative_shear(self, polyurethane_properties):
        """Negative shear rate should be handled gracefully"""
        model = NonNewtonianFluidModel(polyurethane_properties)
        eta = model.power_law_viscosity(-100, 25)
        assert eta > 0


class TestHerschelBulkleyModel:
    """Test Herschel-Bulkley yield stress model"""

    def test_herschel_bulkley_yield_stress(self, polyurethane_properties):
        """At very low shear, yield stress dominates"""
        model = NonNewtonianFluidModel(polyurethane_properties)

        # At very low shear rate
        eta_very_low = model.herschel_bulkley_viscosity(0.1, 25)

        # At moderate shear rate
        eta_moderate = model.herschel_bulkley_viscosity(100, 25)

        # Viscosity should decrease with shear rate
        assert eta_moderate < eta_very_low

    def test_herschel_bulkley_vs_power_law(self, polyurethane_properties):
        """Herschel-Bulkley should differ from power law at low shear"""
        model = NonNewtonianFluidModel(polyurethane_properties)

        eta_pl = model.power_law_viscosity(10, 25)
        eta_hb = model.herschel_bulkley_viscosity(10, 25)

        # They should be different due to yield stress
        assert abs(eta_hb - eta_pl) > 0.001

    def test_herschel_bulkley_temperature_effect(self, polyurethane_properties):
        """Temperature should reduce yield stress effect"""
        model = NonNewtonianFluidModel(polyurethane_properties)

        eta_25 = model.herschel_bulkley_viscosity(50, 25)
        eta_35 = model.herschel_bulkley_viscosity(50, 35)

        assert eta_35 < eta_25


class TestCrossModel:
    """Test Cross smooth-transition model"""

    def test_cross_transition(self, polyurethane_properties):
        """Cross model should smoothly transition from η₀ to η∞"""
        model = NonNewtonianFluidModel(polyurethane_properties)

        # At low shear, should approach zero-shear viscosity
        eta_low = model.cross_viscosity(0.1, 25)
        expected_low = polyurethane_properties.zero_shear_viscosity_pa_s

        # Should be close to zero-shear viscosity
        assert eta_low > expected_low * 0.8

        # At high shear, should approach infinite-shear viscosity
        eta_high = model.cross_viscosity(10000, 25)
        expected_high = polyurethane_properties.infinite_shear_viscosity_pa_s

        assert eta_high < expected_low

    def test_cross_shear_thinning(self, polyurethane_properties):
        """Cross model should show shear thinning"""
        model = NonNewtonianFluidModel(polyurethane_properties)

        eta_100 = model.cross_viscosity(100, 25)
        eta_1000 = model.cross_viscosity(1000, 25)
        eta_5000 = model.cross_viscosity(5000, 25)

        assert eta_100 > eta_1000 > eta_5000

    def test_cross_smooth_behavior(self, polyurethane_properties):
        """Cross model should be smooth (no discontinuities)"""
        model = NonNewtonianFluidModel(polyurethane_properties)

        # Calculate viscosity over range
        viscosities = [
            model.cross_viscosity(shear, 25)
            for shear in [10, 100, 1000, 5000, 10000]
        ]

        # Check monotonic decrease
        for i in range(len(viscosities) - 1):
            assert viscosities[i] >= viscosities[i + 1]


class TestCarreauModel:
    """Test Carreau smooth-transition model"""

    def test_carreau_smooth_transition(self, polyurethane_properties):
        """Carreau should smoothly transition across shear rates"""
        model = NonNewtonianFluidModel(polyurethane_properties)

        eta_low = model.carreau_viscosity(1, 25)
        eta_mid = model.carreau_viscosity(100, 25)
        eta_high = model.carreau_viscosity(5000, 25)

        assert eta_low > eta_mid > eta_high

    def test_carreau_temperature_sensitivity(self, polyurethane_properties):
        """Carreau should respond to temperature"""
        model = NonNewtonianFluidModel(polyurethane_properties)

        eta_20 = model.carreau_viscosity(500, 20)
        eta_30 = model.carreau_viscosity(500, 30)

        assert eta_20 > eta_30


class TestModelComparison:
    """Compare different non-Newtonian models"""

    def test_all_models_shear_thinning(self, polyurethane_properties):
        """All models should show shear thinning"""
        model = NonNewtonianFluidModel(polyurethane_properties)

        for model_name in ['power_law', 'herschel_bulkley', 'cross', 'carreau']:
            eta_low = model.get_viscosity(100, 25, model_name)
            eta_high = model.get_viscosity(5000, 25, model_name)

            assert eta_high < eta_low, f"{model_name} should show shear thinning"

    def test_all_models_temperature_effect(self, polyurethane_properties):
        """All models should respond to temperature"""
        model = NonNewtonianFluidModel(polyurethane_properties)

        for model_name in ['power_law', 'herschel_bulkley', 'cross', 'carreau']:
            eta_25 = model.get_viscosity(500, 25, model_name)
            eta_35 = model.get_viscosity(500, 35, model_name)

            assert eta_25 > eta_35, f"{model_name} should decrease with temperature"

    def test_model_selection(self, polyurethane_properties):
        """Model selector should work for all models"""
        model = NonNewtonianFluidModel(polyurethane_properties)

        models = ['power_law', 'herschel_bulkley', 'cross', 'carreau']
        viscosities = [
            model.get_viscosity(500, 25, m) for m in models
        ]

        # All should be positive
        assert all(v > 0 for v in viscosities)

    def test_invalid_model_raises_error(self, polyurethane_properties):
        """Invalid model name should raise error"""
        model = NonNewtonianFluidModel(polyurethane_properties)

        with pytest.raises(ValueError):
            model.get_viscosity(500, 25, 'invalid_model')


class TestTemperatureEffects:
    """Test Arrhenius temperature correction"""

    def test_arrhenius_activation_energy_effect(self):
        """Higher activation energy = more temperature sensitivity"""
        props_high_ea = RheologicalProperties(
            consistency_coefficient_pa_s=0.85, flow_index=0.82,
            yield_stress_pa=5.0, hb_consistency_pa_s=0.90, hb_flow_index=0.80,
            zero_shear_viscosity_pa_s=0.85, infinite_shear_viscosity_pa_s=0.01,
            cross_k=0.1, cross_n=0.70,
            carreau_lambda=0.08, carreau_n=0.82,
            activation_energy_j_mol=40000,  # Higher E_a
            reference_viscosity_pa_s=0.85, reference_temp_k=298.15,
            density_kg_m3=1120, specific_heat_j_kg_k=1500
        )

        props_low_ea = RheologicalProperties(
            consistency_coefficient_pa_s=0.85, flow_index=0.82,
            yield_stress_pa=5.0, hb_consistency_pa_s=0.90, hb_flow_index=0.80,
            zero_shear_viscosity_pa_s=0.85, infinite_shear_viscosity_pa_s=0.01,
            cross_k=0.1, cross_n=0.70,
            carreau_lambda=0.08, carreau_n=0.82,
            activation_energy_j_mol=15000,  # Lower E_a
            reference_viscosity_pa_s=0.85, reference_temp_k=298.15,
            density_kg_m3=1120, specific_heat_j_kg_k=1500
        )

        model_high = NonNewtonianFluidModel(props_high_ea)
        model_low = NonNewtonianFluidModel(props_low_ea)

        # Same shear rate, 20°C temperature change
        eta_high_25 = model_high.power_law_viscosity(500, 25)
        eta_high_45 = model_high.power_law_viscosity(500, 45)

        eta_low_25 = model_low.power_law_viscosity(500, 25)
        eta_low_45 = model_low.power_law_viscosity(500, 45)

        # Higher E_a should have greater viscosity change
        ratio_high = eta_high_25 / eta_high_45
        ratio_low = eta_low_25 / eta_low_45

        assert ratio_high > ratio_low


class TestWallSlipCorrection:
    """Test wall slip correction at high shear stress"""

    def test_wall_slip_reduces_effective_viscosity(self, polyurethane_properties):
        """Wall slip should reduce effective viscosity"""
        model = NonNewtonianFluidModel(polyurethane_properties)

        # High shear stress
        slip_factor = model.wall_slip_correction(
            shear_stress_pa=1000,
            wall_temperature_c=25,
            slip_constant=0.0005
        )

        # Should be less than 1.0 (indicating slip)
        assert 0.0 < slip_factor <= 1.0

        # Higher stress should increase slip
        slip_factor_higher = model.wall_slip_correction(
            shear_stress_pa=2000,
            wall_temperature_c=25,
            slip_constant=0.0005
        )

        assert slip_factor_higher < slip_factor

    def test_wall_slip_temperature_dependent(self, polyurethane_properties):
        """Higher temperature should reduce wall slip (more fluid behavior)"""
        model = NonNewtonianFluidModel(polyurethane_properties)

        slip_20 = model.wall_slip_correction(
            shear_stress_pa=1000,
            wall_temperature_c=20,
            slip_constant=0.0005
        )

        slip_40 = model.wall_slip_correction(
            shear_stress_pa=1000,
            wall_temperature_c=40,
            slip_constant=0.0005
        )

        # Higher temperature should have less slip (factor closer to 1)
        assert slip_40 > slip_20


class TestEdgeCases:
    """Test edge cases and boundary conditions"""

    def test_zero_shear_rates(self, polyurethane_properties):
        """All models should handle zero shear gracefully"""
        model = NonNewtonianFluidModel(polyurethane_properties)

        eta_pl = model.power_law_viscosity(0, 25)
        eta_hb = model.herschel_bulkley_viscosity(0, 25)
        eta_cross = model.cross_viscosity(0, 25)
        eta_carreau = model.carreau_viscosity(0, 25)

        assert all(v > 0 for v in [eta_pl, eta_hb, eta_cross, eta_carreau])

    def test_extreme_temperatures(self, polyurethane_properties):
        """Models should handle extreme temperatures"""
        model = NonNewtonianFluidModel(polyurethane_properties)

        # Very cold
        eta_cold = model.power_law_viscosity(500, -20)
        # Very hot
        eta_hot = model.power_law_viscosity(500, 100)

        assert eta_cold > eta_hot
        assert eta_cold > 0 and eta_hot > 0

    def test_extreme_shear_rates(self, polyurethane_properties):
        """Models should handle extreme shear rates"""
        model = NonNewtonianFluidModel(polyurethane_properties)

        # Very low shear
        eta_low = model.power_law_viscosity(0.01, 25)
        # Very high shear
        eta_high = model.power_law_viscosity(100000, 25)

        assert eta_high > 0
        assert eta_low > eta_high

    def test_viscosity_always_positive(self, polyurethane_properties):
        """Viscosity should always be positive"""
        model = NonNewtonianFluidModel(polyurethane_properties)

        test_cases = [
            (0.01, -50),
            (10, 0),
            (5000, 80),
            (100000, 150)
        ]

        for shear, temp in test_cases:
            for model_name in ['power_law', 'herschel_bulkley', 'cross', 'carreau']:
                eta = model.get_viscosity(shear, temp, model_name)
                assert eta > 0, f"{model_name} gave negative viscosity"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
