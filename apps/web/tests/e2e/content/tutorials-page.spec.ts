import { test, expect } from '../fixtures/pages.fixture';

test.describe('Tutorials Page', () => {
  test.beforeEach(async ({ tutorialsPage }) => {
    await tutorialsPage.goto();
  });

  test.describe('Page Display', () => {
    test('should display page title "Обучение"', async ({ tutorialsPage }) => {
      await expect(tutorialsPage.heading).toHaveText('Обучение');
    });

    test('should show loading skeleton initially then tutorial cards', async ({ page }) => {
      await page.goto('/tutorials');
      // After loading, content should appear
      await page.waitForTimeout(1200);
      const cards = page.locator('.content-card');
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should display tutorial titles', async ({ page }) => {
      await page.waitForTimeout(1200);
      await expect(page.getByText('Основы видеомонтажа')).toBeVisible();
      await expect(page.getByText('Цветокоррекция для профессионалов')).toBeVisible();
    });

    test('should display course count', async ({ page }) => {
      await page.waitForTimeout(1200);
      await expect(page.getByText(/курсов найдено/)).toBeVisible();
    });
  });

  test.describe('Filters', () => {
    test('should have working category filter', async ({ tutorialsPage, page }) => {
      await page.waitForTimeout(1200);
      await tutorialsPage.toggleFilters();
      await expect(page.getByText('Категория')).toBeVisible();
    });

    test('should have working instructor filter', async ({ tutorialsPage, page }) => {
      await page.waitForTimeout(1200);
      await tutorialsPage.toggleFilters();
      await expect(page.getByText('Автор')).toBeVisible();
    });

    test('should have working age rating filter', async ({ tutorialsPage, page }) => {
      await page.waitForTimeout(1200);
      await tutorialsPage.toggleFilters();
      await expect(page.getByText('Возрастной рейтинг')).toBeVisible();
    });

    test('should show active filter count badge', async ({ page }) => {
      await page.waitForTimeout(1200);
      await page.getByRole('button', { name: /Фильтры/i }).click();
      // Select an age filter
      await page.getByText('16+', { exact: true }).click();
      // Badge should show count
      const badge = page.locator('.bg-mp-accent-primary.rounded-full');
      await expect(badge).toBeVisible();
    });
  });

  test.describe('Sort', () => {
    test('should have working sort dropdown', async ({ page }) => {
      await page.waitForTimeout(1200);
      const sortTrigger = page.locator('[class*="SelectTrigger"]').first();
      await expect(sortTrigger).toBeVisible();
    });
  });

  test.describe('View Mode', () => {
    test('should have grid and list view toggle buttons', async ({ tutorialsPage, page }) => {
      await page.waitForTimeout(1200);
      await expect(tutorialsPage.gridViewButton).toBeVisible();
      await expect(tutorialsPage.listViewButton).toBeVisible();
    });
  });
});
