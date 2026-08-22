import { test, expect, waitForEngine } from './fixtures'

/**
 * That runs survive a reload, in a real browser.
 *
 * The unit tests exercise the store against an in-memory stub, which proves the logic but
 * says nothing about localStorage actually being reached from the running application. That
 * mattered here: the module this replaces wrote to localStorage correctly and was imported by
 * nothing, so for the whole life of the project not one calculation was ever saved. Storage
 * that is not tested end to end is storage that can silently stop working.
 */

const openHistory = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: /history/i }).first().click()
}

test.describe('shot records', () => {
  test.beforeEach(async ({ page, pyodideRequests }) => {
    void pyodideRequests
    await page.goto('./')
  })

  test('a calculated run is still there after a reload', async ({ page }) => {
    await waitForEngine(page)
    await page.click('button[type=submit]')
    await expect(page.getByTestId('kpi-pipe-pressure-drop')).toBeVisible({ timeout: 30_000 })

    await openHistory(page)
    await expect(page.getByTestId('dataset-panel')).toContainText('1')

    // The actual test: come back to the page as a new load
    await page.reload()
    await waitForEngine(page)
    await openHistory(page)

    await expect(page.getByTestId('dataset-panel')).toContainText('1')
    await expect(page.getByTestId('outcome-picker').first()).toBeVisible()
  })

  test('a run starts with no outcome, and keeps one once recorded', async ({ page }) => {
    await waitForEngine(page)
    await page.click('button[type=submit]')
    await expect(page.getByTestId('kpi-pipe-pressure-drop')).toBeVisible({ timeout: 30_000 })

    await openHistory(page)
    const picker = page.getByTestId('outcome-picker').first().locator('select')
    await expect(picker).toHaveValue('unrecorded')

    await picker.selectOption('voids')

    await page.reload()
    await waitForEngine(page)
    await openHistory(page)

    await expect(page.getByTestId('outcome-picker').first().locator('select')).toHaveValue(
      'voids'
    )
  })

  test('says how many more labelled shots a model would need', async ({ page }) => {
    await waitForEngine(page)
    await page.click('button[type=submit]')
    await expect(page.getByTestId('kpi-pipe-pressure-drop')).toBeVisible({ timeout: 30_000 })

    await openHistory(page)

    // With one unlabelled run there is nothing a model could say, and the panel must say so
    // rather than showing a confident-looking number.
    const panel = page.getByTestId('dataset-panel')
    await expect(panel).toContainText('No model yet')
    await expect(panel).toContainText(/\d+ more than there are now/)
  })
})
