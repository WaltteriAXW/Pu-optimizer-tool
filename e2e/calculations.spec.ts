import { test, expect, waitForEngine } from './fixtures'

/**
 * End-to-end tests for the PU Optimizer.
 *
 * These exercise the one path that unit tests cannot reach: the browser actually booting
 * Pyodide, mounting the Python sources and material database into its virtual filesystem,
 * and returning a number that gets rendered.
 *
 * The pressure assertion below is the point of the whole suite. 0.17 bar is what the Python
 * engine computes for the form's default inputs — the same figure asserted in
 * src/core/processors/test_calculation_processor.py. Seeing it appear in the browser proves
 * the entire chain end to end: Pyodide boot, VFS mount, CSV parse, mixed-liquid derivation,
 * Arrhenius correction, pressure calculation and rendering.
 */

/** What Python computes for the form defaults: 500 mm, 12 mm, 25 °C, 5 L/min, Genfoam HD12 */
const EXPECTED_DEFAULT_PRESSURE = '0.17'

/**
 * The pressure the operator sets. The line demands only 25.2 bar, so the machine's 100 bar
 * minimum governs — these are two different numbers and the panel used to give both the same
 * name.
 */
const EXPECTED_SET_PRESSURE = '100'

test.describe('Polyurethane Optimizer - full calculation flow', () => {
  test.beforeEach(async ({ page, pyodideRequests }) => {
    void pyodideRequests // activates the offline Pyodide route
    await page.goto('./')
  })

  test('boots the Python engine and calculates the expected pressure', async ({ page }) => {
    await waitForEngine(page)

    // The material list is populated from the database CSV, not hardcoded in the form
    await expect(page.locator('select[name=material_key]')).toContainText('Genfoam HD12')

    await page.click('button[type=submit]')

    const pressureCard = page.getByTestId('kpi-pipe-pressure-drop')
    await expect(pressureCard).toBeVisible({ timeout: 30_000 })

    // The number itself — agreement with the Python suite is what makes this a proof
    await expect(pressureCard).toContainText(EXPECTED_DEFAULT_PRESSURE)
  })

  test('separates the pressure to set from the pipe pressure drop', async ({ page }) => {
    await waitForEngine(page)
    await page.click('button[type=submit]')

    const setPressure = page.getByTestId('set-pressure')
    await expect(setPressure).toBeVisible({ timeout: 30_000 })
    await expect(setPressure).toContainText('Required Pressure')
    await expect(setPressure).toContainText(EXPECTED_SET_PRESSURE)
    // Which constraint governs must be visible, or the headline is untraceable
    await expect(setPressure).toContainText(/machine minimum governs/i)

    // …and the pipe drop is a different, smaller number under its own name
    const drop = page.getByTestId('kpi-pipe-pressure-drop')
    await expect(drop).toContainText('Pipe Pressure Drop')
    await expect(drop).toContainText(EXPECTED_DEFAULT_PRESSURE)
  })

  test('states how much room there is before the flow turns turbulent', async ({ page }) => {
    await waitForEngine(page)
    await page.click('button[type=submit]')

    const envelope = page.getByTestId('laminar-envelope')
    await expect(envelope).toBeVisible({ timeout: 30_000 })
    await expect(envelope).toContainText('Laminar flow')
    // The margin as a flow rate, not just the word "laminar"
    await expect(envelope).toContainText(/turbulence would not begin until [\d.]+ L\/min/)
  })

  test('tells the operator what to change when the flow is turbulent', async ({ page }) => {
    await waitForEngine(page)

    // A thin material pushed hard: 180 L/min through the 12 mm line
    await page.selectOption('select[name=material_key]', 'ecomate_spray')
    await page.fill('input[name=flow_rate_lpm]', '180')
    await page.click('button[type=submit]')

    const envelope = page.getByTestId('laminar-envelope')
    await expect(envelope).toBeVisible({ timeout: 30_000 })
    await expect(envelope).toContainText('Turbulent flow', { timeout: 30_000 })
    // A direction to move, with a figure — not merely a label
    await expect(envelope).toContainText(/drop the flow rate to [\d.]+ L\/min/)
  })

  test('does not fetch numpy while booting', async ({ page, pyodideRequests }) => {
    await waitForEngine(page)

    const numpyRequests = pyodideRequests.filter(name => /numpy/i.test(name))
    expect(
      numpyRequests,
      'nothing on the calculation path imports numpy, so booting must not fetch it'
    ).toEqual([])
  })

  test('temperature changes the required pressure', async ({ page }) => {
    await waitForEngine(page)

    const readPressure = async () => {
      const card = page.getByTestId('kpi-pipe-pressure-drop')
      await expect(card).toBeVisible({ timeout: 30_000 })
      const text = await card.innerText()
      return parseFloat(text.match(/(\d+\.\d+)/)?.[1] ?? 'NaN')
    }

    await page.fill('input[name=temperature_c]', '18')
    await page.click('button[type=submit]')
    const cold = await readPressure()

    await page.fill('input[name=temperature_c]', '35')
    await page.click('button[type=submit]')
    await expect
      .poll(readPressure, { timeout: 30_000 })
      .toBeLessThan(cold)

    // Warmer material is thinner, so the line needs less pressure. This was the original
    // defect: the temperature input reached a display card but never the calculation.
    const warm = await readPressure()
    expect(warm).toBeLessThan(cold)
  })

  test('selecting a different material changes the result', async ({ page }) => {
    await waitForEngine(page)

    await page.click('button[type=submit]')
    const card = page.getByTestId('kpi-pipe-pressure-drop')
    await expect(card).toBeVisible({ timeout: 30_000 })
    const first = await card.innerText()

    await page.selectOption('select[name=material_key]', 'ecomate_spray')
    await page.click('button[type=submit]')

    await expect.poll(async () => card.innerText(), { timeout: 30_000 }).not.toBe(first)
  })

  test('exports are offered once a calculation exists', async ({ page }) => {
    await waitForEngine(page)
    await page.click('button[type=submit]')

    await expect(page.getByTestId('kpi-pipe-pressure-drop')).toBeVisible({ timeout: 30_000 })

    await expect(page.locator('button:has-text("JSON")')).toBeVisible()
    await expect(page.locator('button:has-text("CSV")')).toBeVisible()
  })
})
