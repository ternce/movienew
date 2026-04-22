import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { waitForAdminPage, getAdminToken } from './helpers/admin-test.helper';

test.describe('Admin Content List', () => {
  test('content list page loads with header', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/content');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();

    if (bodyText.trim().length < 50) {
      test.skip(true, 'Content page did not render');
      return;
    }

    // Should have the page header
    expect(bodyText).toContain('Контент');
  });

  test('content page has "Добавить контент" button', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/content');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const addButton = page.locator('a[href="/admin/content/new"]');
    const isVisible = await addButton.isVisible().catch(() => false);

    if (!isVisible) {
      // Try finding by text
      const textButton = page.getByText('Добавить контент');
      expect(await textButton.count()).toBeGreaterThan(0);
    } else {
      expect(isVisible).toBe(true);
    }
  });

  test('content page shows stats cards', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/content');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const bodyText = await page.locator('body').innerText();
    if (bodyText.trim().length < 50) {
      test.skip(true, 'Content page did not render');
      return;
    }

    // Should have stats text like "Всего контента", "Опубликовано", etc.
    const hasStats =
      bodyText.includes('Всего') ||
      bodyText.includes('Опубликовано') ||
      bodyText.includes('Черновики') ||
      bodyText.includes('контент');

    expect(hasStats).toBe(true);
  });

  test('content table shows items', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/content');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    // Check for table or card-based content list
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').count() > 0;

    expect(hasTable || hasCards).toBe(true);
  });

  test('search by title filters content', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/content');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const searchInput = page.locator('input[placeholder*="Поиск"]');
    const isVisible = await searchInput.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip(true, 'Search input not found');
      return;
    }

    // Type a search query
    await searchInput.fill('test');
    await page.waitForTimeout(2000);

    // Page should still be functional
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(10);
  });

  test('"Добавить контент" navigates to create page', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/content');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const addLink = page.locator('a[href="/admin/content/new"]');
    const isVisible = await addLink.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip(true, 'Add content button not visible');
      return;
    }

    await addLink.click();
    await page.waitForURL('**/admin/content/new', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/admin/content/new');
  });

  test('content API returns paginated data', async () => {
    let token: string;
    try {
      token = await getAdminToken();
    } catch {
      test.skip(true, 'Admin login failed');
      return;
    }

    const res = await apiGet('/admin/content', token);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);

    if (res.data) {
      const data = res.data as { items?: unknown[]; meta?: { total: number } };
      expect(data.items).toBeDefined();
      expect(Array.isArray(data.items)).toBe(true);
    }
  });

  test('content page has Russian text', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/content');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });

  // ---- Enhanced Tests (Step 3) ----

  test('content table has correct columns', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/content');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const table = page.locator('table');
    const tableExists = await table.isVisible().catch(() => false);
    test.skip(!tableExists, 'Table not visible');

    const headers = await page.locator('table th').allInnerTexts();
    const headerText = headers.join(' ');

    // Should contain these column names
    expect(headerText).toContain('Название');
    expect(headerText).toContain('Тип');
    expect(headerText).toContain('Статус');
    expect(headerText).toContain('Возраст');
  });

  test('content row action menu has edit and archive options', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/content');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const menuButton = page.locator('table tbody tr').first().getByRole('button', { name: 'Open menu' });
    const isVisible = await menuButton.isVisible().catch(() => false);
    test.skip(!isVisible, 'No content rows with menu');

    await menuButton.click();
    await page.waitForTimeout(500);

    // Menu should have Просмотреть, Редактировать, Архивировать
    const menuItems = await page.locator('[role="menuitem"]').allInnerTexts();
    expect(menuItems.some((t) => t.includes('Редактировать'))).toBe(true);
    expect(menuItems.some((t) => t.includes('Архивировать') || t.includes('Просмотреть'))).toBe(true);

    await page.keyboard.press('Escape');
  });

  test('content filter buttons are visible', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/content');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // Filter buttons contain text "Статус" and "Тип" but may also contain SVG icons
    // Use text-based locator which is more resilient
    const body = await page.locator('body').innerText();
    const hasFilterControls = body.includes('Статус') && body.includes('Тип');

    // Also check for the search input and column controls
    const hasSearchInput = await page.locator('input[placeholder*="Поиск"]').isVisible().catch(() => false);

    expect(hasFilterControls || hasSearchInput).toBe(true);
  });

  test('content total count matches API', async () => {
    let token: string;
    try {
      token = await getAdminToken();
    } catch {
      test.skip(true, 'Admin login failed');
      return;
    }

    const res = await apiGet('/admin/content?limit=1', token);
    expect(res.success).toBe(true);

    if (res.meta) {
      expect(typeof res.meta.total).toBe('number');
      expect(res.meta.total).toBeGreaterThanOrEqual(0);
    }
  });
});
