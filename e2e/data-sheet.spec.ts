import { test, expect, waitForEngine } from './fixtures'
import {
  buildScanPdf,
  buildTextPdf,
  SCAN_FIXTURE_NAME,
  TWO_TEMPERATURES,
} from '../src/test/tdsFixtures'

/**
 * Filling the custom material form from a data sheet PDF, end to end: pdfjs reads the text in
 * the page, Python finds and combines the values, the user checks them and confirms, and the
 * run is marked as such. The PDFs are generated fixtures; no manufacturer's sheet is used.
 */

test.describe('fill from a data sheet', () => {
  test.beforeEach(async ({ page, pyodideRequests }) => {
    void pyodideRequests // activates the offline Pyodide route
    await page.goto('./')
    await waitForEngine(page)
    await page.locator('select[name=material_key]').selectOption('custom')
  })

  const choose = async (page: import('@playwright/test').Page, name: string, pdf: Uint8Array) => {
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'Fill from a data sheet (PDF)' }).click(),
    ])
    await chooser.setFiles({ name, mimeType: 'application/pdf', buffer: Buffer.from(pdf) })
  }

  test('shows what it found, fills only on confirm, and marks the run', async ({ page }) => {
    const viscosity = page.locator('input[name=viscosity_cp]')
    await expect(viscosity).toHaveValue('350')

    await choose(page, TWO_TEMPERATURES.name, buildTextPdf(TWO_TEMPERATURES))

    // Each value with the exact line it came from
    const review = page.getByTestId('data-sheet-review')
    await expect(review).toBeVisible({ timeout: 30_000 })
    const found = review.getByTestId('data-sheet-found')
    await expect(found).toContainText('Fixture Foam 2T')
    await expect(found).toContainText('950 cP at 25 °C')
    await expect(found).toContainText('420 cP at 40 °C')
    await expect(found).toContainText('Viscosity at 40 °C (cP)  420  110')
    await expect(found).toContainText('100 polyol : 110 isocyanate by weight')
    const combined = review.getByTestId('data-sheet-combined')
    await expect(combined).toContainText('Calculated from the data sheet')
    await expect(combined).toContainText('0.85 (Typical value)')

    // Nothing is filled in until the user confirms
    await expect(viscosity).toHaveValue('350')
    await expect(page.getByTestId('kpi-pipe-pressure-drop')).toHaveCount(0)

    await review.getByRole('button', { name: 'Use these values' }).click()
    await expect(review).toHaveCount(0)
    await expect(viscosity).not.toHaveValue('350')
    await expect(page.getByTestId('data-sheet-mark')).toContainText('Fixture Foam 2T')
    await expect(page.getByTestId('activation-energy-note')).toHaveText('Calculated from the data sheet.')

    // Filled values stay editable
    await expect(viscosity).toBeEditable()

    // Still nothing calculated by itself
    await expect(page.getByTestId('kpi-pipe-pressure-drop')).toHaveCount(0)
    await page.click('button[type=submit]')
    await expect(page.getByTestId('result-activation-energy')).toContainText(
      'Calculated from the data sheet',
      { timeout: 30_000 }
    )
    await expect(page.getByTestId('result-flow-index')).toContainText('Typical value')

    // The run carries the mark into history and the exports
    const download = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.locator('button:has-text("CSV")').click(),
    ]).then(([d]) => d)
    const chunks: Buffer[] = []
    for await (const chunk of await download.createReadStream()) chunks.push(chunk as Buffer)
    expect(Buffer.concat(chunks).toString('utf-8')).toContain(
      'Material values read from a data sheet, confirmed by the user'
    )

    await page.getByRole('button', { name: /history/i }).first().click()
    await expect(page.getByTestId('history-data-sheet-mark').first()).toBeVisible()
  })

  test('says a scanned sheet cannot be read', async ({ page }) => {
    await choose(page, SCAN_FIXTURE_NAME, buildScanPdf())
    await expect(
      page.getByText("This PDF is a scan, so the tool can't read it. Enter the values by hand.")
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('input[name=viscosity_cp]')).toHaveValue('350')
  })
})
