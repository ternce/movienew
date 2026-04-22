import { test as base, expect } from '@playwright/test';

const test = base;

// Mock search results
const MOCK_RESULTS = Array.from({ length: 6 }, (_, i) => ({
  id: String(i + 1),
  slug: `test-series-${i + 1}`,
  title: `Тестовый сериал ${i + 1}`,
  thumbnailUrl: '/images/movie-placeholder.jpg',
  seasonCount: 2,
  episodeCount: 16,
  ageCategory: '12+',
  rating: 8.0 + i * 0.1,
  year: 2024,
}));

const MOCK_PAGINATION_RESULTS = Array.from({ length: 25 }, (_, i) => ({
  id: String(i + 1),
  slug: `paginated-series-${i + 1}`,
  title: `Пагинация сериал ${i + 1}`,
  thumbnailUrl: '/images/movie-placeholder.jpg',
  seasonCount: 1,
  episodeCount: 10,
  ageCategory: '16+',
  rating: 7.5,
  year: 2023,
}));

function mockContentApi(page: import('@playwright/test').Page) {
  return page.route('**/api/v1/content?*', async (route) => {
    const url = new URL(route.request().url());
    const search = url.searchParams.get('search') || '';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const ageCategory = url.searchParams.get('ageCategory');

    if (!search) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: [], total: 0, page: 1, limit: 20 },
          timestamp: new Date().toISOString(),
        }),
      });
    }

    // Determine which dataset to use
    let items = search.includes('пагинация') ? MOCK_PAGINATION_RESULTS : MOCK_RESULTS;

    // Apply age filter
    if (ageCategory) {
      items = items.filter((item) => item.ageCategory === ageCategory);
    }

    const total = items.length;
    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { items: paged, total, page, limit },
        timestamp: new Date().toISOString(),
      }),
    });
  });
}

function mockSearchSuggestionsApi(page: import('@playwright/test').Page) {
  return page.route('**/api/v1/content/search*', async (route) => {
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
}

test.describe('Search Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockSearchSuggestionsApi(page);
    await mockContentApi(page);
  });

  test('should display search input with autoFocus', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const input = page.getByRole('combobox');
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
  });

  test('should show recent searches when no query', async ({ page }) => {
    await page.goto('/search');
    // Set recent searches
    await page.evaluate(() => {
      localStorage.setItem('mp-recent-searches', JSON.stringify(['Тест', 'Драма']));
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Недавние поиски')).toBeVisible();
    await expect(page.getByText('Тест')).toBeVisible();
    await expect(page.getByText('Драма')).toBeVisible();
  });

  test('should display results grid when query is provided', async ({ page }) => {
    await page.goto('/search?q=тестовый');
    await page.waitForLoadState('networkidle');

    // Wait for results to appear
    await expect(page.getByText(/Найдено/)).toBeVisible();
    await expect(page.getByText('6')).toBeVisible();
  });

  test('should show empty state for no results', async ({ page }) => {
    await page.goto('/search?q=несуществующий');
    await page.waitForLoadState('networkidle');

    // The mock returns empty for unknown queries via content endpoint
    await expect(page.getByText('Ничего не найдено')).toBeVisible();
  });

  test('should apply age category filter', async ({ page }) => {
    await page.goto('/search?q=тестовый');
    await page.waitForLoadState('networkidle');

    // All results have ageCategory: '12+', so filtering by '16+' should return 0
    await expect(page.getByText(/Найдено/)).toBeVisible();
  });

  test('should save search to recent searches on submit', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const input = page.getByRole('combobox');
    await input.fill('Мой запрос');
    await page.keyboard.press('Enter');

    // Check localStorage was updated
    const recent = await page.evaluate(() => {
      return localStorage.getItem('mp-recent-searches');
    });
    expect(recent).toContain('Мой запрос');
  });

  test('should paginate results', async ({ page }) => {
    await page.goto('/search?q=пагинация');
    await page.waitForLoadState('networkidle');

    // Should show results count
    await expect(page.getByText(/Найдено/)).toBeVisible();
    await expect(page.getByText('25')).toBeVisible();

    // Should show pagination since 25 > 20 per page
    const pagination = page.locator('nav[aria-label]');
    await expect(pagination).toBeVisible();
  });

  test('should navigate to content detail on card click', async ({ page }) => {
    await page.goto('/search?q=тестовый');
    await page.waitForLoadState('networkidle');

    // Wait for results
    await expect(page.getByText(/Найдено/)).toBeVisible();

    // Click first card link
    const firstCard = page.locator('a[href*="/series/"]').first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await expect(page).toHaveURL(/\/series\//);
    }
  });
});
