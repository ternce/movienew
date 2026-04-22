import { test, expect } from '@playwright/test';

/**
 * Admin Reports E2E Tests
 *
 * Tests for /admin/reports page:
 * - Page rendering with title "Отчёты"
 * - 6 stats cards: Выручка, Пользователи, Контент, Подписки, Партнёры, Заказы
 * - Charts: График выручки, Рост пользователей, Выручка по источникам
 * - Uses useAdminDashboard() and useAdminPaymentStats()
 */

const MOCK_DASHBOARD = {
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
      { period: '2025-04', subscriptionRevenue: 40000, storeRevenue: 15000, totalRevenue: 55000 },
      { period: '2025-05', subscriptionRevenue: 42000, storeRevenue: 16000, totalRevenue: 58000 },
      { period: '2025-06', subscriptionRevenue: 45000, storeRevenue: 18000, totalRevenue: 63000 },
      { period: '2025-07', subscriptionRevenue: 50000, storeRevenue: 20000, totalRevenue: 70000 },
    ],
    userGrowth: [
      { date: '2025-07-01', newUsers: 15, totalUsers: 1200 },
      { date: '2025-07-02', newUsers: 22, totalUsers: 1222 },
      { date: '2025-07-03', newUsers: 18, totalUsers: 1240 },
    ],
    recentTransactions: [],
  },
};

const MOCK_PAYMENT_STATS = {
  success: true,
  data: {
    totalRevenue: 5500000,
    monthlyRevenue: 850000,
    transactionCount: 1234,
    refundCount: 18,
    averageTransaction: 4500,
    completedCount: 980,
    pendingCount: 120,
    failedCount: 34,
  },
};

test.describe('Admin Reports', () => {
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
          body: JSON.stringify({ success: true, data: MOCK_DASHBOARD.data.stats }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_DASHBOARD),
        });
      }
    });

    await page.route('**/api/v1/admin/dashboard/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_DASHBOARD.data.stats }),
      });
    });

    // Mock payment stats API
    await page.route('**/api/v1/admin/payments/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PAYMENT_STATS),
      });
    });
  });

  test.describe('Page Rendering', () => {
    test('should display page title "Отчёты"', async ({ page }) => {
      await page.goto('/admin/reports');

      await expect(page.getByText('Отчёты')).toBeVisible();
    });

    test('should display description "Аналитика и статистика платформы"', async ({ page }) => {
      await page.goto('/admin/reports');

      await expect(page.getByText('Аналитика и статистика платформы')).toBeVisible();
    });
  });

  test.describe('Stats Cards', () => {
    test('should display "Выручка" stats card', async ({ page }) => {
      await page.goto('/admin/reports');

      await expect(page.getByText('Выручка').first()).toBeVisible();
      await expect(page.getByText('Общая выручка платформы')).toBeVisible();
    });

    test('should display "Пользователи" stats card', async ({ page }) => {
      await page.goto('/admin/reports');

      await expect(page.getByText('Пользователи').first()).toBeVisible();
      await expect(page.getByText('Зарегистрировано')).toBeVisible();
    });

    test('should display "Контент" stats card', async ({ page }) => {
      await page.goto('/admin/reports');

      await expect(page.getByText('Контент').first()).toBeVisible();
      await expect(page.getByText('Единиц контента')).toBeVisible();
    });

    test('should display "Подписки" stats card', async ({ page }) => {
      await page.goto('/admin/reports');

      await expect(page.getByText('Подписки').first()).toBeVisible();
      await expect(page.getByText('Активных подписок')).toBeVisible();
    });

    test('should display "Партнёры" stats card', async ({ page }) => {
      await page.goto('/admin/reports');

      await expect(page.getByText('Партнёры').first()).toBeVisible();
      await expect(page.getByText('В партнёрской программе')).toBeVisible();
    });

    test('should display "Заказы" stats card', async ({ page }) => {
      await page.goto('/admin/reports');

      await expect(page.getByText('Заказы').first()).toBeVisible();
      await expect(page.getByText('Ожидающих обработки')).toBeVisible();
    });
  });

  test.describe('Charts', () => {
    test('should display "График выручки" chart', async ({ page }) => {
      await page.goto('/admin/reports');

      await expect(page.getByText('График выручки')).toBeVisible();
    });

    test('should display "Рост пользователей" chart', async ({ page }) => {
      await page.goto('/admin/reports');

      await expect(page.getByText('Рост пользователей')).toBeVisible();
    });

    test('should display "Выручка по источникам" chart', async ({ page }) => {
      await page.goto('/admin/reports');

      await expect(page.getByText('Выручка по источникам')).toBeVisible();
    });

    test('should display chart descriptions', async ({ page }) => {
      await page.goto('/admin/reports');

      await expect(page.getByText('Динамика выручки за последние 12 месяцев')).toBeVisible();
      await expect(page.getByText('Регистрации новых пользователей за 30 дней')).toBeVisible();
      await expect(page.getByText('Сравнение подписок и магазина по месяцам')).toBeVisible();
    });
  });
});
