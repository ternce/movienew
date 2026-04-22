import { test, expect } from '../fixtures/account.fixture';

test.describe('Account Watch History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/account/history');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Display', () => {
    test('should display "История просмотров" heading', async ({ page }) => {
      await expect(page.getByText('История просмотров')).toBeVisible();
    });

    test('should show history items with titles', async ({ page }) => {
      await expect(page.getByText('Ночной патруль')).toBeVisible();
      await expect(page.getByText('Весёлые клипы')).toBeVisible();
    });
  });

  test.describe('Continue Watching', () => {
    test('should display continue watching section', async ({ page }) => {
      await expect(page.getByText('Продолжить просмотр')).toBeVisible();
    });

    test('should show in-progress content', async ({ page }) => {
      // Content with progress < 100 should appear in continue watching
      const continueSection = page.locator(':has(> :text("Продолжить просмотр"))').first();
      await expect(continueSection).toBeVisible();
    });
  });

  test.describe('Content Type Filter', () => {
    test('should have filter chips', async ({ page }) => {
      await expect(page.getByText('Все', { exact: true })).toBeVisible();
      await expect(page.getByText('Сериалы')).toBeVisible();
      await expect(page.getByText('Клипы')).toBeVisible();
    });

    test('should filter by content type', async ({ page }) => {
      // Click on Клипы filter
      await page.getByText('Клипы', { exact: true }).click();

      // Should show only clips
      await expect(page.getByText('Весёлые клипы')).toBeVisible();
      // Series should not be visible (filtered out)
      await expect(page.getByText('Ночной патруль')).not.toBeVisible();
    });

    test('should show all items when "Все" is selected', async ({ page }) => {
      // Click on a filter first
      await page.getByText('Клипы', { exact: true }).click();
      // Then click "Все"
      await page.getByText('Все', { exact: true }).click();

      await expect(page.getByText('Ночной патруль')).toBeVisible();
      await expect(page.getByText('Весёлые клипы')).toBeVisible();
    });

    test('should show empty state when no items match filter', async ({ page }) => {
      // Click on Туториалы — no tutorials in mock data
      await page.getByText('Туториалы', { exact: true }).click();

      await expect(page.getByText('Нет записей для выбранного типа')).toBeVisible();
    });
  });

  test.describe('Date Grouping', () => {
    test('should group items by date', async ({ page }) => {
      // Today's item should be under "Сегодня"
      await expect(page.getByText('Сегодня')).toBeVisible();
    });

    test('should show "Вчера" group for yesterday items', async ({ page }) => {
      await expect(page.getByText('Вчера')).toBeVisible();
    });
  });

  test.describe('Remove Items', () => {
    test('should show remove button on hover', async ({ page }) => {
      // Hover over the first item to reveal the remove button
      const firstItem = page.getByText('Ночной патруль').first();
      await firstItem.hover();

      const removeButton = page.getByRole('button', { name: /удалить/i }).first();
      await expect(removeButton).toBeVisible();
    });
  });

  test.describe('Clear All History', () => {
    test('should have "Очистить" button', async ({ page }) => {
      await expect(page.getByText('Очистить', { exact: true })).toBeVisible();
    });

    test('should show confirmation when clicking clear', async ({ page }) => {
      await page.getByText('Очистить', { exact: true }).click();

      // Confirmation prompt should appear
      await expect(page.getByText('Да')).toBeVisible();
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when no history', async ({ page }) => {
      // Mock empty watch history
      await page.route('**/api/v1/watch-history?*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { items: [], total: 0, page: 1, limit: 20 },
          }),
        });
      });

      await page.goto('/account/history');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('История просмотров пуста')).toBeVisible();
    });
  });
});
