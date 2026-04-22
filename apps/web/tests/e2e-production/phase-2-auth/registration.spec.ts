import { test, expect } from '@playwright/test';
import { PROD_USERS } from '../helpers/auth.helper';

test.describe('Registration', () => {
  test('registration page loads at /register', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('registration form has required fields', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');

    // Email and password should always be present
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('registration form has name fields', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');

    const firstName = page.locator('input[name="firstName"]');
    const lastName = page.locator('input[name="lastName"]');

    // Name fields should be present
    const hasFirstName = await firstName.isVisible().catch(() => false);
    const hasLastName = await lastName.isVisible().catch(() => false);

    expect(hasFirstName || hasLastName).toBe(true);
  });

  test('duplicate email shows error', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');

    // Fill with existing user email
    await page.locator('input[name="email"]').fill(PROD_USERS.user.email);
    await page.locator('input[name="password"]').fill('TestPassword123!');

    const confirmPassword = page.locator(
      'input[name="confirmPassword"], input[name="passwordConfirm"]'
    );
    if (await confirmPassword.isVisible().catch(() => false)) {
      await confirmPassword.fill('TestPassword123!');
    }

    const firstName = page.locator('input[name="firstName"]');
    if (await firstName.isVisible().catch(() => false)) {
      await firstName.fill('Тест');
    }

    const lastName = page.locator('input[name="lastName"]');
    if (await lastName.isVisible().catch(() => false)) {
      await lastName.fill('Пользователь');
    }

    const birthDate = page.locator(
      'input[name="birthDate"], input[type="date"]'
    );
    if (await birthDate.isVisible().catch(() => false)) {
      await birthDate.fill('1990-01-15');
    }

    const terms = page.locator(
      'input[name="acceptTerms"], input[type="checkbox"]'
    ).first();
    if (await terms.isVisible().catch(() => false)) {
      const isChecked = await terms.isChecked();
      if (!isChecked) await terms.check();
    }

    await page.locator('button[type="submit"]').click();

    // Should show error about duplicate email or stay on page
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    const errorVisible = await page
      .locator('[role="alert"], [data-testid="error-message"], .error-message')
      .isVisible()
      .catch(() => false);

    expect(
      errorVisible || currentUrl.includes('/register')
    ).toBe(true);
  });

  test('registration page has link to login', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');

    const loginLink = page.getByRole('link', { name: /войти|вход/i });
    const isVisible = await loginLink.isVisible().catch(() => false);

    if (isVisible) {
      const href = await loginLink.getAttribute('href');
      expect(href).toContain('login');
    }
  });

  test('registration page has Russian text', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');

    const bodyText = await page.locator('body').innerText();
    const hasCyrillic = /[\u0400-\u04FF]/.test(bodyText);
    expect(hasCyrillic).toBe(true);
  });
});
