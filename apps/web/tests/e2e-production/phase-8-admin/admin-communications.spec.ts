import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { waitForAdminPage, getAdminToken } from './helpers/admin-test.helper';

test.describe('Admin Communications', () => {
  test('newsletters page loads', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/newsletters');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);
  });

  test('newsletter creation page loads', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/newsletters/new');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);
  });

  test('documents page loads', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/documents');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);
  });

  test('document creation page loads', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/documents/new');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);
  });

  test('documents API returns data', async () => {
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

  test('communications pages have Russian text', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/newsletters');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
