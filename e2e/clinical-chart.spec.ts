import { test, expect, login } from './fixtures'

test.describe('Clinical chart B2', () => {
  test('nurse can open vitals and problem list tabs', async ({ page }) => {
    await login(page, 'nurse@cityhospital.com', 'nurse123')
    await page.goto('/patients/103')
    await expect(page.locator('h2')).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: /vitals|العلامات الحيوية/i }).click()
    await expect(page.getByRole('button', { name: /add record|إضافة سجل/i })).toBeVisible()

    await page.getByRole('button', { name: /problem list|قائمة المشكلات/i }).click()
    await expect(page.getByText(/diabetes|Type 2|E11/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('nurse can record vitals', async ({ page }) => {
    await login(page, 'nurse@cityhospital.com', 'nurse123')
    await page.goto('/patients/103')
    await page.getByRole('button', { name: /vitals|العلامات الحيوية/i }).click()
    await page.getByRole('button', { name: /add record|إضافة سجل/i }).click()

    // Heart rate field — second number-ish input in vitals form; fill via labels
    const hr = page.getByText(/HR|النبض/).locator('..').locator('input')
    await hr.fill('76')
    await page.getByRole('button', { name: /save vitals|حفظ العلامات/i }).click()
    await expect(page.getByText(/76/).first()).toBeVisible({ timeout: 10000 })
  })

  test('patient portal shows clinical records section', async ({ page }) => {
    await login(page, 'patient@cityhospital.com', 'patient123')
    await page.goto('/portal')
    await page.getByRole('button', { name: /records|سجلاتي|my records/i }).click()
    await expect(page.getByText(/vitals|العلامات الحيوية/i).first()).toBeVisible()
    await expect(page.getByText(/problem list|قائمة المشكلات/i).first()).toBeVisible()
  })
})
