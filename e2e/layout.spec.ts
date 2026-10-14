import { test, expect, waitForEngine } from './fixtures'

/**
 * Layout faults found in a design review. Each one hid or clipped a control rather than
 * merely looking wrong, so each is pinned here.
 */

test.describe('layout', () => {
  test.beforeEach(async ({ page, pyodideRequests }) => {
    void pyodideRequests // activates the offline Pyodide route
  })

  test('the Run button stays on screen while a long form scrolls beside the results', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('./')
    await waitForEngine(page)

    // Open everything optional, so the form is far taller than the window
    await page.getByRole('button', { name: /ambient conditions/i }).click()
    await page.getByLabel('Hose Material').selectOption('rubber')
    await page.getByLabel('Insulation', { exact: true }).selectOption('pe_foam')
    await page.getByLabel('Insulation Thickness').fill('10')
    await page.click('button[type=submit]')
    await expect(page.getByTestId('operating-window')).toBeVisible({ timeout: 30_000 })

    // Sticky positioning used to pin the top of the form and hold its button off-screen
    for (const y of [0, 800, 1600]) {
      await page.evaluate((top) => window.scrollTo(0, top), y)
      await expect(page.locator('button[type=submit]')).toBeInViewport({ ratio: 1 })
    }
  })

  test('nothing runs off a phone screen, and the unit switch is there', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('./')
    await waitForEngine(page)
    await page.click('button[type=submit]')
    await expect(page.getByTestId('operating-window')).toBeVisible({ timeout: 30_000 })

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)

    // Every export is fully on screen horizontally — the PDF one used to be clipped
    for (const name of ['JSON', 'CSV', 'Report', 'PDF']) {
      const box = await page.locator(`button:has-text("${name}")`).boundingBox()
      expect(box, `${name} button`).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(375)
    }

    await expect(page.getByTestId('unit-psi')).toBeVisible()
  })
})
