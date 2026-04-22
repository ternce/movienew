import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { waitForAdminPage, getAdminToken } from './helpers/admin-test.helper';

test.describe('Admin Partner Withdrawals', () => {
  test('partner withdrawals page loads at /admin/partners/withdrawals', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/partners/withdrawals');
    test.skip(!loaded, 'Auth state expired — redirected to login');

    expect(page.url()).toContain('/admin');
    expect(page.url()).not.toContain('/login');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);
  });

  test('partner withdrawals page has content (table or empty state)', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/partners/withdrawals');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();

    const hasWithdrawalContent =
      bodyText.includes('Вывод') ||
      bodyText.includes('вывод') ||
      bodyText.includes('Заявк') ||
      bodyText.includes('заявк') ||
      bodyText.includes('Партнер') ||
      bodyText.includes('партнер') ||
      bodyText.includes('Нет заявок') ||
      bodyText.includes('Пусто') ||
      bodyText.includes('₽');

    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasCards = (await page.locator('[class*="card"]').count()) > 0;
    const hasRows = (await page.locator('tr').count()) > 0;

    expect(hasWithdrawalContent || hasTable || hasCards || hasRows).toBe(true);
  });

  test('partner withdrawals page has Russian text', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/partners/withdrawals');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });

  test('partner withdrawals page has status filter or action buttons', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/partners/withdrawals');
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
      bodyText.includes('Выполнен') ||
      bodyText.includes('Все');

    const hasFilterElements = await page
      .locator('select, [role="combobox"], [role="tablist"], button:has-text("Фильтр"), input[placeholder*="Поиск"], input[placeholder*="поиск"]')
      .first()
      .isVisible()
      .catch(() => false);

    const hasActionButtons = (await page.locator('button').count()) > 1;

    expect(hasStatusControls || hasFilterElements || hasActionButtons).toBe(true);
  });

  test('admin partner withdrawals API responds', async () => {
    let token: string;
    try {
      token = await getAdminToken();
    } catch {
      test.skip(true, 'Admin login failed');
      return;
    }

    const res = await apiGet('/admin/partners/withdrawals', token);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });
});
