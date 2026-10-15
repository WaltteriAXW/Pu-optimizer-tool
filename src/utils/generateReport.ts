import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { CalculationResults } from '@/calculator_types'
import { formatPressure, type PressureUnit } from '@/services/displayPreferences'
import { describeFlowWindow } from '@/components/resultFormatting'
import { CHART_COLORS, type ChartColorRole } from '@/components/PressureChart'
import { BRAND_CELLS, BRAND_NAME } from '@/components/BrandMark'

/**
 * The printed report.
 *
 * It takes the calculation result itself rather than a flattened copy of a few fields. The
 * previous shape accepted two hand-built interfaces holding nine values between them, which
 * is how the report came to show a different, smaller and partly wrong version of what was
 * on screen: the laminar margin, the blowing agent, the line temperature and the whole cure
 * block had no way through, and each new result block would have needed another field added
 * by hand in two files. Reading the same object the screen reads means the two cannot drift.
 *
 * Pressures follow the unit chosen in the interface, and the report says which it is on the
 * first page. This is the one export that does: JSON and CSV are data and stay in bar, but
 * a printed sheet is carried to a machine and read by a person, so it should be in the unit
 * that person set.
 */

// ── Palette and shape, matching the application's light appearance ─────────────────
const INK: RGB = [15, 23, 42]            // slate-900
const SECONDARY: RGB = [71, 85, 105]     // slate-600
const MUTED: RGB = [100, 116, 139]       // slate-500
const RULE: RGB = [226, 232, 240]        // slate-200
const CARD: RGB = [248, 250, 252]        // slate-50
const ACCENT: RGB = [79, 70, 229]        // indigo-600
const ACCENT_SOFT: RGB = [238, 242, 255] // indigo-50
const ACCENT_INK: RGB = [55, 48, 163]    // indigo-800

/** Status colours as pairs, as the app uses them: a tint behind, a deeper ink on it */
const TONE = {
  good: { fill: [236, 253, 245] as RGB, ink: [4, 120, 87] as RGB },    // emerald-50 / 700
  warn: { fill: [255, 251, 235] as RGB, ink: [180, 83, 9] as RGB },    // amber-50 / 700
  bad: { fill: [254, 242, 242] as RGB, ink: [185, 28, 28] as RGB },    // red-50 / 700
}
type Tone = keyof typeof TONE

type RGB = [number, number, number]

const MARGIN = 16
const HEADER_HEIGHT = 22
const FOOTER_SPACE = 18
const GUTTER = 6
const CARD_RADIUS = 2.5
const ROW_PAD_X = 3.5

export interface ReportOptions {
  /** Unit every pressure in the report is quoted in */
  unit: PressureUnit
  /** The chart element to embed, if it is on screen */
  chartElement?: HTMLElement
}

/** A labelled group of rows, drawn as a rounded card like the app's grouped lists. */
interface Section {
  title: string
  /** A sentence leading the card, such as the flow margin */
  lead?: { text: string; tone?: Tone }
  rows: Array<[string, string]>
  notes?: Array<{ text: string; tone?: Tone }>
}

/**
 * Build and download the PDF report for a calculation.
 */
export const generateReport = async (
  results: CalculationResults,
  options: ReportOptions
): Promise<void> => {
  const { unit, chartElement } = options

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - 2 * MARGIN
  const columnWidth = (contentWidth - GUTTER) / 2
  const reportId = generateReportId()
  const generated = new Date()

  /** Current vertical cursor. Every writer below advances it. */
  let y = 0

  const ink = (rgb: RGB) => doc.setTextColor(rgb[0], rgb[1], rgb[2])
  const fill = (rgb: RGB) => doc.setFillColor(rgb[0], rgb[1], rgb[2])
  const stroke = (rgb: RGB) => doc.setDrawColor(rgb[0], rgb[1], rgb[2])
  const p = (bar: number | undefined | null) => formatPressure(bar, unit)

  /** The mark: three foam cells on an indigo tile — the geometry of BrandMark.tsx */
  const drawMark = (x: number, top: number, size: number) => {
    const k = size / 32
    fill(ACCENT)
    doc.roundedRect(x, top, size, size, 8 * k, 8 * k, 'F')
    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(2.25 * k)
    for (const { cx, cy, r } of BRAND_CELLS) doc.circle(x + cx * k, top + cy * k, r * k, 'S')
  }

  const startPage = () => {
    drawMark(MARGIN, 8, 8)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    ink(INK)
    doc.text(BRAND_NAME, MARGIN + 11, 11.6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    ink(MUTED)
    doc.text('Injection parameter report', MARGIN + 11, 15.4)
    doc.text(`Report ${reportId}`, pageWidth - MARGIN, 11.6, { align: 'right' })
    doc.text(generated.toLocaleString(), pageWidth - MARGIN, 15.4, { align: 'right' })
    stroke(RULE)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, HEADER_HEIGHT - 2, pageWidth - MARGIN, HEADER_HEIGHT - 2)
    y = HEADER_HEIGHT + 6
  }

  /** Break to a new page when the next block would not fit. */
  const need = (space: number) => {
    if (y + space > pageHeight - FOOTER_SPACE) {
      doc.addPage()
      startPage()
    }
  }

  // ── Section cards ─────────────────────────────────────────────────────────────
  const ROW_FONT = 8.5
  const LINE = 3.7

  const wrap = (text: string, width: number, size: number, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    return doc.splitTextToSize(pdfSafe(text), width) as string[]
  }

  /** Label takes up to 58 % of the row; the value sits right-aligned in the rest */
  const rowLayout = (width: number, [label, value]: [string, string]) => {
    const inner = width - 2 * ROW_PAD_X
    const labelLines = wrap(label, inner * 0.58, ROW_FONT)
    const valueLines = wrap(value, inner * 0.42 - 2, ROW_FONT, true)
    const height = Math.max(labelLines.length, valueLines.length) * LINE + 3.6
    return { labelLines, valueLines, height }
  }

  const measure = (section: Section, width: number) => {
    let height = 7 // title
    if (section.lead) height += wrap(section.lead.text, width, 8.5).length * LINE + 3
    height += 2 + section.rows.reduce((sum, row) => sum + rowLayout(width, row).height, 0) + 2
    for (const n of section.notes ?? []) height += wrap(n.text, width, 8).length * 3.5 + 2.5
    return height + 6
  }

  const drawSection = (section: Section, x: number, width: number, top: number) => {
    let cursor = top
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    ink(INK)
    doc.text(pdfSafe(section.title), x, cursor + 3.5)
    cursor += 7

    if (section.lead) {
      const lines = wrap(section.lead.text, width, 8.5)
      ink(section.lead.tone ? TONE[section.lead.tone].ink : SECONDARY)
      doc.text(lines, x, cursor + 2.8)
      cursor += lines.length * LINE + 3
    }

    const rows = section.rows.map((row) => rowLayout(width, row))
    const cardHeight = rows.reduce((sum, r) => sum + r.height, 0) + 4
    fill(CARD)
    stroke(RULE)
    doc.setLineWidth(0.2)
    doc.roundedRect(x, cursor, width, cardHeight, CARD_RADIUS, CARD_RADIUS, 'FD')
    let rowTop = cursor + 2
    rows.forEach((r, i) => {
      const baseline = rowTop + 1.8 + 2.9
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(ROW_FONT)
      ink(SECONDARY)
      doc.text(r.labelLines, x + ROW_PAD_X, baseline)
      doc.setFont('helvetica', 'bold')
      ink(INK)
      doc.text(r.valueLines, x + width - ROW_PAD_X, baseline, { align: 'right' })
      rowTop += r.height
      if (i < rows.length - 1) {
        stroke(RULE)
        doc.line(x + ROW_PAD_X, rowTop, x + width - ROW_PAD_X, rowTop)
      }
    })
    cursor += cardHeight + 2

    for (const n of section.notes ?? []) {
      const lines = wrap(n.text, width, 8)
      ink(n.tone ? TONE[n.tone].ink : MUTED)
      doc.text(lines, x, cursor + 2.8)
      cursor += lines.length * 3.5 + 2.5
    }
  }

  /** One section across the page */
  const full = (section: Section | null) => {
    if (!section) return
    const height = measure(section, contentWidth)
    need(height)
    drawSection(section, MARGIN, contentWidth, y)
    y += height
  }

  /** Two sections side by side, or one across the page if the other is missing */
  const pair = (left: Section | null, right: Section | null) => {
    if (!left || !right) return full(left ?? right)
    const height = Math.max(measure(left, columnWidth), measure(right, columnWidth))
    need(height)
    drawSection(left, MARGIN, columnWidth, y)
    drawSection(right, MARGIN + columnWidth + GUTTER, columnWidth, y)
    y += height
  }

  /** Status pills, as on screen: a tinted capsule with a dot and a short label */
  const pills = (items: Array<{ text: string; tone: Tone }>) => {
    if (items.length === 0) return
    const h = 6.5
    let x = MARGIN
    need(h + 4)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    for (const item of items) {
      const text = pdfSafe(item.text)
      const w = doc.getTextWidth(text) + 11
      if (x + w > pageWidth - MARGIN) {
        x = MARGIN
        y += h + 2.5
        need(h + 4)
      }
      fill(TONE[item.tone].fill)
      doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F')
      fill(TONE[item.tone].ink)
      doc.circle(x + 4, y + h / 2, 1, 'F')
      ink(TONE[item.tone].ink)
      doc.text(text, x + 6.8, y + h / 2 + 1.1)
      x += w + 2.5
    }
    y += h + 6
  }

  // ══ Page 1 ═════════════════════════════════════════════════════════════════════
  startPage()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  ink(INK)
  doc.text('Injection parameters', MARGIN, y + 4)
  y += 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  ink(MUTED)
  const material = results.input?.material_name || results.input?.material_key || 'Unknown material'
  const machine = formatMachineType(results.input?.machine_type)
  doc.text(pdfSafe(`${material}  ·  ${machine}  ·  All pressures in ${unit}`), MARGIN, y)
  y += 7

  // ── What to set, and what the gauge will read ──────────────────────────────────
  const mc = results.machine_compatibility
  const injectionPressure = mc?.injection_pressure_bar ?? mc?.set_pressure_bar
  const lineDemand = mc?.line_demand_bar ?? mc?.required_pressure_bar
  const governedByMixHead =
    (mc?.injection_pressure_governed_by ?? mc?.set_pressure_governed_by) === 'mix_head_minimum' ||
    mc?.set_pressure_governed_by === 'machine_minimum'

  if (mc && typeof injectionPressure === 'number') {
    const boxHeight = 36
    need(boxHeight + 4)
    fill(ACCENT_SOFT)
    doc.roundedRect(MARGIN, y, contentWidth, boxHeight, 3, 3, 'F')

    const figure = (x: number, label: string, value: string, valueUnit: string, caption: string, captionTone?: Tone) => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      ink(ACCENT_INK)
      doc.text(pdfSafe(label), x, y + 8)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(26)
      ink(INK)
      doc.text(value, x, y + 20)
      const width = doc.getTextWidth(value)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(12)
      ink(SECONDARY)
      doc.text(valueUnit, x + width + 2, y + 20)
      doc.setFontSize(8.5)
      ink(captionTone ? TONE[captionTone].ink : SECONDARY)
      doc.text(doc.splitTextToSize(pdfSafe(caption), contentWidth / 2 - 12), x, y + 26.5)
    }

    // Left: the setting. Output is what the operator dials in, because a metering pump
    // delivers by pump speed — the pressure follows from it and cannot be dialled up to
    // move more material.
    const outputText =
      typeof mc.output_kg_min === 'number'
        ? mc.output_kg_min.toFixed(mc.output_kg_min >= 10 ? 0 : 1)
        : '-'
    const outOfRange = mc.output_in_range === false
    const outputNote =
      typeof mc.output_min_kg_min === 'number' && typeof mc.output_max_kg_min === 'number'
        ? `Machine range ${mc.output_min_kg_min}-${mc.output_max_kg_min} kg/min`
          + (outOfRange ? ' - this shot is outside it.' : '.')
        : ''
    figure(MARGIN + 7, 'Machine output — set this', outputText, 'kg/min', outputNote, outOfRange ? 'bad' : undefined)

    // Right: the reading that follows from it
    const governed = governedByMixHead
      ? `Set by the mix head, not the line: impingement mixing needs ${p(mc.min_pressure_bar)} ${unit}. The line asks for only ${p(lineDemand)} ${unit}.`
      : `Set by the feed line: ${p(results.pressure?.pressure_with_fittings_bar)} ${unit} of pipe drop plus machine losses.`
    figure(MARGIN + contentWidth / 2 + 4, 'Injection pressure — expected', p(injectionPressure), unit, governed)

    y += boxHeight + 5
  }

  // ── Status, as pills ──────────────────────────────────────────────────────────
  const envelope = results.flow?.laminar_envelope
  const tight = envelope?.is_laminar && typeof envelope.flow_headroom_ratio === 'number' && envelope.flow_headroom_ratio < 1.25
  const status: Array<{ text: string; tone: Tone }> = []
  if (mc) {
    status.push(
      mc.is_compatible
        ? { text: 'Machine can run this shot', tone: 'good' }
        : { text: "Outside the machine's range", tone: 'bad' }
    )
  }
  if (envelope) {
    status.push(
      !envelope.is_laminar
        ? { text: 'Turbulent flow', tone: 'bad' }
        : tight
          ? { text: 'Laminar, little margin', tone: 'warn' }
          : { text: 'Laminar flow', tone: 'good' }
    )
  }
  const warningCount = results.warnings?.length ?? 0
  status.push(
    warningCount > 0
      ? { text: `${warningCount} warning${warningCount === 1 ? '' : 's'}`, tone: 'warn' }
      : { text: 'No warnings', tone: 'good' }
  )
  pills(status)

  if (warningCount > 0) {
    full({
      title: 'Attention needed',
      rows: [],
      notes: results.warnings!.map((w) => ({ text: `•  ${stripEmoji(w)}`, tone: 'warn' as Tone })),
    })
  }

  // ── Chart, near the top as on screen ──────────────────────────────────────────
  if (chartElement) {
    try {
      const canvas = await html2canvas(chartElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        // The page is printed light whatever the screen shows. The clone is forced to the
        // light theme, and the chart's SVG — whose colours are values, not classes — is
        // repainted from the light palette by role.
        //
        // The repaint has to go into inline styles, and onto every descendant: for SVG,
        // html2canvas copies each element's computed style from the live page into the
        // clone, so a line inside a dark grid group arrives carrying the dark stroke as its
        // own style, which outranks any attribute set here.
        onclone: (clonedDocument) => {
          clonedDocument.documentElement.setAttribute('data-theme', 'light')
          const light = CHART_COLORS.light
          const repaint = (selector: string, property: 'stroke' | 'fill', key: 'strokeRole' | 'fillRole') => {
            clonedDocument.querySelectorAll<SVGElement>(selector).forEach((el) => {
              const colour = light[el.dataset[key] as ChartColorRole]
              for (const node of [el, ...Array.from(el.querySelectorAll<SVGElement>('*'))]) {
                node.style.setProperty(property, colour)
              }
            })
          }
          repaint('[data-stroke-role]', 'stroke', 'strokeRole')
          repaint('[data-fill-role]', 'fill', 'fillRole')
        },
      })
      const image = canvas.toDataURL('image/png')
      // The chart and its three figures, in a card, at a size that leaves room below it
      const imageWidth = contentWidth - 8
      const imageHeight = (canvas.height / canvas.width) * imageWidth
      need(imageHeight + 12)
      stroke(RULE)
      doc.setLineWidth(0.2)
      doc.roundedRect(MARGIN, y, contentWidth, imageHeight + 8, CARD_RADIUS, CARD_RADIUS, 'S')
      doc.addImage(image, 'PNG', MARGIN + 4, y + 4, imageWidth, imageHeight)
      y += imageHeight + 14
    } catch (error) {
      console.error('Failed to capture chart:', error)
      // The report is still worth producing without it
      full({ title: 'Pressure profile', rows: [], notes: [{ text: 'The chart could not be captured for this report.', tone: 'warn' }] })
    }
  }

  // ── Inputs and pressure ───────────────────────────────────────────────────────
  const input = results.input
  const pr = results.pressure
  pair(
    {
      title: 'Inputs',
      rows: [
        ['Pipe length', `${fmt(input?.pipe_length_mm, 0)} mm`],
        ['Pipe diameter', `${fmt(input?.pipe_diameter_mm, 1)} mm`],
        ['Material temperature', `${fmt(input?.temperature_c, 1)} °C`],
        ['Flow rate', `${fmt(input?.flow_rate_lpm, 2)} L/min`],
        ['Output', typeof input?.mass_flow_kg_min === 'number' ? `${fmt(input.mass_flow_kg_min, 2)} kg/min` : '-'],
        ['Material', material],
        ['Mixed liquid density', input?.material_density_kg_m3 ? `${fmt(input.material_density_kg_m3, 0)} kg/m³` : 'not recorded'],
        ['Machine', machine],
      ],
    },
    {
      title: 'Pressure',
      rows: [
        ['Pipe drop', `${p(pr?.base_pressure_drop_bar)} ${unit}`],
        ['Fitting loss', `${p(pr?.fitting_loss_bar)} ${unit}`],
        ['Pipe drop with fittings', `${p(pr?.pressure_with_fittings_bar)} ${unit}`],
        ['Line demand incl. machine losses', `${p(lineDemand)} ${unit}`],
        ['Injection pressure at the mix head', `${p(injectionPressure)} ${unit}`],
        ['Set by', governedByMixHead ? 'Mix head minimum' : 'Feed line'],
      ],
    }
  )

  // ── Operating window ──────────────────────────────────────────────────────────
  const window = results.operating_window
  if (window) {
    const bound = (status: string, value: number | null, valueUnit: string, open: string) =>
      status === 'limit' && value !== null
        ? `${fmt(value, 1)} ${valueUnit}`
        : status === 'unconstrained'
          ? open
          : 'None in range'
    full({
      title: 'Operating window',
      lead: {
        text: describeFlowWindow(window.flow_window),
        tone: window.flow_window.current_inside ? undefined : 'bad',
      },
      rows: [
        [
          'Feed-line pressure limit',
          `${p(window.pressure_limit_bar)} ${unit}` +
            (window.limit_source === 'user_limit' ? ' (your limit)' : ' (machine max less internal losses)'),
        ],
        ['Highest flow rate', bound(window.max_flow_rate.status, window.max_flow_rate.value_lpm, 'L/min', 'Not reached in range')],
        ['Lowest set temperature', bound(window.min_temperature.status, window.min_temperature.value_c, '°C', 'Any in range')],
        ['Narrowest line', bound(window.min_diameter.status, window.min_diameter.value_mm, 'mm', 'Any in range')],
      ],
    })
  }

  // ── Flow, and the machine ─────────────────────────────────────────────────────
  const flow = results.flow
  const flowSection: Section = {
    title: 'Flow',
    // The margin before turbulence leads, as on screen
    lead: envelope?.recommendation
      ? { text: envelope.recommendation, tone: envelope.is_laminar ? undefined : 'bad' }
      : undefined,
    rows: [
      ['Flow regime', titleCase(flow?.flow_regime)],
      ['Reynolds number', fmt(flow?.reynolds_number, 0)],
      ['Velocity', `${fmt(flow?.velocity_m_s, 3)} m/s`],
      ['Shear rate', `${fmt(flow?.shear_rate_s_inv, 0)} 1/s`],
      ['Apparent viscosity', `${fmt(flow?.apparent_viscosity_cp, 1)} cP`],
      ...(flow?.rheology
        ? ([
            ['Viscosity model', flow.rheology.model.replace(/_/g, '-')],
            ['Wall shear stress', `${fmt(flow.rheology.wall_shear_stress_pa, 1)} Pa`],
            ['True wall shear rate', `${fmt(flow.rheology.wall_shear_rate_s_inv, 0)} 1/s`],
            ...(typeof flow.rheology.plug_radius_fraction === 'number'
              ? [['Unsheared plug', `${fmt(flow.rheology.plug_radius_fraction * 100, 0)}% of the bore`]]
              : []),
          ] as Array<[string, string]>)
        : []),
    ],
  }

  let machineSection: Section | null = null
  if (mc) {
    const rows: Array<[string, string]> = []
    if (typeof mc.output_kg_min === 'number') rows.push(['Output (the setting)', `${mc.output_kg_min.toFixed(2)} kg/min`])
    if (typeof mc.output_min_kg_min === 'number' && typeof mc.output_max_kg_min === 'number') {
      rows.push(['Machine output range', `${mc.output_min_kg_min}-${mc.output_max_kg_min} kg/min`])
      rows.push(['Output within range', mc.output_in_range === false ? 'No' : 'Yes'])
    }
    rows.push(['Machine pressure window', `${p(mc.min_pressure_bar)}-${p(mc.max_pressure_bar)} ${unit}`])
    if (mc.mix_head_type) rows.push(['Mix head', mc.mix_head_type])
    if (mc.mix_head_shear_range) {
      rows.push(['Mix head design shear', `${mc.mix_head_shear_range.min}-${mc.mix_head_shear_range.max} 1/s`])
    }
    const notes: Section['notes'] = []
    if (mc.mix_head_shear_range) {
      notes.push({
        text:
          'Mix head shear belongs to the mixing element, not the feed line: impingement mixing '
          + 'runs an order of magnitude above a mechanical rotor, by design.',
      })
    }
    machineSection = { title: 'Machine & output', rows, notes }
  }
  pair(flowSection, machineSection)

  // ── Thermal, and the line temperature ─────────────────────────────────────────
  const thermal = results.thermal
  let thermalSection: Section | null = null
  if (thermal) {
    const rows: Array<[string, string]> = [
      ['Process temperature', `${fmt(thermal.temperature_c, 1)} °C`],
      [`Viscosity at ${fmt(thermal.reference_temp_c, 0)} °C (reference)`, `${fmt(thermal.reference_viscosity_cp, 1)} cP`],
      [`Viscosity at ${fmt(thermal.temperature_c, 1)} °C`, `${fmt(thermal.current_viscosity_cp, 1)} cP`],
    ]
    if (typeof thermal.shear_heating_c === 'number') rows.push(['Shear heating', `${fmt(thermal.shear_heating_c, 2)} °C`])
    if (typeof thermal.heat_generated_w === 'number') rows.push(['Heat generated', `${fmt(thermal.heat_generated_w, 1)} W`])
    thermalSection = { title: 'Thermal', rows }
  }

  const line = results.line_temperature
  let lineSection: Section | null = null
  if (line) {
    const rows: Array<[string, string]> = [
      ['Set point', `${fmt(line.set_temperature_c, 1)} °C`],
      ['Ambient', `${fmt(line.ambient_temperature_c, 1)} °C`],
      ['Arriving at the mix head', `${fmt(line.effective_temperature_c, 1)} °C`],
      ['Drift', `${fmt(line.drift_c, 1)} °C`],
      ['Line thermal time constant', `${fmt((line.time_constant_s ?? 0) / 60, 1)} min`],
    ]
    if (line.hose) {
      rows.push([
        'Hose',
        `${line.hose.hose_material.replace(/_/g, ' ')}, ${fmt(line.hose.wall_thickness_mm, 1)} mm wall` +
          (line.hose.insulation_material
            ? `, ${fmt(line.hose.insulation_thickness_mm, 0)} mm ${line.hose.insulation_material.replace(/_/g, ' ')}`
            : ', unlagged'),
      ])
    }
    if (typeof line.heat_transfer_coeff_w_m2_k === 'number') {
      rows.push([
        line.hose ? 'Hose heat transfer (from its build)' : 'Hose heat transfer (bare hose)',
        `${fmt(line.heat_transfer_coeff_w_m2_k, 1)} W/m²·K`,
      ])
    }
    lineSection = {
      title: 'Temperature at the mix head',
      rows,
      notes: line.warning ? [{ text: line.warning, tone: 'warn' }] : undefined,
    }
  }
  pair(thermalSection, lineSection)

  // ── Blowing agent, and environmental ──────────────────────────────────────────
  const vol = results.volatility
  let agentSection: Section | null = null
  if (vol) {
    const rows: Array<[string, string]> = [
      ['Agent', vol.agent],
      ['Status', VOLATILITY_TEXT[vol.status] ?? vol.status],
    ]
    if (typeof vol.boiling_point_c === 'number') rows.push(['Boiling point', `${fmt(vol.boiling_point_c, 1)} °C`])
    if (typeof vol.temperature_margin_c === 'number') rows.push(['Margin to boiling', `${fmt(vol.temperature_margin_c, 1)} °C`])
    const notes: Section['notes'] = []
    if (vol.message) notes.push({ text: vol.message })
    if (vol.warning) notes.push({ text: vol.warning, tone: vol.status === 'flash_risk' ? 'bad' : 'warn' })
    agentSection = { title: 'Blowing agent', rows, notes }
  }

  const env = results.environmental
  let envSection: Section | null = null
  if (env) {
    const rows: Array<[string, string]> = [['Blowing agent', env.blowing_agent || 'Unknown']]
    if (typeof env.gwp_per_kg === 'number') rows.push(['GWP', `${fmt(env.gwp_per_kg, 2)} kg CO₂eq/kg`])
    rows.push(['Eco-friendly', env.is_eco_friendly ? 'Yes' : 'No'])
    envSection = {
      title: 'Environmental',
      rows,
      notes: env.recommendation ? [{ text: env.recommendation }] : undefined,
    }
  }
  pair(agentSection, envSection)

  // ── Cure and exotherm, only when a part thickness was supplied ────────────────
  const cure = results.cure
  if (cure) {
    const rows: Array<[string, string]> = [['Part thickness', `${fmt(cure.part_thickness_mm, 1)} mm`]]
    if (typeof cure.mold_temperature_c === 'number') {
      rows.push([
        `Mould temperature (${MOLD_SOURCE[cure.mold_temperature_source] ?? 'unknown source'})`,
        `${fmt(cure.mold_temperature_c, 1)} °C`,
      ])
    }
    if (typeof cure.cream_time_s === 'number') rows.push(['Cream time', `${fmt(cure.cream_time_s, 0)} s`])
    if (typeof cure.gel_time_s === 'number') rows.push(['Gel time', `${fmt(cure.gel_time_s, 0)} s`])
    if (cure.processing_window) rows.push(['Working time', `${fmt(cure.processing_window.work_time_s, 0)} s`])
    if (typeof cure.adiabatic_rise_c === 'number') rows.push(['Reaction heat (adiabatic rise)', `${fmt(cure.adiabatic_rise_c, 0)} °C`])
    if (typeof cure.peak_temperature_c === 'number') rows.push(['Peak core temperature', `${fmt(cure.peak_temperature_c, 0)} °C`])
    if (cure.scorch_risk) {
      rows.push([
        'Scorch risk',
        typeof cure.scorch_margin_c === 'number'
          ? `${titleCase(cure.scorch_risk)} (${fmt(cure.scorch_margin_c, 0)} °C margin)`
          : titleCase(cure.scorch_risk),
      ])
    }
    full({
      title: 'Cure & exotherm',
      lead: { text: 'Describes the moulded part after the mix head, not the feed line above.' },
      rows,
      notes: cure.heat_of_reaction_is_estimated
        ? [{
            text: "Exotherm figures are estimated: this material's data sheet states no heat of "
              + 'reaction, so a literature-typical value for rigid polyurethane was used.',
            tone: 'warn',
          }]
        : undefined,
    })
  }

  // ── Sign-off ──────────────────────────────────────────────────────────────────
  need(24)
  y += 6
  stroke(RULE)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y + 8, MARGIN + 60, y + 8)
  doc.line(pageWidth - MARGIN - 60, y + 8, pageWidth - MARGIN, y + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  ink(MUTED)
  doc.text('Operator', MARGIN, y + 12)
  doc.text('QA approval / date', pageWidth - MARGIN - 60, y + 12)

  // ── Footer on every page ──────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    stroke(RULE)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, pageHeight - 12, pageWidth - MARGIN, pageHeight - 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    ink(MUTED)
    doc.text(
      'Computer-generated for reference. Verify against your own process before production.',
      MARGIN,
      pageHeight - 7.5
    )
    doc.text(
      `${BRAND_NAME} ${__APP_VERSION__}  ·  page ${i} of ${pageCount}`,
      pageWidth - MARGIN,
      pageHeight - 7.5,
      { align: 'right' }
    )
  }

  doc.save(`Polyurethane-Optimizer-report-${reportId}-${generated.toISOString().slice(0, 10)}.pdf`)
}

// ── Helpers ─────────────────────────────────────────────────────────────────────────

const VOLATILITY_TEXT: Record<string, string> = {
  ok: 'Stays in solution',
  marginal: 'Close to boiling',
  flash_risk: 'Flash-off risk',
  not_volatile: 'No volatile agent',
  no_boiling_point_data: 'Not evaluated — no boiling point on file',
  unknown_agent: 'Not evaluated — agent not recognised',
}

const MOLD_SOURCE: Record<string, string> = {
  user: 'entered',
  data_sheet: 'from data sheet',
  default: 'model default',
}

/**
 * Text the PDF's built-in fonts can actually draw.
 *
 * jsPDF's standard fonts cover WinAnsi and nothing else. A character outside it — the
 * subscript in CO₂ is the one that turned up — does not merely fail to draw: it drops the
 * font to a fallback for the whole string, which renders wide and spaced-out and, worse,
 * measures wrong, so splitTextToSize wraps the line off the edge of the page. Mapping the
 * handful of scientific characters this application produces, then dropping anything else
 * beyond WinAnsi, keeps every string measurable.
 */
function pdfSafe(text: string): string {
  const subscripts = '₀₁₂₃₄₅₆₇₈₉'
  const superscripts = '⁰¹²³⁴⁵⁶⁷⁸⁹'
  return text
    .replace(/[₀-₉]/g, (c) => String(subscripts.indexOf(c)))
    .replace(/[⁰⁴-⁹]/g, (c) => String(superscripts.indexOf(c)))
    .replace(/⁻/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/–/g, '-')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/≈/g, '~')
    // Anything still beyond WinAnsi would drop the whole string to a fallback font
    .replace(/[^\u0020-\u00FF\u2013\u2014\n]/g, '')
}

/** A number for the report, or a dash where the engine gave none. */
function fmt(value: number | undefined | null, decimals: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
  const text = value.toFixed(decimals)
  // A drift of -0.04 °C rounds to "-0.0", which reads as a fault rather than as "none
  // worth reporting". Drop the sign once every displayed digit is a zero.
  return /^-0(\.0*)?$/.test(text) ? text.slice(1) : text
}

function titleCase(value: string | undefined): string {
  if (!value) return '—'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatMachineType(value: string | undefined): string {
  if (value === 'high_pressure') return 'High-pressure machine'
  if (value === 'low_pressure') return 'Low-pressure machine'
  return value ? titleCase(value.replace(/_/g, ' ')) : 'Unknown machine'
}

/**
 * The warnings carry emoji for the screen. The PDF's standard fonts have no glyphs for
 * them, so they render as a black box or vanish — strip them rather than print rubbish.
 */
function stripEmoji(text: string): string {
  // Alternation rather than one character class: a variation selector combines with the
  // glyph before it, and lint rightly objects to mixing it into a range.
  return text
    .replace(/\u{FE0F}/gu, '')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function generateReportId(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `${timestamp}-${random}`
}
