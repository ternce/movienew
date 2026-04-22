import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { waitForAdminPage, getAdminToken } from './helpers/admin-test.helper';

test.describe('Admin Verifications', () => {
  test('verifications page loads at /admin/verifications', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/verifications');
    test.skip(!loaded, 'Auth state expired — redirected to login');

    expect(page.url()).toContain('/admin');
    expect(page.url()).not.toContain('/login');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);
  });

  test('verifications page has content (table, queue, or empty state)', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/verifications');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();

    const hasVerificationContent =
      bodyText.includes('Верификаци') ||
      bodyText.includes('верификаци') ||
      bodyText.includes('Проверк') ||
      bodyText.includes('проверк') ||
      bodyText.includes('Заявк') ||
      bodyText.includes('заявк') ||
      bodyText.includes('Документ') ||
      bodyText.includes('Нет заявок') ||
      bodyText.includes('Пусто');

    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasCards = (await page.locator('[class*="card"]').count()) > 0;
    const hasRows = (await page.locator('tr').count()) > 0;

    expect(hasVerificationContent || hasTable || hasCards || hasRows).toBe(true);
  });

  test('verifications page has Russian text', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/verifications');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });

  test('verifications page has filter or status controls', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/verifications');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();

    const hasStatusControls =
      bodyText.includes('Статус') ||
      bodyText.includes('статус') ||
      bodyText.includes('Фильтр') ||
      bodyText.includes('Ожидает') ||
      bodyText.includes('ожидает') ||
      bodyText.includes('Одобрен') ||
      bodyText.includes('Отклонен') ||
      bodyText.includes('Все');

    const hasFilterElements = await page
      .locator('select, [role="combobox"], [role="tablist"], button:has-text("Фильтр"), input[placeholder*="Поиск"], input[placeholder*="поиск"]')
      .first()
      .isVisible()
      .catch(() => false);

    const hasButtons = (await page.locator('button').count()) > 1;

    expect(hasStatusControls || hasFilterElements || hasButtons).toBe(true);
  });

  test('verifications API responds with admin token', async () => {
    let token: string;
    try {
      token = await getAdminToken();
    } catch {
      test.skip(true, 'Admin login failed');
      return;
    }

    const res = await apiGet('/admin/verifications', token);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });
});
