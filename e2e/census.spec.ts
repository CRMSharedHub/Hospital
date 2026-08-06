import { test, expect, login } from './fixtures'

test.describe('Census / ADT', () => {
  test('admin can open census page', async ({ page }) => {
    await login(page, 'admin@cityhospital.com', 'admin123')
    await page.goto('/census')
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible()
  })

  test('nurse can admit transfer discharge', async ({ page }) => {
    await login(page, 'nurse@cityhospital.com', 'nurse123')
    await page.goto('/census')
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible()

    // Admit on first available bed button
    const admitBtn = page.getByRole('button', { name: /admit|تنويم/i }).first()
    await expect(admitBtn).toBeVisible({ timeout: 15000 })
    await admitBtn.click()

    const dialog = page.locator('.fixed.inset-0').last()
    await expect(dialog.getByRole('heading')).toBeVisible()
    const patientSelect = dialog.locator('select').first()
    await patientSelect.selectOption({ index: 1 })
    await dialog.getByRole('button', { name: /admit|تنويم/i }).click()

    // Discharge one of the occupied beds (may be seed or just-admitted)
    const dischargeBtn = page.getByRole('button', { name: /discharge|خروج/i }).first()
    await expect(dischargeBtn).toBeVisible({ timeout: 10000 })
    await dischargeBtn.click()
  })

  test('patient cannot access census', async ({ page }) => {
    await login(page, 'patient@cityhospital.com', 'patient123')
    await page.goto('/census')
    await expect(page).toHaveURL('/')
  })
})
