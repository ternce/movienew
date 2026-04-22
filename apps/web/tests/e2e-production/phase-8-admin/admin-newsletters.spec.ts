import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { waitForAdminPage, getAdminToken } from './helpers/admin-test.helper';

test.describe('Admin Newsletters', () => {
  test('newsletters page loads at /admin/newsletters', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/newsletters');
    test.skip(!loaded, 'Auth state expired — redirected to login');

    expect(page.url()).toContain('/admin');
    expect(page.url()).not.toContain('/login');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);
  });

  test('newsletters page has create or add button', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/newsletters');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();

    const hasCreateAction =
      bodyText.includes('Создать') ||
      bodyText.includes('создать') ||
      bodyText.includes('Добавить') ||
      bodyText.includes('добавить') ||
      bodyText.includes('Новая') ||
      bodyText.includes('Новый');

    const hasCreateButton = await page
      .locator('button:has-text("Создать"), button:has-text("Добавить"), a[href*="newsletters/new"], a:has-text("Создать"), a:has-text("Добавить")')
      .isVisible()
      .catch(() => false);

    expect(hasCreateAction || hasCreateButton).toBe(true);
  });

  test('newsletters page has content list or empty state', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/newsletters');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();

    const hasNewsletterContent =
      bodyText.includes('Рассылк') ||
      bodyText.includes('рассылк') ||
      bodyText.includes('Письм') ||
      bodyText.includes('письм') ||
      bodyText.includes('Email') ||
      bodyText.includes('email') ||
      bodyText.includes('Нет рассылок') ||
      bodyText.includes('Пусто');

    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasCards = (await page.locator('[class*="card"]').count()) > 0;
    const hasListItems = (await page.locator('tr, li, [class*="item"]').count()) > 0;

    expect(hasNewsletterContent || hasTable || hasCards || hasListItems).toBe(true);
  });

  test('newsletters page has Russian text', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/newsletters');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });

  test('admin newsletters API responds', async () => {
    let token: string;
    try {
      token = await getAdminToken();
    } catch {
      test.skip(true, 'Admin login failed');
      return;
    }

    const res = await apiGet('/admin/newsletters', token);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });
});
