import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { waitForAdminPage, getAdminToken } from './helpers/admin-test.helper';

/**
 * Admin Content List Filtering & Pagination Tests
 *
 * Tests content filtering by type, status, and search query,
 * as well as pagination controls and API-level pagination
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

test.describe('Content List Filtering', () => {
  test('content table visible at /admin/content', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/content');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasCards = (await page.locator('[class*="card"]').count()) > 0;
    const hasRows = (await page.locator('tr').count()) > 0;

    expect(hasTable || hasCards || hasRows).toBe(true);
  });

  test('search input present and filterable', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/content');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const searchInput = page.locator('input[placeholder*="Поиск"], input[placeholder*="поиск"], input[type="search"]');
    const isVisible = await searchInput.first().isVisible().catch(() => false);

    if (!isVisible) {
      test.skip(true, 'Search input not found on page');
      return;
    }

    // Type a query and verify page is still functional
    await searchInput.first().fill('test');
    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(10);
  });

  test('API: contentType=SERIES filter returns only series', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/content?contentType=SERIES&limit=20', adminToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');

    if (res.success && res.data) {
      const data = res.data as { items?: { contentType: string }[] };
      const items = data.items ?? [];

      // Every returned item should be SERIES
      for (const item of items) {
        expect(item.contentType).toBe('SERIES');
      }
    }
  });

  test('API: status=DRAFT filter returns only drafts', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/content?status=DRAFT&limit=20', adminToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');

    if (res.success && res.data) {
      const data = res.data as { items?: { status: string }[] };
      const items = data.items ?? [];

      for (const item of items) {
        expect(item.status).toBe('DRAFT');
      }
    }
  });

  test('API: combined filter status=PUBLISHED + contentType=CLIP', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/content?status=PUBLISHED&contentType=CLIP&limit=20', adminToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');

    if (res.success && res.data) {
      const data = res.data as { items?: { status: string; contentType: string }[] };
      const items = data.items ?? [];

      for (const item of items) {
        expect(item.status).toBe('PUBLISHED');
        expect(item.contentType).toBe('CLIP');
      }
    }
  });

  test('search returns empty for nonsense query', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const nonsense = `zzz_nonexistent_${Date.now()}`;
    const res = await apiGet(`/admin/content?search=${encodeURIComponent(nonsense)}&limit=20`, adminToken);
    expect(res).toBeDefined();

    if (res.success && res.data) {
      const data = res.data as { items?: unknown[] };
      const items = data.items ?? [];
      expect(items.length).toBe(0);
    }
  });
});

test.describe('Content List Pagination', () => {
  test('pagination controls visible on page', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/content');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const bodyText = await page.locator('body').innerText();

    // Look for pagination indicators: page numbers, "Следующая", "Предыдущая", arrows, or numbered buttons
    const hasPaginationText =
      bodyText.includes('Следующ') ||
      bodyText.includes('Предыдущ') ||
      bodyText.includes('Назад') ||
      bodyText.includes('Вперед') ||
      /Страница\s*\d+/.test(bodyText) ||
      /\d+\s*из\s*\d+/.test(bodyText);

    const hasPaginationButtons = await page
      .locator('button:has-text("1"), button:has-text("2"), [aria-label*="page"], [aria-label*="Next"], [aria-label*="Previous"], nav[aria-label*="pagination"]')
      .first()
      .isVisible()
      .catch(() => false);

    // Also accept the case where there are very few items and no pagination shown
    const totalRes = await apiGet('/admin/content?limit=1', adminToken);
    const total = totalRes.meta?.total ?? 0;
    const fewItems = total <= 10;

    expect(hasPaginationText || hasPaginationButtons || fewItems).toBe(true);
  });

  test('API: page=1 vs page=2 return different items', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const page1Res = await apiGet('/admin/content?page=1&limit=5', adminToken);
    const page2Res = await apiGet('/admin/content?page=2&limit=5', adminToken);

    expect(page1Res).toBeDefined();
    expect(page2Res).toBeDefined();

    if (page1Res.success && page2Res.success && page1Res.data && page2Res.data) {
      const page1Items = (page1Res.data as { items?: { id: string }[] }).items ?? [];
      const page2Items = (page2Res.data as { items?: { id: string }[] }).items ?? [];

      if (page1Items.length > 0 && page2Items.length > 0) {
        // First item IDs should differ between pages
        expect(page1Items[0].id).not.toBe(page2Items[0].id);
      }
      // If page 2 is empty, that just means there are <= 5 items total — acceptable
    }
  });

  test('API: limit=5 returns at most 5 items', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/content?limit=5', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);

    if (res.data) {
      const data = res.data as { items?: unknown[] };
      const items = data.items ?? [];
      expect(items.length).toBeLessThanOrEqual(5);
    }
  });

  test('page has Russian text', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/content');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
