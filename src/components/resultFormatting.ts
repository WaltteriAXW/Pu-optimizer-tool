/**
 * Display decisions for the results panel.
 *
 * These live apart from the component so they can be tested directly — the test setup runs in
 * a node environment with no DOM, so a rendered assertion is not available. Each function here
 * corresponds to a defect found by photographing the running application.
 */

/**
 * Present-and-numeric guard. The Python layer sends null for values it could not evaluate,
 * and omits keys entirely for blocks that were not requested.
 *
 * The distinction from a plain truthiness check is the whole point: `gwp_per_kg` is 0 for
 * water-blown foam and `heat_generated_w` is 0 at zero flow. Guarding those with `value &&`
 * both suppressed the row and rendered a bare "0" into the card, because that is what React
 * does with a falsy number in an `&&` expression — and it did so precisely when the value was
 * most favourable.
 */
export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

/**
 * A temperature for a label, at one decimal.
 *
 * Interpolating the raw value produced labels like "Viscosity at 12.901331283799657 °C". The
 * mix-head temperature is the result of an exponential thermal decay, so it is only ever a
 * round number by accident.
 */
export const formatTemperature = (value: unknown): string =>
  isNumber(value) ? `${value.toFixed(1)} °C` : '—'

/**
 * Whether two temperatures are the same once rounded for display.
 *
 * Compared as rendered strings rather than raw floats: two values differing in the twelfth
 * decimal still label two rows identically, and an identical row printed twice is the thing
 * worth suppressing. With no ambient temperature entered, the material sits at its reference
 * temperature and the panel showed "Viscosity at 25 °C · 447.57 cP" twice in a row.
 */
export const isSameTemperature = (a: unknown, b: unknown): boolean =>
  isNumber(a) && isNumber(b) && a.toFixed(1) === b.toFixed(1)
