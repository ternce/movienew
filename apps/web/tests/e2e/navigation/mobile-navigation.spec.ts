import { test, expect } from '@playwright/test';

/**
 * Mobile navigation E2E tests
 * Run on mobile-chrome (Pixel 5) and mobile-safari (iPhone 12)
 */

test.describe('Mobile Bottom Navigation', () => {
  // Skip on desktop projects
  test.beforeEach(async ({ page }, testInfo) => {
    const isMobileProject =
      testInfo.project.name === 'mobile-chrome' || testInfo.project.name === 'mobile-safari';
    test.skip(!isMobileProject, 'Mobile-only test');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display bottom nav on mobile viewport', async ({ page }) => {
    const bottomNav = page.locator('nav.fixed.bottom-0, nav[class*="bottom-0"]');
    await expect(bottomNav).toBeVisible();
  });

  test('should display 5 navigation items', async ({ page }) => {
    const navItems = page.locator(
      'nav.fixed.bottom-0 a, nav.fixed.bottom-0 button, nav[class*="bottom-0"] a, nav[class*="bottom-0"] button'
    );
    await expect(navItems).toHaveCount(5);
  });

  test('should navigate to /series on tap', async ({ page }) => {
    await page.getByLabel('Сериалы').click();
    await expect(page).toHaveURL(/\/series/);
  });

  test('should navigate to /shorts on tap', async ({ page }) => {
    await page.getByLabel('Шортсы').click();
    await expect(page).toHaveURL(/\/shorts/);
  });

  test('should navigate to /account on tap', async ({ page }) => {
    await page.getByLabel('Аккаунт').click();
    await expect(page).toHaveURL(/\/account/);
  });

  test('should highlight active tab with aria-current', async ({ page }) => {
    // On /dashboard, Главная should be active
    const homeLink = page.getByLabel('Главная');
    await expect(homeLink).toHaveAttribute('aria-current', 'page');

    // Navigate to series
    await page.goto('/series');
    await page.waitForLoadState('networkidle');
    const seriesLink = page.getByLabel('Сериалы');
    await expect(seriesLink).toHaveAttribute('aria-current', 'page');
  });

  test('should hide on /watch routes', async ({ page }) => {
    await page.goto('/watch/test-content');
    await page.waitForLoadState('networkidle');

    const bottomNav = page.locator('nav.fixed.bottom-0, nav[class*="bottom-0"]');
    await expect(bottomNav).toBeHidden();
  });

  test('should open search overlay on search tap', async ({ page }) => {
    await page.getByLabel('Поиск').click();

    // Search overlay should appear
    const searchInput = page.getByPlaceholder('Поиск сериалов, клипов...');
    await expect(searchInput).toBeVisible();
  });

  test('should not show bottom nav on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Bottom nav uses md:hidden so should not be visible on desktop
    const bottomNav = page.locator('nav.fixed.bottom-0, nav[class*="bottom-0"]');
    await expect(bottomNav).toBeHidden();
  });
});

test.describe('Mobile Search Overlay', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const isMobileProject =
      testInfo.project.name === 'mobile-chrome' || testInfo.project.name === 'mobile-safari';
    test.skip(!isMobileProject, 'Mobile-only test');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should open from bottom nav search button', async ({ page }) => {
    await page.getByLabel('Поиск').click();

    const searchInput = page.getByPlaceholder('Поиск сериалов, клипов...');
    await expect(searchInput).toBeVisible();
  });

  test('should close on close button tap', async ({ page }) => {
    await page.getByLabel('Поиск').click();

    const searchInput = page.getByPlaceholder('Поиск сериалов, клипов...');
    await expect(searchInput).toBeVisible();

    await page.getByLabel('Закрыть поиск').click();
    await expect(searchInput).toBeHidden();
  });

  test('should navigate to /search?q=... on submit', async ({ page }) => {
    await page.getByLabel('Поиск').click();

    const searchInput = page.getByPlaceholder('Поиск сериалов, клипов...');
    await searchInput.fill('тестовый запрос');
    await searchInput.press('Enter');

    await expect(page).toHaveURL(/\/search\?q=/);
  });

  test('should display recent searches from localStorage', async ({ page }) => {
    // Seed recent searches
    await page.evaluate(() => {
      localStorage.setItem(
        'mp-recent-searches',
        JSON.stringify(['Сериал тест', 'Фильм тест'])
      );
    });

    // Open search overlay (need to reload to pick up localStorage)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Поиск').click();

    await expect(page.getByText('Сериал тест')).toBeVisible();
    await expect(page.getByText('Фильм тест')).toBeVisible();
  });

  test('should navigate on recent search tap', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        'mp-recent-searches',
        JSON.stringify(['Тестовый поиск'])
      );
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Поиск').click();

    await page.getByText('Тестовый поиск').click();
    await expect(page).toHaveURL(/\/search\?q=/);
  });

  test('should clear recent searches', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        'mp-recent-searches',
        JSON.stringify(['Удалить это'])
      );
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Поиск').click();

    await expect(page.getByText('Удалить это')).toBeVisible();
    await page.getByText('Очистить').click();
    await expect(page.getByText('Удалить это')).toBeHidden();

    // Verify localStorage is cleared
    const stored = await page.evaluate(() =>
      localStorage.getItem('mp-recent-searches')
    );
    expect(stored).toBeNull();
  });

  test('should show empty state when no recent and no query', async ({ page }) => {
    await page.getByLabel('Поиск').click();

    await expect(
      page.getByText('Начните вводить для поиска сериалов, клипов и обучающих материалов')
    ).toBeVisible();
  });
});

test.describe('Mobile Header', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const isMobileProject =
      testInfo.project.name === 'mobile-chrome' || testInfo.project.name === 'mobile-safari';
    test.skip(!isMobileProject, 'Mobile-only test');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should hide desktop search and show mobile search button', async ({ page }) => {
    // Mobile search button should be visible
    const mobileSearchButton = page.getByLabel('Поиск');
    await expect(mobileSearchButton).toBeVisible();

    // Desktop search input (compact) should be hidden on mobile
    const desktopSearch = page.locator('form[data-testid="search-input-compact"]');
    const isDesktopSearchVisible = await desktopSearch.isVisible().catch(() => false);
    // On mobile, the compact search form should not be visible
    expect(isDesktopSearchVisible).toBe(false);
  });

  test('should show hamburger menu button', async ({ page }) => {
    const menuButton = page.getByLabel(/меню|menu/i);
    const isVisible = await menuButton.isVisible().catch(() => false);
    // The hamburger/menu button should be present on mobile
    expect(isVisible).toBe(true);
  });
});
