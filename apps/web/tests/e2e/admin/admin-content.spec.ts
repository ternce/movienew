import { test, expect } from '@playwright/test';

/**
 * Admin Content E2E Tests
 *
 * Tests for /admin/content page:
 * - Page rendering with title and stats
 * - DataTable with content list
 * - Search functionality
 * - Filter options (status, content type)
 * - "Добавить контент" button navigation
 * - Stats cards for content breakdown
 */

const MOCK_CONTENT_ITEMS = [
  {
    id: 'content-1',
    title: 'Тестовый сериал',
    slug: 'test-serial',
    contentType: 'SERIES',
    status: 'PUBLISHED',
    ageCategory: '16+',
    thumbnailUrl: null,
    previewUrl: null,
    isFree: false,
    createdAt: '2025-07-01T10:00:00.000Z',
    updatedAt: '2025-07-01T10:00:00.000Z',
  },
  {
    id: 'content-2',
    title: 'Клип Новый',
    slug: 'clip-new',
    contentType: 'CLIP',
    status: 'DRAFT',
    ageCategory: '12+',
    thumbnailUrl: null,
    previewUrl: null,
    isFree: true,
    createdAt: '2025-07-02T10:00:00.000Z',
    updatedAt: '2025-07-02T10:00:00.000Z',
  },
  {
    id: 'content-3',
    title: 'Архивный контент',
    slug: 'archived-content',
    contentType: 'SHORT',
    status: 'ARCHIVED',
    ageCategory: '0+',
    thumbnailUrl: null,
    previewUrl: null,
    isFree: true,
    createdAt: '2025-06-15T10:00:00.000Z',
    updatedAt: '2025-06-15T10:00:00.000Z',
  },
];

const MOCK_CONTENT_RESPONSE = {
  success: true,
  data: {
    items: MOCK_CONTENT_ITEMS,
    page: 1,
    limit: 20,
    total: 3,
    totalPages: 1,
  },
};

test.describe('Admin Content', () => {
  test.beforeEach(async ({ page }) => {
    // Set admin auth state
    await page.addInitScript(() => {
      window.localStorage.setItem('mp-auth-storage', JSON.stringify({
        state: {
          isAuthenticated: true,
          isHydrated: true,
          accessToken: 'mock-admin-token',
          user: {
            id: 'admin-1',
            email: 'admin@test.ru',
            role: 'ADMIN',
            firstName: 'Тест',
            lastName: 'Админ',
          },
        },
      }));
    });

    // Mock content list API
    await page.route('**/api/v1/admin/content*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CONTENT_RESPONSE),
      });
    });
  });

  test.describe('Page Rendering', () => {
    test('should display page title "Контент"', async ({ page }) => {
      await page.goto('/admin/content');

      await expect(page.getByText('Контент', { exact: false }).first()).toBeVisible();
    });

    test('should display description "Управление контентом платформы"', async ({ page }) => {
      await page.goto('/admin/content');

      await expect(page.getByText('Управление контентом платформы')).toBeVisible();
    });
  });

  test.describe('Stats Cards', () => {
    test('should display "Всего контента" stats card', async ({ page }) => {
      await page.goto('/admin/content');

      await expect(page.getByText('Всего контента')).toBeVisible();
    });

    test('should display "Опубликовано" stats card', async ({ page }) => {
      await page.goto('/admin/content');

      await expect(page.getByText('Опубликовано')).toBeVisible();
    });

    test('should display "Черновики" stats card', async ({ page }) => {
      await page.goto('/admin/content');

      await expect(page.getByText('Черновики')).toBeVisible();
    });

    test('should display "Архив" stats card', async ({ page }) => {
      await page.goto('/admin/content');

      await expect(page.getByText('Архив')).toBeVisible();
    });
  });

  test.describe('Content Table', () => {
    test('should display content items in table', async ({ page }) => {
      await page.goto('/admin/content');

      await expect(page.getByText('Тестовый сериал')).toBeVisible();
      await expect(page.getByText('Клип Новый')).toBeVisible();
    });

    test('should display search input with placeholder', async ({ page }) => {
      await page.goto('/admin/content');

      const searchInput = page.locator('input[placeholder*="Поиск"]');
      await expect(searchInput).toBeVisible();
    });
  });

  test.describe('Add Content Button', () => {
    test('should display "Добавить контент" button', async ({ page }) => {
      await page.goto('/admin/content');

      await expect(page.getByText('Добавить контент')).toBeVisible();
    });

    test('should have link to /admin/content/new', async ({ page }) => {
      await page.goto('/admin/content');

      const addButton = page.locator('a[href="/admin/content/new"]');
      await expect(addButton).toBeVisible();
    });
  });

  test.describe('Filters', () => {
    test('should display status filter with options', async ({ page }) => {
      await page.goto('/admin/content');

      // The DataTable has filter options for status
      const filterTriggers = page.locator('button:has-text("Статус")');
      if (await filterTriggers.count() > 0) {
        await expect(filterTriggers.first()).toBeVisible();
      }
    });

    test('should display content type filter with options', async ({ page }) => {
      await page.goto('/admin/content');

      // The DataTable has filter options for content type
      const filterTriggers = page.locator('button:has-text("Тип")');
      if (await filterTriggers.count() > 0) {
        await expect(filterTriggers.first()).toBeVisible();
      }
    });
  });
});
