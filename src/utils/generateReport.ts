import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import type { CalculationResults } from '@/calculator_types'
import { formatPressure, type PressureUnit } from '@/services/displayPreferences'

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

// ── Palette, matching the application ───────────────────────────────────────────────
const INK: RGB = [15, 23, 42]        // slate-900
const MUTED: RGB = [100, 116, 139]   // slate-500
const RULE: RGB = [226, 232, 240]    // slate-200
const ACCENT: RGB = [79, 70, 229]    // indigo-600
const ACCENT_SOFT: RGB = [238, 242, 255] // indigo-50
const GOOD: RGB = [5, 150, 105]      // emerald-600
const WARN: RGB = [217, 119, 6]      // amber-600
const BAD: RGB = [220, 38, 38]       // red-600
const ZEBRA: RGB = [248, 250, 252]   // slate-50

type RGB = [number, number, number]

const MARGIN = 16
const HEADER_HEIGHT = 14

export interface ReportOptions {
  /** Unit every pressure in the report is quoted in */
  unit: PressureUnit
  /** The chart element to embed, if it is on screen */
  chartElement?: HTMLElement
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
  const reportId = generateReportId()

  /** Current vertical cursor. Every writer below advances it. */
  let y = 0

  const setColor = (rgb: RGB) => doc.setTextColor(rgb[0], rgb[1], rgb[2])
  const p = (bar: number | undefined | null) => formatPressure(bar, unit)

  const startPage = () => {
    doc.setFillColor(INK[0], INK[1], INK[2])
    doc.rect(0, 0, pageWidth, HEADER_HEIGHT, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text('PU OPTIMIZER', MARGIN, 9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(203, 213, 225)
    doc.text('Injection parameter report', MARGIN + 32, 9)
    doc.text(reportId, pageWidth - MARGIN, 9, { align: 'right' })
    y = HEADER_HEIGHT + 12
  }

  /** Break to a new page when the next block would not fit. */
  const need = (space: number) => {
    if (y + space > pageHeight - 22) {
      doc.addPage()
      startPage()
    }
  }

  const heading = (text: string, reserveForContent = 26) => {
    need(18 + reserveForContent)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    setColor(INK)
    doc.text(pdfSafe(text.toUpperCase()), MARGIN, y)
    y += 2.5
    doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2])
    doc.setLineWidth(0.6)
    doc.line(MARGIN, y, MARGIN + 16, y)
    doc.setDrawColor(RULE[0], RULE[1], RULE[2])
    doc.setLineWidth(0.3)
    doc.line(MARGIN + 16, y, pageWidth - MARGIN, y)
    y += 6
  }

  /** A note in small muted type, wrapped to the content width. */
  const note = (text: string, color: RGB = MUTED) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    setColor(color)
    const lines = doc.splitTextToSize(pdfSafe(text), contentWidth)
    need(lines.length * 4 + 3)
    doc.text(lines, MARGIN, y)
    y += lines.length * 4 + 3
  }

  const table = (rows: string[][], head?: string[]) => {
    need(20)
    autoTable(doc, {
      head: head ? [head.map(pdfSafe)] : undefined,
      body: rows.map((row) => row.map(pdfSafe)),
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 },
        textColor: INK,
        lineColor: RULE,
        lineWidth: { bottom: 0.1 },
      },
      headStyles: {
        fontStyle: 'bold',
        fontSize: 8,
        textColor: MUTED,
        fillColor: false,
        lineWidth: { bottom: 0.4 },
        lineColor: RULE,
      },
      alternateRowStyles: { fillColor: ZEBRA },
      columnStyles: {
        0: { cellWidth: 68 },
        1: { fontStyle: 'bold' },
      },
      didDrawPage: () => {
        // A table that spills onto a new page still needs the band at the top
        if (doc.getNumberOfPages() > 1) {
          const current = (doc as unknown as { internal: { getCurrentPageInfo: () => { pageNumber: number } } })
            .internal.getCurrentPageInfo().pageNumber
          if (current > 1) {
            doc.setFillColor(INK[0], INK[1], INK[2])
            doc.rect(0, 0, pageWidth, HEADER_HEIGHT, 'F')
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(9)
            doc.setTextColor(255, 255, 255)
            doc.text('PU OPTIMIZER', MARGIN, 9)
          }
        }
      },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7
  }

  // ══ Page 1 ═════════════════════════════════════════════════════════════════════
  startPage()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  setColor(INK)
  doc.text('Injection parameters', MARGIN, y)
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  setColor(MUTED)
  const material = results.input?.material_name || results.input?.material_key || 'Unknown material'
  const machine = formatMachineType(results.input?.machine_type)
  doc.text(`${material}  ·  ${machine}  ·  generated ${new Date().toLocaleString()}`, MARGIN, y)
  y += 4.5
  doc.text(`All pressures in ${unit}.`, MARGIN, y)
  y += 9

  // ── What to set, and what the gauge will read ──────────────────────────────────
  const mc = results.machine_compatibility
  const injectionPressure = mc?.injection_pressure_bar ?? mc?.set_pressure_bar
  const lineDemand = mc?.line_demand_bar ?? mc?.required_pressure_bar
  const governedByMixHead =
    (mc?.injection_pressure_governed_by ?? mc?.set_pressure_governed_by) === 'mix_head_minimum' ||
    mc?.set_pressure_governed_by === 'machine_minimum'

  if (mc && typeof injectionPressure === 'number') {
    const boxHeight = 34
    need(boxHeight + 4)
    doc.setFillColor(ACCENT_SOFT[0], ACCENT_SOFT[1], ACCENT_SOFT[2])
    doc.rect(MARGIN, y, contentWidth, boxHeight, 'F')
    doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2])
    doc.rect(MARGIN, y, 1.6, boxHeight, 'F')

    // Left: the setting. Output is what the operator dials in, because a metering pump
    // delivers by pump speed — the pressure follows from it and cannot be dialled up to
    // move more material.
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    setColor(MUTED)
    doc.text('MACHINE OUTPUT - SET THIS', MARGIN + 7, y + 8)

    doc.setFontSize(26)
    setColor(INK)
    const outputText =
      typeof mc.output_kg_min === 'number'
        ? mc.output_kg_min.toFixed(mc.output_kg_min >= 10 ? 0 : 1)
        : '-'
    doc.text(outputText, MARGIN + 7, y + 20)
    const outputWidth = doc.getTextWidth(outputText)
    doc.setFontSize(12)
    setColor(MUTED)
    doc.text('kg/min', MARGIN + 9 + outputWidth, y + 20)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    const outOfRange = mc.output_in_range === false
    setColor(outOfRange ? BAD : MUTED)
    const outputNote =
      typeof mc.output_min_kg_min === 'number' && typeof mc.output_max_kg_min === 'number'
        ? `Machine range ${mc.output_min_kg_min}-${mc.output_max_kg_min} kg/min`
          + (outOfRange ? ' - this shot is outside it.' : '.')
        : ''
    doc.text(pdfSafe(outputNote), MARGIN + 7, y + 27)

    // Right: the reading that follows from it
    const midX = MARGIN + contentWidth / 2 + 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    setColor(MUTED)
    doc.text('INJECTION PRESSURE - EXPECTED', midX, y + 8)

    doc.setFontSize(26)
    setColor(INK)
    doc.text(p(injectionPressure), midX, y + 20)
    const pressureWidth = doc.getTextWidth(p(injectionPressure))
    doc.setFontSize(12)
    setColor(MUTED)
    doc.text(unit, midX + 3 + pressureWidth, y + 20)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    setColor(MUTED)
    const governed = governedByMixHead
      ? `Set by the mix head, not the line: impingement mixing needs ${p(mc.min_pressure_bar)} ${unit}. The line asks for only ${p(lineDemand)} ${unit}.`
      : `Set by the feed line: ${p(results.pressure?.pressure_with_fittings_bar)} ${unit} of pipe drop plus machine losses.`
    doc.text(doc.splitTextToSize(pdfSafe(governed), contentWidth / 2 - 10), midX, y + 27)

    y += boxHeight + 5

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    setColor(mc.is_compatible ? GOOD : BAD)
    doc.text(
      mc.is_compatible ? 'Machine can run this shot' : "Outside the machine's range",
      MARGIN,
      y + 4
    )
    y += 11
  }

  // ── Warnings, where the engine raised any ──────────────────────────────────────
  if (results.warnings && results.warnings.length > 0) {
    heading('Attention needed')
    for (const warning of results.warnings) {
      const lines = doc.splitTextToSize(pdfSafe(`-  ${stripEmoji(warning)}`), contentWidth - 4)
      need(lines.length * 4.2 + 2)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      setColor(WARN)
      doc.text(lines, MARGIN + 2, y)
      y += lines.length * 4.2 + 2
    }
    y += 3
  }

  // ── Inputs ────────────────────────────────────────────────────────────────────
  heading('Inputs', 68)
  const input = results.input
  table(
    [
      ['Pipe length', `${fmt(input?.pipe_length_mm, 0)} mm`],
      ['Pipe diameter', `${fmt(input?.pipe_diameter_mm, 1)} mm`],
      ['Material temperature', `${fmt(input?.temperature_c, 1)} °C`],
      ['Flow rate', `${fmt(input?.flow_rate_lpm, 2)} L/min`],
      [
        'Output',
        typeof input?.mass_flow_kg_min === 'number'
          ? `${fmt(input.mass_flow_kg_min, 2)} kg/min`
          : '-',
      ],
      ['Material', material],
      [
        'Mixed liquid density',
        input?.material_density_kg_m3 ? `${fmt(input.material_density_kg_m3, 0)} kg/m³` : 'not recorded',
      ],
      ['Machine', machine],
    ],
    ['Parameter', 'Value']
  )

  // ── Pressure ──────────────────────────────────────────────────────────────────
  heading('Pressure', 61)
  const pr = results.pressure
  table([
    ['Base pipe pressure drop', `${p(pr?.base_pressure_drop_bar)} ${unit}`],
    ['Fitting loss', `${p(pr?.fitting_loss_bar)} ${unit}`],
    ['Pipe drop with fittings', `${p(pr?.pressure_with_fittings_bar)} ${unit}`],
    ['Line demand incl. machine losses', `${p(lineDemand)} ${unit}`],
    ['Injection pressure at the mix head', `${p(injectionPressure)} ${unit}`],
    ['Injection pressure set by', governedByMixHead ? 'Mix head minimum' : 'Feed line'],
  ])

  // ── Machine and output ────────────────────────────────────────────────────────
  if (mc) {
    const machineRows: string[][] = [['Machine', machine]]
    if (typeof mc.output_kg_min === 'number') {
      machineRows.push(['Output (the setting)', `${mc.output_kg_min.toFixed(2)} kg/min`])
    }
    if (typeof mc.output_min_kg_min === 'number' && typeof mc.output_max_kg_min === 'number') {
      machineRows.push([
        'Machine output range',
        `${mc.output_min_kg_min}-${mc.output_max_kg_min} kg/min`,
      ])
      machineRows.push(['Output within range', mc.output_in_range === false ? 'NO' : 'Yes'])
    }
    machineRows.push([
      'Machine pressure window',
      `${p(mc.min_pressure_bar)}-${p(mc.max_pressure_bar)} ${unit}`,
    ])
    if (mc.mix_head_type) machineRows.push(['Mix head', mc.mix_head_type])
    if (mc.mix_head_shear_range) {
      machineRows.push([
        'Mix head design shear',
        `${mc.mix_head_shear_range.min}-${mc.mix_head_shear_range.max} 1/s`,
      ])
    }
    heading('Machine & output', machineRows.length * 7 + 12)
    table(machineRows)

    if (mc.mix_head_shear_range) {
      note(
        'Mix head shear is a property of the mixing element and is unrelated to the shear '
          + 'rate in the feed line above - impingement mixing runs an order of magnitude '
          + 'higher than a mechanical rotor, by design.'
      )
    }
    if (mc.note) note(mc.note)
  }

  // ── Flow ──────────────────────────────────────────────────────────────────────
  heading('Flow', 54)
  const flow = results.flow

  // The margin before turbulence leads this section rather than trailing it: a page break
  // between the table and a trailing note left the sentence stranded at the top of the
  // next page with no heading above it.
  const envelope = flow?.laminar_envelope
  if (envelope?.recommendation) {
    note(envelope.recommendation, envelope.is_laminar ? MUTED : BAD)
  }

  table([
    ['Flow regime', titleCase(flow?.flow_regime)],
    ['Reynolds number', fmt(flow?.reynolds_number, 0)],
    ['Velocity', `${fmt(flow?.velocity_m_s, 3)} m/s`],
    ['Shear rate', `${fmt(flow?.shear_rate_s_inv, 0)} 1/s`],
    ['Apparent viscosity', `${fmt(flow?.apparent_viscosity_cp, 1)} cP`],
  ])

  // ── Thermal ───────────────────────────────────────────────────────────────────
  const thermal = results.thermal
  if (thermal) {
    heading('Thermal')
    const rows: string[][] = [
      ['Process temperature', `${fmt(thermal.temperature_c, 1)} °C`],
      [
        `Viscosity at ${fmt(thermal.reference_temp_c, 0)} °C (reference)`,
        `${fmt(thermal.reference_viscosity_cp, 1)} cP`,
      ],
      [
        `Viscosity at ${fmt(thermal.temperature_c, 1)} °C`,
        `${fmt(thermal.current_viscosity_cp, 1)} cP`,
      ],
    ]
    if (typeof thermal.shear_heating_c === 'number') {
      rows.push(['Shear heating', `${fmt(thermal.shear_heating_c, 2)} °C`])
    }
    if (typeof thermal.heat_generated_w === 'number') {
      rows.push(['Heat generated', `${fmt(thermal.heat_generated_w, 1)} W`])
    }
    table(rows)
  }

  // ── Temperature at the mix head, only when it was modelled ────────────────────
  const line = results.line_temperature
  if (line) {
    heading('Temperature at the mix head')
    table([
      ['Set point', `${fmt(line.set_temperature_c, 1)} °C`],
      ['Ambient', `${fmt(line.ambient_temperature_c, 1)} °C`],
      ['Arriving at the mix head', `${fmt(line.effective_temperature_c, 1)} °C`],
      ['Drift', `${fmt(line.drift_c, 1)} °C`],
      ['Line thermal time constant', `${fmt((line.time_constant_s ?? 0) / 60, 1)} min`],
    ])
    if (line.warning) note(line.warning, WARN)
  }

  // ── Blowing agent ─────────────────────────────────────────────────────────────
  const vol = results.volatility
  if (vol) {
    heading('Blowing agent')
    const rows: string[][] = [
      ['Agent', vol.agent],
      ['Status', VOLATILITY_TEXT[vol.status] ?? vol.status],
    ]
    if (typeof vol.boiling_point_c === 'number') {
      rows.push(['Boiling point', `${fmt(vol.boiling_point_c, 1)} °C`])
    }
    if (typeof vol.temperature_margin_c === 'number') {
      rows.push(['Margin to boiling', `${fmt(vol.temperature_margin_c, 1)} °C`])
    }
    table(rows)
    if (vol.message) note(vol.message)
    if (vol.warning) note(vol.warning, vol.status === 'flash_risk' ? BAD : WARN)
  }

  // ── Environmental ─────────────────────────────────────────────────────────────
  const env = results.environmental
  if (env) {
    heading('Environmental')
    const rows: string[][] = [['Blowing agent', env.blowing_agent || 'Unknown']]
    if (typeof env.gwp_per_kg === 'number') {
      rows.push(['GWP', `${fmt(env.gwp_per_kg, 2)} kg CO₂eq/kg`])
    }
    rows.push(['Eco-friendly', env.is_eco_friendly ? 'Yes' : 'No'])
    table(rows)
    if (env.recommendation) note(env.recommendation)
  }

  // ── Cure and exotherm, only when a part thickness was supplied ────────────────
  const cure = results.cure
  if (cure) {
    heading('Cure & exotherm')
    note('Describes the moulded part after the mix head, not the feed line above.')
    const rows: string[][] = [['Part thickness', `${fmt(cure.part_thickness_mm, 1)} mm`]]
    if (typeof cure.mold_temperature_c === 'number') {
      rows.push([
        `Mould temperature (${MOLD_SOURCE[cure.mold_temperature_source] ?? 'unknown source'})`,
        `${fmt(cure.mold_temperature_c, 1)} °C`,
      ])
    }
    if (typeof cure.cream_time_s === 'number') rows.push(['Cream time', `${fmt(cure.cream_time_s, 0)} s`])
    if (typeof cure.gel_time_s === 'number') rows.push(['Gel time', `${fmt(cure.gel_time_s, 0)} s`])
    if (cure.processing_window) {
      rows.push(['Working time', `${fmt(cure.processing_window.work_time_s, 0)} s`])
    }
    if (typeof cure.adiabatic_rise_c === 'number') {
      rows.push(['Reaction heat (adiabatic rise)', `${fmt(cure.adiabatic_rise_c, 0)} °C`])
    }
    if (typeof cure.peak_temperature_c === 'number') {
      rows.push(['Peak core temperature', `${fmt(cure.peak_temperature_c, 0)} °C`])
    }
    if (cure.scorch_risk) {
      rows.push([
        'Scorch risk',
        typeof cure.scorch_margin_c === 'number'
          ? `${titleCase(cure.scorch_risk)} (${fmt(cure.scorch_margin_c, 0)} °C margin)`
          : titleCase(cure.scorch_risk),
      ])
    }
    table(rows)

    if (cure.heat_of_reaction_is_estimated) {
      note(
        'Exotherm figures are estimated: this material\'s data sheet states no heat of reaction, '
          + 'so a literature-typical value for rigid polyurethane was used.',
        WARN
      )
    }
  }

  // ── Chart ─────────────────────────────────────────────────────────────────────
  if (chartElement) {
    try {
      const canvas = await html2canvas(chartElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      })
      const image = canvas.toDataURL('image/png')
      const imageWidth = contentWidth
      const imageHeight = (canvas.height / canvas.width) * imageWidth

      need(imageHeight + 14)
      heading('Pressure profile')
      doc.addImage(image, 'PNG', MARGIN, y, imageWidth, imageHeight)
      y += imageHeight + 8
    } catch (error) {
      console.error('Failed to capture chart:', error)
      // The report is still worth producing without it
      heading('Pressure profile')
      note('The chart could not be captured for this report.', WARN)
    }
  }

  // ── Sign-off ──────────────────────────────────────────────────────────────────
  need(30)
  y += 4
  doc.setDrawColor(RULE[0], RULE[1], RULE[2])
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y + 10, MARGIN + 55, y + 10)
  doc.line(pageWidth - MARGIN - 55, y + 10, pageWidth - MARGIN, y + 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  setColor(MUTED)
  doc.text('Operator', MARGIN, y + 14)
  doc.text('QA approval / date', pageWidth - MARGIN - 55, y + 14)

  // ── Footer on every page ──────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    setColor(MUTED)
    doc.text(
      'Computer-generated for reference. Verify against your own process before production.',
      MARGIN,
      pageHeight - 8
    )
    doc.text(
      `PU Optimizer v${__APP_VERSION__}  ·  ${reportId}  ·  page ${i} of ${pageCount}`,
      pageWidth - MARGIN,
      pageHeight - 8,
      { align: 'right' }
    )
  }

  doc.save(`PU-report-${reportId}-${new Date().toISOString().slice(0, 10)}.pdf`)
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
