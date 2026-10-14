import { test, expect, waitForEngine } from './fixtures'

/**
 * The three pieces wired in from previously unused modules: the operating window, the hose
 * description, and measured flow curves for custom materials. The Python suite proves the
 * physics; these prove each one is reachable from the form and shows up on screen.
 */

test.describe('operating window, hose and flow curves', () => {
  test.beforeEach(async ({ page, pyodideRequests }) => {
    void pyodideRequests // activates the offline Pyodide route
    await page.goto('./')
    await waitForEngine(page)
  })

  test('shows how far the flow rate can go before the pressure runs out', async ({ page }) => {
    // A long, narrow line on a low-pressure machine, so the pressure limit binds in range
    await page.locator('input[name=pipe_length_mm]').fill('5000')
    await page.locator('input[name=pipe_diameter_mm]').fill('8')
    await page.locator('input[name=flow_rate_lpm]').fill('10')
    await page.getByLabel('Low pressure', { exact: true }).check()
    await page.click('button[type=submit]')

    const card = page.getByTestId('operating-window')
    await expect(card).toBeVisible({ timeout: 30_000 })
    await expect(card).toContainText('less')
    await expect(card).toContainText(/Highest flow rate within the pressure limit\s*\d+\.\d L\/min/)
    await expect(card).toContainText('set by the pressure limit')

    // A tighter limit of one's own replaces the machine's
    await page.getByLabel('Max Feed-Line Pressure').fill('5')
    await page.click('button[type=submit]')
    await expect(card).toContainText('your limit', { timeout: 30_000 })
  })

  test('a lagged hose keeps the material warmer than a bare one', async ({ page }) => {
    await page.getByRole('button', { name: /ambient conditions/i }).click()
    await page.getByLabel('Ambient Temperature').fill('5')
    await page.getByLabel('Time Since Last Shot').fill('1200')
    await page.getByLabel('Hose Material').selectOption('rubber')
    await page.click('button[type=submit]')

    const mixHead = page.getByText('At mix head').locator('xpath=following-sibling::p')
    await expect(mixHead).toBeVisible({ timeout: 30_000 })
    const bare = parseFloat((await mixHead.textContent()) ?? '')

    await page.getByLabel('Insulation', { exact: true }).selectOption('elastomeric_foam')
    // Lagging without a thickness is held back rather than quietly meaning none
    await expect(page.locator('button[type=submit]')).toBeDisabled()
    await page.getByLabel('Insulation Thickness').fill('19')
    await page.click('button[type=submit]')

    await expect(page.getByTestId('hose-breakdown')).toContainText('insulation', { timeout: 30_000 })
    await expect
      .poll(async () => parseFloat((await mixHead.textContent()) ?? ''))
      .toBeGreaterThan(bare)
  })

  test('a custom material can be described by a measured flow curve', async ({ page }) => {
    await page.locator('select[name=material_key]').selectOption('custom')
    await page.getByLabel('Viscosity Model').selectOption('carreau')
    await expect(page.getByLabel('Zero-Shear Viscosity η₀')).toHaveValue('1500')
    // A measured value off any round grid. A numeric `step` on the input once made the
    // browser block the submit for values like this, silently.
    await page.getByLabel('Time Constant λ').fill('0.0437')
    await page.click('button[type=submit]')

    const curve = page.getByTestId('flow-curve')
    await expect(curve).toContainText('Carreau', { timeout: 30_000 })
    await expect(curve).toContainText('Effective viscosity')

    // A yield-stress fluid moves partly as a plug, and says how much
    await page.getByLabel('Viscosity Model').selectOption('herschel_bulkley')
    await page.click('button[type=submit]')
    await expect(curve).toContainText('Herschel–Bulkley', { timeout: 30_000 })
    await expect(curve).toContainText('Unsheared plug')
  })
})
