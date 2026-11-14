import { test, expect, waitForEngine } from './fixtures'

/**
 * Temperature sensitivity (activation energy) on a custom material. It is read-only and
 * shows the typical value as an estimate until a second viscosity reading is given, when
 * Python calculates it. The formula and its rules are proved in the Python suite; this
 * proves the form shows what Python worked out, says where it came from, and carries the
 * label through to the results.
 */

test.describe('activation energy from a second viscosity reading', () => {
  test.beforeEach(async ({ page, pyodideRequests }) => {
    void pyodideRequests // activates the offline Pyodide route
    await page.goto('./')
    await waitForEngine(page)
    await page.locator('select[name=material_key]').selectOption('custom')
  })

  test('shows the calculated value and says it was calculated', async ({ page }) => {
    const field = page.getByLabel('Temperature sensitivity (activation energy)')
    const note = page.getByTestId('activation-energy-note')

    // Before a second reading: the typical value, read-only, called a typical value
    await expect(field).toHaveValue('25000')
    await expect(field).toHaveAttribute('readonly', '')
    await expect(note).toHaveText(
      'Typical value. Add a second viscosity reading to calculate it for your material.'
    )

    // 350 cP at 25 °C and 200 cP at 40 °C: R ln(350/200) / (1/298.15 − 1/313.15) ≈ 28,960
    await page.getByLabel('Second viscosity reading').fill('200')
    await page.getByLabel('Measured at').fill('40')

    await expect(field).toHaveValue('29000')
    await expect(note).toHaveText('Calculated from your two viscosity readings.')
    await expect(field).toHaveAttribute('readonly', '')

    await page.click('button[type=submit]')
    const row = page.getByTestId('result-activation-energy')
    await expect(row).toContainText('29,000', { timeout: 30_000 })
    await expect(row).toContainText('Calculated from two viscosity readings')
  })

  test('refuses readings where the material gets thicker as it warms', async ({ page }) => {
    await page.getByLabel('Second viscosity reading').fill('400')
    await page.getByLabel('Measured at').fill('40')
    await expect(
      page.getByText('Viscosity must be lower at the higher temperature. Check the two readings.')
    ).toBeVisible()
    await expect(page.locator('button[type=submit]')).toBeDisabled()
  })

  test('a value entered manually is marked as entered by the user', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter value manually' }).click()
    const field = page.getByLabel('Temperature sensitivity (activation energy)')
    await expect(field).not.toHaveAttribute('readonly', '')
    await field.fill('31000')
    await expect(page.getByTestId('activation-energy-note')).toHaveText('Entered by user.')

    await page.click('button[type=submit]')
    const row = page.getByTestId('result-activation-energy')
    await expect(row).toContainText('31,000', { timeout: 30_000 })
    await expect(row).toContainText('Entered by user')
  })
})
