import { test, expect, waitForEngine } from './fixtures'

/**
 * Offline use. After one visit with a connection, the service worker holds the app, the
 * Python modules, the Pyodide runtime and the user guide, so the whole calculator works with
 * the network gone.
 */

test.use({ serviceWorkers: 'allow' })

test('works offline after the first load', async ({ page, context }) => {
  // Two engine boots plus precaching about 21 MB
  test.setTimeout(180_000)

  await page.goto('./')
  await waitForEngine(page)

  // Wait until the service worker has finished precaching and controls the page
  await page.evaluate(() => navigator.serviceWorker.ready)
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null), {
      timeout: 60_000,
    })
    .toBe(true)

  await context.setOffline(true)
  await page.reload()

  // The engine boots from the cache alone and a calculation goes through
  await waitForEngine(page)
  await page.click('button[type=submit]')
  await expect(page.getByTestId('kpi-pipe-pressure-drop')).toBeVisible({ timeout: 30_000 })

  // The user guide's slides come from the cache too
  await page.getByTestId('open-settings').click()
  await page.getByTestId('open-user-guide').click()
  const slides = page.getByRole('dialog', { name: 'User guide' }).getByRole('img')
  await expect(slides).toHaveCount(14)
  const first = slides.first()
  await expect
    .poll(() => first.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
    .toBeGreaterThan(0)
})
