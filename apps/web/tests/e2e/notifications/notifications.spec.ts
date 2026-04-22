import { test, expect, MOCK_NOTIFICATIONS, MOCK_EMPTY_NOTIFICATIONS } from '../fixtures/notifications.fixture';

test.describe('Notifications Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/account/notifications');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Display', () => {
    test('should display page heading "Уведомления"', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Уведомления' })).toBeVisible();
    });

    test('should display total and unread count in subheading', async ({ page }) => {
      await expect(page.getByText(/5 уведомлений.*3 непрочитанных/)).toBeVisible();
    });

    test('should display "Прочитать все" button when unread exist', async ({ page }) => {
      await expect(page.getByText('Прочитать все')).toBeVisible();
    });

    test('should display "Очистить" button when notifications exist', async ({ page }) => {
      await expect(page.getByText('Очистить')).toBeVisible();
    });
  });

  test.describe('Filter Tabs', () => {
    test('should display all filter tabs', async ({ page }) => {
      const tabs = ['Все', 'Система', 'Подписки', 'Платежи', 'Контент', 'Партнёры', 'Бонусы', 'Промо'];
      for (const tab of tabs) {
        await expect(page.getByRole('button', { name: tab })).toBeVisible();
      }
    });

    test('should have "Все" tab active by default', async ({ page }) => {
      const allTab = page.getByRole('button', { name: 'Все' });
      await expect(allTab).toHaveClass(/bg-mp-accent-primary/);
    });

    test('should switch active tab on click', async ({ page }) => {
      const paymentTab = page.getByRole('button', { name: 'Платежи' });
      await paymentTab.click();
      await expect(paymentTab).toHaveClass(/bg-mp-accent-primary/);
    });
  });

  test.describe('Notification List', () => {
    test('should display notification items', async ({ page }) => {
      for (const notif of MOCK_NOTIFICATIONS.items) {
        await expect(page.getByText(notif.title)).toBeVisible();
      }
    });

    test('should display notification body text', async ({ page }) => {
      await expect(page.getByText('Оплата на сумму 499 ₽ прошла успешно.')).toBeVisible();
    });

    test('should show unread indicator for unread notifications', async ({ page }) => {
      // Unread notifications have border-l-mp-accent-primary class
      const unreadItems = page.locator('.border-l-mp-accent-primary');
      await expect(unreadItems).toHaveCount(3);
    });

    test('should display delete button on hover', async ({ page }) => {
      const firstItem = page.getByText('Платёж успешно выполнен').locator('..');
      await firstItem.hover();
      await expect(page.getByLabel('Удалить уведомление').first()).toBeVisible();
    });
  });

  test.describe('Actions', () => {
    test('should mark all as read when clicking "Прочитать все"', async ({ page }) => {
      let markAllReadCalled = false;
      await page.route('**/api/v1/notifications/read-all', async (route) => {
        markAllReadCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ count: 3 }),
        });
      });

      await page.getByText('Прочитать все').click();

      expect(markAllReadCalled).toBe(true);
    });

    test('should delete all when clicking "Очистить"', async ({ page }) => {
      let deleteAllCalled = false;
      await page.route('**/api/v1/notifications', async (route) => {
        if (route.request().method() === 'DELETE') {
          deleteAllCalled = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ count: 5 }),
          });
        } else {
          await route.fallback();
        }
      });

      await page.getByText('Очистить').click();

      expect(deleteAllCalled).toBe(true);
    });

    test('should mark notification as read when clicking on it', async ({ page }) => {
      let markReadCalled = false;
      await page.route('**/api/v1/notifications/*/read', async (route) => {
        if (route.request().method() === 'PATCH') {
          markReadCalled = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ isRead: true }),
          });
        } else {
          await route.fallback();
        }
      });

      // Click on the first unread notification
      await page.getByText('Платёж успешно выполнен').click();

      expect(markReadCalled).toBe(true);
    });
  });
});

test.describe('Notifications Page - Empty State', () => {
  test('should show empty state when no notifications', async ({ page }) => {
    // Override notification routes to return empty
    await page.route('**/api/v1/notifications?*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_EMPTY_NOTIFICATIONS),
        });
      } else {
        await route.fallback();
      }
    });

    await page.route('**/api/v1/notifications', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_EMPTY_NOTIFICATIONS),
        });
      } else {
        await route.fallback();
      }
    });

    await page.route('**/api/v1/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 0 }),
      });
    });

    await page.goto('/account/notifications');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Нет уведомлений')).toBeVisible();
    await expect(page.getByText('Здесь будут появляться ваши уведомления')).toBeVisible();
  });

  test('should show category-specific empty message when filter applied', async ({ page }) => {
    await page.route('**/api/v1/notifications?*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_EMPTY_NOTIFICATIONS),
        });
      } else {
        await route.fallback();
      }
    });

    await page.route('**/api/v1/notifications', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_EMPTY_NOTIFICATIONS),
        });
      } else {
        await route.fallback();
      }
    });

    await page.route('**/api/v1/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 0 }),
      });
    });

    await page.goto('/account/notifications');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Партнёры' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('Нет уведомлений в этой категории')).toBeVisible();
  });
});

test.describe('Account Sidebar - Notification Badge', () => {
  test('should display Уведомления link in sidebar', async ({ page }) => {
    await page.goto('/account/notifications');
    await page.waitForLoadState('networkidle');

    // Check desktop sidebar (on larger screens)
    const sidebarLink = page.locator('aside').getByText('Уведомления');
    await expect(sidebarLink).toBeVisible();
  });
});

test.describe('Notification Settings (Preferences)', () => {
  test('should display notification preference toggles on settings page', async ({ page }) => {
    await page.goto('/account/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Email рассылки')).toBeVisible();
    await expect(page.getByText('Обновления')).toBeVisible();
    await expect(page.getByText('Push уведомления')).toBeVisible();
  });

  test('should update preferences when toggle is clicked', async ({ page }) => {
    let preferencesUpdated = false;
    await page.route('**/api/v1/notifications/preferences', async (route) => {
      if (route.request().method() === 'PATCH') {
        preferencesUpdated = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            emailMarketing: false,
            emailUpdates: true,
            pushNotifications: false,
          }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/account/settings');
    await page.waitForLoadState('networkidle');

    // Find and click the first switch (Email рассылки)
    const switches = page.locator('button[role="switch"]');
    await switches.first().click();

    expect(preferencesUpdated).toBe(true);
  });
});
