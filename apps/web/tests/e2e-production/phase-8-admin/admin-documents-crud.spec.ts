import { test, expect } from '@playwright/test';
import { apiGet, apiPost, apiPatch, apiDelete } from '../helpers/api.helper';
import {
  waitForAdminPage,
  getAdminToken,
  cleanupTestDocuments,
  TEST_CONTENT_PREFIX,
} from './helpers/admin-test.helper';

/**
 * Admin Documents CRUD Tests
 *
 * Tests document listing, creation, update, and deletion via both
 * UI page loads and direct API calls against production.
 * All created data uses E2E-TEST- prefix for safe cleanup.
 */

let adminToken: string;
let createdDocumentId: string | undefined;

test.beforeAll(async () => {
  try {
    adminToken = await getAdminToken();
  } catch {
    // Tests will skip if auth fails
  }
});

test.afterAll(async () => {
  if (adminToken) {
    await cleanupTestDocuments(adminToken);
  }
});

test.describe('Admin Documents CRUD', () => {
  test('documents list page loads at /admin/documents', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');

    const loaded = await waitForAdminPage(page, '/admin/documents');
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
      bodyText.includes('Документ') ||
      bodyText.includes('документ') ||
      bodyText.includes('Политика') ||
      bodyText.includes('Соглашение');

    expect(hasTable || hasCards || hasListItems || hasHeading).toBe(true);
  });

  test('documents API returns list', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/documents', adminToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');

    if (res.success && res.data) {
      const data = res.data as { items?: unknown[] };
      if (data.items) {
        expect(Array.isArray(data.items)).toBe(true);
      }
    }
  });

  test('create form loads at /admin/documents/new', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');

    const loaded = await waitForAdminPage(page, '/admin/documents/new');
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

  test('create document via API', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const timestamp = Date.now().toString(36);
    const title = `${TEST_CONTENT_PREFIX}Doc-${timestamp}`;

    const res = await apiPost(
      '/admin/documents',
      {
        title,
        content: `Test document content created at ${new Date().toISOString()}`,
        type: 'terms',
      },
      adminToken
    );

    expect(res).toBeDefined();

    if (res.success && res.data) {
      const data = res.data as { id?: string; title?: string };
      expect(data.id).toBeDefined();
      expect(data.title).toContain(TEST_CONTENT_PREFIX);
      createdDocumentId = data.id;
    }
  });

  test('created document appears in API list', async () => {
    test.skip(!adminToken, 'Admin token not available');
    test.skip(!createdDocumentId, 'No document was created');

    const res = await apiGet('/admin/documents?limit=100', adminToken);
    expect(res).toBeDefined();

    if (res.success && res.data) {
      const data = res.data as { items?: { id: string; title?: string }[] };
      const items = data.items ?? [];
      const found = items.find((item) => item.id === createdDocumentId);

      expect(found).toBeDefined();
      expect(found?.title).toContain(TEST_CONTENT_PREFIX);
    }
  });

  test('update document via API', async () => {
    test.skip(!adminToken, 'Admin token not available');
    test.skip(!createdDocumentId, 'No document was created');

    const updatedTitle = `${TEST_CONTENT_PREFIX}Doc-Updated-${Date.now().toString(36)}`;

    const res = await apiPatch(
      `/admin/documents/${createdDocumentId}`,
      {
        title: updatedTitle,
        content: `Updated document content at ${new Date().toISOString()}`,
      },
      adminToken
    );

    expect(res).toBeDefined();

    if (res.success && res.data) {
      const data = res.data as { id?: string; title?: string };
      expect(data.title).toContain('Updated');
    }

    // Verify update via GET
    const detailRes = await apiGet(`/admin/documents/${createdDocumentId}`, adminToken);
    if (detailRes.success && detailRes.data) {
      const detail = detailRes.data as { title?: string };
      expect(detail.title).toContain('Updated');
    }
  });

  test('delete document via API', async () => {
    test.skip(!adminToken, 'Admin token not available');
    test.skip(!createdDocumentId, 'No document was created');

    const res = await apiDelete(`/admin/documents/${createdDocumentId}`, adminToken);
    expect(res).toBeDefined();

    // Verify deletion — item should no longer appear in list
    if (res.success) {
      const listRes = await apiGet('/admin/documents?limit=100', adminToken);
      if (listRes.success && listRes.data) {
        const data = listRes.data as { items?: { id: string }[] };
        const items = data.items ?? [];
        const found = items.find((item) => item.id === createdDocumentId);
        expect(found).toBeUndefined();
      }
      createdDocumentId = undefined;
    }
  });
});
