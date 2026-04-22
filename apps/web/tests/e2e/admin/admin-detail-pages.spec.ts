import { test, expect } from '@playwright/test';

/**
 * Admin Detail Pages E2E Tests
 *
 * Tests for admin detail pages:
 * - User detail: profile, subscription, bonus balance, role change, ban/unban
 * - Payment detail: amount, method, status, refund
 * - Partner detail: level, referrals, earnings
 * - Store order detail: items, status
 */

const MOCK_USER_DETAIL = {
  success: true,
  data: {
    id: 'user-1',
    email: 'ivan@test.movieplatform.ru',
    firstName: 'Иван',
    lastName: 'Иванов',
    role: 'BUYER',
    verificationStatus: 'VERIFIED',
    isActive: true,
    bonusBalance: 15000,
    ageCategory: '18+',
    referralCode: 'REF-IVAN-123',
    lastLoginAt: '2025-08-01T12:00:00.000Z',
    createdAt: '2025-01-15T10:00:00.000Z',
    subscriptions: [
      {
        id: 'sub-1',
        planName: 'Премиум подписка',
        status: 'ACTIVE',
        startedAt: '2025-07-01T00:00:00.000Z',
        expiresAt: '2025-10-01T00:00:00.000Z',
      },
    ],
    recentTransactions: [
      {
        id: 'tx-user-1',
        type: 'SUBSCRIPTION',
        amount: 990,
        status: 'COMPLETED',
        createdAt: '2025-07-01T10:00:00.000Z',
      },
    ],
    bonusTransactions: [
      {
        id: 'bt-1',
        type: 'EARN',
        amount: 500,
        source: 'REFERRAL',
        createdAt: '2025-07-10T10:00:00.000Z',
      },
    ],
    sessions: [],
  },
};

const MOCK_BANNED_USER = {
  success: true,
  data: {
    ...MOCK_USER_DETAIL.data,
    id: 'user-banned',
    email: 'banned@test.movieplatform.ru',
    firstName: 'Блок',
    lastName: 'Блоков',
    isActive: false,
    bonusBalance: 0,
    subscriptions: [],
    recentTransactions: [],
    bonusTransactions: [],
    sessions: [],
  },
};

const MOCK_PAYMENT_DETAIL = {
  success: true,
  data: {
    id: 'tx-1',
    userId: 'user-1',
    userEmail: 'ivan@test.movieplatform.ru',
    type: 'SUBSCRIPTION',
    amount: 990,
    currency: 'RUB',
    bonusUsed: 0,
    paymentMethod: 'card',
    status: 'COMPLETED',
    externalId: 'ext-12345',
    metadata: { planId: 'premium' },
    createdAt: '2025-07-15T10:00:00.000Z',
    updatedAt: '2025-07-15T10:01:00.000Z',
  },
};

const MOCK_PARTNER_DETAIL = {
  success: true,
  data: {
    id: 'partner-1',
    email: 'partner@test.movieplatform.ru',
    firstName: 'Партнёр',
    lastName: 'Партнёров',
    level: 'SILVER',
    referralCode: 'PART-ABC123',
    totalReferrals: 25,
    activeReferrals: 18,
    totalEarnings: 125000,
    availableBalance: 45000,
    pendingBalance: 12000,
    withdrawnAmount: 68000,
    registeredAt: '2025-02-01T10:00:00.000Z',
    levelProgress: {
      currentLevel: 'SILVER',
      nextLevel: 'GOLD',
      currentReferrals: 25,
      requiredReferrals: 50,
      currentEarnings: 125000,
      requiredEarnings: 250000,
    },
    recentCommissions: [
      {
        id: 'comm-1',
        amount: 500,
        level: 1,
        rate: 0.1,
        sourceUserId: 'user-ref-1',
        sourceUser: {
          id: 'user-ref-1',
          email: 'ref1@test.ru',
          firstName: 'Реферал',
          lastName: 'Один',
        },
        transactionId: 'tx-ref-1',
        status: 'COMPLETED',
        createdAt: '2025-07-20T10:00:00.000Z',
      },
    ],
    recentWithdrawals: [],
    referralTreePreview: [],
    directReferrals: [
      {
        id: 'ref-1',
        firstName: 'Реферал',
        lastName: 'Первый',
        email: 'ref1@test.ru',
        isActive: true,
        registeredAt: '2025-05-01T10:00:00.000Z',
      },
    ],
    referredBy: null,
  },
};

const MOCK_ORDER_DETAIL = {
  success: true,
  data: {
    id: 'order-1',
    userId: 'user-1',
    user: {
      id: 'user-1',
      email: 'ivan@test.movieplatform.ru',
      firstName: 'Иван',
      lastName: 'Иванов',
    },
    status: 'PENDING',
    totalAmount: 3700,
    bonusAmountUsed: 200,
    shippingAddress: {
      city: 'Москва',
      street: 'ул. Пушкина, д. 10',
      zip: '101000',
    },
    trackingNumber: null,
    items: [
      {
        orderId: 'order-1',
        productId: 'prod-1',
        product: {
          id: 'prod-1',
          name: 'Футболка MoviePlatform',
          slug: 'futbolka',
          images: [],
        },
        quantity: 1,
        priceAtPurchase: 2500,
        bonusUsed: 200,
      },
      {
        orderId: 'order-1',
        productId: 'prod-2',
        product: {
          id: 'prod-2',
          name: 'Стикерпак',
          slug: 'stickerpak',
          images: [],
        },
        quantity: 2,
        priceAtPurchase: 600,
        bonusUsed: 0,
      },
    ],
    createdAt: '2025-08-01T10:00:00.000Z',
    updatedAt: '2025-08-01T10:00:00.000Z',
  },
};

test.describe('Admin Detail Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Set cookies via browser context BEFORE page loads (server-side middleware needs these)
    await page.context().addCookies([
      { name: 'mp-authenticated', value: 'true', domain: 'localhost', path: '/' },
      { name: 'mp-auth-token', value: 'mock-admin-token', domain: 'localhost', path: '/' },
    ]);
    await page.addInitScript(() => {
      localStorage.setItem('mp-auth-storage', JSON.stringify({
        state: {
          user: { id: 'admin-1', email: 'admin@test.movieplatform.ru', firstName: 'Тест', lastName: 'Админ', role: 'ADMIN' },
          accessToken: 'mock-admin-token', refreshToken: 'mock-refresh',
          isAuthenticated: true, isHydrated: true,
        },
        version: 0,
      }));
    });

    await page.route('**/api/v1/auth/refresh', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { accessToken: 'new', refreshToken: 'new' } }) });
    });
    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 'admin-1', email: 'admin@test.movieplatform.ru', firstName: 'Тест', lastName: 'Админ', role: 'ADMIN' } }) });
    });
    await page.route('**/api/v1/notifications/unread-count', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 0 }) });
    });
    await page.route('**/api/v1/notifications/preferences', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ emailMarketing: true, emailUpdates: true, pushNotifications: false }) });
    });

    // User detail API
    await page.route('**/api/v1/admin/users/user-1', async (route) => {
      const method = route.request().method();
      if (method === 'PATCH') {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { ...MOCK_USER_DETAIL.data, ...body } }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_USER_DETAIL),
        });
      }
    });

    // Banned user detail
    await page.route('**/api/v1/admin/users/user-banned', async (route) => {
      const method = route.request().method();
      if (method === 'PATCH') {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { ...MOCK_BANNED_USER.data, ...body } }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_BANNED_USER),
        });
      }
    });

    // Payment detail API
    await page.route('**/api/v1/admin/payments/transactions/tx-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PAYMENT_DETAIL),
      });
    });

    // Payment stats (in case payments page is loaded as fallback)
    await page.route('**/api/v1/admin/payments/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { totalRevenue: 0, monthlyRevenue: 0, transactionCount: 0, refundCount: 0 } }),
      });
    });

    // Refund API
    await page.route('**/api/v1/admin/payments/transactions/*/refund', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { ...MOCK_PAYMENT_DETAIL.data, status: 'REFUNDED' } }),
      });
    });

    // Partner detail API
    await page.route('**/api/v1/admin/partners/partner-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PARTNER_DETAIL),
      });
    });

    // Store order detail API
    await page.route('**/api/v1/admin/store/orders/order-1', async (route) => {
      const method = route.request().method();
      if (method === 'PATCH') {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { ...MOCK_ORDER_DETAIL.data, ...body } }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_ORDER_DETAIL),
        });
      }
    });

    // Store order stats (fallback)
    await page.route('**/api/v1/admin/store/orders/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { totalOrders: 0, pendingCount: 0, processingCount: 0, shippedCount: 0, deliveredCount: 0, cancelledCount: 0, totalRevenue: 0 } }),
      });
    });
  });

  // ===== User Detail Tests =====

  test('should load user detail page with profile info', async ({ page }) => {
    await page.goto('/admin/users/user-1');

    await expect(page.getByRole('heading', { name: 'Иван Иванов' })).toBeVisible();
    await expect(page.getByText('ivan@test.movieplatform.ru').first()).toBeVisible();
    await expect(page.getByText('Информация о пользователе')).toBeVisible();
  });

  test('should display user subscription status', async ({ page }) => {
    await page.goto('/admin/users/user-1');

    await expect(page.getByText('Подписки')).toBeVisible();
    await expect(page.getByText('Премиум подписка')).toBeVisible();
    await expect(page.getByText('Активна')).toBeVisible();
  });

  test('should display user bonus balance', async ({ page }) => {
    await page.goto('/admin/users/user-1');

    await expect(page.getByText('Бонусный баланс')).toBeVisible();
  });

  test('should display role change dropdown', async ({ page }) => {
    await page.goto('/admin/users/user-1');

    await expect(page.getByText('Изменить роль')).toBeVisible();
    const roleSelect = page.locator('select, [role="combobox"]').last();
    await expect(roleSelect).toBeVisible();
  });

  test('should display "Заблокировать" button for active user', async ({ page }) => {
    await page.goto('/admin/users/user-1');

    const banButton = page.getByRole('button', { name: /Заблокировать/ });
    await expect(banButton).toBeVisible();
  });

  test('should display "Разблокировать" button for banned user', async ({ page }) => {
    await page.goto('/admin/users/user-banned');

    await expect(page.getByText('Заблокирован')).toBeVisible();
    const unbanButton = page.getByRole('button', { name: /Разблокировать/ });
    await expect(unbanButton).toBeVisible();
  });

  // ===== Payment Detail Tests =====

  test('should load payment detail page with amount and method', async ({ page }) => {
    await page.goto('/admin/payments/tx-1');

    await expect(page.getByText('Детали транзакции')).toBeVisible();
    await expect(page.getByText('Информация о транзакции')).toBeVisible();
    await expect(page.getByText('ivan@test.movieplatform.ru')).toBeVisible();
    await expect(page.getByText('Способ оплаты')).toBeVisible();
  });

  test('should display payment status badge', async ({ page }) => {
    await page.goto('/admin/payments/tx-1');

    await expect(page.getByText('Статус')).toBeVisible();
    await expect(page.getByText('Завершено')).toBeVisible();
  });

  test('should display refund button for completed payment', async ({ page }) => {
    await page.goto('/admin/payments/tx-1');

    const refundButton = page.getByRole('button', { name: /Возврат/ });
    await expect(refundButton).toBeVisible();
  });

  // ===== Partner Detail Tests =====

  test('should load partner detail page with level and referrals', async ({ page }) => {
    await page.goto('/admin/partners/partner-1');

    await expect(page.getByText('Партнёр Партнёров')).toBeVisible();
    await expect(page.getByText('Рефералы').first()).toBeVisible();
    await expect(page.getByText('25', { exact: true })).toBeVisible();
  });

  test('should display partner earnings amount', async ({ page }) => {
    await page.goto('/admin/partners/partner-1');

    await expect(page.getByText('Заработок').first()).toBeVisible();
    await expect(page.getByText('Баланс').first()).toBeVisible();
  });

  // ===== Store Order Detail Tests =====

  test('should load store order detail page with items and status', async ({ page }) => {
    await page.goto('/admin/store/orders/order-1');

    await expect(page.getByRole('heading', { name: /Заказ #order-1/ })).toBeVisible();
    await expect(page.getByText('Информация о заказе')).toBeVisible();
    await expect(page.getByText('Товары в заказе')).toBeVisible();
    await expect(page.getByText('Футболка MoviePlatform')).toBeVisible();
    await expect(page.getByText('Стикерпак')).toBeVisible();
    await expect(page.getByText('Ожидание').first()).toBeVisible();
  });
});
