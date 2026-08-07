import { test, expect, login, selectLabeledOption } from './fixtures'

test.describe('Portal & Claims', () => {
  test('patient can open portal and see bills', async ({ page }) => {
    await login(page, 'patient@cityhospital.com', 'patient123')
    await page.goto('/portal')
    await expect(page).toHaveURL(/\/portal/)
    await expect(page.getByRole('heading', { name: /portal|بوابتي/i })).toBeVisible()
    await expect(page.getByText(/Invoice #|رقم الفاتورة/i).first()).toBeVisible()
  })

  test('patient can mock-pay an unpaid invoice', async ({ page }) => {
    await login(page, 'patient@cityhospital.com', 'patient123')
    await page.goto('/portal')
    // Expand unpaid invoice #5 (Follow-up)
    await page.getByText(/#5/).first().click()
    await page.getByRole('button', { name: /pay now|ادفع الآن/i }).click()
    await expect(page.getByText(/payment succeeded|تم الدفع بنجاح/i)).toBeVisible({ timeout: 10_000 })
  })

  test('admin can create a claim draft', async ({ page }) => {
    await login(page, 'admin@cityhospital.com', 'admin123')
    await page.goto('/claims')
    await expect(page.getByRole('heading', { name: /claims|المطالبات/i })).toBeVisible()
    await selectLabeledOption(page, /invoice|فاتورة/i, 1)
    const createBtn = page.getByRole('button', { name: /create claim|إنشاء مطالبة/i })
    await expect(createBtn).toBeEnabled({ timeout: 10_000 })
    await createBtn.click()
    await expect(page.getByText(/claim #|مطالبة #/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('patient portal shows records tab', async ({ page }) => {
    await login(page, 'patient@cityhospital.com', 'patient123')
    await page.goto('/portal')
    await page.getByRole('button', { name: /my records|سجلاتي/i }).click()
    await expect(page.getByText(/laboratory|المختبر|medications|الأدوية/i).first()).toBeVisible()
  })

  test('admin can post remittance after claim submit', async ({ page }) => {
    await login(page, 'admin@cityhospital.com', 'admin123')
    await page.goto('/claims')
    await selectLabeledOption(page, /invoice|فاتورة/i, 1)
    const createBtn = page.getByRole('button', { name: /create claim|إنشاء مطالبة/i })
    await expect(createBtn).toBeEnabled({ timeout: 10_000 })
    await createBtn.click()
    await expect(page.getByText(/claim #|مطالبة #/i).first()).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /submit claim|إرسال المطالبة/i }).first().click()
    await page.getByRole('button', { name: /post remittance|ترحيل تسوية/i }).first().click()
    await expect(page.getByText(/ERA-/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('admin can open interop page', async ({ page }) => {
    await login(page, 'admin@cityhospital.com', 'admin123')
    await page.goto('/interop')
    await expect(page.getByRole('heading', { name: /interop|التكامل/i })).toBeVisible()
    await page.getByRole('button', { name: /encode hl7|ترميز/i }).click()
    await expect(page.locator('pre').first()).toContainText('MSH|')
  })

  test('patient cannot access claims', async ({ page }) => {
    await login(page, 'patient@cityhospital.com', 'patient123')
    await page.goto('/claims')
    await expect(page).toHaveURL('/')
  })
})
