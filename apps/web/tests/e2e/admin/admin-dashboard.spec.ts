import { test, expect } from '@playwright/test';

/**
 * Admin Dashboard E2E Tests
 *
 * Tests for /admin/dashboard page:
 * - Page rendering with stats cards
 * - Charts section
 * - Pending actions section
 * - Recent transactions section
 * - Navigation from action cards
 * - Loading and error states
 */

const MOCK_DASHBOARD_OVERVIEW = {
  success: true,
  data: {
    stats: {
      totalUsers: 1250,
      newUsersToday: 15,
      activeSubscriptions: 850,
      monthlyRevenue: 125000,
      pendingOrders: 8,
      pendingVerifications: 12,
      pendingWithdrawals: 5,
      contentCount: 320,
      productCount: 45,
    },
    revenueByMonth: [
      { period: '2025-06', subscriptionRevenue: 45000, storeRevenue: 18000, totalRevenue: 63000 },
      { period: '2025-07', subscriptionRevenue: 50000, storeRevenue: 20000, totalRevenue: 70000 },
    ],
    userGrowth: [
      { date: '2025-07-01', newUsers: 15, totalUsers: 1200 },
      { date: '2025-07-02', newUsers: 22, totalUsers: 1222 },
    ],
    recentTransactions: [
      {
        id: 'tx-1',
        userEmail: 'user1@test.ru',
        type: 'SUBSCRIPTION',
        amount: 990,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'tx-2',
        userEmail: 'user2@test.ru',
        type: 'PURCHASE',
        amount: 2500,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'tx-3',
        userEmail: 'user3@test.ru',
        type: 'WITHDRAWAL',
        amount: 5000,
        status: 'PROCESSING',
        createdAt: new Date().toISOString(),
      },
    ],
  },
};

test.describe('Admin Dashboard', () => {
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

    // Mock dashboard overview API
    await page.route('**/api/v1/admin/dashboard', async (route) => {
      if (route.request().url().includes('/stats')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_DASHBOARD_OVERVIEW.data.stats }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_DASHBOARD_OVERVIEW),
        });
      }
    });

    await page.route('**/api/v1/admin/dashboard/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_DASHBOARD_OVERVIEW.data.stats }),
      });
    });
  });

  test.describe('Page Rendering', () => {
    test('should display page title "Панель управления"', async ({ page }) => {
      await page.goto('/admin/dashboard');

      await expect(page.getByText('Панель управления')).toBeVisible();
    });

    test('should display description text', async ({ page }) => {
      await page.goto('/admin/dashboard');

      await expect(page.getByText('Обзор статистики платформы MoviePlatform')).toBeVisible();
    });
  });

  test.describe('Stats Cards', () => {
    test('should display "Пользователи" stats card', async ({ page }) => {
      await page.goto('/admin/dashboard');

      await expect(page.getByText('Пользователи')).toBeVisible();
    });

    test('should display "Подписки" stats card', async ({ page }) => {
      await page.goto('/admin/dashboard');

      await expect(page.getByText('Подписки')).toBeVisible();
    });

    test('should display "Выручка (мес.)" stats card', async ({ page }) => {
      await page.goto('/admin/dashboard');

      await expect(page.getByText('Выручка (мес.)')).toBeVisible();
    });

    test('should display "Контент" stats card', async ({ page }) => {
      await page.goto('/admin/dashboard');

      await expect(page.getByText('Контент')).toBeVisible();
    });

    test('should display formatted user count from API data', async ({ page }) => {
      await page.goto('/admin/dashboard');

      // 1250 formatted with locale -> "1 250" or "1,250"
      await expect(page.locator('text=/1.*250/')).toBeVisible();
    });
  });

  test.describe('Charts', () => {
    test('should display "Выручка по месяцам" chart title', async ({ page }) => {
      await page.goto('/admin/dashboard');

      await expect(page.getByText('Выручка по месяцам')).toBeVisible();
    });

    test('should display "Рост пользователей" chart title', async ({ page }) => {
      await page.goto('/admin/dashboard');

      await expect(page.getByText('Рост пользователей')).toBeVisible();
    });
  });

  test.describe('Pending Actions', () => {
    test('should display "Требуют внимания" section heading', async ({ page }) => {
      await page.goto('/admin/dashboard');

      await expect(page.getByText('Требуют внимания')).toBeVisible();
    });

    test('should display "Верификации" action card with count', async ({ page }) => {
      await page.goto('/admin/dashboard');

      const verificationCard = page.locator('a[href="/admin/verifications"]');
      await expect(verificationCard).toBeVisible();
      await expect(verificationCard.getByText('Верификации')).toBeVisible();
      await expect(verificationCard.getByText('12')).toBeVisible();
    });

    test('should display "Выводы средств" action card with count', async ({ page }) => {
      await page.goto('/admin/dashboard');

      const withdrawalCard = page.locator('a[href="/admin/payments"]');
      await expect(withdrawalCard).toBeVisible();
      await expect(withdrawalCard.getByText('Выводы средств')).toBeVisible();
      await expect(withdrawalCard.getByText('5')).toBeVisible();
    });

    test('should display "Заказы" action card with count', async ({ page }) => {
      await page.goto('/admin/dashboard');

      const ordersCard = page.locator('a[href="/admin/store/orders"]');
      await expect(ordersCard).toBeVisible();
      await expect(ordersCard.getByText('Заказы')).toBeVisible();
      await expect(ordersCard.getByText('8')).toBeVisible();
    });

    test('should display "Истекающие подписки" action card', async ({ page }) => {
      await page.goto('/admin/dashboard');

      const subscriptionsCard = page.locator('a[href="/admin/subscriptions"]');
      await expect(subscriptionsCard).toBeVisible();
      await expect(subscriptionsCard.getByText('Истекающие подписки')).toBeVisible();
    });
  });

  test.describe('Recent Transactions', () => {
    test('should display "Последние транзакции" section heading', async ({ page }) => {
      await page.goto('/admin/dashboard');

      await expect(page.getByText('Последние транзакции')).toBeVisible();
    });

    test('should display transaction email addresses', async ({ page }) => {
      await page.goto('/admin/dashboard');

      await expect(page.getByText('user1@test.ru')).toBeVisible();
      await expect(page.getByText('user2@test.ru')).toBeVisible();
      await expect(page.getByText('user3@test.ru')).toBeVisible();
    });

    test('should display transaction status badges', async ({ page }) => {
      await page.goto('/admin/dashboard');

      await expect(page.getByText('Завершён')).toBeVisible();
      await expect(page.getByText('Ожидание')).toBeVisible();
      await expect(page.getByText('Обработка')).toBeVisible();
    });
  });
});
