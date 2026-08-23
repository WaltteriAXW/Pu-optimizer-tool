import { test, expect, waitForEngine } from './fixtures'

/**
 * The printed report.
 *
 * The report is generated in the browser from the same result object the screen renders, so
 * the thing worth proving here is that it actually contains what the screen showed — it
 * previously carried a flattened handful of fields and silently omitted the laminar margin,
 * the blowing agent, the line temperature and the whole cure block.
 */

test.describe('PDF report', () => {
  test.beforeEach(async ({ page, pyodideRequests }) => {
    void pyodideRequests
    await page.goto('./')
  })

  test('downloads a PDF built from the calculation', async ({ page }) => {
    await waitForEngine(page)
    await page.click('button[type=submit]')
    await expect(page.getByTestId('kpi-pipe-pressure-drop')).toBeVisible({ timeout: 30_000 })

    const download = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.locator('button:has-text("PDF")').click(),
    ]).then(([d]) => d)

    expect(download.suggestedFilename()).toMatch(/^PU-report-.+\.pdf$/)

    const stream = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(chunk as Buffer)
    const pdf = Buffer.concat(chunks)

    // A real PDF, and one with actual content rather than an empty shell
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pdf.length).toBeGreaterThan(20_000)
  })

  test('carries the sections the screen shows, including the optional ones', async ({
    page,
  }) => {
    await waitForEngine(page)

    // Supply the optional inputs so the cure and line-temperature blocks exist at all
    await page.getByRole('button', { name: /ambient conditions/i }).click()
    await page.getByLabel('Ambient Temperature').fill('5')
    await page.getByLabel('Part Thickness').fill('40')
    await page.click('button[type=submit]')

    // Both optional blocks must be on screen before the report can be expected to hold them
    await expect(page.getByText('Temperature at the Mix Head')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Cure & Exotherm')).toBeVisible()

    const download = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.locator('button:has-text("PDF")').click(),
    ]).then(([d]) => d)

    const stream = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(chunk as Buffer)
    const pdf = Buffer.concat(chunks)

    // jsPDF writes its text uncompressed, so the section headings are greppable in the
    // raw bytes. Crude, but it is the difference between a report that matches the screen
    // and one that quietly drops half of it.
    const raw = pdf.toString('latin1')
    for (const heading of [
      'MACHINE OUTPUT - SET THIS',
      'INJECTION PRESSURE - EXPECTED',
      'MACHINE & OUTPUT',
      'INPUTS',
      'PRESSURE',
      'FLOW',
      'THERMAL',
      'TEMPERATURE AT THE MIX HEAD',
      'CURE & EXOTHERM',
    ]) {
      expect(raw, `report is missing the "${heading}" section`).toContain(heading)
    }
  })

  test('quotes pressures in the unit chosen on screen', async ({ page }) => {
    await waitForEngine(page)
    await page.getByTestId('unit-psi').click()
    await page.click('button[type=submit]')
    await expect(page.getByTestId('kpi-pipe-pressure-drop')).toBeVisible({ timeout: 30_000 })

    const download = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.locator('button:has-text("PDF")').click(),
    ]).then(([d]) => d)

    const stream = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(chunk as Buffer)
    const raw = Buffer.concat(chunks).toString('latin1')

    // The report is the one export that follows the display unit, and says so
    expect(raw).toContain('All pressures in psi')
    // 100 bar of machine minimum is 1450 psi
    expect(raw).toContain('1450')
  })
})
