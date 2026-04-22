import { test, expect } from '@playwright/test';

/**
 * Admin Bonus Management E2E Tests
 *
 * Tests for /admin/bonuses pages:
 * - Overview page: heading, stats cards, transaction list
 * - Campaigns page: table, create form, validation
 * - Rates page: config display, rate editing
 */

const MOCK_BONUS_STATS = {
  success: true,
  data: {
    totalBalance: 1250000,
    totalEarned: 3500000,
    totalSpent: 2250000,
    expiringIn30Days: 180000,
    activeUsers: 840,
    totalWithdrawn: 500000,
    transactionsToday: 45,
    transactionsThisMonth: 1230,
  },
};

const MOCK_CAMPAIGNS = {
  success: true,
  data: {
    items: [
      {
        id: 'camp-1',
        name: 'Новогодняя акция',
        description: 'Бонусы на Новый год',
        bonusAmount: 500,
        targetType: 'ALL' as const,
        status: 'ACTIVE' as const,
        usedCount: 120,
        usageLimit: 1000,
        startDate: '2025-12-20T00:00:00.000Z',
        endDate: '2026-01-15T00:00:00.000Z',
        createdAt: '2025-12-15T10:00:00.000Z',
      },
      {
        id: 'camp-2',
        name: 'Реферальный бонус',
        description: 'Бонусы за приглашение друзей',
        bonusAmount: 200,
        targetType: 'SEGMENT' as const,
        status: 'DRAFT' as const,
        usedCount: 0,
        usageLimit: null,
        startDate: '2025-08-01T00:00:00.000Z',
        endDate: null,
        createdAt: '2025-07-28T10:00:00.000Z',
      },
      {
        id: 'camp-3',
        name: 'Летняя распродажа',
        description: 'Бонусы за покупки',
        bonusAmount: 300,
        targetType: 'ALL' as const,
        status: 'COMPLETED' as const,
        usedCount: 500,
        usageLimit: 500,
        startDate: '2025-06-01T00:00:00.000Z',
        endDate: '2025-08-31T00:00:00.000Z',
        createdAt: '2025-05-25T10:00:00.000Z',
      },
    ],
    page: 1,
    limit: 20,
    total: 3,
    totalPages: 1,
  },
};

const MOCK_RATES = {
  success: true,
  data: [
    {
      id: 'rate-1',
      rate: 1.5,
      fromCurrency: 'BONUS',
      toCurrency: 'RUB',
      isActive: true,
      effectiveFrom: '2025-07-01T00:00:00.000Z',
      effectiveTo: null,
      createdAt: '2025-06-28T10:00:00.000Z',
    },
    {
      id: 'rate-2',
      rate: 1.0,
      fromCurrency: 'BONUS',
      toCurrency: 'RUB',
      isActive: false,
      effectiveFrom: '2025-01-01T00:00:00.000Z',
      effectiveTo: '2025-06-30T00:00:00.000Z',
      createdAt: '2024-12-28T10:00:00.000Z',
    },
  ],
};

test.describe('Admin Bonus Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('mp-auth-storage', JSON.stringify({
        state: {
          user: { id: 'admin-1', email: 'admin@test.movieplatform.ru', firstName: 'Тест', lastName: 'Админ', role: 'ADMIN' },
          accessToken: 'mock-admin-token', refreshToken: 'mock-refresh',
          isAuthenticated: true, isHydrated: true,
        },
        version: 0,
      }));
      document.cookie = 'mp-authenticated=true;path=/';
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

    // Bonus stats API
    await page.route('**/api/v1/admin/bonuses/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_BONUS_STATS),
      });
    });

    // Campaigns list API
    await page.route('**/api/v1/admin/bonuses/campaigns?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CAMPAIGNS),
      });
    });

    await page.route('**/api/v1/admin/bonuses/campaigns', async (route) => {
      const method = route.request().method();
      if (method === 'POST') {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'camp-new',
              ...body,
              status: 'DRAFT',
              usedCount: 0,
              createdAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_CAMPAIGNS),
        });
      }
    });

    // Campaign detail
    await page.route('**/api/v1/admin/bonuses/campaigns/camp-1', async (route) => {
      const method = route.request().method();
      if (method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { ...MOCK_CAMPAIGNS.data.items[0], ...route.request().postDataJSON() } }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_CAMPAIGNS.data.items[0] }),
        });
      }
    });

    // Execute campaign
    await page.route('**/api/v1/admin/bonuses/campaigns/*/execute', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { ...MOCK_CAMPAIGNS.data.items[0], status: 'ACTIVE' } }),
      });
    });

    // Cancel campaign
    await page.route('**/api/v1/admin/bonuses/campaigns/*/cancel', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { ...MOCK_CAMPAIGNS.data.items[0], status: 'CANCELLED' } }),
      });
    });

    // Rates API
    await page.route('**/api/v1/admin/bonuses/rates', async (route) => {
      const method = route.request().method();
      if (method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'rate-new', ...route.request().postDataJSON(), isActive: true, createdAt: new Date().toISOString() },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_RATES),
        });
      }
    });

    // Rate update
    await page.route('**/api/v1/admin/bonuses/rates/*', async (route) => {
      const method = route.request().method();
      if (method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { ...MOCK_RATES.data[0], ...route.request().postDataJSON() } }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_RATES.data[0] }),
        });
      }
    });
  });

  test('should load bonus overview page with heading', async ({ page }) => {
    await page.goto('/admin/bonuses');

    await expect(page.getByText('Бонусная система')).toBeVisible();
    await expect(page.getByText('Управление бонусами, курсами и кампаниями')).toBeVisible();
  });

  test('should display stats cards with values', async ({ page }) => {
    await page.goto('/admin/bonuses');

    await expect(page.getByText('Общий баланс')).toBeVisible();
    await expect(page.getByText('Всего начислено')).toBeVisible();
    await expect(page.getByText('Всего потрачено')).toBeVisible();
  });

  test('should display active campaigns section', async ({ page }) => {
    await page.goto('/admin/bonuses');

    await expect(page.getByText('Активные кампании')).toBeVisible();
    await expect(page.getByText('Текущий курс')).toBeVisible();
  });

  test('should load campaigns list page with table', async ({ page }) => {
    await page.goto('/admin/bonuses/campaigns');

    await expect(page.getByText('Бонусные кампании')).toBeVisible();
    await expect(page.getByText('Новогодняя акция')).toBeVisible();
    await expect(page.getByText('Реферальный бонус')).toBeVisible();
    await expect(page.getByText('Летняя распродажа')).toBeVisible();
  });

  test('should display "Новая кампания" create button on campaigns page', async ({ page }) => {
    await page.goto('/admin/bonuses/campaigns');

    await expect(page.getByText('Новая кампания')).toBeVisible();
    const createLink = page.locator('a[href="/admin/bonuses/campaigns/new"]');
    await expect(createLink).toBeVisible();
  });

  test('should display campaign status badges', async ({ page }) => {
    await page.goto('/admin/bonuses/campaigns');

    await expect(page.getByText('Активна')).toBeVisible();
    await expect(page.getByText('Черновик')).toBeVisible();
    await expect(page.getByText('Завершена')).toBeVisible();
  });

  test('should display campaign type column', async ({ page }) => {
    await page.goto('/admin/bonuses/campaigns');

    await expect(page.getByText('Все пользователи').first()).toBeVisible();
    await expect(page.getByText('Сегмент')).toBeVisible();
  });

  test('should display status filter on campaigns page', async ({ page }) => {
    await page.goto('/admin/bonuses/campaigns');

    await expect(page.getByText('Фильтры:')).toBeVisible();
    await expect(page.getByText('Все статусы')).toBeVisible();
  });

  test('should load rates config page', async ({ page }) => {
    await page.goto('/admin/bonuses/rates');

    await expect(page.getByText('Курсы бонусов')).toBeVisible();
    await expect(page.getByText('Управление курсами конвертации бонусов')).toBeVisible();
  });

  test('should display current active rate', async ({ page }) => {
    await page.goto('/admin/bonuses/rates');

    await expect(page.getByText('Текущий курс')).toBeVisible();
    await expect(page.getByText('1 бонус = 1.5 ₽')).toBeVisible();
    await expect(page.getByText('Активен', { exact: true })).toBeVisible();
  });

  test('should display rate history table', async ({ page }) => {
    await page.goto('/admin/bonuses/rates');

    await expect(page.getByText('История курсов')).toBeVisible();
    await expect(page.getByText('Неактивен')).toBeVisible();
  });

  test('should display "Новый курс" button on rates page', async ({ page }) => {
    await page.goto('/admin/bonuses/rates');

    const newRateButton = page.getByText('Новый курс').first();
    await expect(newRateButton).toBeVisible();
  });
});
