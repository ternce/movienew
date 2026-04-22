import { test as base, expect, type Page } from '@playwright/test';
import { TEST_USERS } from './auth.fixture';

/**
 * Mock data for notification tests
 */
export const MOCK_NOTIFICATIONS = {
  items: [
    {
      id: 'notif-1',
      type: 'PAYMENT',
      title: 'Платёж успешно выполнен',
      body: 'Оплата на сумму 499 ₽ прошла успешно.',
      isRead: false,
      link: '/account/payments',
      metadata: { type: 'PAYMENT', amount: 499 },
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'notif-2',
      type: 'SUBSCRIPTION',
      title: 'Подписка продлена',
      body: 'Ваша подписка "Премиум" успешно продлена до 01.03.2025.',
      isRead: false,
      link: '/account/subscriptions',
      metadata: { type: 'SUBSCRIPTION' },
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'notif-3',
      type: 'SYSTEM',
      title: 'Добро пожаловать!',
      body: 'Добро пожаловать на MoviePlatform! Откройте мир видео контента.',
      isRead: true,
      link: null,
      metadata: { type: 'SYSTEM' },
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'notif-4',
      type: 'CONTENT',
      title: 'Новый эпизод доступен',
      body: 'Вышел новый эпизод сериала "Ночной патруль".',
      isRead: true,
      link: '/series/night-patrol',
      metadata: { type: 'CONTENT' },
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: 'notif-5',
      type: 'BONUS',
      title: 'Начислены бонусы',
      body: 'Вам начислено 50 бонусов за активность.',
      isRead: false,
      link: null,
      metadata: { type: 'BONUS', amount: 50 },
      createdAt: new Date(Date.now() - 259200000).toISOString(),
    },
  ],
  total: 5,
  page: 1,
  limit: 20,
  totalPages: 1,
  unreadCount: 3,
};

export const MOCK_EMPTY_NOTIFICATIONS = {
  items: [],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  unreadCount: 0,
};

export const MOCK_NOTIFICATION_PREFERENCES = {
  id: 'pref-1',
  userId: 'user-1',
  emailMarketing: true,
  emailUpdates: true,
  pushNotifications: false,
};

/**
 * Mock all notification-related API endpoints
 */
export async function mockNotificationApi(page: Page) {
  // List notifications
  await page.route('**/api/v1/notifications?*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_NOTIFICATIONS),
      });
    } else {
      await route.fallback();
    }
  });

  // List notifications (without query params)
  await page.route('**/api/v1/notifications', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_NOTIFICATIONS),
      });
    } else if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 5 }),
      });
    } else {
      await route.fallback();
    }
  });

  // Unread count
  await page.route('**/api/v1/notifications/unread-count', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ count: 3 }),
    });
  });

  // Mark single as read
  await page.route('**/api/v1/notifications/*/read', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'notif-1',
          type: 'PAYMENT',
          title: 'Платёж успешно выполнен',
          body: 'Оплата на сумму 499 ₽ прошла успешно.',
          isRead: true,
          createdAt: new Date().toISOString(),
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // Mark all as read
  await page.route('**/api/v1/notifications/read-all', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ count: 3 }),
    });
  });

  // Delete single notification
  await page.route(/\/api\/v1\/notifications\/notif-\w+$/, async (route) => {
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

  // Preferences
  await page.route('**/api/v1/notifications/preferences', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_NOTIFICATION_PREFERENCES),
      });
    } else if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...MOCK_NOTIFICATION_PREFERENCES,
          ...route.request().postDataJSON(),
        }),
      });
    }
  });

  // Profile (needed for sidebar)
  await page.route('**/api/v1/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'user-1',
          email: TEST_USERS.user.email,
          firstName: 'Тест',
          lastName: 'Пользователь',
          avatarUrl: null,
          role: 'USER',
        },
      }),
    });
  });

  // Sessions (needed for settings page)
  await page.route('**/api/v1/users/me/sessions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

/**
 * Notification fixture types
 */
interface NotificationFixtures {
  mockNotificationApis: void;
}

/**
 * Extended test with notification mocks
 */
export const test = base.extend<NotificationFixtures>({
  mockNotificationApis: [
    async ({ page }, use) => {
      // Set cookies via browser context BEFORE page loads (server-side middleware needs these)
      await page.context().addCookies([
        { name: 'mp-authenticated', value: 'true', domain: 'localhost', path: '/' },
        { name: 'mp-auth-token', value: 'mock-access-token', domain: 'localhost', path: '/' },
      ]);
      await mockNotificationApi(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
