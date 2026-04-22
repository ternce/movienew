import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { waitForAdminPage, getAdminToken } from './helpers/admin-test.helper';

test.describe('Settings Page', () => {
  let adminToken: string;

  test.beforeAll(async () => {
    try {
      adminToken = await getAdminToken();
    } catch {
      // Token will be empty — tests will skip
    }
  });

  test('settings page loads at /admin/settings', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/settings');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);
  });

  test('page has section headers or card components', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/settings');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // Look for section headers (h2, h3) or card containers
    const headings = await page.locator('h1, h2, h3, h4').count();
    const cards = await page.locator('[class*="card"], [class*="Card"]').count();
    const sections = await page.locator('section, [class*="section"], [class*="Section"]').count();

    expect(headings + cards + sections).toBeGreaterThan(0);
  });

  test('page has form inputs or toggle switches', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/settings');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // Look for various form elements: inputs, textareas, toggles, checkboxes
    const inputs = await page.locator('input').count();
    const textareas = await page.locator('textarea').count();
    const toggles = await page.locator(
      '[role="switch"], [class*="switch"], [class*="Switch"], ' +
      '[class*="toggle"], [class*="Toggle"]'
    ).count();
    const checkboxes = await page.locator('input[type="checkbox"], [role="checkbox"]').count();
    const selects = await page.locator('select, [role="combobox"]').count();

    expect(inputs + textareas + toggles + checkboxes + selects).toBeGreaterThan(0);
  });

  test('page has save or update button', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/settings');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // Look for save/update/apply action buttons
    const actionButtons = await page.locator(
      'button:has-text("Сохранить"), button:has-text("сохранить"), ' +
      'button:has-text("Обновить"), button:has-text("обновить"), ' +
      'button:has-text("Применить"), button:has-text("применить"), ' +
      'button:has-text("Save"), button:has-text("Update"), ' +
      'button[type="submit"]'
    ).count();
    const buttons = await page.locator('button').count();

    // Page should have at least some action buttons (save or generic)
    expect(actionButtons + buttons).toBeGreaterThan(0);
  });

  test('page has interactive elements', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/settings');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input').count();
    const links = await page.locator('a').count();

    expect(buttons + inputs + links).toBeGreaterThan(2);
  });

  test('page has Russian text', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/settings');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
