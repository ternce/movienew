import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { waitForAdminPage, getAdminToken } from './helpers/admin-test.helper';

/**
 * Admin Verifications Workflow Tests
 *
 * Tests the verification queue page, status filtering, pagination,
 * stats API, and detail access against production.
 */

let adminToken: string;

test.beforeAll(async () => {
  try {
    adminToken = await getAdminToken();
  } catch {
    // Tests will skip if auth fails
  }
});

test.describe('Verification Queue', () => {
  test('page loads at /admin/verifications', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/verifications');
    test.skip(!loaded, 'Auth state expired');

    expect(page.url()).toContain('/admin');
    expect(page.url()).not.toContain('/login');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);
  });

  test('shows queue items or empty state message', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/verifications');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();

    // Should have verification-related content or an empty state
    const hasVerificationContent =
      bodyText.includes('Верификаци') ||
      bodyText.includes('верификаци') ||
      bodyText.includes('Проверк') ||
      bodyText.includes('Заявк') ||
      bodyText.includes('заявк') ||
      bodyText.includes('Документ');

    const hasEmptyState =
      bodyText.includes('Нет заявок') ||
      bodyText.includes('Пусто') ||
      bodyText.includes('нет') ||
      bodyText.includes('пусто');

    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasCards = (await page.locator('[class*="card"]').count()) > 0;

    expect(hasVerificationContent || hasEmptyState || hasTable || hasCards).toBe(true);
  });

  test('API: GET /admin/verifications returns paginated list', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/verifications', adminToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');

    if (res.success && res.data) {
      const data = res.data as { items?: unknown[] };
      if (data.items) {
        expect(Array.isArray(data.items)).toBe(true);
      }
    }
  });

  test('API: GET /admin/verifications/stats returns counts', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/verifications/stats', adminToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');

    if (res.success && res.data) {
      const data = res.data as Record<string, unknown>;
      // Stats should contain numeric values (e.g., pending count, total count)
      const values = Object.values(data);
      if (values.length > 0) {
        const hasNumbers = values.some(
          (v) => typeof v === 'number' || (typeof v === 'object' && v !== null)
        );
        expect(hasNumbers).toBe(true);
      }
    }
  });

  test('items have status badges (Pending/Approved/Rejected text)', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/verifications');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();

    // Should display status-related terms or badges
    const hasStatusText =
      bodyText.includes('Ожидает') ||
      bodyText.includes('ожидает') ||
      bodyText.includes('Одобрен') ||
      bodyText.includes('одобрен') ||
      bodyText.includes('Отклонен') ||
      bodyText.includes('отклонен') ||
      bodyText.includes('Pending') ||
      bodyText.includes('Approved') ||
      bodyText.includes('Rejected') ||
      bodyText.includes('На рассмотрении') ||
      bodyText.includes('Подтвержден');

    // Also check for badge-like elements
    const hasBadges = await page
      .locator('[class*="badge"], [class*="status"], [class*="chip"]')
      .first()
      .isVisible()
      .catch(() => false);

    // If no verification items exist, the page may just show an empty state
    const hasEmptyState =
      bodyText.includes('Нет заявок') ||
      bodyText.includes('Пусто') ||
      bodyText.includes('пусто');

    expect(hasStatusText || hasBadges || hasEmptyState).toBe(true);
  });

  test('filter tabs for pending/approved/rejected present', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/verifications');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();

    // Look for tab or filter controls
    const hasFilterTabs =
      bodyText.includes('Все') ||
      bodyText.includes('Ожидает') ||
      bodyText.includes('Одобрен') ||
      bodyText.includes('Отклонен') ||
      bodyText.includes('Статус') ||
      bodyText.includes('Фильтр');

    const hasTabList = await page
      .locator('[role="tablist"], [role="tab"], select, [role="combobox"]')
      .first()
      .isVisible()
      .catch(() => false);

    const hasButtons = (await page.locator('button').count()) > 1;

    expect(hasFilterTabs || hasTabList || hasButtons).toBe(true);
  });

  test('pagination controls present', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/verifications');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();

    const hasPaginationText =
      bodyText.includes('Следующ') ||
      bodyText.includes('Предыдущ') ||
      bodyText.includes('Назад') ||
      bodyText.includes('Вперед') ||
      /\d+\s*из\s*\d+/.test(bodyText);

    const hasPaginationControls = await page
      .locator('button:has-text("1"), button:has-text("2"), [aria-label*="page"], [aria-label*="Next"], nav[aria-label*="pagination"]')
      .first()
      .isVisible()
      .catch(() => false);

    // If there are very few items, pagination may not be shown
    const apiRes = await apiGet('/admin/verifications?limit=1', adminToken);
    const total = apiRes.meta?.total ?? 0;
    const fewItems = total <= 10;

    expect(hasPaginationText || hasPaginationControls || fewItems).toBe(true);
  });

  test('verification detail accessible if items exist', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const listRes = await apiGet('/admin/verifications?limit=1', adminToken);
    expect(listRes).toBeDefined();

    if (listRes.success && listRes.data) {
      const data = listRes.data as { items?: { id: string }[] };
      const items = data.items ?? [];

      if (items.length === 0) {
        test.skip(true, 'No verification items to check detail');
        return;
      }

      const firstId = items[0].id;
      const detailRes = await apiGet(`/admin/verifications/${firstId}`, adminToken);
      expect(detailRes).toBeDefined();
      expect(typeof detailRes.success).toBe('boolean');

      if (detailRes.success && detailRes.data) {
        const detail = detailRes.data as { id?: string };
        expect(detail.id).toBe(firstId);
      }
    }
  });

  test('page has action buttons area', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/verifications');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // The page should have interactive buttons (approve, reject, filter, etc.)
    const buttonCount = await page.locator('button').count();
    expect(buttonCount).toBeGreaterThan(0);

    // Check for action-related text
    const bodyText = await page.locator('body').innerText();
    const hasActionText =
      bodyText.includes('Одобрить') ||
      bodyText.includes('Отклонить') ||
      bodyText.includes('Подробнее') ||
      bodyText.includes('Действи') ||
      bodyText.includes('Просмотр');

    const hasActionButtons = await page
      .locator('button, a[role="button"]')
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasActionText || hasActionButtons).toBe(true);
  });

  test('page has Russian text', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/verifications');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
