import { test as base, expect } from '@playwright/test';

const test = base;

// Mock suggestion data returned by the API
const MOCK_API_SUGGESTIONS = [
  { id: '1', title: 'Ночной Патруль', type: 'Сериал' },
  { id: '2', title: 'Ночные Огни', type: 'Сериал' },
];

const MOCK_API_SUGGESTIONS_ТОЧКА = [
  { id: '3', title: 'Точка Невозврата', type: 'Сериал' },
];

const MOCK_API_SUGGESTIONS_ОСНОВЫ = [
  { id: '4', title: 'Основы видеомонтажа', type: 'Курс' },
];

test.describe('Search Suggestions', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept search API calls and return mock data
    await page.route('**/api/v1/content/search*', async (route) => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get('q')?.toLowerCase() || '';

      let data = [];
      if (query.includes('ноч')) {
        data = MOCK_API_SUGGESTIONS;
      } else if (query.includes('точка')) {
        data = MOCK_API_SUGGESTIONS_ТОЧКА;
      } else if (query.includes('основы')) {
        data = MOCK_API_SUGGESTIONS_ОСНОВЫ;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data,
          timestamp: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/search');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Dropdown Visibility', () => {
    test('should not show dropdown when input is empty and no recent searches', async ({ page }) => {
      const dropdown = page.locator('#search-suggestions');
      await expect(dropdown).not.toBeVisible();
    });

    test('should show recent searches when input is focused with saved history', async ({ page }) => {
      // Set recent searches in localStorage
      await page.evaluate(() => {
        localStorage.setItem('mp-recent-searches', JSON.stringify(['Ночной Патруль', 'Драма']));
      });
      // Reload to pick up localStorage
      await page.reload();
      await page.waitForLoadState('networkidle');

      const input = page.getByRole('combobox');
      await input.focus();

      // Recent searches header should appear
      await expect(page.getByText(/Недавние запросы/i)).toBeVisible();
    });

    test('should show suggestions dropdown when typing 2+ characters', async ({ page }) => {
      const input = page.getByRole('combobox');
      await input.fill('Ноч');

      // Wait for debounce + API response
      await page.waitForTimeout(500);

      const dropdown = page.locator('#search-suggestions');
      await expect(dropdown).toBeVisible();
    });

    test('should not show suggestions for single character', async ({ page }) => {
      const input = page.getByRole('combobox');
      await input.fill('Н');

      await page.waitForTimeout(500);

      const dropdown = page.locator('#search-suggestions');
      await expect(dropdown).not.toBeVisible();
    });
  });

  test.describe('Suggestion Content', () => {
    test('should display suggestions based on API response', async ({ page }) => {
      const input = page.getByRole('combobox');
      await input.fill('Точка');

      await page.waitForTimeout(500);

      await expect(page.getByText('Точка Невозврата')).toBeVisible();
    });

    test('should display suggestion type labels', async ({ page }) => {
      const input = page.getByRole('combobox');
      await input.fill('Основы');

      await page.waitForTimeout(500);

      // The mock suggestion "Основы видеомонтажа" has type "Курс"
      await expect(page.getByText('Курс')).toBeVisible();
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should move selection down with ArrowDown', async ({ page }) => {
      const input = page.getByRole('combobox');
      await input.fill('Ночной');

      await page.waitForTimeout(500);

      await page.keyboard.press('ArrowDown');

      const options = page.locator('[role="option"]');
      const first = options.first();
      await expect(first).toHaveAttribute('aria-selected', 'true');
    });

    test('should move selection up with ArrowUp', async ({ page }) => {
      const input = page.getByRole('combobox');
      await input.fill('Ночной');

      await page.waitForTimeout(500);

      // ArrowUp from default (-1) wraps to last item
      await page.keyboard.press('ArrowUp');

      const options = page.locator('[role="option"]');
      const last = options.last();
      await expect(last).toHaveAttribute('aria-selected', 'true');
    });

    test('should close dropdown on Escape', async ({ page }) => {
      const input = page.getByRole('combobox');
      await input.fill('Ночной');

      await page.waitForTimeout(500);
      await expect(page.locator('#search-suggestions')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.locator('#search-suggestions')).not.toBeVisible();
    });

    test('should select suggestion and submit on Enter with selection', async ({ page }) => {
      const input = page.getByRole('combobox');
      await input.fill('Ночной');

      await page.waitForTimeout(500);

      // Select first item
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');

      // Should navigate to search results page
      await expect(page).toHaveURL(/\/search\?q=/);
    });
  });

  test.describe('Click Outside', () => {
    test('should close dropdown when clicking outside', async ({ page }) => {
      const input = page.getByRole('combobox');
      await input.fill('Ночной');

      await page.waitForTimeout(500);
      await expect(page.locator('#search-suggestions')).toBeVisible();

      // Click outside the search container
      await page.locator('body').click({ position: { x: 10, y: 10 } });
      await expect(page.locator('#search-suggestions')).not.toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have role="combobox" on input', async ({ page }) => {
      const input = page.getByRole('combobox');
      await expect(input).toBeVisible();
    });

    test('should have aria-expanded toggling based on dropdown state', async ({ page }) => {
      const input = page.getByRole('combobox');
      await expect(input).toHaveAttribute('aria-expanded', 'false');

      await input.fill('Ночной');
      await page.waitForTimeout(500);

      await expect(input).toHaveAttribute('aria-expanded', 'true');
    });

    test('should have role="listbox" on dropdown', async ({ page }) => {
      const input = page.getByRole('combobox');
      await input.fill('Ночной');

      await page.waitForTimeout(500);

      const listbox = page.getByRole('listbox');
      await expect(listbox).toBeVisible();
    });

    test('should have role="option" on each suggestion', async ({ page }) => {
      const input = page.getByRole('combobox');
      await input.fill('Ночной');

      await page.waitForTimeout(500);

      const options = page.locator('[role="option"]');
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should update aria-activedescendant on keyboard navigation', async ({ page }) => {
      const input = page.getByRole('combobox');
      await input.fill('Ночной');

      await page.waitForTimeout(500);

      // Initially no active descendant
      await expect(input).not.toHaveAttribute('aria-activedescendant');

      // Arrow down
      await page.keyboard.press('ArrowDown');
      await expect(input).toHaveAttribute('aria-activedescendant', 'suggestion-0');
    });
  });
});
