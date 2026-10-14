"""
The operating window: how far each setting can move before the line stops working.

The forward calculation answers "what pressure does this setup need?". An operator usually
has the opposite question — "how fast can I run before the pump runs out of pressure?",
"how cold can the tank get?", "would a narrower hose do?". Each of those is one setting
moved until the feed-line pressure reaches a limit, with everything else held where it is.

Each answer is found by bisection on the real calculation, not by inverting equations or
by a general-purpose optimiser. Feed-line pressure moves one way with each of these
settings — up with flow rate, down with temperature, down with diameter — so a single
crossing exists if one exists at all, and bisection finds it to float precision in sixty
steps without a starting guess, derivatives, or any chance of converging somewhere else.
The previous optimisers here did none of that: one needed scipy and a pressure input this
engine does not have, and scored "quality" with weights nobody had measured; the other
crashed on the first text-valued parameter it met and never contracted its simplex.

The limit is the machine's maximum pressure less its own internal losses (what the feed
line may use of it), or a lower figure the user sets themselves, whichever is tighter.

The flow rate window combines this with the two limits the result already knows: the
laminar envelope (turbulence) and the machine's output range.
"""

from typing import Any, Callable, Dict, Optional, Tuple

# Sixty halvings take any bracket in this tool's ranges below a millionth of its width.
BISECTION_STEPS = 60

# A setting is reported as a limit only when the crossing lies inside the range the form
# accepts. Outside it, the answer is "anywhere in range is fine" or "nowhere is".
STATUS_LIMIT = 'limit'
STATUS_UNCONSTRAINED = 'unconstrained'
STATUS_INFEASIBLE = 'infeasible'


def _bisect(
    pressure_at: Callable[[float], float],
    low: float,
    high: float,
    limit_bar: float,
    rising: bool,
) -> Tuple[str, Optional[float]]:
    """
    The setting at which feed-line pressure reaches the limit.

    Args:
        pressure_at: Feed-line pressure for a value of the setting
        low, high: The range the setting may take
        limit_bar: Pressure the line may not exceed
        rising: True when pressure rises with the setting (flow rate), False when it falls
            (temperature, diameter)

    Returns:
        (status, value). For a rising setting the value is the highest one within the
        limit; for a falling setting, the lowest. None unless the status is 'limit'.
    """
    def ok(value: float) -> bool:
        return pressure_at(value) <= limit_bar

    # The end of the range that is easiest on the line, and the end that is hardest
    easy, hard = (low, high) if rising else (high, low)

    if ok(hard):
        return STATUS_UNCONSTRAINED, None
    if not ok(easy):
        return STATUS_INFEASIBLE, None

    for _ in range(BISECTION_STEPS):
        mid = (easy + hard) / 2
        if ok(mid):
            easy = mid
        else:
            hard = mid

    return STATUS_LIMIT, easy


def solve_operating_window(
    feed_pressure_at: Callable[[Dict[str, float]], float],
    current: Dict[str, float],
    ranges: Dict[str, Tuple[float, float]],
    machine_max_bar: float,
    machine_loss_bar: float,
    user_limit_bar: Optional[float] = None,
    max_laminar_flow_lpm: Optional[float] = None,
    output_range_lpm: Optional[Tuple[float, float]] = None,
) -> Dict[str, Any]:
    """
    How far flow rate, temperature and diameter can each move within the pressure limit.

    Args:
        feed_pressure_at: Feed-line pressure (bar, fittings included) for the current setup
            with the given settings overridden, e.g. {'flow_rate_lpm': 12.0}
        current: The present flow_rate_lpm, temperature_c and pipe_diameter_mm
        ranges: (min, max) the form accepts for each of those three keys
        machine_max_bar: The machine's maximum pressure
        machine_loss_bar: Pressure the machine's own plumbing uses (mix head, valves, filters)
        user_limit_bar: A lower feed-line limit the user has set, if any
        max_laminar_flow_lpm: Flow at which the line turns turbulent, from the laminar
            envelope; None when it cannot within range
        output_range_lpm: The machine's output range converted to L/min, if known

    Returns:
        Dict with the limit applied, the boundary for each setting, and the flow window.
    """
    machine_feed_limit = machine_max_bar - machine_loss_bar
    if user_limit_bar is not None and user_limit_bar < machine_feed_limit:
        limit_bar, limit_source = user_limit_bar, 'user_limit'
    else:
        limit_bar, limit_source = machine_feed_limit, 'machine_max'

    def along(key: str) -> Callable[[float], float]:
        return lambda value: feed_pressure_at({key: value})

    flow_status, max_flow = _bisect(
        along('flow_rate_lpm'), *ranges['flow_rate_lpm'], limit_bar, rising=True
    )
    temp_status, min_temp = _bisect(
        along('temperature_c'), *ranges['temperature_c'], limit_bar, rising=False
    )
    diameter_status, min_diameter = _bisect(
        along('pipe_diameter_mm'), *ranges['pipe_diameter_mm'], limit_bar, rising=False
    )

    window = _flow_window(
        current_flow=current['flow_rate_lpm'],
        flow_range=ranges['flow_rate_lpm'],
        pressure_status=flow_status,
        pressure_max_flow=max_flow,
        max_laminar_flow=max_laminar_flow_lpm,
        output_range=output_range_lpm,
    )

    return {
        'pressure_limit_bar': limit_bar,
        'limit_source': limit_source,
        'machine_max_bar': machine_max_bar,
        'machine_loss_bar': machine_loss_bar,
        'max_flow_rate': {'status': flow_status, 'value_lpm': max_flow},
        'min_temperature': {'status': temp_status, 'value_c': min_temp},
        'min_diameter': {'status': diameter_status, 'value_mm': min_diameter},
        'flow_window': window,
    }


def _flow_window(
    current_flow: float,
    flow_range: Tuple[float, float],
    pressure_status: str,
    pressure_max_flow: Optional[float],
    max_laminar_flow: Optional[float],
    output_range: Optional[Tuple[float, float]],
) -> Dict[str, Any]:
    """
    The flow rates this line and machine can run at, and what sets each end.

    The bottom is the machine's minimum output, where the metering stops being accurate.
    The top is whichever comes first: the pressure limit, turbulence, or the machine's
    maximum output.
    """
    low, low_by = flow_range[0], 'input_range'
    if output_range is not None and output_range[0] > low:
        low, low_by = output_range[0], 'machine_output'

    if pressure_status == STATUS_INFEASIBLE:
        return {
            'min_lpm': low,
            'max_lpm': None,
            'min_governed_by': low_by,
            'max_governed_by': 'pressure',
            'is_empty': True,
            'current_inside': False,
        }

    candidates = [(flow_range[1], 'input_range')]
    if pressure_status == STATUS_LIMIT and pressure_max_flow is not None:
        candidates.append((pressure_max_flow, 'pressure'))
    if max_laminar_flow is not None:
        candidates.append((max_laminar_flow, 'turbulence'))
    if output_range is not None:
        candidates.append((output_range[1], 'machine_output'))
    high, high_by = min(candidates, key=lambda c: c[0])

    is_empty = high < low
    return {
        'min_lpm': low,
        'max_lpm': high,
        'min_governed_by': low_by,
        'max_governed_by': high_by,
        'is_empty': is_empty,
        'current_inside': (not is_empty) and low <= current_flow <= high,
    }


__all__ = [
    'BISECTION_STEPS',
    'STATUS_LIMIT',
    'STATUS_UNCONSTRAINED',
    'STATUS_INFEASIBLE',
    'solve_operating_window',
]
