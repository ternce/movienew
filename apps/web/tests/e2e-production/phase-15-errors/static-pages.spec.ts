import { test, expect } from '@playwright/test';
import { expectRussianText } from '../helpers/assertions.helper';

/**
 * Phase 15 — Static / Public Pages
 *
 * Verifies that key public pages load without authentication
 * and display content. These pages should be accessible to everyone.
 *
 * NO auth required — uses default Chrome context (no storageState).
 */

test.describe('Static Public Pages', () => {
  test('/about page loads and has content', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Should not redirect to login
    const url = page.url();
    expect(url).not.toContain('/login');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);

    // Should have Russian content
    const hasCyrillic = /[\u0400-\u04FF]/.test(bodyText);
    expect(hasCyrillic).toBe(true);
  });

  test('/support page loads and has content', async ({ page }) => {
    await page.goto('/support');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Should not redirect to login
    const url = page.url();
    expect(url).not.toContain('/login');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);

    // Should have Russian content
    const hasCyrillic = /[\u0400-\u04FF]/.test(bodyText);
    expect(hasCyrillic).toBe(true);
  });

  test('/pricing page loads without auth', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Should not redirect to login — pricing is public
    const url = page.url();
    expect(url).not.toContain('/login');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(30);

    // Check for pricing-related Russian text
    const hasPricingContent =
      bodyText.includes('Подписка') ||
      bodyText.includes('подписка') ||
      bodyText.includes('Тариф') ||
      bodyText.includes('тариф') ||
      bodyText.includes('руб') ||
      bodyText.includes('Бесплатно') ||
      /[\u0400-\u04FF]/.test(bodyText);

    expect(hasPricingContent).toBe(true);
  });

  test('landing page (/) has visible content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Should not redirect to login
    const url = page.url();
    const redirectedToLogin = url.includes('/login');
    expect(redirectedToLogin).toBe(false);

    // Landing page should have substantial content
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);

    // Page should not show a server error
    const title = await page.title();
    expect(title).not.toContain('500');
  });

  test('/login page loads with form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Should have login form elements
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();

    const submitButton = page.locator('button[type="submit"]');
    const hasSubmit = await submitButton.isVisible().catch(() => false);
    expect(hasSubmit).toBe(true);

    // Should have Russian text
    await expectRussianText(page);
  });
});
