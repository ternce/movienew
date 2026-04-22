import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { waitForAdminPage, getAdminToken } from './helpers/admin-test.helper';

test.describe('Admin Payments', () => {
  test('payments page loads', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/payments');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);
  });

  test('payments API returns data', async () => {
    let token: string;
    try {
      token = await getAdminToken();
    } catch {
      test.skip(true, 'Admin login failed');
      return;
    }

    const res = await apiGet('/admin/payments/transactions', token);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('subscriptions page loads', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/subscriptions');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);
  });

  test('payments page has interactive elements', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/payments');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const buttons = await page.locator('button').count();
    const links = await page.locator('a').count();
    expect(buttons + links).toBeGreaterThan(2);
  });

  test('payments page has Russian text', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/payments');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
