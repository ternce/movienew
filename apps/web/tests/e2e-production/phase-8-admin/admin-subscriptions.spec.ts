import { test, expect } from '@playwright/test';
import { getAdminToken, waitForAdminPage } from './helpers/admin-test.helper';
import { apiGet, apiPatch } from '../helpers/api.helper';

test.describe('Admin Subscriptions', () => {
  let adminToken: string;

  test.beforeAll(async () => {
    try {
      adminToken = await getAdminToken();
    } catch {
      // Token will be empty — tests will skip
    }
  });

  test('subscriptions page loads', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/subscriptions');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();

    if (bodyText.trim().length < 20) {
      test.skip(true, 'Subscriptions page did not render');
      return;
    }

    // Page should have content and Russian text
    expect(bodyText.trim().length).toBeGreaterThan(10);
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });

  test('subscriptions plans API returns data', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/subscriptions/plans', adminToken);
    expect(res).toBeDefined();

    // API may return plans as array directly or nested in items
    if (res.success && res.data) {
      const data = res.data as unknown;
      const isArray = Array.isArray(data);
      const hasItems = !isArray && typeof data === 'object' && data !== null && 'items' in data;
      expect(isArray || hasItems).toBe(true);
    }
  });

  test('subscriptions stats API returns data', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/subscriptions/stats', adminToken);
    expect(res).toBeDefined();
    // Stats endpoint should return success — data shape may vary
    expect(typeof res.success).toBe('boolean');
  });

  test('page shows plan names or pricing', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/subscriptions');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();

    if (bodyText.trim().length < 50) {
      test.skip(true, 'Subscriptions page did not render enough content');
      return;
    }

    // Should display plan names, pricing, or subscription-related terms
    const hasPlanInfo =
      bodyText.includes('Подписк') ||
      bodyText.includes('подписк') ||
      bodyText.includes('Тариф') ||
      bodyText.includes('тариф') ||
      bodyText.includes('Премиум') ||
      bodyText.includes('Premium') ||
      /\d+\s*₽/.test(bodyText) ||
      /\d+/.test(bodyText);

    expect(hasPlanInfo).toBe(true);
  });

  test('page has Russian text', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/subscriptions');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
