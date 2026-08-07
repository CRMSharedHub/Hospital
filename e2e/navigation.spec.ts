import { test, expect, login } from './fixtures'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@cityhospital.com', 'admin123')
  })

  test('navigate to patients page', async ({ page }) => {
    await page.getByRole('link', { name: /patients|المرضى/ }).first().click()
    await expect(page).toHaveURL(/\/patients/)
    await expect(page.locator('h2')).toBeVisible()
  })

  test('navigate to doctors page', async ({ page }) => {
    await page.getByRole('link', { name: /doctors|الأطباء/ }).first().click()
    await expect(page).toHaveURL(/\/doctors/)
  })

  test('navigate to appointments page', async ({ page }) => {
    await page.getByRole('link', { name: /appointments|المواعيد/ }).first().click()
    await expect(page).toHaveURL(/\/appointments/)
  })

  test('navigate to billing page', async ({ page }) => {
    await page.getByRole('link', { name: /billing|الفوترة/ }).first().click()
    await expect(page).toHaveURL(/\/billing/)
  })

  test('navigate to pharmacy page', async ({ page }) => {
    await page.getByRole('link', { name: /pharmacy|الصيدلية/ }).first().click()
    await expect(page).toHaveURL(/\/pharmacy/)
  })

  test('navigate to lab page', async ({ page }) => {
    await page.getByRole('link', { name: /lab|المختبر/ }).first().click()
    await expect(page).toHaveURL(/\/lab/)
  })

  test('navigate to census page', async ({ page }) => {
    await page.getByRole('link', { name: /census|التعداد/ }).first().click()
    await expect(page).toHaveURL(/\/census/)
  })

  test('navigate to orders page', async ({ page }) => {
    await page.getByRole('link', { name: /orders|الأوامر/ }).first().click()
    await expect(page).toHaveURL(/\/orders/)
  })

  test('navigate to emar page', async ({ page }) => {
    await page.getByRole('link', { name: /emar|إعطاء|الأدوية/i }).first().click()
    await expect(page).toHaveURL(/\/emar/)
  })

  test('navigate to reports page', async ({ page }) => {
    await page.getByRole('link', { name: /reports|التقارير/ }).first().click()
    await expect(page).toHaveURL(/\/reports/)
  })

  test('navigate to settings page', async ({ page }) => {
    await page.getByRole('link', { name: /settings|الإعدادات/ }).first().click()
    await expect(page).toHaveURL(/\/settings/)
  })

  test('command palette opens with Ctrl+K', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').first()).toBeVisible()
    // Dispatch in-page so Chromium does not steal Ctrl+K for the omnibox
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.evaluate(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
      )
    })
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 })
  })
})
