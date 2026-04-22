import { test as base, expect, type Page, type Locator } from '@playwright/test';
import { TEST_USERS } from './auth.fixture';

/**
 * Mock data for account pages
 */
export const MOCK_PROFILE = {
  id: 'user-1',
  email: TEST_USERS.user.email,
  firstName: 'Тест',
  lastName: 'Пользователь',
  phone: '+71234567890',
  avatarUrl: null,
  dateOfBirth: '1995-06-15',
  ageCategory: '18+',
  role: 'USER',
  referralCode: 'TESTREF123',
  bonusBalance: 500,
  verificationStatus: 'UNVERIFIED',
  createdAt: '2024-01-10T10:00:00Z',
  updatedAt: '2024-12-01T10:00:00Z',
};

export const MOCK_SUBSCRIPTION = {
  id: 'sub-1',
  plan: { id: 'plan-1', name: 'Премиум', price: 499 },
  status: 'ACTIVE',
  startedAt: '2024-11-01T00:00:00Z',
  expiresAt: '2025-02-01T00:00:00Z',
  autoRenew: true,
};

export const MOCK_WATCH_HISTORY = {
  items: [
    {
      id: 'wh-1',
      contentId: 'content-1',
      content: {
        id: 'content-1',
        title: 'Ночной патруль',
        slug: 'night-patrol',
        contentType: 'SERIES',
        thumbnailUrl: null,
        ageCategory: '16+',
      },
      progress: 45,
      duration: 120,
      lastWatchedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: 'wh-2',
      contentId: 'content-2',
      content: {
        id: 'content-2',
        title: 'Весёлые клипы',
        slug: 'funny-clips',
        contentType: 'CLIP',
        thumbnailUrl: null,
        ageCategory: '0+',
      },
      progress: 100,
      duration: 60,
      lastWatchedAt: new Date(Date.now() - 86400000).toISOString(),
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
  total: 2,
  page: 1,
  limit: 20,
};

export const MOCK_CONTINUE_WATCHING = {
  items: [MOCK_WATCH_HISTORY.items[0]],
  total: 1,
};

export const MOCK_WATCHLIST = {
  items: [
    {
      id: 'wl-1',
      contentId: 'content-3',
      content: {
        id: 'content-3',
        title: 'Обучение программированию',
        slug: 'learn-programming',
        contentType: 'TUTORIAL',
        thumbnailUrl: null,
        ageCategory: '0+',
        description: 'Полный курс по программированию',
      },
      createdAt: '2024-12-01T10:00:00Z',
    },
    {
      id: 'wl-2',
      contentId: 'content-4',
      content: {
        id: 'content-4',
        title: 'Драма нового сезона',
        slug: 'new-season-drama',
        contentType: 'SERIES',
        thumbnailUrl: null,
        ageCategory: '16+',
        description: 'Захватывающий новый сезон',
      },
      createdAt: '2024-11-15T10:00:00Z',
    },
  ],
  total: 2,
  page: 1,
  limit: 20,
};

export const MOCK_TRANSACTIONS = {
  items: [
    {
      id: 'tx-1',
      type: 'SUBSCRIPTION',
      status: 'COMPLETED',
      amount: 499,
      bonusAmountUsed: 0,
      description: 'Подписка Премиум',
      createdAt: '2024-12-01T10:00:00Z',
    },
    {
      id: 'tx-2',
      type: 'BONUS_PURCHASE',
      status: 'PENDING',
      amount: 200,
      bonusAmountUsed: 0,
      description: 'Покупка бонусов',
      createdAt: '2024-11-28T10:00:00Z',
    },
  ],
  total: 2,
  page: 1,
  limit: 10,
};

export const MOCK_SESSIONS = [
  {
    id: 'session-1',
    deviceName: 'Chrome на macOS',
    deviceType: 'desktop',
    ip: '192.168.1.1',
    lastActive: new Date().toISOString(),
    current: true,
  },
  {
    id: 'session-2',
    deviceName: 'Safari на iPhone',
    deviceType: 'mobile',
    ip: '192.168.1.2',
    lastActive: new Date(Date.now() - 3600000).toISOString(),
    current: false,
  },
];

export const MOCK_VERIFICATION = {
  status: 'UNVERIFIED',
  createdAt: null,
  reviewedAt: null,
  rejectionReason: null,
};

/**
 * Mock all account-related API endpoints
 */
export async function mockAccountApi(page: Page) {
  // Profile
  await page.route('**/api/v1/users/me/profile', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_PROFILE }),
      });
    } else if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { ...MOCK_PROFILE, ...body },
        }),
      });
    }
  });

  // Active subscription
  await page.route('**/api/v1/subscriptions/active', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_SUBSCRIPTION }),
    });
  });

  // Watch history
  await page.route('**/api/v1/watch-history?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_WATCH_HISTORY }),
    });
  });

  await page.route('**/api/v1/watch-history/continue*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_CONTINUE_WATCHING }),
    });
  });

  // Watch history DELETE
  await page.route('**/api/v1/watch-history/**', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.fallback();
    }
  });

  // Watchlist
  await page.route('**/api/v1/watchlist?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_WATCHLIST }),
    });
  });

  await page.route('**/api/v1/watchlist/**', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.fallback();
    }
  });

  // Transactions
  await page.route('**/api/v1/transactions?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_TRANSACTIONS }),
    });
  });

  // Sessions
  await page.route('**/api/v1/auth/sessions', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_SESSIONS }),
      });
    }
  });

  await page.route('**/api/v1/auth/sessions/**', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.fallback();
    }
  });

  // Verification status
  await page.route('**/api/v1/users/me/verification/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_VERIFICATION }),
    });
  });

  // Verification submit
  await page.route('**/api/v1/users/me/verification', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { ...MOCK_VERIFICATION, status: 'PENDING' },
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // Forgot password (password reset via email)
  await page.route('**/api/v1/auth/forgot-password', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { message: 'Ссылка для сброса пароля отправлена' } }),
    });
  });

  // Notification preferences
  await page.route('**/api/v1/users/me/preferences', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            emailNotifications: true,
            pushNotifications: false,
            marketingEmails: false,
            newContentAlerts: true,
            subscriptionAlerts: true,
          },
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
  });

  // Subscriptions list
  await page.route('**/api/v1/subscriptions/my', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { items: [MOCK_SUBSCRIPTION], total: 1 },
      }),
    });
  });
}

/**
 * Account fixture types
 */
interface AccountFixtures {
  mockApi: void;
}

/**
 * Extended test with account mocks
 */
export const test = base.extend<AccountFixtures>({
  mockApi: [
    async ({ page }, use) => {
      await mockAccountApi(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
