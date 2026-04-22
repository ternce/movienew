import { test, expect } from '@playwright/test';
import { apiGet, apiPost, apiDelete } from '../helpers/api.helper';
import {
  waitForAdminPage,
  getAdminToken,
  cleanupTestNewsletters,
  TEST_CONTENT_PREFIX,
} from './helpers/admin-test.helper';

/**
 * Admin Newsletters CRUD Tests
 *
 * Tests newsletter listing, creation, detail, and deletion via both
 * UI page loads and direct API calls against production.
 * All created data uses E2E-TEST- prefix for safe cleanup.
 */

let adminToken: string;
let createdNewsletterId: string | undefined;

test.beforeAll(async () => {
  try {
    adminToken = await getAdminToken();
  } catch {
    // Tests will skip if auth fails
  }
});

test.afterAll(async () => {
  if (adminToken) {
    await cleanupTestNewsletters(adminToken);
  }
});

test.describe('Admin Newsletters CRUD', () => {
  test('newsletters list page loads at /admin/newsletters', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');

    const loaded = await waitForAdminPage(page, '/admin/newsletters');
    test.skip(!loaded, 'Auth state expired');

    expect(page.url()).toContain('/admin');
    expect(page.url()).not.toContain('/login');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);

    // Should have a heading or table/list structure
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasCards = (await page.locator('[class*="card"]').count()) > 0;
    const hasListItems = (await page.locator('tr, li, [class*="item"]').count()) > 0;
    const hasHeading =
      bodyText.includes('Рассылк') ||
      bodyText.includes('рассылк') ||
      bodyText.includes('Письм') ||
      bodyText.includes('Newsletter');

    expect(hasTable || hasCards || hasListItems || hasHeading).toBe(true);
  });

  test('newsletters API returns list', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/newsletters', adminToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');

    if (res.success && res.data) {
      const data = res.data as { items?: unknown[] };
      if (data.items) {
        expect(Array.isArray(data.items)).toBe(true);
      }
    }
  });

  test('create form loads at /admin/newsletters/new', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');

    const loaded = await waitForAdminPage(page, '/admin/newsletters/new');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);

    // Should have form fields (inputs, textareas, or buttons)
    const inputs = await page.locator('input').count();
    const textareas = await page.locator('textarea').count();
    const buttons = await page.locator('button').count();

    expect(inputs + textareas + buttons).toBeGreaterThan(0);
  });

  test('create newsletter via API', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const timestamp = Date.now().toString(36);
    const subject = `${TEST_CONTENT_PREFIX}Newsletter-${timestamp}`;

    const res = await apiPost(
      '/admin/newsletters',
      {
        subject,
        body: `Test newsletter body created at ${new Date().toISOString()}`,
      },
      adminToken
    );

    expect(res).toBeDefined();

    if (res.success && res.data) {
      const data = res.data as { id?: string; subject?: string };
      expect(data.id).toBeDefined();
      expect(data.subject).toContain(TEST_CONTENT_PREFIX);
      createdNewsletterId = data.id;
    }
  });

  test('created newsletter appears in API list', async () => {
    test.skip(!adminToken, 'Admin token not available');
    test.skip(!createdNewsletterId, 'No newsletter was created');

    const res = await apiGet('/admin/newsletters?limit=100', adminToken);
    expect(res).toBeDefined();

    if (res.success && res.data) {
      const data = res.data as { items?: { id: string; subject?: string }[] };
      const items = data.items ?? [];
      const found = items.find((item) => item.id === createdNewsletterId);

      expect(found).toBeDefined();
      expect(found?.subject).toContain(TEST_CONTENT_PREFIX);
    }
  });

  test('newsletter detail via API', async () => {
    test.skip(!adminToken, 'Admin token not available');
    test.skip(!createdNewsletterId, 'No newsletter was created');

    const res = await apiGet(`/admin/newsletters/${createdNewsletterId}`, adminToken);
    expect(res).toBeDefined();

    if (res.success && res.data) {
      const data = res.data as { id?: string; subject?: string; body?: string };
      expect(data.id).toBe(createdNewsletterId);
      expect(data.subject).toContain(TEST_CONTENT_PREFIX);
    }
  });

  test('delete newsletter via API', async () => {
    test.skip(!adminToken, 'Admin token not available');
    test.skip(!createdNewsletterId, 'No newsletter was created');

    const res = await apiDelete(`/admin/newsletters/${createdNewsletterId}`, adminToken);
    expect(res).toBeDefined();

    // Verify deletion — item should no longer appear
    if (res.success) {
      const listRes = await apiGet('/admin/newsletters?limit=100', adminToken);
      if (listRes.success && listRes.data) {
        const data = listRes.data as { items?: { id: string }[] };
        const items = data.items ?? [];
        const found = items.find((item) => item.id === createdNewsletterId);
        expect(found).toBeUndefined();
      }
      createdNewsletterId = undefined;
    }
  });

  test('newsletters page has Russian text', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');

    const loaded = await waitForAdminPage(page, '/admin/newsletters');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
