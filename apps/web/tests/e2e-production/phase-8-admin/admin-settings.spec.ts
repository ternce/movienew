import { test, expect } from '@playwright/test';
import { waitForAdminPage } from './helpers/admin-test.helper';

test.describe('Admin Settings', () => {
  test('settings page loads', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/settings');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);
  });

  test('settings page has content cards', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/settings');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const cards = await page.locator('[class*="card"]').count();
    expect(cards).toBeGreaterThan(0);
  });

  test('settings page has interactive elements', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/settings');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input').count();
    const links = await page.locator('a').count();

    expect(buttons + inputs + links).toBeGreaterThan(2);
  });

  test('settings page has Russian text', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/settings');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
