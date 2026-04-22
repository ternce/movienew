import { test, expect } from '@playwright/test';

test.describe('Accessibility — Skip to Content & Main Content', () => {
  test('should have skip-to-content link as first focusable element', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Press Tab to focus the first focusable element
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toHaveAttribute('href', '#main-content');
  });

  test('skip-to-content link should be sr-only by default', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();

    // The link should not be visible (sr-only)
    const box = await skipLink.boundingBox();
    expect(box === null || box.width <= 1 || box.height <= 1).toBe(true);
  });

  test('skip-to-content link should become visible on focus', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tab to focus the skip link
    await page.keyboard.press('Tab');

    const skipLink = page.locator('a[href="#main-content"]:focus');
    await expect(skipLink).toBeVisible();
  });

  test('skip-to-content link href should point to #main-content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toHaveAttribute('href', '#main-content');
    await expect(skipLink).toContainText('Перейти к содержимому');
  });

  test('main content area should have id="main-content"', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeAttached();

    // Should be a <main> element
    const tagName = await mainContent.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe('main');
  });
});
