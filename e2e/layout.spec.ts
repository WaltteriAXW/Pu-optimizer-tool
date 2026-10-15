import { test, expect, waitForEngine } from './fixtures'

/**
 * Layout faults found in a design review. Each one hid or clipped a control rather than
 * merely looking wrong, so each is pinned here.
 */

test.describe('layout', () => {
  test.beforeEach(async ({ pyodideRequests }) => {
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

  test('asking for less motion turns off smooth scrolling and the slide-in', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('./')
    await waitForEngine(page)
    await page.click('button[type=submit]')
    const results = page.getByRole('region', { name: /calculation results/i })
    await expect(results).toBeVisible({ timeout: 30_000 })

    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)
    ).toBe('auto')
    // A fade is fine; movement is not
    expect(await results.evaluate((el) => getComputedStyle(el).animationName)).toBe('fade')
  })

  test('on a phone, running a simulation brings the result into view', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('./')
    await waitForEngine(page)
    await page.click('button[type=submit]')

    await expect(page.getByTestId('machine-settings')).toBeInViewport({ timeout: 30_000 })
  })

  test('dark appearance applies, and the PDF still comes out', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('./')
    await waitForEngine(page)

    // The page background follows the system appearance
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    const [r, g, b] = background.match(/\d+/g)!.map(Number)
    expect(r + g + b).toBeLessThan(120)

    await page.click('button[type=submit]')
    await expect(page.getByTestId('kpi-pipe-pressure-drop')).toBeVisible({ timeout: 30_000 })

    // The chart is repainted light for the printed page; the export must still succeed
    const download = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.locator('button:has-text("PDF")').click(),
    ]).then(([d]) => d)
    expect(download.suggestedFilename()).toMatch(/\.pdf$/)
  })

  test('text enlarged to 200% reflows instead of running off the screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('./')
    await waitForEngine(page)
    // What someone who has doubled their browser text size gets
    await page.addStyleTag({ content: 'html { font-size: 32px !important; }' })
    await page.click('button[type=submit]')
    await expect(page.getByTestId('operating-window')).toBeVisible({ timeout: 30_000 })

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)

    // On a wide screen the number cards take fewer columns rather than clipping
    await page.setViewportSize({ width: 1440, height: 900 })
    const clipped = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid^="kpi-"]')]
        .filter((card) => card.scrollWidth > card.clientWidth + 1)
        .map((card) => card.getAttribute('data-testid'))
    )
    expect(clipped).toEqual([])
  })

  test('every control is at least 44 px in both directions', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('./')
    await waitForEngine(page)
    await page.getByRole('button', { name: /ambient conditions/i }).click()
    await page.getByLabel('Hose Material').selectOption('rubber')
    await page.getByLabel('Insulation', { exact: true }).selectOption('pe_foam')
    await page.getByLabel('Insulation Thickness').fill('10')
    await page.click('button[type=submit]')
    await expect(page.getByTestId('operating-window')).toBeVisible({ timeout: 30_000 })
    await page.getByRole('button', { name: /calculation history/i }).click()

    const small = await page.evaluate(() =>
      [...document.querySelectorAll('button, a[href], input, select, textarea')]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          const s = getComputedStyle(el)
          return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && (el as HTMLInputElement).type !== 'file'
        })
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.width < 44 || r.height < 44
        })
        .map((el) => {
          const r = el.getBoundingClientRect()
          return `${Math.round(r.width)}x${Math.round(r.height)} ${el.tagName} ${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}`
        })
    )
    expect(small).toEqual([])
  })
})
