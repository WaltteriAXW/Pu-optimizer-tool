import { test, expect, waitForEngine } from './fixtures'

/**
 * Keyboard and assistive-technology behaviour, in a real browser.
 *
 * These are the parts of the interface that cannot be checked by reading the markup: whether
 * a label actually resolves to its input, whether Escape reaches the panel, whether focus
 * goes somewhere sensible when a dialog opens and comes back when it closes. A unit test
 * against the component tree would assert the attributes exist without proving the browser
 * does anything with them.
 */

test.describe('accessibility', () => {
  test.beforeEach(async ({ page, pyodideRequests }) => {
    void pyodideRequests
    await page.goto('./')
  })

  test('every form control resolves to its own label', async ({ page }) => {
    await waitForEngine(page)

    // getByLabel only matches when the association actually resolves — these all used to
    // be bare <label> elements sitting next to unlabelled inputs.
    await expect(page.getByLabel('Pipe Length')).toBeVisible()
    await expect(page.getByLabel('Pipe Diameter')).toBeVisible()
    await expect(page.getByLabel('Material Temperature')).toBeVisible()
    await expect(page.getByLabel('Flow Rate')).toBeVisible()
    await expect(page.getByLabel('Material Type')).toBeVisible()
    await expect(page.getByLabel('Machine Type')).toBeVisible()
  })

  test('an out-of-range value is announced, not only coloured red', async ({ page }) => {
    await waitForEngine(page)

    const pipeLength = page.getByLabel('Pipe Length')
    await pipeLength.fill('10')  // below the 50 mm minimum

    // Marked invalid for assistive technology rather than by border colour alone
    await expect(pipeLength).toHaveAttribute('aria-invalid', 'true')

    // …and the reason is carried in a live region, so it is spoken when it appears
    const alert = page.getByRole('alert').filter({ hasText: /at least 50 mm/i })
    await expect(alert).toBeVisible()

    // The field points at that message, which is what makes it readable on focus.
    // Matched by attribute rather than '#id' — useId emits colons, which are CSS syntax.
    const describedBy = await pipeLength.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    const errorId = describedBy!.split(' ')[0]
    await expect(page.locator(`[id="${errorId}"]`)).toContainText(/at least 50 mm/i)
  })

  test('the history panel is a dialog that Escape closes', async ({ page }) => {
    await waitForEngine(page)

    const toggle = page.getByRole('button', { name: /calculation history/i })
    await toggle.click()

    const dialog = page.getByRole('dialog', { name: /calculation history/i })
    await expect(dialog).toBeVisible()

    // Escape must reach it. Without a key handler the only way out was to find the toggle
    // again — and above the lg breakpoint there was no backdrop to click either.
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()

    // Focus returns to what opened it, rather than being dropped on the body
    await expect(toggle).toBeFocused()
  })

  test('the backdrop dismisses the panel at desktop width too', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await waitForEngine(page)

    await page.getByRole('button', { name: /calculation history/i }).click()
    const dialog = page.getByRole('dialog', { name: /calculation history/i })
    await expect(dialog).toBeVisible()

    // Click well away from the panel, which sits against the right edge
    await page.mouse.click(100, 450)
    await expect(dialog).not.toBeVisible()
  })

  test('results are announced when a calculation completes', async ({ page }) => {
    await waitForEngine(page)
    await page.click('button[type=submit]')

    const results = page.getByRole('region', { name: /calculation results/i })
    await expect(results).toBeVisible({ timeout: 30_000 })
    // Polite rather than assertive: it should not interrupt, but it must be spoken
    await expect(results).toHaveAttribute('aria-live', 'polite')
  })

  test('the pressure chart carries a text alternative', async ({ page }) => {
    await waitForEngine(page)
    await page.click('button[type=submit]')

    // The chart is otherwise a wall of <path> elements with nothing to announce
    const chart = page.getByRole('img', { name: /pressure profile along the pipe/i })
    await expect(chart).toBeVisible({ timeout: 30_000 })
    await expect(chart).toContainText(/bar from pipe friction alone/i)
  })
})
