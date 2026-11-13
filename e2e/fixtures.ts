import { test as base, expect } from '@playwright/test'
import { version as pyodideVersion } from 'pyodide'
import { pyodideCdnUrl } from '../src/services/pyodideCdnUrl'

/**
 * Playwright fixtures for the end-to-end suite.
 *
 * The Pyodide runtime is served from the app's own origin (the build copies it into
 * dist/pyodide), so the suite needs no network to boot the engine. Optional package wheels
 * still point at the CDN; those requests are failed explicitly, so a test can never come to
 * depend on the network by accident.
 *
 * Built from the same helper as vite.config.ts, so a Pyodide bump moves both together.
 */
const PYODIDE_CDN = pyodideCdnUrl(pyodideVersion)
const PYODIDE_SELF_HOSTED = /\/pyodide\/([^?]+)/

export const test = base.extend<{ pyodideRequests: string[] }>({
  /**
   * Every Pyodide file requested during the test, self-hosted or from the CDN, so a test can
   * assert on what the boot actually fetched — proving, for instance, that nothing pulls
   * numpy any more.
   */
  pyodideRequests: async ({ page }, use) => {
    const requested: string[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.startsWith(PYODIDE_CDN)) {
        requested.push(url.slice(PYODIDE_CDN.length).split('?')[0])
        return
      }
      const match = new URL(url).pathname.match(PYODIDE_SELF_HOSTED)
      if (match) requested.push(match[1])
    })

    await page.route(`${PYODIDE_CDN}**`, route =>
      route.fulfill({
        status: 404,
        body: `${route.request().url()} is a package wheel; the suite does not use the network`,
      })
    )

    await use(requested)
  },
})

export { expect }

/**
 * Wait for the Python runtime to finish booting.
 *
 * The submit button is the readiness signal: it reads "Loading Engine..." until Pyodide has
 * mounted the virtual filesystem and passed its import check.
 */
export async function waitForEngine(page: import('@playwright/test').Page) {
  await expect(page.locator('button[type=submit]')).toHaveText(/Run Simulation/, {
    timeout: 120_000,
  })
}

/**
 * Change the pressure unit, which lives in the Settings sheet: open it, choose, close it.
 */
export async function choosePressureUnit(page: import('@playwright/test').Page, unit: 'bar' | 'psi') {
  await page.getByTestId('open-settings').click()
  await page.getByTestId(`unit-${unit}`).check()
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByTestId('settings-sheet')).toHaveCount(0)
}
