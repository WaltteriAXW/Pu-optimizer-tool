import { test, expect, waitForEngine } from './fixtures'

/** Sliders and pop-up menus, driven the way a keyboard or switch user would. */

test.describe('controls', () => {
  test.beforeEach(async ({ page, pyodideRequests }) => {
    void pyodideRequests // activates the offline Pyodide route
    await page.goto('./')
    await waitForEngine(page)
  })

  test('a slider and its field set the same value, both ways', async ({ page }) => {
    const field = page.locator('input[name=flow_rate_lpm]')
    const slider = page.getByRole('slider', { name: 'Flow Rate slider' })

    // Keyboard: Home and End reach the ends of the range
    await slider.focus()
    await page.keyboard.press('End')
    await expect(field).toHaveValue('200')
    await page.keyboard.press('Home')
    await expect(field).toHaveValue('0.1')

    // The value is spoken with its unit, not as a bare slider position
    await expect(slider).toHaveAttribute('aria-valuetext', '0.1 L/min')

    // Typing in the field moves the slider
    await field.fill('5')
    const position = Number(await slider.inputValue())
    expect(position).toBeGreaterThan(450)
    expect(position).toBeLessThan(600)
  })

  test('a slider clears an error the typed value had', async ({ page }) => {
    const field = page.locator('input[name=pipe_length_mm]')
    await field.fill('5')
    await expect(page.getByRole('alert').filter({ hasText: /at least 50 mm/i })).toBeVisible()

    // The slider sits at its start while the field is below the range; moving it sets a
    // value inside the range
    await page.getByRole('slider', { name: 'Pipe Length slider' }).focus()
    await page.keyboard.press('End')
    await expect(field).toHaveValue('10000')
    await expect(page.getByRole('alert').filter({ hasText: /at least 50 mm/i })).toHaveCount(0)
  })

  test('menus are native selects underneath, so every platform shows its own picker', async ({ page }) => {
    const material = page.getByLabel('Material Type')
    expect(await material.evaluate((el) => el.tagName)).toBe('SELECT')
    await material.selectOption({ index: 1 })
    await expect(material).not.toHaveValue('')
  })
})
