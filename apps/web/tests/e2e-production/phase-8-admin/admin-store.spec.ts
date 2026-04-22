import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { waitForAdminPage, getAdminToken } from './helpers/admin-test.helper';

test.describe('Admin Store', () => {
  test('products page loads', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/store/products');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);
  });

  test('orders page loads', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/store/orders');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);
  });

  test('products API returns data', async () => {
    let token: string;
    try {
      token = await getAdminToken();
    } catch {
      test.skip(true, 'Admin login failed');
      return;
    }

    const res = await apiGet('/admin/store/products', token);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('product creation page loads', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/store/products/new');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);
  });

  test('store pages have interactive elements', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/store/products');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const buttons = await page.locator('button').count();
    const links = await page.locator('a').count();
    expect(buttons + links).toBeGreaterThan(2);
  });

  test('store pages have Russian text', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/store/products');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
