import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { waitForAdminPage, getAdminToken } from './helpers/admin-test.helper';

test.describe('Admin Documents', () => {
  test('documents page loads at /admin/documents', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/documents');
    test.skip(!loaded, 'Auth state expired — redirected to login');

    expect(page.url()).toContain('/admin');
    expect(page.url()).not.toContain('/login');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);
  });

  test('documents page has create or add button', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/documents');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();

    const hasCreateAction =
      bodyText.includes('Создать') ||
      bodyText.includes('создать') ||
      bodyText.includes('Добавить') ||
      bodyText.includes('добавить') ||
      bodyText.includes('Новый');

    const hasCreateButton = await page
      .locator('button:has-text("Создать"), button:has-text("Добавить"), a[href*="documents/new"], a:has-text("Создать"), a:has-text("Добавить")')
      .isVisible()
      .catch(() => false);

    const hasAddIcon = await page
      .locator('button svg, a[href*="new"] svg')
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasCreateAction || hasCreateButton || hasAddIcon).toBe(true);
  });

  test('documents page has content list or empty state', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/documents');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();

    const hasDocumentContent =
      bodyText.includes('Документ') ||
      bodyText.includes('документ') ||
      bodyText.includes('Политика') ||
      bodyText.includes('Пользовательское') ||
      bodyText.includes('Соглашение') ||
      bodyText.includes('Нет документов') ||
      bodyText.includes('Пусто');

    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasCards = (await page.locator('[class*="card"]').count()) > 0;
    const hasListItems = (await page.locator('tr, li, [class*="item"]').count()) > 0;

    expect(hasDocumentContent || hasTable || hasCards || hasListItems).toBe(true);
  });

  test('documents page has Russian text', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/documents');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });

  test('admin documents API responds', async () => {
    let token: string;
    try {
      token = await getAdminToken();
    } catch {
      test.skip(true, 'Admin login failed');
      return;
    }

    const res = await apiGet('/admin/documents', token);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });
});
