import { test, expect, waitForEngine } from './fixtures'

/**
 * The simpler custom material form, and the "Typical value" label on the catalogued
 * materials' flow index and activation energy, which nobody measured.
 */

test.describe('simpler custom material form', () => {
  test.beforeEach(async ({ page, pyodideRequests }) => {
    void pyodideRequests // activates the offline Pyodide route
    await page.goto('./')
    await waitForEngine(page)
  })

  test('the viscosity model menu waits for a measured flow curve', async ({ page }) => {
    await page.locator('select[name=material_key]').selectOption('custom')
    await expect(page.getByLabel('Viscosity Model')).toHaveCount(0)

    await page.getByRole('button', { name: 'I have a measured flow curve' }).click()
    await expect(page.getByLabel('Viscosity Model')).toBeVisible()
    await expect(page.getByRole('button', { name: 'I have a measured flow curve' })).toHaveCount(0)
  })

  test('a remembered setup that used a flow curve opens with the menu shown', async ({ page }) => {
    await page.locator('select[name=material_key]').selectOption('custom')
    await page.getByRole('button', { name: 'I have a measured flow curve' }).click()
    await page.getByLabel('Viscosity Model').selectOption('carreau')
    await page.click('button[type=submit]')
    await expect(page.getByTestId('flow-curve')).toBeVisible({ timeout: 30_000 })

    await page.reload()
    await waitForEngine(page)
    await expect(page.getByLabel('Viscosity Model')).toHaveValue('carreau')
  })

  test('a catalogued material calls its flow index and activation energy typical', async ({ page }) => {
    await page.click('button[type=submit]')

    const flowIndex = page.getByTestId('result-flow-index')
    await expect(flowIndex).toContainText('Typical value', { timeout: 30_000 })
    await expect(page.getByTestId('result-activation-energy')).toContainText('Typical value')

    const download = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.getByRole('button', { name: 'PDF', exact: true }).click(),
    ]).then(([d]) => d)
    const chunks: Buffer[] = []
    for await (const chunk of await download.createReadStream()) chunks.push(chunk as Buffer)
    const raw = Buffer.concat(chunks).toString('latin1')

    // Parentheses inside a PDF text string are escaped in the raw bytes
    expect(raw).toContain('Flow index \\(Typical value\\)')
    expect(raw).toContain('Activation energy \\(Typical value\\)')
  })

  test('the custom pre-filled flow index is typical until the user changes it', async ({ page }) => {
    await page.locator('select[name=material_key]').selectOption('custom')
    await page.click('button[type=submit]')
    const flowIndex = page.getByTestId('result-flow-index')
    await expect(flowIndex).toContainText('Typical value', { timeout: 30_000 })

    await page.locator('input[name=flow_index]').fill('0.8')
    await page.click('button[type=submit]')
    await expect(flowIndex).toContainText('Entered by user', { timeout: 30_000 })
  })
})
