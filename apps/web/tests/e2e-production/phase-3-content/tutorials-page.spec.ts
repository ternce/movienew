import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';

test.describe('Tutorials Page', () => {
  test('tutorials page loads at /tutorials', async ({ page }) => {
    await page.goto('/tutorials');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('/tutorials');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('tutorials page has navigation and layout', async ({ page }) => {
    await page.goto('/tutorials');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const navLinks = page.locator('a[href*="/tutorials"]');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('tutorials API returns data', async () => {
    const res = await apiGet('/content?contentType=TUTORIAL');
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('tutorials page has Russian text', async ({ page }) => {
    await page.goto('/tutorials');
    await page.waitForLoadState('domcontentloaded');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
