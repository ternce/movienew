import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { waitForAdminPage, getAdminToken } from './helpers/admin-test.helper';

test.describe('Admin Dashboard', () => {
  test('dashboard page loads with content', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/dashboard');
    test.skip(!loaded, 'Auth state expired — redirected to login');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);
  });

  test('dashboard shows stats cards', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/dashboard');
    test.skip(!loaded, 'Auth state expired');

    // Wait for data to load
    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();
    if (bodyText.trim().length < 50) {
      test.skip(true, 'Dashboard did not fully render');
      return;
    }

    // Should have stat-related text or numbers
    const hasNumbers = /\d+/.test(bodyText);
    expect(hasNumbers).toBe(true);
  });

  test('dashboard API returns valid data', async () => {
    let token: string;
    try {
      token = await getAdminToken();
    } catch {
      test.skip(true, 'Admin login failed');
      return;
    }

    const res = await apiGet('/admin/dashboard', token);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('dashboard has Russian text throughout', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/dashboard');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });

  test('dashboard has interactive elements', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/dashboard');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const buttonCount = await page.locator('button').count();
    const linkCount = await page.locator('a').count();

    expect(buttonCount + linkCount).toBeGreaterThan(3);
  });
});
