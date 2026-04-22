import { test, expect } from '@playwright/test';

/**
 * Admin Payments E2E Tests
 *
 * Tests for /admin/payments page:
 * - Page rendering with title and description
 * - Stats cards: Общая выручка, Выручка за месяц, Транзакций, Возвраты
 * - DataTable with transaction list
 * - Search by email or transaction ID
 * - Status and type filters
 * - Transaction status badges
 * - Currency formatting
 */

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

const MOCK_TRANSACTIONS = {
  success: true,
  data: {
    items: [
      {
        id: 'tx-pay-1',
        userId: 'user-1',
        userEmail: 'buyer@test.ru',
        type: 'SUBSCRIPTION',
        amount: 990,
        currency: 'RUB',
        bonusUsed: 0,
        paymentMethod: 'card',
        status: 'COMPLETED',
        createdAt: '2025-07-15T10:00:00.000Z',
        updatedAt: '2025-07-15T10:00:00.000Z',
      },
      {
        id: 'tx-pay-2',
        userId: 'user-2',
        userEmail: 'shopper@test.ru',
        type: 'STORE',
        amount: 2500,
        currency: 'RUB',
        bonusUsed: 100,
        paymentMethod: 'sbp',
        status: 'PENDING',
        createdAt: '2025-07-16T10:00:00.000Z',
        updatedAt: '2025-07-16T10:00:00.000Z',
      },
      {
        id: 'tx-pay-3',
        userId: 'user-3',
        userEmail: 'partner@test.ru',
        type: 'WITHDRAWAL',
        amount: 15000,
        currency: 'RUB',
        bonusUsed: 0,
        paymentMethod: 'bank_transfer',
        status: 'PROCESSING',
        createdAt: '2025-07-17T10:00:00.000Z',
        updatedAt: '2025-07-17T10:00:00.000Z',
      },
    ],
    page: 1,
    limit: 20,
    total: 3,
    totalPages: 1,
  },
};

test.describe('Admin Payments', () => {
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

    // Mock payment stats API
    await page.route('**/api/v1/admin/payments/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PAYMENT_STATS),
      });
    });

    // Mock transactions list API
    await page.route('**/api/v1/admin/payments/transactions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_TRANSACTIONS),
      });
    });
  });

  test.describe('Page Rendering', () => {
    test('should display page title "Платежи"', async ({ page }) => {
      await page.goto('/admin/payments');

      await expect(page.getByText('Платежи', { exact: false }).first()).toBeVisible();
    });

    test('should display description "Управление транзакциями"', async ({ page }) => {
      await page.goto('/admin/payments');

      await expect(page.getByText('Управление транзакциями')).toBeVisible();
    });
  });

  test.describe('Stats Cards', () => {
    test('should display "Общая выручка" stats card', async ({ page }) => {
      await page.goto('/admin/payments');

      await expect(page.getByText('Общая выручка')).toBeVisible();
    });

    test('should display "Выручка за месяц" stats card', async ({ page }) => {
      await page.goto('/admin/payments');

      await expect(page.getByText('Выручка за месяц')).toBeVisible();
    });

    test('should display "Транзакций" stats card', async ({ page }) => {
      await page.goto('/admin/payments');

      await expect(page.getByText('Транзакций')).toBeVisible();
    });

    test('should display "Возвраты" stats card', async ({ page }) => {
      await page.goto('/admin/payments');

      await expect(page.getByText('Возвраты')).toBeVisible();
    });
  });

  test.describe('Transactions Table', () => {
    test('should display transaction emails', async ({ page }) => {
      await page.goto('/admin/payments');

      await expect(page.getByText('buyer@test.ru')).toBeVisible();
      await expect(page.getByText('shopper@test.ru')).toBeVisible();
      await expect(page.getByText('partner@test.ru')).toBeVisible();
    });

    test('should display transaction type badges', async ({ page }) => {
      await page.goto('/admin/payments');

      await expect(page.getByText('Подписка')).toBeVisible();
      await expect(page.getByText('Магазин')).toBeVisible();
      await expect(page.getByText('Вывод')).toBeVisible();
    });

    test('should display transaction status badges', async ({ page }) => {
      await page.goto('/admin/payments');

      await expect(page.getByText('Завершено')).toBeVisible();
      await expect(page.getByText('Ожидание')).toBeVisible();
      await expect(page.getByText('Обработка')).toBeVisible();
    });
  });

  test.describe('Filters', () => {
    test('should display "Фильтры:" label', async ({ page }) => {
      await page.goto('/admin/payments');

      await expect(page.getByText('Фильтры:')).toBeVisible();
    });

    test('should display search input with placeholder', async ({ page }) => {
      await page.goto('/admin/payments');

      const searchInput = page.locator('input[placeholder*="Email"]');
      await expect(searchInput).toBeVisible();
    });

    test('should display status filter dropdown', async ({ page }) => {
      await page.goto('/admin/payments');

      // Status select trigger
      await expect(page.getByText('Все статусы')).toBeVisible();
    });

    test('should display type filter dropdown', async ({ page }) => {
      await page.goto('/admin/payments');

      // Type select trigger
      await expect(page.getByText('Все типы')).toBeVisible();
    });
  });
});
