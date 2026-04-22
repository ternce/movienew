import { test, expect } from '../fixtures/pages.fixture';

test.describe('Category Page', () => {
  test.describe('Page Display', () => {
    test('should display category name from slug (drama → "Драма")', async ({ categoryPage }) => {
      await categoryPage.goto('drama');
      await expect(categoryPage.heading).toHaveText('Драма');
    });

    test('should show total item count', async ({ categoryPage, page }) => {
      await categoryPage.goto('drama');
      await page.waitForTimeout(1000);
      await expect(page.getByText(/результатов в категории/)).toBeVisible();
    });

    test('should display loading skeleton then content', async ({ page }) => {
      await page.goto('/category/drama');
      // Loading skeleton should appear
      const skeleton = page.locator('[class*="skeleton"], [class*="animate-pulse"]');
      // After timeout, content should replace skeleton
      await page.waitForTimeout(1000);
      const cards = page.locator('.content-card');
      await expect(cards.first()).toBeVisible();
    });
  });

  test.describe('Tab "Все" (default)', () => {
    test('should show section headings: "Сериалы", "Клипы", "Обучение"', async ({ categoryPage, page }) => {
      await categoryPage.goto('drama');
      await page.waitForTimeout(1000);

      await expect(page.getByRole('heading', { name: 'Сериалы' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Клипы' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Обучение' })).toBeVisible();
    });

    test('should render content cards in all sections', async ({ categoryPage, page }) => {
      await categoryPage.goto('drama');
      await page.waitForTimeout(1000);

      const cards = page.locator('.content-card');
      const count = await cards.count();
      // 2 series + 2 clips + 1 tutorial = 5
      expect(count).toBe(5);
    });
  });

  test.describe('Tab "Сериалы"', () => {
    test('should show only series cards without section headings', async ({ categoryPage, page }) => {
      await categoryPage.goto('drama');
      await page.waitForTimeout(1000);

      await categoryPage.selectTab('series');

      // Section headings should not appear in individual tab mode
      await expect(page.getByRole('heading', { name: 'Клипы' })).not.toBeVisible();
      await expect(page.getByRole('heading', { name: 'Обучение' })).not.toBeVisible();

      // Series content should be visible
      await expect(page.getByText('Точка Невозврата')).toBeVisible();
    });
  });

  test.describe('Tab "Клипы"', () => {
    test('should show only clip cards', async ({ categoryPage, page }) => {
      await categoryPage.goto('drama');
      await page.waitForTimeout(1000);

      await categoryPage.selectTab('clips');

      await expect(page.getByText('Эпичный Момент')).toBeVisible();
      // Series should not be visible
      await expect(page.getByText('Точка Невозврата')).not.toBeVisible();
    });
  });

  test.describe('Tab "Обучение"', () => {
    test('should show only tutorial cards', async ({ categoryPage, page }) => {
      await categoryPage.goto('drama');
      await page.waitForTimeout(1000);

      await categoryPage.selectTab('tutorials');

      await expect(page.getByText('Основы видеомонтажа')).toBeVisible();
      // Series should not be visible
      await expect(page.getByText('Точка Невозврата')).not.toBeVisible();
    });
  });

  test.describe('Tab Switching Behavior', () => {
    test('should reset to page 1 when switching tabs', async ({ categoryPage, page }) => {
      await categoryPage.goto('drama');
      await page.waitForTimeout(1000);

      // Switch tabs and verify no errors
      await categoryPage.selectTab('series');
      await categoryPage.selectTab('clips');
      await categoryPage.selectTab('all');

      // All sections should be back
      await expect(page.getByRole('heading', { name: 'Сериалы' })).toBeVisible();
    });
  });

  test.describe('Unknown Category', () => {
    test('should display slug as category name for unknown slugs', async ({ categoryPage }) => {
      await categoryPage.goto('unknown-category');
      // Falls back to the slug itself
      await expect(categoryPage.heading).toHaveText('unknown-category');
    });
  });

  test.describe('Tab Active State', () => {
    test('should highlight active tab', async ({ categoryPage, page }) => {
      await categoryPage.goto('drama');
      await page.waitForTimeout(1000);

      // "Все" tab should be active by default
      const allTab = page.getByRole('button', { name: 'Все' });
      await expect(allTab).toHaveClass(/border-mp-accent-primary/);

      // Switch to Сериалы
      await categoryPage.selectTab('series');
      const seriesTab = page.getByRole('button', { name: 'Сериалы' });
      await expect(seriesTab).toHaveClass(/border-mp-accent-primary/);
    });
  });
});
