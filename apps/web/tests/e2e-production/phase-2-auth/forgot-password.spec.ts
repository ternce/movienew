import { test, expect } from '@playwright/test';
import { expectRussianText } from '../helpers/assertions.helper';

/**
 * Phase 2 — Forgot Password
 *
 * Verifies the /forgot-password page loads, shows the email form,
 * handles submission gracefully, and has proper navigation.
 *
 * No auth required — uses default Chrome context from auth phase config.
 */

test.describe('Forgot Password', () => {
  test('forgot password page loads at /forgot-password', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Should stay on forgot-password page (not redirect)
    const url = page.url();
    expect(url).toContain('forgot-password');

    // Page should render content
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(30);
  });

  test('forgot password page has email input field', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Should have an email input (by name, type, or id)
    const emailInput = page.locator(
      'input[name="email"], input[type="email"], input#email'
    ).first();
    const hasEmailInput = await emailInput.isVisible().catch(() => false);
    expect(hasEmailInput).toBe(true);
  });

  test('forgot password page has submit button', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Should have a submit button
    const submitButton = page.locator('button[type="submit"]');
    const hasSubmit = await submitButton.isVisible().catch(() => false);
    expect(hasSubmit).toBe(true);

    // Button text should be in Russian
    if (hasSubmit) {
      const buttonText = await submitButton.innerText();
      const hasCyrillic = /[\u0400-\u04FF]/.test(buttonText);
      expect(hasCyrillic).toBe(true);
    }
  });

  test('submitting with random email shows confirmation or stays on page (no crash)', async ({
    page,
  }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Fill with a random email that doesn't exist
    const randomEmail = `test-${Date.now()}@nonexistent-domain.com`;
    const emailInput = page.locator(
      'input[name="email"], input[type="email"], input#email'
    ).first();
    await emailInput.fill(randomEmail);

    // Submit the form
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(5000);

    // Should not crash — either shows success/confirmation or stays on page
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);

    // Check for success message, or still on forgot-password page, or toast
    const showsConfirmation =
      bodyText.includes('Проверьте почту') ||
      bodyText.includes('отправлен') ||
      bodyText.includes('Инструкции') ||
      bodyText.includes('инструкции') ||
      bodyText.includes('сброс');

    const stayedOnPage = page.url().includes('forgot-password');

    // Either got a confirmation or stayed on the page without crash
    expect(showsConfirmation || stayedOnPage).toBe(true);
  });

  test('forgot password page has Russian text', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await expectRussianText(page);

    // Check for expected Russian headings
    const bodyText = await page.locator('body').innerText();
    const hasExpectedText =
      bodyText.includes('Забыли пароль') ||
      bodyText.includes('забыли пароль') ||
      bodyText.includes('Восстановление') ||
      bodyText.includes('восстановление') ||
      bodyText.includes('Сброс пароля') ||
      bodyText.includes('сброс пароля');

    expect(hasExpectedText).toBe(true);
  });

  test('forgot password page has link back to /login', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Look for a link back to login
    const loginLink = page.locator('a[href="/login"], a[href*="/login"]').first();
    const hasLoginLink = await loginLink.isVisible().catch(() => false);

    // Or look for Russian text about going back to login
    const bodyText = await page.locator('body').innerText();
    const hasLoginText =
      bodyText.includes('Вернуться к входу') ||
      bodyText.includes('Вернуться') ||
      bodyText.includes('Войти') ||
      bodyText.includes('входу');

    expect(hasLoginLink || hasLoginText).toBe(true);
  });
});
