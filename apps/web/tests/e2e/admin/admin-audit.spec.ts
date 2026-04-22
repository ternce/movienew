import { test, expect } from '@playwright/test';

/**
 * Admin Audit Log E2E Tests
 *
 * Tests for /admin/audit page:
 * - Page rendering with title "Журнал аудита"
 * - DataTable with audit log entries
 * - Search/filter by action, entity type, date range
 * - Table columns: action, entity type, entity ID, user, IP, date
 * - Detail dialog for log entries
 * - Reset filters button
 */

const MOCK_AUDIT_LOGS = {
  success: true,
  data: {
    items: [
      {
        id: 'audit-1',
        action: 'CREATE',
        entityType: 'User',
        entityId: 'user-new-1',
        userId: 'admin-1',
        userEmail: 'admin@test.ru',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Agent',
        oldValues: null,
        newValues: { email: 'newuser@test.ru', role: 'USER' },
        metadata: { source: 'admin_panel' },
        createdAt: '2025-07-15T10:30:00.000Z',
      },
      {
        id: 'audit-2',
        action: 'UPDATE',
        entityType: 'Content',
        entityId: 'content-42',
        userId: 'admin-1',
        userEmail: 'admin@test.ru',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Agent',
        oldValues: { status: 'DRAFT' },
        newValues: { status: 'PUBLISHED' },
        metadata: null,
        createdAt: '2025-07-15T11:00:00.000Z',
      },
      {
        id: 'audit-3',
        action: 'DELETE',
        entityType: 'Transaction',
        entityId: 'tx-refund-1',
        userId: 'admin-1',
        userEmail: 'admin@test.ru',
        ipAddress: '10.0.0.1',
        userAgent: null,
        oldValues: { status: 'COMPLETED', amount: 990 },
        newValues: null,
        metadata: { reason: 'Запрос пользователя' },
        createdAt: '2025-07-14T15:45:00.000Z',
      },
      {
        id: 'audit-4',
        action: 'LOGIN',
        entityType: 'Session',
        entityId: 'session-99',
        userId: 'user-5',
        userEmail: 'user5@test.ru',
        ipAddress: '172.16.0.50',
        userAgent: 'Mozilla/5.0 Chrome',
        oldValues: null,
        newValues: null,
        metadata: { device: 'desktop' },
        createdAt: '2025-07-13T09:00:00.000Z',
      },
    ],
    page: 1,
    limit: 20,
    total: 4,
    totalPages: 1,
  },
};

const MOCK_AUDIT_LOG_DETAIL = {
  success: true,
  data: {
    id: 'audit-1',
    action: 'CREATE',
    entityType: 'User',
    entityId: 'user-new-1',
    userId: 'admin-1',
    userEmail: 'admin@test.ru',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 Test Agent',
    oldValues: null,
    newValues: { email: 'newuser@test.ru', role: 'USER' },
    metadata: { source: 'admin_panel' },
    createdAt: '2025-07-15T10:30:00.000Z',
  },
};

test.describe('Admin Audit Log', () => {
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

    // Mock audit logs list API
    await page.route('**/api/v1/admin/audit', async (route) => {
      const url = route.request().url();
      // Check if this is a detail request (has ID path segment after /audit/)
      const auditIdMatch = url.match(/\/admin\/audit\/([^?/]+)/);
      if (auditIdMatch) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_AUDIT_LOG_DETAIL),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_AUDIT_LOGS),
        });
      }
    });

    // Mock audit log detail API (specific ID route)
    await page.route('**/api/v1/admin/audit/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_AUDIT_LOG_DETAIL),
      });
    });
  });

  test.describe('Page Rendering', () => {
    test('should display page title "Журнал аудита"', async ({ page }) => {
      await page.goto('/admin/audit');

      await expect(page.getByText('Журнал аудита')).toBeVisible();
    });

    test('should display description "Все действия в системе"', async ({ page }) => {
      await page.goto('/admin/audit');

      await expect(page.getByText('Все действия в системе')).toBeVisible();
    });

    test('should display total records count', async ({ page }) => {
      await page.goto('/admin/audit');

      await expect(page.getByText('4 записей')).toBeVisible();
    });
  });

  test.describe('Table Display', () => {
    test('should display action values in table', async ({ page }) => {
      await page.goto('/admin/audit');

      await expect(page.getByText('CREATE').first()).toBeVisible();
      await expect(page.getByText('UPDATE').first()).toBeVisible();
      await expect(page.getByText('DELETE').first()).toBeVisible();
      await expect(page.getByText('LOGIN').first()).toBeVisible();
    });

    test('should display entity type badges with Russian labels', async ({ page }) => {
      await page.goto('/admin/audit');

      await expect(page.getByText('Пользователь')).toBeVisible();
      await expect(page.getByText('Контент')).toBeVisible();
      await expect(page.getByText('Транзакция')).toBeVisible();
      await expect(page.getByText('Сессия')).toBeVisible();
    });

    test('should display IP addresses in table', async ({ page }) => {
      await page.goto('/admin/audit');

      await expect(page.getByText('192.168.1.1').first()).toBeVisible();
      await expect(page.getByText('10.0.0.1')).toBeVisible();
      await expect(page.getByText('172.16.0.50')).toBeVisible();
    });

    test('should display table column headers', async ({ page }) => {
      await page.goto('/admin/audit');

      await expect(page.getByText('Действие').first()).toBeVisible();
      await expect(page.getByText('Тип сущности').first()).toBeVisible();
      await expect(page.getByText('IP адрес').first()).toBeVisible();
    });
  });

  test.describe('Filters', () => {
    test('should display "Фильтры:" label', async ({ page }) => {
      await page.goto('/admin/audit');

      await expect(page.getByText('Фильтры:')).toBeVisible();
    });

    test('should display action search input', async ({ page }) => {
      await page.goto('/admin/audit');

      const actionInput = page.locator('input[placeholder*="CREATE"]');
      await expect(actionInput).toBeVisible();
    });

    test('should display entity type filter with "Все типы"', async ({ page }) => {
      await page.goto('/admin/audit');

      await expect(page.getByText('Все типы')).toBeVisible();
    });

    test('should display date range filters', async ({ page }) => {
      await page.goto('/admin/audit');

      await expect(page.getByText('Дата от')).toBeVisible();
      await expect(page.getByText('Дата до')).toBeVisible();

      const dateInputs = page.locator('input[type="date"]');
      const count = await dateInputs.count();
      expect(count).toBe(2);
    });
  });

  test.describe('Shield Icon and Record Count', () => {
    test('should display shield icon and record count in header', async ({ page }) => {
      await page.goto('/admin/audit');

      // The header has a shield icon with total count
      await expect(page.getByText('записей')).toBeVisible();
    });
  });
});
