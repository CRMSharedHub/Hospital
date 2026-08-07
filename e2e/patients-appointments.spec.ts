import { test, expect, login } from './fixtures'

test.describe('Patients', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@cityhospital.com', 'admin123')
    await page.goto('/patients')
  })

  test('displays patients page with title', async ({ page }) => {
    await expect(page.locator('h2')).toBeVisible()
  })

  test('shows add patient button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /add patient|إضافة مريض/i })).toBeVisible()
  })

  test('opens add patient modal', async ({ page }) => {
    await page.getByRole('button', { name: /add patient|إضافة مريض/i }).click()
    // Modal should appear with form fields
    await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input[name="phone"]')).toBeVisible()
  })

  test('search filters patients', async ({ page }) => {
    const searchInput = page.locator('.card input[type="text"]')
    await searchInput.fill('zzznonexistent')
    await page.waitForTimeout(500)
    const visibleRows = page.locator('tbody tr')
    const count = await visibleRows.count()
    // At most 1 row (could be a "no results" message row)
    expect(count).toBeLessThanOrEqual(1)
  })
})

test.describe('Appointments', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@cityhospital.com', 'admin123')
    await page.goto('/appointments')
  })

  test('displays appointments page with title', async ({ page }) => {
    await expect(page.locator('h2')).toBeVisible()
  })

  test('shows new appointment button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /new appointment|موعد جديد/i })).toBeVisible()
  })

  test('can switch to calendar view', async ({ page }) => {
    // Find and click calendar view toggle button
    const calendarBtn = page.getByRole('button', { name: /calendar|التقويم/i }).first()
    if (await calendarBtn.isVisible()) {
      await calendarBtn.click()
      await page.waitForTimeout(500)
      // FullCalendar should render
      await expect(page.locator('.fc, [class*="calendar"]')).toBeVisible({ timeout: 5000 })
    }
  })

  test('status filter buttons are present', async ({ page }) => {
    // Should have filter buttons/tabs for different statuses
    await expect(page.getByText(/all|الكل/i).first()).toBeVisible()
  })
})
