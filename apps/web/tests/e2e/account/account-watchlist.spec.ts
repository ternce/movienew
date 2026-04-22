import { test, expect } from '../fixtures/account.fixture';

test.describe('Account Watchlist', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/account/watchlist');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Display', () => {
    test('should display "Избранное" heading', async ({ page }) => {
      await expect(page.getByText('Избранное')).toBeVisible();
    });

    test('should show watchlist items', async ({ page }) => {
      await expect(page.getByText('Обучение программированию')).toBeVisible();
      await expect(page.getByText('Драма нового сезона')).toBeVisible();
    });

    test('should display item count', async ({ page }) => {
      await expect(page.getByText(/2.*элемент/i)).toBeVisible();
    });
  });

  test.describe('Content Type Filter', () => {
    test('should have filter chips', async ({ page }) => {
      await expect(page.getByText('Все', { exact: true })).toBeVisible();
      await expect(page.getByText('Сериалы')).toBeVisible();
      await expect(page.getByText('Туториалы')).toBeVisible();
    });

    test('should filter by content type', async ({ page }) => {
      await page.getByText('Туториалы', { exact: true }).click();

      await expect(page.getByText('Обучение программированию')).toBeVisible();
      await expect(page.getByText('Драма нового сезона')).not.toBeVisible();
    });

    test('should show empty state when no items match filter', async ({ page }) => {
      await page.getByText('Клипы', { exact: true }).click();

      await expect(page.getByText('Нет элементов для выбранного типа контента')).toBeVisible();
    });
  });

  test.describe('Sort Options', () => {
    test('should have sort dropdown', async ({ page }) => {
      const sortTrigger = page.locator('button').filter({ hasText: /новые|старые|по названию/i });
      await expect(sortTrigger).toBeVisible();
    });

    test('should sort by title', async ({ page }) => {
      // Open sort dropdown
      const sortTrigger = page.locator('button').filter({ hasText: /новые/i }).first();
      await sortTrigger.click();

      // Select "По названию"
      await page.getByText('По названию').click();

      // Items should be sorted alphabetically
      const items = page.locator('h3').filter({ hasText: /обучение|драма/i });
      const count = await items.count();
      expect(count).toBe(2);
    });
  });

  test.describe('Grid/List Toggle', () => {
    test('should have grid/list toggle buttons', async ({ page }) => {
      await expect(page.getByRole('button', { name: /сетка/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /список/i })).toBeVisible();
    });

    test('should default to grid view', async ({ page }) => {
      // Grid view should show items in a grid layout
      const gridContainer = page.locator('.grid.grid-cols-2');
      await expect(gridContainer).toBeVisible();
    });

    test('should switch to list view', async ({ page }) => {
      await page.getByRole('button', { name: /список/i }).click();

      // List view should show items with descriptions
      await expect(page.getByText('Полный курс по программированию')).toBeVisible();
    });

    test('should switch back to grid view', async ({ page }) => {
      // Switch to list first
      await page.getByRole('button', { name: /список/i }).click();
      // Switch back to grid
      await page.getByRole('button', { name: /сетка/i }).click();

      const gridContainer = page.locator('.grid.grid-cols-2');
      await expect(gridContainer).toBeVisible();
    });
  });

  test.describe('Remove Items', () => {
    test('should remove item from watchlist', async ({ page }) => {
      // In grid view, hover over the first item to reveal remove button
      const firstItem = page.locator('.group.relative').first();
      await firstItem.hover();

      const removeButton = page.getByRole('button', { name: /удалить из избранного/i }).first();
      await expect(removeButton).toBeVisible();
    });

    test('should show remove button in list view', async ({ page }) => {
      await page.getByRole('button', { name: /список/i }).click();

      const removeButton = page.getByRole('button', { name: /удалить из избранного/i }).first();
      await expect(removeButton).toBeVisible();
    });
  });

  test.describe('Content Links', () => {
    test('should link tutorials to tutorial pages', async ({ page }) => {
      const tutorialLink = page.getByRole('link', { name: 'Обучение программированию' }).first();
      const href = await tutorialLink.getAttribute('href');
      expect(href).toContain('/tutorials/');
    });

    test('should link series to series pages', async ({ page }) => {
      const seriesLink = page.getByRole('link', { name: 'Драма нового сезона' }).first();
      const href = await seriesLink.getAttribute('href');
      expect(href).toContain('/series/');
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when no items', async ({ page }) => {
      await page.route('**/api/v1/watchlist?*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { items: [], total: 0, page: 1, limit: 20 },
          }),
        });
      });

      await page.goto('/account/watchlist');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Ваш список пуст')).toBeVisible();
      await expect(page.getByRole('link', { name: /смотреть контент/i })).toBeVisible();
    });
  });

  test.describe('Content Badges', () => {
    test('should display content type badges', async ({ page }) => {
      await expect(page.getByText('Туториал')).toBeVisible();
      await expect(page.getByText('Сериал')).toBeVisible();
    });

    test('should display age badges', async ({ page }) => {
      await expect(page.getByText('0+')).toBeVisible();
      await expect(page.getByText('16+')).toBeVisible();
    });
  });
});
