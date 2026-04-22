import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test('settings page loads at /account/settings', async ({ page }) => {
    await page.goto('/account/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    expect(page.url()).toContain('/account');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('settings page has content sections', async ({ page }) => {
    await page.goto('/account/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    const bodyText = await page.locator('body').innerText();

    const hasContent =
      bodyText.includes('Уведомления') ||
      bodyText.includes('уведомлени') ||
      bodyText.includes('Email') ||
      bodyText.includes('Пароль') ||
      bodyText.includes('пароль') ||
      bodyText.includes('Настройки') ||
      bodyText.includes('Безопасность');

    expect(hasContent).toBe(true);
  });

  test('settings page has form elements', async ({ page }) => {
    await page.goto('/account/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    // Check for interactive elements (toggles, inputs, buttons)
    const inputs = page.locator('input, button[role="switch"], [role="checkbox"]');
    const count = await inputs.count();
    // Settings page should have at least some interactive elements
    expect(count).toBeGreaterThan(0);
  });

  test('settings page has Russian text', async ({ page }) => {
    await page.goto('/account/settings');
    await page.waitForLoadState('domcontentloaded');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
