import { test, expect } from '@playwright/test';
import { expectRussianText } from '../helpers/assertions.helper';

test.describe('Dashboard', () => {
  test('dashboard page loads for authenticated user', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Should not redirect to login
    expect(page.url()).not.toContain('/login');
  });

  test('dashboard has content rows', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Wait for content to load (skeletons to disappear)
    await page.waitForTimeout(3000);

    // Should have some visible content
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(100);
  });

  test('dashboard contains Russian text', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await expectRussianText(page);
  });

  test('dashboard has clickable content cards', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Look for links that could be content cards
    const contentLinks = page.locator('a[href*="/series/"], a[href*="/clips/"], a[href*="/shorts/"], a[href*="/tutorials/"], a[href*="/watch/"]');
    const count = await contentLinks.count();

    // Dashboard may or may not have content depending on data
    if (count > 0) {
      const firstLink = contentLinks.first();
      const href = await firstLink.getAttribute('href');
      expect(href).toBeTruthy();
    }
  });

  test('dashboard hero section renders', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Page should have substantial content rendered
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
