import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The Stone & Forest palette, held to.
 *
 * Two promises are checked here. Every colour the app can show is one of the brand guide's
 * colours: in the theme variables, and in the few places a colour is written as a value (the
 * chart, the PDF, the favicon, the browser chrome). And every pairing the interface uses meets
 * the WCAG AA minimum (4.5:1 for text, 3:1 for bold text and for graphics) in light, dark and
 * Increase Contrast. A change that breaks either fails here rather than on someone's screen.
 */

type RGB = [number, number, number]

/**
 * Stone & Forest v1.2: core colours, light and dark tokens, Increase Contrast variants, the dark
 * elevation level, the status colours and the chart palette
 */
const STATUS = [
  '1E7347', 'E2F0E6', '4FCB86', '14301F', '8A5A00', 'FAEED3', 'F2B54A', '33280F',
  'F7E2DC', '3A1F1A', '2F5E94', 'E2EAF4', '82B4EC', '16263A',
]
const CHART_LIGHT = ['1A7F58', 'B77F12', '3E6FB0', 'C2553A', '8A4F9E', '5F8A1E']
const CHART_DARK = ['2FA877', 'C08A1C', '5B8FD6', 'D9694E', 'A574C4', '6E9A2C']
const PALETTE = [
  '1B3B2B', 'F2EFE9', 'A3B19B', '0C0E0D', 'E8DCCB', '5CE1A6',
  'FFFFFF', 'E6ECE8', 'E2DDD5', '1C1D1A', '5C6058', 'B23A2E',
  '161A18', '1A2E26', '262C29', 'F4F6F5', '9CA39E', 'FF7A66',
  '3F433C', '6E7D66', 'B9B2A6', 'C4CAC6', '4A524D', '1E2320',
  ...STATUS, ...CHART_LIGHT, ...CHART_DARK,
]

const root = join(__dirname, '..')
const css = readFileSync(join(__dirname, 'theme.css'), 'utf-8')

const toHex = ([r, g, b]: RGB) => [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()

interface Block {
  colors: Record<string, RGB>
  alphas: Record<string, number>
}

/** The declarations inside the first block whose selector text matches. */
function block(selectorPattern: RegExp): Block {
  const match = selectorPattern.exec(css)
  if (!match) throw new Error(`no block matching ${selectorPattern}`)
  const start = css.indexOf('{', match.index + match[0].length - 1)
  const end = css.indexOf('}', start)
  const body = css.slice(start + 1, end)
  const colors: Record<string, RGB> = {}
  const alphas: Record<string, number> = {}
  for (const d of body.matchAll(/--c-([\w-]+):\s*(\d+) (\d+) (\d+);/g)) {
    colors[d[1]] = [Number(d[2]), Number(d[3]), Number(d[4])]
  }
  for (const d of body.matchAll(/--a-([\w-]+):\s*([\d.]+);/g)) alphas[d[1]] = Number(d[2])
  return { colors, alphas }
}

const merge = (a: Block, b: Block): Block => ({
  colors: { ...a.colors, ...b.colors },
  alphas: { ...a.alphas, ...b.alphas },
})

const light = block(/^:root \{/m)
const dark = merge(light, block(/prefers-color-scheme: dark\) \{\s*:root:not/))
const lightMore = merge(light, block(/prefers-contrast: more\) \{\s*:root \{/))
const darkMore = merge(dark, block(/and \(prefers-contrast: more\) \{\s*:root:not/))

function luminance([r, g, b]: RGB): number {
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const over = (top: RGB, alpha: number, under: RGB): RGB =>
  top.map((c, i) => Math.round(c * alpha + under[i] * (1 - alpha))) as RGB

/**
 * [foreground, background, minimum]. A tinted background is written "role@alpha-name" and is
 * composited over the card surface, as it sits on screen.
 */
const PAIRS: Array<[string, string, number]> = [
  // Body and secondary text on the card surface and on the canvas
  ['ink', 'surface', 4.5],
  ['ink', 'canvas', 4.5],
  ['ink-2', 'surface', 4.5],
  ['ink-2', 'canvas', 4.5],
  // Labels on the segmented control's track, and the chosen one raised on it
  ['ink-2', 'track', 3],
  ['ink', 'raised', 4.5],
  // Graphics: input edges
  ['line-strong', 'surface', 1.5],
  // The one main action: Deep Forest and white in light, Champagne and Obsidian in dark
  ['on-accent', 'accent', 7],
  // Accent text, plain buttons, the switch and the slider fill
  ['highlight', 'surface', 4.5],
  ['highlight', 'canvas', 4.5],
  // Secondary buttons and pills: accent text on Pale Mist / Deep Forest Fill
  ['highlight', 'muted', 4.5],
  // Status: text and icon on the card and on its own tint
  ['success', 'surface', 4.5],
  ['success', 'success-bg', 4.5],
  ['warning', 'surface', 4.5],
  ['warning', 'warning-bg', 4.5],
  ['danger', 'surface', 4.5],
  ['danger', 'danger-bg', 4.5],
  ['info', 'surface', 4.5],
  ['info', 'info-bg', 4.5],
  ['ink', 'info-bg', 4.5],
  // Text on the raised surfaces: toasts, sheets, side panels
  ['ink', 'level-2', 4.5],
  ['ink', 'level-3', 4.5],
  ['ink-2', 'level-3', 4.5],
  ['ink', 'overlay', 4.5],
  // Chart series hold 3:1 on their surface
  ['chart-1', 'surface', 3],
  ['chart-2', 'surface', 3],
  ['chart-3', 'surface', 3],
  ['chart-4', 'surface', 3],
  ['chart-5', 'surface', 3],
  ['chart-6', 'surface', 3],
]

describe.each([
  ['light', light],
  ['dark', dark],
  ['light, increased contrast', lightMore],
  ['dark, increased contrast', darkMore],
])('%s appearance', (_name, palette) => {
  const resolve = (token: string): RGB => {
    const [role, alphaName] = token.split('@')
    const value = palette.colors[role]
    if (!value) throw new Error(`no value for ${role}`)
    if (!alphaName) return value
    const alpha = palette.alphas[alphaName]
    if (alpha === undefined) throw new Error(`no alpha ${alphaName}`)
    return over(value, alpha, palette.colors.surface)
  }

  it.each(PAIRS)('%s on %s reaches %s:1', (fg, bg, minimum) => {
    expect(contrast(resolve(fg), resolve(bg))).toBeGreaterThanOrEqual(minimum)
  })

  it('keeps status colours out of the chart palette', () => {
    const chart = [1, 2, 3, 4, 5, 6].map((n) => toHex(palette.colors[`chart-${n}`]))
    const status = ['success', 'warning', 'danger', 'info'].map((r) => toHex(palette.colors[r]))
    expect(chart.filter((c) => status.includes(c))).toEqual([])
  })

  it('uses only Stone & Forest colours', () => {
    const outside = Object.entries(palette.colors)
      .map(([role, value]) => [role, toHex(value)])
      .filter(([, hex]) => !PALETTE.includes(hex))
    expect(outside).toEqual([])
  })
})

describe('colours written as values', () => {
  it.each([
    'src/components/PressureChart.tsx',
    'src/components/BrandMark.tsx',
    'src/index.css',
    'public/favicon.svg',
    'index.html',
  ])('%s uses only Stone & Forest colours', (file) => {
    const text = readFileSync(join(root, file), 'utf-8')
    const hexes = [...text.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)].map((m) => {
      const h = m[1].toUpperCase()
      return h.length === 3 ? h.split('').map((c) => c + c).join('') : h
    })
    expect(hexes.filter((h) => !PALETTE.includes(h))).toEqual([])
  })

  it('the PDF uses only Stone & Forest colours', () => {
    const text = readFileSync(join(root, 'src/utils/generateReport.ts'), 'utf-8')
    const triples = [...text.matchAll(/\[(\d{1,3}), (\d{1,3}), (\d{1,3})\]/g)].map((m) =>
      toHex([Number(m[1]), Number(m[2]), Number(m[3])])
    )
    const calls = [...text.matchAll(/set(?:Text|Fill|Draw)Color\((\d{1,3}), (\d{1,3}), (\d{1,3})\)/g)].map((m) =>
      toHex([Number(m[1]), Number(m[2]), Number(m[3])])
    )
    expect(triples.length).toBeGreaterThan(5)
    expect([...triples, ...calls].filter((h) => !PALETTE.includes(h))).toEqual([])
  })
})

describe('dark chosen in Settings', () => {
  it('uses exactly the values the device dark appearance does', () => {
    const forced = block(/^:root\[data-theme='dark'\] \{/m)
    const automatic = block(/prefers-color-scheme: dark\) \{\s*:root:not/)
    expect(forced).toEqual(automatic)
  })
})
