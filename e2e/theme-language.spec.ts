import { test, expect, login } from './fixtures'

test.describe('Theme & Language', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@cityhospital.com', 'admin123')
  })

  test('toggle dark mode in settings', async ({ page }) => {
    await page.goto('/settings')
    const isDarkBefore = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    // Toggles: notifications (0), push (1), dark mode (2)
    const toggleButtons = page.locator('button.relative.w-12')
    await toggleButtons.nth(2).click()
    await page.waitForTimeout(500)
    const isDarkAfter = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(isDarkAfter).not.toBe(isDarkBefore)
  })

  test('dark mode persists across navigation', async ({ page }) => {
    await page.goto('/settings')
    const toggleButtons = page.locator('button.relative.w-12')
    await toggleButtons.nth(2).click()
    await page.waitForTimeout(300)
    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    // Navigate to dashboard
    await page.goto('/')
    await page.waitForTimeout(300)
    const isDarkAfterNav = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(isDarkAfterNav).toBe(isDark)
  })

  test('toggle language between Arabic and English', async ({ page }) => {
    await page.goto('/')
    // Get initial language
    const langBefore = await page.evaluate(() => document.documentElement.lang)
    // Click language toggle button (shows 'EN' or 'عربي')
    const langButton = page.getByRole('button', { name: /^(EN|عربي)$/ })
    await langButton.click()
    await page.waitForTimeout(500)
    const langAfter = await page.evaluate(() => document.documentElement.lang)
    expect(langAfter).not.toBe(langBefore)
  })

  test('language toggle switches direction', async ({ page }) => {
    await page.goto('/')
    const dirBefore = await page.evaluate(() => document.documentElement.dir)
    const langButton = page.getByRole('button', { name: /^(EN|عربي)$/ })
    await langButton.click()
    await page.waitForTimeout(500)
    const dirAfter = await page.evaluate(() => document.documentElement.dir)
    expect(dirAfter).not.toBe(dirBefore)
  })

  test('settings page shows role badge', async ({ page }) => {
    await page.goto('/settings')
    // Should see Admin role badge
    await expect(page.getByText(/admin|مدير/i).first()).toBeVisible()
  })

  test('settings page shows permissions list', async ({ page }) => {
    await page.goto('/settings')
    // Should see some permission tags
    await expect(page.getByText(/dashboard:view|patients:view/i).first()).toBeVisible({ timeout: 5000 })
  })
})
