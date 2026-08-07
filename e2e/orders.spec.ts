import { test, expect, login, selectLabeledOption } from './fixtures'

test.describe('CPOE Orders', () => {
  test('doctor can open orders page and see seed orders', async ({ page }) => {
    await login(page, 'doctor@cityhospital.com', 'doctor123')
    await page.goto('/orders')
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible()
    await expect(page.getByText(/HbA1c|Chest X-ray|Amlodipine/i).first()).toBeVisible({ timeout: 15000 })
  })

  test('doctor can place a lab order', async ({ page }) => {
    await login(page, 'doctor@cityhospital.com', 'doctor123')
    await page.goto('/orders')
    await selectLabeledOption(page, /patients|المرضى/i, 1)
    await page.locator('label').filter({ hasText: /description|الوصف/i }).locator('input').fill('CBC panel')
    await page.getByRole('button', { name: /place order|إصدار الأمر/i }).click()
    await expect(page.getByText(/CBC panel/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('patient cannot access orders route', async ({ page }) => {
    await login(page, 'patient@cityhospital.com', 'patient123')
    await page.goto('/orders')
    await expect(page).toHaveURL('/')
  })
})
