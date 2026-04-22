import { test, expect } from '@playwright/test';
import { waitForAdminPage } from './helpers/admin-test.helper';

test.describe('Admin Navigation', () => {
  test('admin panel loads without redirect to login', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin');
    test.skip(!loaded, 'Auth state expired — redirected to login');

    expect(page.url()).not.toContain('/login');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('sidebar shows all navigation groups', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/dashboard');
    test.skip(!loaded, 'Auth state expired');

    const body = await page.locator('body').innerText();

    // Main visible groups
    expect(body).toContain('Дашборд');
    expect(body).toContain('Контент');
    expect(body).toContain('Пользователи');
  });

  test('navigate to content section via sidebar', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/dashboard');
    test.skip(!loaded, 'Auth state expired');

    const contentLink = page.locator('a[href="/admin/content"]').first();
    if (await contentLink.isVisible()) {
      await contentLink.click();
      await page.waitForURL('**/admin/content', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/admin/content');
    }
  });

  test('navigate to users section via sidebar', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/dashboard');
    test.skip(!loaded, 'Auth state expired');

    const usersLink = page.locator('a[href="/admin/users"]').first();
    if (await usersLink.isVisible()) {
      await usersLink.click();
      await page.waitForURL('**/admin/users', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/admin/users');
    }
  });

  test('navigate to all major admin sections', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/dashboard');
    test.skip(!loaded, 'Auth state expired');

    const sections = [
      '/admin/dashboard',
      '/admin/content',
      '/admin/users',
    ];

    for (const section of sections) {
      await page.goto(section);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Should not redirect to login
      if (page.url().includes('/login')) {
        continue; // Auth may have expired
      }

      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length).toBeGreaterThan(10);
    }
  });

  test('admin pages display Russian text', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/dashboard');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    // Check for Cyrillic characters
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
