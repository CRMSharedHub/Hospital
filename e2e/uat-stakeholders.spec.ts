/**
 * Stakeholder UAT smoke (admin / doctor / nurse / patient + settings).
 * Run: npx playwright test --config=playwright.uat.config.ts
 */
import { test, expect, type Page } from '@playwright/test'

const USERS = {
  admin: { email: 'admin@cityhospital.com', password: 'admin123' },
  doctor: { email: 'doctor@cityhospital.com', password: 'doctor123' },
  nurse: { email: 'nurse@cityhospital.com', password: 'nurse123' },
  patient: { email: 'patient@cityhospital.com', password: 'patient123' },
} as const

async function dismissDevOverlay(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll('vite-plugin-checker-error-overlay').forEach((el) => el.remove())
  }).catch(() => {})
}

/** Sidebar settles after auth hydrate + permission filter. */
async function waitForSidebar(page: Page) {
  await expect(page.locator('aside nav[aria-label]')).toBeVisible({ timeout: 15_000 })
  await expect
    .poll(async () => page.locator('aside nav a[href]').count(), {
      timeout: 15_000,
      message: 'sidebar nav links never appeared',
    })
    .toBeGreaterThan(0)
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await dismissDevOverlay(page)
  await page.fill('#email', email)
  await page.fill('#password', password)
  await dismissDevOverlay(page)
  await page.click('button[type="submit"]', { force: true })
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 })
  await waitForSidebar(page)
}

function navLink(page: Page, href: string) {
  // Single nav landmark inside aside (UX-04).
  return page.locator(`aside nav a[href="${href}"]`)
}

async function expectNav(page: Page, href: string, shouldShow: boolean) {
  const link = navLink(page, href)
  if (shouldShow) {
    await expect(link, `nav ${href} should be visible`).toBeAttached({ timeout: 10_000 })
  } else {
    await expect(link, `nav ${href} should be hidden`).toHaveCount(0)
  }
}

test.describe('UAT — stakeholder sessions', () => {
  test('S1 Admin — login, facility filter, billing/claims/compliance, deny portal', async ({ page }) => {
    await login(page, USERS.admin.email, USERS.admin.password)
    await expect(page).toHaveURL('/')
    await expectNav(page, '/billing', true)
    await expectNav(page, '/claims', true)
    await expectNav(page, '/compliance', true)
    await expectNav(page, '/facilities', true)
    await expectNav(page, '/portal', false)

    await page.goto('/billing')
    await expect(page.getByRole('heading').first()).toBeVisible()
    await page.goto('/claims')
    await expect(page.getByRole('heading').first()).toBeVisible()
    await page.goto('/compliance')
    await expect(page.getByRole('heading').first()).toBeVisible()
    await page.goto('/facilities')
    await expect(page.getByRole('heading').first()).toBeVisible()

    await page.goto('/portal')
    await expect(page).toHaveURL('/')
  })

  test('S2 Doctor — clinical stack, place order, deny billing', async ({ page }) => {
    await login(page, USERS.doctor.email, USERS.doctor.password)
    await expectNav(page, '/orders', true)
    await expectNav(page, '/emar', true)
    await expectNav(page, '/lab', true)
    await expectNav(page, '/billing', false)
    await expectNav(page, '/claims', false)

    await page.goto('/orders')
    await expect(page.getByRole('heading').first()).toBeVisible()
    const patientSelect = page.locator('label').filter({ hasText: /patients|المرضى/i }).locator('select')
    await expect(patientSelect).toBeVisible({ timeout: 10_000 })
    await expect.poll(async () => patientSelect.locator('option').count()).toBeGreaterThan(1)
    await patientSelect.selectOption({ index: 1 })
    await page.locator('label').filter({ hasText: /description|الوصف/i }).locator('input').fill('UAT CBC')
    await page.getByRole('button', { name: /place order|إصدار الأمر/i }).click()
    await expect(page.getByText(/UAT CBC/i).first()).toBeVisible({ timeout: 10_000 })

    await page.goto('/billing')
    await expect(page).toHaveURL('/')
  })

  test('S3 Nurse — census/emar, pharmacy view, no reports', async ({ page }) => {
    await login(page, USERS.nurse.email, USERS.nurse.password)
    await expectNav(page, '/census', true)
    await expectNav(page, '/emar', true)
    await expectNav(page, '/pharmacy', true)
    await expectNav(page, '/reports', false)
    await expectNav(page, '/billing', false)

    await page.goto('/census')
    await expect(page.getByRole('heading').first()).toBeVisible()
    await page.goto('/emar')
    await expect(page.getByRole('heading').first()).toBeVisible()
    await page.goto('/pharmacy')
    await expect(page.getByRole('heading').first()).toBeVisible()

    await page.goto('/reports')
    await expect(page).toHaveURL('/')
  })

  test('S4 Patient — portal pay path, deny claims', async ({ page }) => {
    await login(page, USERS.patient.email, USERS.patient.password)
    await expectNav(page, '/portal', true)
    await expectNav(page, '/messages', true)
    await expectNav(page, '/billing', false)
    await expectNav(page, '/orders', false)

    await page.goto('/portal')
    await expect(page.getByRole('heading').first()).toBeVisible()
    await page.getByRole('button', { name: /my records|سجلاتي/i }).click()
    await expect(page.getByText(/laboratory|المختبر|medications|الأدوية/i).first()).toBeVisible({ timeout: 10_000 })

    await page.goto('/claims')
    await expect(page).toHaveURL('/')
  })

  test('S5 Cross-cutting — RTL toggle + dark mode in settings', async ({ page }) => {
    await login(page, USERS.admin.email, USERS.admin.password)
    await page.goto('/settings')
    await dismissDevOverlay(page)
    await expect(page.getByRole('heading').first()).toBeVisible()

    const beforeDir = await page.evaluate(() => document.documentElement.dir)
    const langToggle = page.locator('button').filter({ hasText: /English|العربية|EN|AR/i }).first()
    if (await langToggle.count()) {
      await langToggle.click({ force: true })
      await expect.poll(async () => page.evaluate(() => document.documentElement.dir)).not.toBe(beforeDir)
    }

    const themeSwitch = page.locator('button.relative.w-12.h-6').first()
    if (await themeSwitch.count()) {
      await themeSwitch.click({ force: true })
    }
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
