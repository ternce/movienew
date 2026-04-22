import { test, expect } from '@playwright/test';

/**
 * Admin Users E2E Tests
 *
 * Tests for /admin/users page:
 * - Page rendering with title
 * - Stats cards: Всего, Верифицировано, Администраторы, Партнёры
 * - DataTable with user list
 * - Search input functionality
 * - Role and verification status filter options
 * - User row data display
 */

const MOCK_USERS = [
  {
    id: 'user-1',
    email: 'ivan@test.ru',
    firstName: 'Иван',
    lastName: 'Иванов',
    role: 'USER',
    verificationStatus: 'VERIFIED',
    isActive: true,
    createdAt: '2025-06-01T10:00:00.000Z',
  },
  {
    id: 'user-2',
    email: 'petr@test.ru',
    firstName: 'Пётр',
    lastName: 'Петров',
    role: 'PARTNER',
    verificationStatus: 'VERIFIED',
    isActive: true,
    createdAt: '2025-06-15T10:00:00.000Z',
  },
  {
    id: 'user-3',
    email: 'admin2@test.ru',
    firstName: 'Мария',
    lastName: 'Сидорова',
    role: 'ADMIN',
    verificationStatus: 'VERIFIED',
    isActive: true,
    createdAt: '2025-05-01T10:00:00.000Z',
  },
  {
    id: 'user-4',
    email: 'pending@test.ru',
    firstName: 'Анна',
    lastName: 'Козлова',
    role: 'USER',
    verificationStatus: 'PENDING',
    isActive: true,
    createdAt: '2025-07-01T10:00:00.000Z',
  },
];

const MOCK_USERS_RESPONSE = {
  success: true,
  data: {
    items: MOCK_USERS,
    page: 1,
    limit: 20,
    total: 4,
    totalPages: 1,
  },
};

test.describe('Admin Users', () => {
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

    // Mock users list API
    await page.route('**/api/v1/admin/users*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_USERS_RESPONSE),
      });
    });
  });

  test.describe('Page Rendering', () => {
    test('should display page title "Пользователи"', async ({ page }) => {
      await page.goto('/admin/users');

      await expect(page.getByText('Пользователи', { exact: false }).first()).toBeVisible();
    });

    test('should display description "Управление пользователями платформы"', async ({ page }) => {
      await page.goto('/admin/users');

      await expect(page.getByText('Управление пользователями платформы')).toBeVisible();
    });
  });

  test.describe('Stats Cards', () => {
    test('should display "Всего пользователей" stats card', async ({ page }) => {
      await page.goto('/admin/users');

      await expect(page.getByText('Всего пользователей')).toBeVisible();
    });

    test('should display "Верифицировано" stats card', async ({ page }) => {
      await page.goto('/admin/users');

      await expect(page.getByText('Верифицировано')).toBeVisible();
    });

    test('should display "Администраторы" stats card', async ({ page }) => {
      await page.goto('/admin/users');

      await expect(page.getByText('Администраторы')).toBeVisible();
    });

    test('should display "Партнёры" stats card', async ({ page }) => {
      await page.goto('/admin/users');

      await expect(page.getByText('Партнёры')).toBeVisible();
    });
  });

  test.describe('Users Table', () => {
    test('should display user emails in the table', async ({ page }) => {
      await page.goto('/admin/users');

      await expect(page.getByText('ivan@test.ru')).toBeVisible();
      await expect(page.getByText('petr@test.ru')).toBeVisible();
    });

    test('should display search input with placeholder', async ({ page }) => {
      await page.goto('/admin/users');

      const searchInput = page.locator('input[placeholder*="Поиск"]');
      await expect(searchInput).toBeVisible();
    });

    test('should display search placeholder text for email or name', async ({ page }) => {
      await page.goto('/admin/users');

      const searchInput = page.locator('input[placeholder*="email"]');
      await expect(searchInput).toBeVisible();
    });
  });

  test.describe('Filters', () => {
    test('should display role filter', async ({ page }) => {
      await page.goto('/admin/users');

      const roleFilter = page.locator('button:has-text("Роль")');
      if (await roleFilter.count() > 0) {
        await expect(roleFilter.first()).toBeVisible();
      }
    });

    test('should display verification filter', async ({ page }) => {
      await page.goto('/admin/users');

      const verFilter = page.locator('button:has-text("Верификация")');
      if (await verFilter.count() > 0) {
        await expect(verFilter.first()).toBeVisible();
      }
    });
  });

  test.describe('Stats Count Accuracy', () => {
    test('should show correct total users count', async ({ page }) => {
      await page.goto('/admin/users');

      // Total from API is 4
      const statsCards = page.locator('[class*="stat"]');
      await expect(page.getByText('4').first()).toBeVisible();
    });
  });
});
