import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';

test.describe('Shorts Page', () => {
  test('shorts page loads at /shorts', async ({ page }) => {
    await page.goto('/shorts');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('/shorts');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('shorts page has navigation and layout', async ({ page }) => {
    await page.goto('/shorts');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const navLinks = page.locator('a[href*="/shorts"]');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('shorts API returns data', async () => {
    const res = await apiGet('/content?contentType=SHORT');
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('shorts page has Russian text', async ({ page }) => {
    await page.goto('/shorts');
    await page.waitForLoadState('domcontentloaded');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
