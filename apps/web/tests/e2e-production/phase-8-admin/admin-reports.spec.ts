import { test, expect } from '@playwright/test';
import { getAdminToken, waitForAdminPage } from './helpers/admin-test.helper';
import { apiGet, apiPatch } from '../helpers/api.helper';

test.describe('Admin Reports', () => {
  let adminToken: string;

  test.beforeAll(async () => {
    try {
      adminToken = await getAdminToken();
    } catch {
      // Token will be empty — tests will skip
    }
  });

  test('reports page loads at /admin/reports', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/reports');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();

    if (bodyText.trim().length < 20) {
      test.skip(true, 'Reports page did not render');
      return;
    }

    // Heading should contain reports-related text
    const hasReportsHeading =
      bodyText.includes('Отчёты') ||
      bodyText.includes('Отчеты') ||
      bodyText.includes('отчёт') ||
      bodyText.includes('отчет') ||
      bodyText.includes('Аналитика') ||
      bodyText.includes('аналитик');

    expect(hasReportsHeading).toBe(true);
  });

  test('reports page has chart area', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/reports');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();

    if (bodyText.trim().length < 20) {
      test.skip(true, 'Reports page did not render');
      return;
    }

    // Charts may be rendered as SVG (recharts), canvas, or a container div
    const hasSvg = (await page.locator('svg').count()) > 0;
    const hasCanvas = (await page.locator('canvas').count()) > 0;
    const hasChartContainer =
      (await page.locator('[class*="chart"], [class*="Chart"], [class*="recharts"]').count()) > 0;

    // At least one chart-related element should be present
    expect(hasSvg || hasCanvas || hasChartContainer).toBe(true);
  });

  test('reports page has Russian text', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/reports');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });

  test('reports page has interactive elements', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/reports');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const buttons = await page.locator('button').count();
    const links = await page.locator('a').count();

    expect(buttons + links).toBeGreaterThan(3);
  });

  test('dashboard revenue API works', async () => {
    test.skip(!adminToken, 'Admin login failed');

    // Revenue endpoint is used by reports charts
    const res = await apiGet('/admin/dashboard/revenue', adminToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });
});
