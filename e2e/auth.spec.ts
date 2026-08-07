import { test, expect, login, logout, DEMO_USERS } from './fixtures'

test.describe('Authentication', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', 'wrong@test.com')
    await page.fill('#password', 'wrongpass')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login as admin and see dashboard', async ({ page }) => {
    await login(page, 'admin@cityhospital.com', 'admin123')
    await expect(page).toHaveURL('/')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('logout redirects to login', async ({ page }) => {
    await login(page, 'admin@cityhospital.com', 'admin123')
    await logout(page)
    await expect(page).toHaveURL(/\/login/)
  })

  test('quick login buttons are visible', async ({ page }) => {
    await page.goto('/login')
    for (const user of DEMO_USERS) {
      await expect(page.getByText(user.email, { exact: false })).toBeVisible()
    }
  })
})

test.describe('RBAC', () => {
  test('admin can access billing', async ({ page }) => {
    await login(page, 'admin@cityhospital.com', 'admin123')
    await page.goto('/billing')
    await expect(page).toHaveURL(/\/billing/)
    await expect(page.locator('h2')).toBeVisible()
  })

  test('patient cannot access billing', async ({ page }) => {
    await login(page, 'patient@cityhospital.com', 'patient123')
    await page.goto('/billing')
    await expect(page).toHaveURL('/')
  })

  test('patient cannot access pharmacy', async ({ page }) => {
    await login(page, 'patient@cityhospital.com', 'patient123')
    await page.goto('/pharmacy')
    await expect(page).toHaveURL('/')
  })

  test('patient cannot access reports', async ({ page }) => {
    await login(page, 'patient@cityhospital.com', 'patient123')
    await page.goto('/reports')
    await expect(page).toHaveURL('/')
  })

  test('doctor can access lab', async ({ page }) => {
    await login(page, 'doctor@cityhospital.com', 'doctor123')
    await page.goto('/lab')
    await expect(page).toHaveURL(/\/lab/)
  })

  test('doctor cannot access billing', async ({ page }) => {
    await login(page, 'doctor@cityhospital.com', 'doctor123')
    await page.goto('/billing')
    await expect(page).toHaveURL('/')
  })

  test('nurse can access pharmacy', async ({ page }) => {
    await login(page, 'nurse@cityhospital.com', 'nurse123')
    await page.goto('/pharmacy')
    await expect(page).toHaveURL(/\/pharmacy/)
  })

  test('nurse cannot access billing', async ({ page }) => {
    await login(page, 'nurse@cityhospital.com', 'nurse123')
    await page.goto('/billing')
    await expect(page).toHaveURL('/')
  })

  test('patient sidebar only shows allowed items', async ({ page }) => {
    await login(page, 'patient@cityhospital.com', 'patient123')
    // patient: dashboard, appointments, portal, settings — not billing/pharmacy/lab/reports
    await expect(page.getByRole('link', { name: /billing|الفوترة/ })).not.toBeVisible()
    await expect(page.getByRole('link', { name: /pharmacy|الصيدلية/ })).not.toBeVisible()
    await expect(page.getByRole('link', { name: /lab|المختبر/ })).not.toBeVisible()
    await expect(page.getByRole('link', { name: /portal|بوابتي/i })).toBeVisible()
  })

  test('admin sidebar shows all items', async ({ page }) => {
    await login(page, 'admin@cityhospital.com', 'admin123')
    await expect(page.getByRole('link', { name: /billing|الفوترة/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /pharmacy|الصيدلية/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /lab|المختبر/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /reports|التقارير/ })).toBeVisible()
  })
})
