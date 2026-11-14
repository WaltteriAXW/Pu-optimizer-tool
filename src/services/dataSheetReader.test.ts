import { describe, it, expect } from 'vitest'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import type * as PdfJs from 'pdfjs-dist'
import { extractRows, ScannedPdfError, SCAN_MESSAGE } from './dataSheetReader'
import {
  buildScanPdf,
  buildTextPdf,
  CLEAN_TABLE,
  MPAS_UNITS,
  TEXT_FIXTURES,
  TWO_TEMPERATURES,
} from '@/test/tdsFixtures'

/**
 * Reading the text of a data sheet PDF. The fixtures are generated here; no manufacturer's
 * PDF is in the repository. The Python suite proves what is done with the text
 * (src/core/data/test_data_sheet.py).
 */

// The Node build of pdfjs, which the tests run on; the browser loads the modern build
const lib = pdfjs as unknown as typeof PdfJs

const text = (rows: Awaited<ReturnType<typeof extractRows>>) => rows.map((row) => row.cells.map((c) => c.text))

describe('extractRows', () => {
  it('keeps a table row as separate cells, left to right', async () => {
    const rows = await extractRows(lib, buildTextPdf(CLEAN_TABLE))
    expect(text(rows)).toContainEqual(['Viscosity at 25 °C (cP)', '950', '200'])
    expect(text(rows)).toContainEqual(['Property', 'Polyol', 'Isocyanate'])
  })

  it('puts the cells of each column at the same position', async () => {
    const rows = await extractRows(lib, buildTextPdf(TWO_TEMPERATURES))
    const at25 = rows.find((row) => row.cells[0].text.includes('25 °C'))!
    const at40 = rows.find((row) => row.cells[0].text.includes('40 °C'))!
    expect(at25.cells[1].x).toBeCloseTo(at40.cells[1].x, 0)
    expect(at25.cells[2].x).toBeCloseTo(at40.cells[2].x, 0)
  })

  it('keeps the symbols a data sheet uses', async () => {
    const rows = await extractRows(lib, buildTextPdf(MPAS_UNITS))
    const lines = text(rows).map((cells) => cells.join(' | '))
    expect(lines).toContain('Viscosity, 25 °C (mPa·s) | 950 | 200')
    expect(lines).toContain('Density, 25 °C (kg/m³) | 1070 | 1230')
  })

  it('reads the title as the tallest text', async () => {
    const rows = await extractRows(lib, buildTextPdf(CLEAN_TABLE))
    const tallest = rows.reduce((a, b) => (b.height > a.height ? b : a))
    expect(tallest.cells[0].text).toBe('Fixture Foam CT Technical Data Sheet')
  })

  it.each(TEXT_FIXTURES.map((f) => [f.name, f] as const))('reads every line of %s', async (_name, fixture) => {
    const rows = await extractRows(lib, buildTextPdf(fixture))
    expect(rows.length).toBe(fixture.lines.length)
  })

  it('says a scan has nothing to read', async () => {
    await expect(extractRows(lib, buildScanPdf())).rejects.toThrow(ScannedPdfError)
    await expect(extractRows(lib, buildScanPdf())).rejects.toThrow(SCAN_MESSAGE)
  })

  it('uses the exact wording for a scan', () => {
    expect(SCAN_MESSAGE).toBe("This PDF is a scan, so the tool can't read it. Enter the values by hand.")
  })
})
