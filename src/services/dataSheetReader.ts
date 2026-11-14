/**
 * Reading the text of a data sheet PDF, in the browser.
 *
 * pdfjs-dist is bundled with the app and loaded only when the user picks a file, so it costs
 * nothing until then. Nothing is uploaded: the file is read in the page and its text goes to
 * the Python engine running in the same page, which finds the values (src/core/data/
 * data_sheet.py). There is no OCR: a scanned sheet has no text to read, and says so.
 */
import type * as PdfJs from 'pdfjs-dist'

export const SCAN_MESSAGE = "This PDF is a scan, so the tool can't read it. Enter the values by hand."

/** One line of the sheet, top to bottom, split into cells where the text has a wide gap */
export interface SheetRow {
  cells: Array<{ text: string; x: number }>
  /** Text height, used to find the title */
  height: number
}

/** The sheet has no text layer to read */
export class ScannedPdfError extends Error {
  constructor() {
    super(SCAN_MESSAGE)
    this.name = 'ScannedPdfError'
  }
}

/** Long sheets put the properties on the first pages; this keeps a big file quick */
const MAX_PAGES = 10

interface TextItem {
  str: string
  transform: number[]
  width: number
  height: number
}

/**
 * The text of a PDF as rows of cells. Takes the pdfjs module as an argument so the tests can
 * pass the build that runs in Node.
 *
 * @throws ScannedPdfError when no page has any text
 */
export async function extractRows(pdfjs: typeof PdfJs, data: Uint8Array): Promise<SheetRow[]> {
  const task = pdfjs.getDocument({ data, verbosity: 0 })
  const pdf = await task.promise
  const rows: SheetRow[] = []
  try {
    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, MAX_PAGES); pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      const items = (content.items as unknown[]).filter(
        (item): item is TextItem =>
          typeof (item as TextItem).str === 'string' && (item as TextItem).str.trim() !== ''
      )
      rows.push(...groupIntoRows(items))
    }
  } finally {
    await task.destroy()
  }
  if (rows.length === 0) throw new ScannedPdfError()
  return rows
}

/** Pieces of text on the same baseline make a row; a gap wider than a space starts a cell. */
function groupIntoRows(items: TextItem[]): SheetRow[] {
  const sorted = [...items].sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4])
  const lines: TextItem[][] = []
  for (const item of sorted) {
    const y = item.transform[5]
    const size = Math.abs(item.height || item.transform[3]) || 10
    const line = lines[lines.length - 1]
    if (line && Math.abs(line[0].transform[5] - y) <= Math.max(2, size * 0.4)) line.push(item)
    else lines.push([item])
  }

  return lines.map((line) => {
    line.sort((a, b) => a.transform[4] - b.transform[4])
    const height = Math.max(...line.map((item) => Math.abs(item.height || item.transform[3]) || 0))
    const cells: SheetRow['cells'] = []
    let end = -Infinity
    for (const item of line) {
      const x = item.transform[4]
      const gap = x - end
      const last = cells[cells.length - 1]
      if (last && gap < Math.max(4, height * 0.8)) {
        last.text += gap > height * 0.15 ? ` ${item.str}` : item.str
      } else {
        cells.push({ text: item.str, x })
      }
      end = x + item.width
    }
    for (const cell of cells) cell.text = cell.text.replace(/\s+/g, ' ').trim()
    return { cells: cells.filter((cell) => cell.text), height }
  })
}

/**
 * Read a PDF the user picked. Loads pdfjs and its worker, both bundled with the app, the first
 * time it is used.
 */
export async function readDataSheetPdf(file: File): Promise<SheetRow[]> {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return extractRows(pdfjs, new Uint8Array(await file.arrayBuffer()))
}
