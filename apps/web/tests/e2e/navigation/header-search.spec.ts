import { test as base, expect } from '@playwright/test';

const test = base;

test.describe('Header Search', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API calls to prevent real network requests
    await page.route('**/api/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
          timestamp: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should show search input in header on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // The header search uses SearchInputCompact which has a form with an input
    const headerSearch = page.locator('header form input[type="text"]');
    await expect(headerSearch).toBeVisible();
  });

  test('should hide search input on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // The search input is hidden on mobile (hidden sm:block on parent)
    const headerSearchContainer = page.locator('header .hidden.sm\\:block');
    await expect(headerSearchContainer).not.toBeVisible();
  });

  test('should navigate to /search?q=... on submit', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const headerSearch = page.locator('header form input[type="text"]');
    await headerSearch.fill('Тест');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/search\?q=.*%D0%A2%D0%B5%D1%81%D1%82/);
  });

  test('should show mobile search button on small viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const mobileSearchButton = page.getByRole('button', { name: 'Поиск' });
    await expect(mobileSearchButton).toBeVisible();
  });
});
