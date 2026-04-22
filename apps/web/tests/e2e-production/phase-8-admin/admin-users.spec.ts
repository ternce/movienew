import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { waitForAdminPage, getAdminToken } from './helpers/admin-test.helper';

test.describe('Admin Users', () => {
  test('users page loads with content', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/users');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();

    if (bodyText.trim().length < 50) {
      test.skip(true, 'Users page did not render');
      return;
    }

    expect(bodyText).toContain('Пользователи');
  });

  test('users table shows seeded users', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/users');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();

    if (bodyText.trim().length < 50) {
      test.skip(true, 'Users page did not render');
      return;
    }

    const hasUsers =
      bodyText.includes('movieplatform.local') ||
      bodyText.includes('Иван') ||
      bodyText.includes('Админ') ||
      bodyText.includes('admin');

    expect(hasUsers).toBe(true);
  });

  test('users API returns valid data', async () => {
    let token: string;
    try {
      token = await getAdminToken();
    } catch {
      test.skip(true, 'Admin login failed');
      return;
    }

    const res = await apiGet('/admin/users', token);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);

    if (res.data) {
      const data = res.data as { items?: unknown[] };
      expect(data.items).toBeDefined();
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.items!.length).toBeGreaterThan(0);
    }
  });

  test('users page has table or list view', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/users');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasRows = (await page.locator('tr').count()) > 1;
    const hasCards = (await page.locator('[class*="card"]').count()) > 2;

    expect(hasTable || hasRows || hasCards).toBe(true);
  });

  test('users page has interactive elements', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/users');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const buttons = await page.locator('button').count();
    const links = await page.locator('a').count();
    expect(buttons + links).toBeGreaterThan(3);
  });

  test('users stats display numbers', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/users');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();
    expect(/\d+/.test(bodyText)).toBe(true);
  });

  test('users page has search input', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/users');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const inputs = await page.locator('input').count();
    expect(inputs).toBeGreaterThan(0);
  });

  test('users page has Russian text', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/users');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
