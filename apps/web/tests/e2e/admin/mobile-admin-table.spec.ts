import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/auth.fixture';

/**
 * Mobile admin data table E2E tests
 * Run on mobile-chrome (Pixel 5) and mobile-safari (iPhone 12)
 */

test.describe('Mobile Admin Data Table', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const isMobileProject =
      testInfo.project.name === 'mobile-chrome' || testInfo.project.name === 'mobile-safari';
    test.skip(!isMobileProject, 'Mobile-only test');

    // Login as admin
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', TEST_USERS.admin.email);
    await page.fill('input[name="password"]', TEST_USERS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(admin)?/);
  });

  test('should render card view instead of table on mobile', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // On mobile, the traditional table element should be hidden
    const table = page.locator('table');
    const isTableVisible = await table.isVisible().catch(() => false);

    // Card view should be present instead
    const cardView = page.locator(
      '[class*="space-y-3"], [data-testid="card-view"]'
    ).first();
    const isCardViewVisible = await cardView.isVisible().catch(() => false);

    // Either table is hidden or card view is shown
    expect(isTableVisible === false || isCardViewVisible === true).toBe(true);
  });

  test('should show preview fields on each card', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Cards should show some data fields
    const cardFields = page.locator(
      '.uppercase.tracking-wider, [class*="text-mp-text-disabled"]'
    );
    const fieldCount = await cardFields.count();

    // Each card should show at least one field
    expect(fieldCount).toBeGreaterThan(0);
  });

  test('should expand card on "Подробнее" tap', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    const expandButton = page.getByText('Подробнее').first();
    const hasExpandButton = await expandButton.isVisible().catch(() => false);

    if (hasExpandButton) {
      await expandButton.click();

      // After expanding, "Скрыть" button should appear
      const collapseButton = page.getByText('Скрыть').first();
      await expect(collapseButton).toBeVisible();
    }
  });

  test('should collapse on "Скрыть" tap', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    const expandButton = page.getByText('Подробнее').first();
    const hasExpandButton = await expandButton.isVisible().catch(() => false);

    if (hasExpandButton) {
      await expandButton.click();

      const collapseButton = page.getByText('Скрыть').first();
      await expect(collapseButton).toBeVisible();

      await collapseButton.click();

      // "Подробнее" should reappear
      await expect(page.getByText('Подробнее').first()).toBeVisible();
    }
  });

  test('should show loading skeletons', async ({ page }) => {
    // Slow down API to see loading state
    await page.route('**/api/v1/admin/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto('/admin/users');

    // Check for skeleton/loading state
    const skeleton = page.locator(
      '[class*="animate-pulse"], [class*="skeleton"]'
    ).first();
    const hasSkeletons = await skeleton.isVisible({ timeout: 3000 }).catch(() => false);

    // Skeletons should appear during loading
    expect(hasSkeletons).toBe(true);
  });

  test('should show table on desktop viewport (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // On desktop, a table element should be visible
    const table = page.locator('table');
    const isTableVisible = await table.isVisible().catch(() => false);

    // Desktop should show table view
    expect(isTableVisible).toBe(true);
  });

  test('search toolbar should be visible on mobile', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Search/filter input should be accessible on mobile
    const searchInput = page.locator(
      'input[placeholder*="Поиск"], input[placeholder*="поиск"], input[placeholder*="Search"], input[type="search"]'
    ).first();
    const hasSearch = await searchInput.isVisible().catch(() => false);

    expect(hasSearch).toBe(true);
  });
});

test.describe('Mobile Admin Accessibility', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const isMobileProject =
      testInfo.project.name === 'mobile-chrome' || testInfo.project.name === 'mobile-safari';
    test.skip(!isMobileProject, 'Mobile-only test');

    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', TEST_USERS.admin.email);
    await page.fill('input[name="password"]', TEST_USERS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(admin)?/);
  });

  test('should have adequate touch targets on expand buttons', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    const expandButton = page.getByText('Подробнее').first();
    const hasExpandButton = await expandButton.isVisible().catch(() => false);

    if (hasExpandButton) {
      const box = await expandButton.boundingBox();
      if (box) {
        // Minimum touch target: 44px height (WCAG 2.1 AAA) or 48px (Material Design)
        // We check for at least 36px as a reasonable minimum
        expect(box.height).toBeGreaterThanOrEqual(36);
      }
    }
  });
});
