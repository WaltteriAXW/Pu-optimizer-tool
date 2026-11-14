/**
 * Test fixtures: small technical data sheet PDFs, generated when the tests run.
 *
 * No manufacturer's PDF is committed. Every sheet here is made up for the tests, names a
 * fictional product ("Fixture Foam …"), and is built with jsPDF, the same library the app
 * uses for its report. Each one covers one thing the reader has to cope with. Node only: the
 * scan fixture's image is encoded with node:zlib.
 */
import { jsPDF } from 'jspdf'
import { deflateSync } from 'node:zlib'

/** One line of text on the sheet: [text, x in mm]. Lines are 8 mm apart. */
type Cell = [string, number]
type Line = Cell[]

export interface TdsFixture {
  /** File name, always starting "fixture-tds-" */
  name: string
  lines: Line[]
  /** Title size; the product name is read from the largest text near the top */
  titleSize?: number
}

const COL_LABEL = 20
const COL_POLYOL = 100
const COL_ISO = 150

/** A clean table: polyol and isocyanate side by side, plain numbers in cP */
export const CLEAN_TABLE: TdsFixture = {
  name: 'fixture-tds-clean-table.pdf',
  lines: [
    [['Fixture Foam CT Technical Data Sheet', COL_LABEL]],
    [['Property', COL_LABEL], ['Polyol', COL_POLYOL], ['Isocyanate', COL_ISO]],
    [['Viscosity at 25 °C (cP)', COL_LABEL], ['950', COL_POLYOL], ['200', COL_ISO]],
    [['Specific gravity at 25 °C', COL_LABEL], ['1.07', COL_POLYOL], ['1.23', COL_ISO]],
    [['Mixing ratio by weight', COL_LABEL], ['100', COL_POLYOL], ['110', COL_ISO]],
  ],
}

/** A viscosity given as a range, in a sheet laid out as one section per component */
export const RANGE: TdsFixture = {
  name: 'fixture-tds-range.pdf',
  lines: [
    [['Fixture Foam R Product Data Sheet', COL_LABEL]],
    [['Component A (Polyol)', COL_LABEL]],
    [['Viscosity at 25 °C: 900-1050 cP', COL_LABEL]],
    [['Specific gravity: 1.07', COL_LABEL]],
    [['Component B (Isocyanate)', COL_LABEL]],
    [['Viscosity at 25 °C: 180-220 cP', COL_LABEL]],
    [['Specific gravity: 1.23', COL_LABEL]],
    [['Mix ratio A:B by weight 100:110', COL_LABEL]],
  ],
}

/** A viscosity with a tolerance, written inline with the component's name */
export const TOLERANCE: TdsFixture = {
  name: 'fixture-tds-tolerance.pdf',
  lines: [
    [['Fixture Foam T', COL_LABEL]],
    [['Polyol viscosity at 25 °C: 350 ± 50 cP', COL_LABEL]],
    [['Isocyanate viscosity at 25 °C: 200 ± 20 cP', COL_LABEL]],
    [['Polyol specific gravity: 1.12', COL_LABEL]],
    [['Isocyanate specific gravity: 1.23', COL_LABEL]],
    [['Mixing ratio (polyol : isocyanate) by weight 100 : 110', COL_LABEL]],
  ],
}

/** Viscosity at two temperatures, so the activation energy can be calculated */
export const TWO_TEMPERATURES: TdsFixture = {
  name: 'fixture-tds-two-temperatures.pdf',
  lines: [
    [['Fixture Foam 2T Technical Data Sheet', COL_LABEL]],
    [['Property', COL_LABEL], ['Polyol', COL_POLYOL], ['Isocyanate', COL_ISO]],
    [['Viscosity at 25 °C (cP)', COL_LABEL], ['950', COL_POLYOL], ['200', COL_ISO]],
    [['Viscosity at 40 °C (cP)', COL_LABEL], ['420', COL_POLYOL], ['110', COL_ISO]],
    [['Specific gravity at 25 °C', COL_LABEL], ['1.07', COL_POLYOL], ['1.23', COL_ISO]],
    [['Mixing ratio by weight', COL_LABEL], ['100', COL_POLYOL], ['110', COL_ISO]],
  ],
}

/** mPa·s for viscosity, and densities in kg/m³ rather than specific gravities */
export const MPAS_UNITS: TdsFixture = {
  name: 'fixture-tds-mpas-units.pdf',
  lines: [
    [['Fixture Foam M Technical Data Sheet', COL_LABEL]],
    [['', COL_LABEL], ['Component A', COL_POLYOL], ['Component B', COL_ISO]],
    [['Viscosity, 25 °C (mPa·s)', COL_LABEL], ['950', COL_POLYOL], ['200', COL_ISO]],
    [['Density, 25 °C (kg/m³)', COL_LABEL], ['1070', COL_POLYOL], ['1230', COL_ISO]],
    [['Mixing ratio by weight', COL_LABEL], ['100', COL_POLYOL], ['110', COL_ISO]],
  ],
}

/** The isocyanate viscosity is not on the sheet */
export const MISSING_VALUE: TdsFixture = {
  name: 'fixture-tds-missing-value.pdf',
  lines: [
    [['Fixture Foam MV Technical Data Sheet', COL_LABEL]],
    [['Property', COL_LABEL], ['Polyol', COL_POLYOL], ['Isocyanate', COL_ISO]],
    [['Viscosity at 25 °C (cP)', COL_LABEL], ['950', COL_POLYOL]],
    [['Specific gravity at 25 °C', COL_LABEL], ['1.07', COL_POLYOL], ['1.23', COL_ISO]],
    [['Mixing ratio by weight', COL_LABEL], ['100', COL_POLYOL], ['110', COL_ISO]],
  ],
}

export const TEXT_FIXTURES = [CLEAN_TABLE, RANGE, TOLERANCE, TWO_TEMPERATURES, MPAS_UNITS, MISSING_VALUE]

/** A sheet as text, as a PDF */
export function buildTextPdf(fixture: TdsFixture): Uint8Array {
  const doc = new jsPDF()
  fixture.lines.forEach((line, i) => {
    doc.setFontSize(i === 0 ? fixture.titleSize ?? 16 : 10)
    for (const [text, x] of line) {
      if (text) doc.text(text, x, 20 + i * 8)
    }
  })
  return new Uint8Array(doc.output('arraybuffer'))
}

export const SCAN_FIXTURE_NAME = 'fixture-tds-scan.pdf'

/** A "scanned" sheet: one image of a page and no text layer at all */
export function buildScanPdf(): Uint8Array {
  const doc = new jsPDF()
  doc.addImage(greyPagePng(60, 80), 'PNG', 20, 20, 120, 160)
  return new Uint8Array(doc.output('arraybuffer'))
}

/** A small greyscale PNG with a few dark bands, like a photographed page of text */
function greyPagePng(width: number, height: number): Uint8Array {
  const raw = new Uint8Array((width + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const band = y % 8 < 2 && x > 5 && x < width - 5
      raw[y * (width + 1) + 1 + x] = band ? 40 : 235
    }
  }
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length)
    const view = new DataView(out.buffer)
    view.setUint32(0, data.length)
    out.set(new TextEncoder().encode(type), 4)
    out.set(data, 8)
    view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
    return out
  }
  const header = new Uint8Array(13)
  const view = new DataView(header.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  header[8] = 8 // bit depth
  header[9] = 0 // greyscale
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', new Uint8Array(deflateSync(raw))),
    chunk('IEND', new Uint8Array(0)),
  ]
  const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let offset = 0
  for (const part of parts) {
    png.set(part, offset)
    offset += part.length
  }
  return png
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
  }
  return (crc ^ 0xffffffff) >>> 0
}
