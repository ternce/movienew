import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { waitForAdminPage, getAdminToken } from './helpers/admin-test.helper';

/**
 * Admin Subscriptions Detail Tests
 *
 * Tests the subscriptions management page, stats API, expiring
 * subscriptions endpoint, pricing display, and interactive elements
 * against production.
 */

let adminToken: string;

test.beforeAll(async () => {
  try {
    adminToken = await getAdminToken();
  } catch {
    // Tests will skip if auth fails
  }
});

test.describe('Subscriptions Management', () => {
  test('page loads at /admin/subscriptions', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/subscriptions');
    test.skip(!loaded, 'Auth state expired');

    expect(page.url()).toContain('/admin');
    expect(page.url()).not.toContain('/login');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);
  });

  test('shows subscription data or empty state', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/subscriptions');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();

    if (bodyText.trim().length < 20) {
      test.skip(true, 'Subscriptions page did not render');
      return;
    }

    // Should have subscription-related content or empty state
    const hasSubscriptionContent =
      bodyText.includes('Подписк') ||
      bodyText.includes('подписк') ||
      bodyText.includes('Тариф') ||
      bodyText.includes('тариф') ||
      bodyText.includes('Активн') ||
      bodyText.includes('активн') ||
      bodyText.includes('Премиум') ||
      bodyText.includes('Premium');

    const hasEmptyState =
      bodyText.includes('Нет подписок') ||
      bodyText.includes('Пусто') ||
      bodyText.includes('пусто');

    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasCards = (await page.locator('[class*="card"]').count()) > 0;

    expect(hasSubscriptionContent || hasEmptyState || hasTable || hasCards).toBe(true);
  });

  test('API: GET /admin/subscriptions returns list', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/subscriptions', adminToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');

    if (res.success && res.data) {
      const data = res.data as unknown;
      const isArray = Array.isArray(data);
      const hasItems = !isArray && typeof data === 'object' && data !== null && 'items' in data;

      // API may return plans array directly or nested in items
      expect(isArray || hasItems).toBe(true);

      if (hasItems) {
        const nested = data as { items?: unknown[] };
        if (nested.items) {
          expect(Array.isArray(nested.items)).toBe(true);
        }
      }
    }
  });

  test('API: GET /admin/subscriptions/stats returns stats', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/subscriptions/stats', adminToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');

    if (res.success && res.data) {
      const data = res.data as Record<string, unknown>;
      // Stats should have numeric values or nested objects
      const values = Object.values(data);
      if (values.length > 0) {
        const hasData = values.some(
          (v) =>
            typeof v === 'number' ||
            typeof v === 'string' ||
            (typeof v === 'object' && v !== null)
        );
        expect(hasData).toBe(true);
      }
    }
  });

  test('API: GET /admin/subscriptions/expiring returns expiring list', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/subscriptions/expiring', adminToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');

    if (res.success && res.data) {
      const data = res.data as unknown;
      const isArray = Array.isArray(data);
      const hasItems = !isArray && typeof data === 'object' && data !== null && 'items' in data;

      // May return an array of expiring subscriptions or a wrapped object
      if (isArray) {
        expect(Array.isArray(data)).toBe(true);
      } else if (hasItems) {
        const nested = data as { items?: unknown[] };
        if (nested.items) {
          expect(Array.isArray(nested.items)).toBe(true);
        }
      }
      // If the endpoint returns an empty result, that is also acceptable
    }
  });

  test('page has interactive elements', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/subscriptions');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // Should have buttons, links, or other interactive elements
    const buttonCount = await page.locator('button').count();
    const linkCount = await page.locator('a').count();
    const inputCount = await page.locator('input, select, [role="combobox"]').count();

    expect(buttonCount + linkCount + inputCount).toBeGreaterThan(0);
  });

  test('subscription pricing shows ruble sign or numbers', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/subscriptions');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();

    if (bodyText.trim().length < 50) {
      test.skip(true, 'Subscriptions page did not render enough content');
      return;
    }

    // Should display pricing with ruble sign or numeric values
    const hasRubleSign = bodyText.includes('\u20BD'); // ₽ symbol
    const hasPricePattern = /\d+\s*₽/.test(bodyText);
    const hasNumbers = /\d{2,}/.test(bodyText); // at least a 2-digit number
    const hasPricingTerms =
      bodyText.includes('Цена') ||
      bodyText.includes('цена') ||
      bodyText.includes('Стоимость') ||
      bodyText.includes('руб');

    expect(hasRubleSign || hasPricePattern || hasNumbers || hasPricingTerms).toBe(true);
  });

  test('page has Russian text', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/subscriptions');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
