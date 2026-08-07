import { test, expect, login } from './fixtures'

test.describe('eMAR', () => {
  test('nurse can open emar and see entries', async ({ page }) => {
    await login(page, 'nurse@cityhospital.com', 'nurse123')
    await page.goto('/emar')
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible()
    await expect(page.getByText(/Metformin|Amlodipine/i).first()).toBeVisible({ timeout: 15000 })
  })

  test('nurse can mark dose given', async ({ page }) => {
    await login(page, 'nurse@cityhospital.com', 'nurse123')
    await page.goto('/emar')
    const givenBtn = page.getByRole('button', { name: /given|أُعطي/i }).first()
    await expect(givenBtn).toBeVisible({ timeout: 15000 })
    await givenBtn.click()
    await expect(page.getByText(/given|أُعطي/i).first()).toBeVisible()
  })

  test('patient cannot access emar', async ({ page }) => {
    await login(page, 'patient@cityhospital.com', 'patient123')
    await page.goto('/emar')
    await expect(page).toHaveURL('/')
  })
})
