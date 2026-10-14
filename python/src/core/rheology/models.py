"""
Viscosity models beyond the power law, for materials someone has measured on a rheometer.

The power law, η = K·γ̇^(n-1), is the default and the only model the catalogued materials
use, because a data sheet gives a viscosity and little else. It has two faults at the ends of
the shear range: viscosity grows without bound as shear falls, and it never levels off as
shear rises. These models fix one or the other, and are worth using only with the parameters
from a measured flow curve:

    Carreau              η = η₀·[1 + (λγ̇)²]^((n-1)/2)
                         levels off at η₀ at low shear; power law above γ̇ ≈ 1/λ

    Cross                η = η∞ + (η₀ - η∞) / (1 + (λγ̇)^m)
                         plateaus at both ends

    Herschel-Bulkley     τ = τ₀ + K·γ̇^n          (no flow below τ₀)
                         a yield stress — filled or thixotropic systems

Temperature. Carreau and Cross shift by time-temperature superposition,
η(γ̇, T) = a_T·η_ref(a_T·γ̇), which moves the whole curve: a colder material is more viscous
AND starts thinning at a lower shear rate, because its relaxation time grows by the same
factor. Scaling η₀ alone, as the earlier version of this module did, leaves λ fixed and gets
the onset of thinning wrong. Herschel-Bulkley has no relaxation time to shift, so τ₀ and K
are both scaled by a_T. In every case a_T is the Arrhenius factor the rest of the engine
uses, exp[E_a/R·(1/T - 1/T_ref)].

Each model gives shear stress τ(γ̇) and its slope dτ/dγ̇ in closed form, which is what the
pipe flow solution (pipe_flow.py) integrates.
"""

from dataclasses import dataclass
from typing import Any, Dict, Optional

MODELS = ('carreau', 'cross', 'herschel_bulkley')


@dataclass(frozen=True)
class RheologyModel:
    """
    One flow curve at the reference temperature, in SI units.

    Attributes:
        model: 'carreau', 'cross' or 'herschel_bulkley'
        index: n for Carreau and Herschel-Bulkley, m for Cross
        zero_shear_viscosity_pa_s: η₀ (Carreau, Cross)
        infinite_shear_viscosity_pa_s: η∞ (Cross)
        time_constant_s: λ (Carreau, Cross)
        yield_stress_pa: τ₀ (Herschel-Bulkley)
        consistency_pa_sn: K (Herschel-Bulkley)
    """
    model: str
    index: float
    zero_shear_viscosity_pa_s: float = 0.0
    infinite_shear_viscosity_pa_s: float = 0.0
    time_constant_s: float = 0.0
    yield_stress_pa: float = 0.0
    consistency_pa_sn: float = 0.0

    def stress(self, shear_rate: float, shift: float = 1.0) -> float:
        """Shear stress τ (Pa) at a shear rate (1/s), with Arrhenius shift factor a_T."""
        if self.model == 'herschel_bulkley':
            if shear_rate <= 0:
                return 0.0
            return shift * (self.yield_stress_pa + self.consistency_pa_sn * shear_rate ** self.index)
        return self.viscosity(shear_rate, shift) * shear_rate

    def viscosity(self, shear_rate: float, shift: float = 1.0) -> float:
        """
        Apparent viscosity τ/γ̇ (Pa·s).

        For Herschel-Bulkley this diverges as γ̇ → 0, which is the point of the model: below
        the yield stress the material does not flow. Asked at zero shear it returns infinity
        rather than a large made-up number.
        """
        if self.model == 'herschel_bulkley':
            if shear_rate <= 0:
                return float('inf')
            return self.stress(shear_rate, shift) / shear_rate

        g = shift * shear_rate
        if self.model == 'carreau':
            base = 1.0 + (self.time_constant_s * g) ** 2
            return shift * self.zero_shear_viscosity_pa_s * base ** ((self.index - 1.0) / 2.0)
        if self.model == 'cross':
            eta_0 = self.zero_shear_viscosity_pa_s
            eta_inf = self.infinite_shear_viscosity_pa_s
            return shift * (eta_inf + (eta_0 - eta_inf) / (1.0 + (self.time_constant_s * g) ** self.index))
        raise ValueError(f'Unknown rheology model: {self.model}')

    def stress_slope(self, shear_rate: float, shift: float = 1.0) -> float:
        """dτ/dγ̇ (Pa·s), in closed form."""
        if self.model == 'herschel_bulkley':
            if shear_rate <= 0:
                return float('inf') if self.index < 1 else shift * self.consistency_pa_sn
            return shift * self.index * self.consistency_pa_sn * shear_rate ** (self.index - 1.0)

        # τ = η(γ̇)·γ̇, so dτ/dγ̇ = η + γ̇·dη/dγ̇. Under the shift, η(γ̇) = a·η_ref(a·γ̇) and
        # dη/dγ̇ = a²·η_ref'(a·γ̇).
        g = shift * shear_rate
        lam = self.time_constant_s
        if self.model == 'carreau':
            eta_0, n = self.zero_shear_viscosity_pa_s, self.index
            base = 1.0 + (lam * g) ** 2
            eta_ref = eta_0 * base ** ((n - 1.0) / 2.0)
            d_eta_ref = eta_0 * (n - 1.0) * lam ** 2 * g * base ** ((n - 3.0) / 2.0)
        elif self.model == 'cross':
            eta_0, eta_inf, m = (
                self.zero_shear_viscosity_pa_s, self.infinite_shear_viscosity_pa_s, self.index,
            )
            lg_m = (lam * g) ** m
            eta_ref = eta_inf + (eta_0 - eta_inf) / (1.0 + lg_m)
            d_eta_ref = (
                -(eta_0 - eta_inf) * m * lam ** m * g ** (m - 1.0) / (1.0 + lg_m) ** 2
                if g > 0 else 0.0
            )
        else:
            raise ValueError(f'Unknown rheology model: {self.model}')
        return shift * eta_ref + shear_rate * shift ** 2 * d_eta_ref


def build_model(parameters: Dict[str, Any]) -> Optional[RheologyModel]:
    """
    The model a calculation asks for, from its parameters, or None for the power law.

    Viscosities arrive in centipoise like every other viscosity in the API, and are
    converted to Pa·s here.

    Raises:
        ValueError: naming the parameter that is missing or out of its physical range
    """
    model = parameters.get('rheology_model') or 'power_law'
    if model == 'power_law':
        return None
    if model not in MODELS:
        raise ValueError(f'Unknown rheology model: {model}')

    def number(key: str, label: str) -> float:
        value = parameters.get(key)
        if value is None:
            raise ValueError(f'{label} is required for the {model.replace("_", "-")} model')
        try:
            return float(value)
        except (TypeError, ValueError):
            raise ValueError(f'{label} must be a number') from None

    index = number('rheology_index', 'Flow index')

    if model == 'herschel_bulkley':
        yield_stress = number('yield_stress_pa', 'Yield stress')
        consistency = number('consistency_pa_sn', 'Consistency')
        if yield_stress < 0:
            raise ValueError('Yield stress cannot be negative')
        if consistency <= 0:
            raise ValueError('Consistency must be positive')
        if not 0 < index <= 1.5:
            raise ValueError('Flow index must be above 0 and at most 1.5')
        return RheologyModel(
            model=model, index=index,
            yield_stress_pa=yield_stress, consistency_pa_sn=consistency,
        )

    eta_0 = number('zero_shear_viscosity_cp', 'Zero-shear viscosity') / 1000.0
    lam = number('time_constant_s', 'Time constant')
    if eta_0 <= 0:
        raise ValueError('Zero-shear viscosity must be positive')
    if lam <= 0:
        raise ValueError('Time constant must be positive')
    # Above 1 the curve would thicken, and above it the stress can fall with shear rate —
    # a flow curve no pipe solution is unique for.
    if not 0 < index <= 1:
        raise ValueError('Flow index must be above 0 and at most 1')

    eta_inf = 0.0
    if model == 'cross':
        eta_inf = number('infinite_shear_viscosity_cp', 'Infinite-shear viscosity') / 1000.0
        if not 0 <= eta_inf < eta_0:
            raise ValueError('Infinite-shear viscosity must be below the zero-shear viscosity')

    return RheologyModel(
        model=model, index=index,
        zero_shear_viscosity_pa_s=eta_0, infinite_shear_viscosity_pa_s=eta_inf,
        time_constant_s=lam,
    )


__all__ = ['MODELS', 'RheologyModel', 'build_model']
