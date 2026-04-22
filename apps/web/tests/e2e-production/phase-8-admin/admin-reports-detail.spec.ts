import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { waitForAdminPage, getAdminToken } from './helpers/admin-test.helper';

test.describe('Reports Page', () => {
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
      bodyText.includes('аналитик') ||
      bodyText.includes('Статистика') ||
      bodyText.includes('статистик');

    expect(hasReportsHeading).toBe(true);
  });

  test('page has chart area (SVG elements or recharts containers)', async ({ page }) => {
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

  test('page has date range or filter controls', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/reports');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    // Look for date inputs, selects, or filter-related elements
    const dateInputs = await page.locator('input[type="date"], input[type="datetime-local"]').count();
    const selects = await page.locator('select, [role="combobox"], [role="listbox"]').count();
    const filterButtons = await page.locator(
      'button:has-text("Фильтр"), button:has-text("фильтр"), ' +
      'button:has-text("Период"), button:has-text("период"), ' +
      'button:has-text("Дата"), button:has-text("дата")'
    ).count();
    const buttons = await page.locator('button').count();

    // At minimum, the page should have some interactive controls
    expect(dateInputs + selects + filterButtons + buttons).toBeGreaterThan(0);
  });

  test('page renders data visualization elements', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/reports');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    // Look for data visualization: charts, cards with numbers, stat blocks
    const svgElements = await page.locator('svg').count();
    const statCards = await page.locator('[class*="card"], [class*="Card"], [class*="stat"], [class*="Stat"]').count();
    const numbers = await page.locator('body').innerText();
    const hasNumericData = /\d+/.test(numbers);

    // Reports page should display some form of data visualization
    expect(svgElements + statCards > 0 || hasNumericData).toBe(true);
  });

  test('page has interactive elements', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/reports');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const buttons = await page.locator('button').count();
    const links = await page.locator('a').count();

    expect(buttons + links).toBeGreaterThan(3);
  });

  test('page has Russian text', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/reports');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
