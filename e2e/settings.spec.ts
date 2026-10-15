import { test, expect, waitForEngine } from './fixtures'

/**
 * The Settings sheet: appearance, units and the remembered setup. Each setting must do what
 * it says and survive a reload.
 */

test.describe('settings', () => {
  test.beforeEach(async ({ page, pyodideRequests }) => {
    void pyodideRequests // activates the offline Pyodide route
    await page.goto('./')
    await waitForEngine(page)
  })

  test('opens as a dialog and closes with Done or Escape', async ({ page }) => {
    await page.getByTestId('open-settings').click()
    const sheet = page.getByRole('dialog', { name: 'Settings' })
    await expect(sheet).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
    // Focus goes back to the button that opened it
    await expect(page.getByTestId('open-settings')).toBeFocused()

    await page.getByTestId('open-settings').click()
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(sheet).toHaveCount(0)
  })

  test('a chosen appearance overrides the device, and survives a reload', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.getByTestId('open-settings').click()
    await page.getByTestId('appearance-dark').check()

    const darkBackground = async () => {
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
      const [r, g, b] = bg.match(/\d+/g)!.map(Number)
      return r + g + b < 120
    }
    expect(await darkBackground()).toBe(true)

    await page.reload()
    await waitForEngine(page)
    expect(await darkBackground()).toBe(true)

    // Automatic hands it back to the device
    await page.getByTestId('open-settings').click()
    await page.getByTestId('appearance-system').check()
    expect(await darkBackground()).toBe(false)
  })

  test('turning off "Remember last setup" forgets it', async ({ page }) => {
    await page.locator('input[name=pipe_length_mm]').fill('1234')
    await page.click('button[type=submit]')
    await expect(page.getByTestId('kpi-pipe-pressure-drop')).toBeVisible({ timeout: 30_000 })

    await page.reload()
    await waitForEngine(page)
    await expect(page.locator('input[name=pipe_length_mm]')).toHaveValue('1234')

    await page.getByTestId('open-settings').click()
    await page.getByRole('switch', { name: /remember last setup/i }).click()
    await expect(page.getByRole('switch', { name: /remember last setup/i })).toHaveAttribute('aria-checked', 'false')

    await page.reload()
    await waitForEngine(page)
    await expect(page.locator('input[name=pipe_length_mm]')).toHaveValue('500')
  })
})
