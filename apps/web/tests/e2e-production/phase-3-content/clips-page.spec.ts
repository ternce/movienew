import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';

test.describe('Clips Page', () => {
  test('clips page loads at /clips', async ({ page }) => {
    await page.goto('/clips');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('/clips');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('clips page has navigation and layout', async ({ page }) => {
    await page.goto('/clips');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Should have sidebar with nav links
    const navLinks = page.locator('a[href*="/clips"]');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('clips API returns data', async () => {
    const res = await apiGet('/content?contentType=CLIP');
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('clips page has Russian text', async ({ page }) => {
    await page.goto('/clips');
    await page.waitForLoadState('domcontentloaded');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
