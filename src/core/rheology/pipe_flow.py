"""
Laminar pipe flow of a fluid whose viscosity depends on shear rate.

For a Newtonian fluid the pressure drop follows from Hagen-Poiseuille. For a shear-thinning
one the shortcut is to take the viscosity at the Newtonian wall shear rate 8V/D and use it in
Hagen-Poiseuille anyway. That is close for a mild power law (about 4 % low at n = 0.85) but it
is not a method: it ignores that the velocity profile flattens as the fluid thins, and for a
yield-stress fluid, which flows as a solid plug in the middle of the pipe, it is simply wrong.

The exact relation for any fluid whose stress is a function of shear rate alone is the
Rabinowitsch-Mooney equation:

    Q = (π·R³ / τ_w³) · ∫₀^τ_w  τ²·γ̇(τ) dτ

where τ_w is the wall shear stress, from which the pressure drop follows by a force balance,
ΔP = 2·τ_w·L / R. It needs γ̇(τ), the inverse of the flow curve, which has no closed form for
Carreau or Cross. Substituting τ = τ(γ̇) moves the integral onto shear rate instead:

    Q = (π·R³ / τ_w³) · ∫₀^γ̇_w  τ(g)²·g·τ'(g) dg

which needs only τ and its slope, both closed-form for every model in models.py. The integral
is done by Gauss-Legendre quadrature, and the wall shear rate that delivers the required flow
is found by a bracketed root search (the Illinois variant of regula falsi) on its logarithm:
Q rises monotonically with it for any flow curve whose stress rises with shear rate, which
models.build_model enforces, so the bracket always holds the one answer. Plain bisection
would also work but takes sixty quadratures where this takes about ten, and the operating
window asks for this solution a few hundred times per calculation.

The result is reported the way the rest of the engine already works, as an effective
viscosity η_eff = τ_w / (8V/D). Put into Hagen-Poiseuille it reproduces the exact pressure
drop, and ρVD/η_eff is the Metzner-Reed Reynolds number, the standard one for judging the
laminar-turbulent transition of a non-Newtonian fluid. So the existing pressure, Reynolds and
envelope calculations take it unchanged.
"""

import math
from typing import Dict, List, Tuple

from .models import RheologyModel

# Gauss-Legendre order. The integrand is smooth except a u^n corner at zero shear for a
# yield-stress fluid; 48 points hold the flow rate to better than 1e-5 there and to machine
# precision for the smooth models (see test_pipe_flow.py).
QUADRATURE_POINTS = 48

# The root search stops when the flow rate matches to this relative tolerance, or after this
# many steps — a guard that a monotone function never reaches in practice.
FLOW_TOLERANCE = 1e-10
MAX_STEPS = 100


def _gauss_legendre(n: int) -> List[Tuple[float, float]]:
    """Nodes and weights on [0, 1], by Newton iteration on the Legendre polynomial."""
    pairs = []
    for i in range(1, n + 1):
        x = math.cos(math.pi * (i - 0.25) / (n + 0.5))
        for _ in range(100):
            p0, p1 = 1.0, x
            for k in range(2, n + 1):
                p0, p1 = p1, ((2 * k - 1) * x * p1 - (k - 1) * p0) / k
            dp = n * (x * p1 - p0) / (x * x - 1)
            step = p1 / dp
            x -= step
            if abs(step) < 1e-15:
                break
        weight = 2 / ((1 - x * x) * dp * dp)
        pairs.append(((1 - x) / 2, weight / 2))
    return pairs


_NODES = _gauss_legendre(QUADRATURE_POINTS)


def flow_rate_at_wall_shear_rate(
    model: RheologyModel, wall_shear_rate: float, radius_m: float, shift: float = 1.0,
) -> float:
    """Volumetric flow (m³/s) in a pipe whose true wall shear rate is the one given."""
    if wall_shear_rate <= 0:
        return 0.0
    tau_w = model.stress(wall_shear_rate, shift)
    if tau_w <= 0:
        return 0.0

    integral = 0.0
    for u, w in _NODES:
        g = u * wall_shear_rate
        tau = model.stress(g, shift)
        integral += w * tau * tau * g * model.stress_slope(g, shift)
    integral *= wall_shear_rate

    return math.pi * radius_m ** 3 * integral / tau_w ** 3


def solve_pipe_flow(
    model: RheologyModel,
    diameter_mm: float,
    flow_rate_lpm: float,
    shift: float = 1.0,
) -> Dict[str, float]:
    """
    Wall shear stress and effective viscosity for a flow rate through a pipe.

    Args:
        model: The flow curve at the reference temperature
        diameter_mm: Pipe bore
        flow_rate_lpm: Flow rate
        shift: Arrhenius shift factor a_T for the process temperature

    Returns:
        Dict with the wall shear stress, the true and apparent (8V/D) wall shear rates,
        and the effective viscosity that reproduces the exact pressure drop in
        Hagen-Poiseuille.
    """
    radius_m = diameter_mm / 2000.0
    q = flow_rate_lpm / 60000.0
    if radius_m <= 0 or q <= 0:
        raise ValueError('Diameter and flow rate must be positive')

    apparent_shear_rate = 4 * q / (math.pi * radius_m ** 3)

    # Bracket the true wall shear rate around the apparent one. For a shear-thinning or
    # yield-stress fluid it is higher; for a mildly thickening one, a little lower.
    low = apparent_shear_rate / 2
    while flow_rate_at_wall_shear_rate(model, low, radius_m, shift) > q:
        low /= 4
    high = apparent_shear_rate * 2
    while flow_rate_at_wall_shear_rate(model, high, radius_m, shift) < q:
        high *= 4

    # Illinois regula falsi on f(x) = ln Q(e^x) - ln q, which is close to linear in x
    def f(x: float) -> float:
        return math.log(flow_rate_at_wall_shear_rate(model, math.exp(x), radius_m, shift) / q)

    a, b = math.log(low), math.log(high)
    fa, fb = f(a), f(b)
    side = 0
    x = b
    for _ in range(MAX_STEPS):
        if fb == fa:
            x = (a + b) / 2
        else:
            x = (a * fb - b * fa) / (fb - fa)
        fx = f(x)
        if abs(fx) < FLOW_TOLERANCE:
            break
        if fx * fb > 0:
            b, fb = x, fx
            if side == -1:
                fa /= 2
            side = -1
        else:
            a, fa = x, fx
            if side == 1:
                fb /= 2
            side = 1
    wall_shear_rate = math.exp(x)

    tau_w = model.stress(wall_shear_rate, shift)
    effective_viscosity_pa_s = tau_w / apparent_shear_rate

    result = {
        'wall_shear_stress_pa': tau_w,
        'wall_shear_rate_s_inv': wall_shear_rate,
        'apparent_shear_rate_s_inv': apparent_shear_rate,
        'effective_viscosity_cp': effective_viscosity_pa_s * 1000.0,
    }
    if model.model == 'herschel_bulkley':
        # Inside this radius the stress is below yield and the material moves as a solid
        # plug. Reported because a plug filling most of the bore is a line that is barely
        # flowing — the thing a yield-stress model is chosen to reveal.
        result['plug_radius_fraction'] = min(1.0, shift * model.yield_stress_pa / tau_w)
    return result


__all__ = ['QUADRATURE_POINTS', 'flow_rate_at_wall_shear_rate', 'solve_pipe_flow']
