import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Contrast of the colour pairings the interface actually uses, in each appearance.
 *
 * The values live in src/theme.css; a change there that drops a pairing below the WCAG AA
 * minimum (4.5:1 for text, 3:1 for bold text and for graphics) fails here rather than on
 * someone's screen. The pairings are the real ones: card text on the card surface, status
 * text on its tinted background, white on the Run button and so on.
 */

type Palette = Record<string, [number, number, number]>

const css = readFileSync(join(__dirname, 'theme.css'), 'utf-8')

/** The declarations inside the first block whose selector text matches. */
function block(selectorPattern: RegExp): Palette {
  const match = selectorPattern.exec(css)
  if (!match) throw new Error(`no block matching ${selectorPattern}`)
  const start = css.indexOf('{', match.index + match[0].length - 1)
  const end = css.indexOf('}', start)
  const palette: Palette = {}
  for (const decl of css.slice(start + 1, end).matchAll(/--c-([\w-]+):\s*(\d+) (\d+) (\d+);/g)) {
    palette[decl[1]] = [Number(decl[2]), Number(decl[3]), Number(decl[4])]
  }
  return palette
}

const light = block(/^:root \{/m)
const dark = { ...light, ...block(/prefers-color-scheme: dark\) \{\s*:root:not/) }
const lightMore = { ...light, ...block(/prefers-contrast: more\) \{\s*:root \{/) }
const darkMore = { ...dark, ...block(/and \(prefers-contrast: more\) \{\s*:root:not/) }

const WHITE: [number, number, number] = [255, 255, 255]

function luminance([r, g, b]: [number, number, number]): number {
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** [foreground, background, minimum] — 'white' is literal white, everything else a token */
const PAIRS: Array<[string, string, number]> = [
  // Body and secondary text on the card surface and on the canvas
  ['stone-900', 'surface', 4.5],
  ['stone-900', 'canvas', 4.5],
  ['stone-700', 'surface', 4.5],
  ['stone-600', 'surface', 4.5],
  ['stone-500', 'surface', 4.5],
  ['stone-500', 'canvas', 4.5],
  ['stone-600', 'canvas', 4.5],
  // Labels on the segmented controls' track, and the chosen one raised on it
  ['stone-600', 'stone-200', 3],
  ['stone-900', 'raised', 4.5],
  // Graphics: input borders on hover, axis lines
  ['stone-400', 'surface', 2.5],
  // The one main action: Deep Forest and white in light, Champagne and Obsidian in dark
  ['on-accent', 'accent', 7],
  ['on-accent', 'accent-pressed', 7],
  // Accent text, plain buttons, the switch and slider fill (Jade Mint in dark)
  ['forest-600', 'surface', 4.5],
  ['forest-600', 'canvas', 4.5],
  ['forest-700', 'surface', 4.5],
  // Secondary buttons and pills: accent text on Pale Mist / Deep Forest Fill
  ['forest-600', 'forest-50', 4.5],
  ['forest-700', 'forest-50', 4.5],
  ['forest-800', 'forest-50', 4.5],
  ['forest-900', 'forest-50', 4.5],
  ['forest-600', 'forest-100', 4.5],
  // Status: text on its own tint
  ['emerald-700', 'emerald-100', 4.5],
  ['emerald-800', 'emerald-50', 4.5],
  ['emerald-900', 'emerald-50', 4.5],
  ['amber-800', 'amber-50', 4.5],
  ['amber-900', 'amber-50', 4.5],
  ['red-800', 'red-50', 4.5],
  // Destructive: Clay Red / Ember Coral on the surface and on its tinted button
  ['red-700', 'surface', 4.5],
  ['red-600', 'surface', 4.5],
  ['red-700', 'red-100', 4.5],
  // Status icons on their tiles
  ['emerald-700', 'emerald-100', 3],
  ['amber-700', 'amber-100', 3],
  // The clear-data confirmation, which inverts in dark
  ['stone-50', 'stone-900', 4.5],
]

describe.each([
  ['light', light],
  ['dark', dark],
  ['light, increased contrast', lightMore],
  ['dark, increased contrast', darkMore],
])('%s appearance', (_name, palette) => {
  const resolve = (token: string): [number, number, number] => {
    const value = token === 'white' ? WHITE : palette[token]
    if (!value) throw new Error(`no value for ${token}`)
    return value
  }

  it.each(PAIRS)('%s on %s reaches %s:1', (fg, bg, minimum) => {
    expect(contrast(resolve(fg), resolve(bg))).toBeGreaterThanOrEqual(minimum)
  })
})

describe('dark chosen in Settings', () => {
  it('uses exactly the values the device dark appearance does', () => {
    const forced = block(/^:root\[data-theme='dark'\] \{/m)
    const automatic = block(/prefers-color-scheme: dark\) \{\s*:root:not/)
    expect(forced).toEqual(automatic)
  })
})
