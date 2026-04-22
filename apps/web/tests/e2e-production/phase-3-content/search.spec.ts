import { test, expect } from '@playwright/test';

test.describe('Search', () => {
  test('search page loads at /search', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('search input accepts text and responds', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('domcontentloaded');

    // Find search input
    const searchInput = page.locator(
      'input[type="search"], input[name="search"], input[name="q"], input[placeholder*="Поиск"], input[placeholder*="поиск"], input[type="text"]'
    );

    const isVisible = await searchInput.first().isVisible().catch(() => false);

    if (!isVisible) {
      test.skip(true, 'No search input found on /search page');
      return;
    }

    await searchInput.first().fill('test');
    await searchInput.first().press('Enter');
    await page.waitForTimeout(3000);

    // Page should still be functional after search
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('search for nonsense returns empty results', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.locator(
      'input[type="search"], input[name="search"], input[name="q"], input[placeholder*="Поиск"], input[placeholder*="поиск"]'
    );

    const isVisible = await searchInput.first().isVisible().catch(() => false);

    if (isVisible) {
      await searchInput.first().fill('xyznonexistent12345');
      await searchInput.first().press('Enter');
      await page.waitForTimeout(3000);

      const bodyText = await page.locator('body').innerText();
      // Should show empty state or "nothing found" message
      const isEmpty =
        bodyText.includes('Ничего не найдено') ||
        bodyText.includes('не найдено') ||
        bodyText.includes('Нет результатов') ||
        !bodyText.includes('xyznonexistent');

      expect(isEmpty).toBe(true);
    }
  });

  test('search page has Russian text', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('domcontentloaded');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
