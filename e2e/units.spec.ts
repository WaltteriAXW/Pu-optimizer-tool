import { test, expect, waitForEngine } from './fixtures'

/**
 * The pressure unit is a display preference and nothing more.
 *
 * The property worth proving in a real browser is that switching it changes what is read
 * and not what was calculated: the engine works in bar, the stored records hold bar, and a
 * preference that leaked into either would quietly make two saved runs incomparable.
 *
 * The figures are the ones the calculation suite already pins for the form defaults: a
 * 0.17 bar pipe drop and a 100 bar set point, which is the machine minimum.
 */

test.describe('pressure units', () => {
  test.beforeEach(async ({ page, pyodideRequests }) => {
    void pyodideRequests
    await page.goto('./')
  })

  test('bar is the default, and psi converts the displayed figures', async ({ page }) => {
    await waitForEngine(page)
    await page.click('button[type=submit]')

    const setPressure = page.getByTestId('set-pressure')
    await expect(setPressure).toBeVisible({ timeout: 30_000 })
    await expect(setPressure).toContainText('100')
    await expect(setPressure).toContainText('bar')

    await page.getByTestId('unit-psi').click()

    // 100 bar is 1450 psi. Seeing the converted figure proves the preference reached the
    // headline, and seeing the unit change proves it is not merely relabelling.
    await expect(setPressure).toContainText('1450')
    await expect(setPressure).toContainText('psi')

    // The pipe drop follows. It shows as 0.17 bar, but the underlying figure is 0.1662,
    // which is 2.41 psi — converting the rounded 0.17 instead would give 2.47. That gap is
    // the reason conversion happens on the value and never on the formatted string.
    const drop = page.getByTestId('kpi-pipe-pressure-drop')
    await expect(drop).toContainText('2.41')
    await expect(drop).toContainText('psi')
  })

  test('the choice survives a reload', async ({ page }) => {
    await waitForEngine(page)
    await page.getByTestId('unit-psi').click()

    await page.reload()
    await waitForEngine(page)

    await expect(page.getByTestId('unit-psi')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('unit-bar')).toHaveAttribute('aria-pressed', 'false')
  })

  test('switching units does not change what was calculated', async ({ page }) => {
    await waitForEngine(page)
    await page.click('button[type=submit]')
    await expect(page.getByTestId('kpi-pipe-pressure-drop')).toBeVisible({ timeout: 30_000 })

    // Switch away and back: the bar figure must be exactly what it was, not a value
    // round-tripped through psi and back with the rounding that would imply
    await page.getByTestId('unit-psi').click()
    await page.getByTestId('unit-bar').click()

    await expect(page.getByTestId('kpi-pipe-pressure-drop')).toContainText('0.17')
    await expect(page.getByTestId('set-pressure')).toContainText('100')
  })

  test('exports stay in bar whatever the display shows', async ({ page }) => {
    await waitForEngine(page)
    await page.click('button[type=submit]')
    await expect(page.getByTestId('kpi-pipe-pressure-drop')).toBeVisible({ timeout: 30_000 })

    await page.getByTestId('unit-psi').click()

    // The exported record is the calculation, not the view of it. A file whose units
    // depended on a toggle set at download time would be unreadable a week later.
    const download = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button:has-text("JSON")').click(),
    ]).then(([d]) => d)

    const stream = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(chunk as Buffer)
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf-8'))

    expect(payload.machine_compatibility.set_pressure_bar).toBeCloseTo(100, 5)
    expect(payload.pressure.pressure_with_fittings_bar).toBeLessThan(1)
  })
})
