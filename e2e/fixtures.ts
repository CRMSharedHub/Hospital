import { test as base, type Page, expect } from '@playwright/test'

export interface DemoUser {
  email: string
  password: string
  role: string
}

export const DEMO_USERS: DemoUser[] = [
  { email: 'admin@cityhospital.com', password: 'admin123', role: 'admin' },
  { email: 'doctor@cityhospital.com', password: 'doctor123', role: 'doctor' },
  { email: 'nurse@cityhospital.com', password: 'nurse123', role: 'nurse' },
  { email: 'patient@cityhospital.com', password: 'patient123', role: 'patient' },
]

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  await page.waitForURL((url) => !url.pathname.includes('/login'))
}

export async function quickLogin(page: Page, role: string) {
  await page.goto('/login')
  const user = DEMO_USERS.find((u) => u.role === role)
  if (!user) throw new Error(`Unknown role: ${role}`)
  await page.getByText(user.email, { exact: false }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'))
}

export async function logout(page: Page) {
  await page.goto('/settings')
  await page.getByRole('button', { name: /logout|تسجيل الخروج/ }).click()
  await page.waitForURL('**/login')
}

/** Select a non-empty option in a labeled <select>, waiting for options to load.
 * Avoids Header facility filter which is often the first <select> on the page. */
export async function selectLabeledOption(
  page: Page,
  labelPattern: RegExp,
  optionIndex = 1,
) {
  const select = page.locator('label').filter({ hasText: labelPattern }).locator('select')
  await expect(select).toBeVisible({ timeout: 15_000 })
  await expect
    .poll(async () => select.locator('option').count(), { timeout: 15_000 })
    .toBeGreaterThan(optionIndex)
  await select.selectOption({ index: optionIndex })
}

export const test = base.extend<{
  authPage: Page
}>({
  authPage: async ({ page }, use) => {
    await use(page)
    await logout(page).catch(() => { })
  },
})

export { expect }
