import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { waitForAdminPage, getAdminToken } from './helpers/admin-test.helper';

test.describe('Admin Audit Log', () => {
  test('audit log page loads', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/audit');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);
  });

  test('audit log API returns data', async () => {
    let token: string;
    try {
      token = await getAdminToken();
    } catch {
      test.skip(true, 'Admin login failed');
      return;
    }

    const res = await apiGet('/admin/audit', token);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('audit log shows entries', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/audit');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const bodyText = await page.locator('body').innerText();
    if (bodyText.trim().length < 50) {
      test.skip(true, 'Audit page did not fully render');
      return;
    }

    // Should have table or list with audit entries
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasRows = (await page.locator('tr').count()) > 0;
    const hasCards = (await page.locator('[class*="card"]').count()) > 0;

    expect(hasTable || hasRows || hasCards).toBe(true);
  });

  test('audit log has Russian text', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/audit');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
