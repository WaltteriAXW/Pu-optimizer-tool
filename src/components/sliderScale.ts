/**
 * Mapping between a slider's position and a field's value.
 *
 * Pipe length, diameter and flow rate each span three or four orders of magnitude (50 mm to
 * 10 m, 0.1 to 200 L/min). On a linear slider nearly all the travel would go to the top of the
 * range and the values people actually use would be crammed into the first few pixels, so
 * those sliders are logarithmic: equal travel is an equal ratio. Temperature, a narrow range
 * used throughout, stays linear.
 */

export type SliderScale = 'linear' | 'log'

export interface SliderSpec {
  min: number
  max: number
  scale: SliderScale
}

/** Positions the slider runs over. Fine enough that every rounded value is reachable. */
export const SLIDER_STEPS = 1000

export function toSliderPosition(value: number, { min, max, scale }: SliderSpec): number {
  const clamped = Math.min(max, Math.max(min, value))
  const fraction =
    scale === 'log'
      ? Math.log(clamped / min) / Math.log(max / min)
      : (clamped - min) / (max - min)
  return Math.round(fraction * SLIDER_STEPS)
}

export function fromSliderPosition(position: number, spec: SliderSpec): number {
  const { min, max, scale } = spec
  const fraction = Math.min(1, Math.max(0, position / SLIDER_STEPS))
  const raw = scale === 'log' ? min * (max / min) ** fraction : min + fraction * (max - min)
  return roundForDisplay(raw, spec)
}

/**
 * Round to a value someone would type: a slider that lands on 487.31 mm reads as noise.
 * Steps grow with magnitude on a log slider; a linear one rounds to half units.
 */
export function roundForDisplay(value: number, { min, max, scale }: SliderSpec): number {
  let step: number
  if (scale === 'linear') step = 0.5
  else if (value < 1) step = 0.05
  else if (value < 10) step = 0.1
  else if (value < 100) step = 1
  else if (value < 1000) step = 5
  else step = 50
  const rounded = Math.round(value / step) * step
  // Clear floating-point dust (0.15000000000000002) and stay inside the range
  return Math.min(max, Math.max(min, Number(rounded.toFixed(2))))
}
