import { test as base, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Playwright fixtures for the end-to-end suite.
 *
 * The application loads Pyodide from a CDN, which makes the whole suite dependent on
 * outbound network access — the reason it could never run in a sandboxed environment or in
 * CI. Pyodide's runtime is already present in node_modules as a dependency, so the CDN
 * request is served from there instead.
 *
 * This is a test harness only. The application still loads Pyodide from the CDN in real
 * use; nothing about the shipped code changes.
 */

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
const PYODIDE_LOCAL = path.resolve('node_modules/pyodide')

const CONTENT_TYPES: Record<string, string> = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.zip': 'application/zip',
  '.ts': 'text/plain',
}

export const test = base.extend<{ pyodideRequests: string[] }>({
  /**
   * Every Pyodide asset requested during the test, so a test can assert on what the boot
   * actually fetched — proving, for instance, that nothing pulls numpy any more.
   */
  pyodideRequests: async ({ page }, use) => {
    const requested: string[] = []

    await page.route(`${PYODIDE_CDN}**`, async route => {
      const name = route.request().url().slice(PYODIDE_CDN.length).split('?')[0]
      requested.push(name)

      const file = path.join(PYODIDE_LOCAL, name)

      // Anything not shipped in the npm package — a package wheel, for instance — is not
      // available offline. Fail it explicitly rather than hanging on a blocked request.
      if (!name || !fs.existsSync(file)) {
        return route.fulfill({
          status: 404,
          body: `${name} is not bundled in node_modules/pyodide`,
        })
      }

      await route.fulfill({
        status: 200,
        contentType: CONTENT_TYPES[path.extname(name)] ?? 'application/octet-stream',
        body: fs.readFileSync(file),
      })
    })

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
