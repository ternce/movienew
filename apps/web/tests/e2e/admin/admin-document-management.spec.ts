import { test, expect } from '@playwright/test';

/**
 * Admin Document Management E2E Tests
 *
 * Tests for /admin/documents pages:
 * - List page: heading, table, document types
 * - Create page: form fields, type selector, validation
 * - Detail page: edit inactive, publish, version display
 */

const MOCK_DOCUMENTS = [
  {
    id: 'doc-1',
    type: 'PRIVACY_POLICY' as const,
    title: 'Политика конфиденциальности',
    version: '2.0',
    content: '<h1>Политика конфиденциальности</h1><p>Условия обработки персональных данных.</p>',
    isActive: false,
    requiresAcceptance: true,
    publishedAt: null,
    createdAt: '2025-07-01T10:00:00.000Z',
    updatedAt: '2025-07-15T10:00:00.000Z',
  },
  {
    id: 'doc-2',
    type: 'USER_AGREEMENT' as const,
    title: 'Пользовательское соглашение',
    version: '1.5',
    content: '<h1>Пользовательское соглашение</h1><p>Правила пользования платформой.</p>',
    isActive: true,
    requiresAcceptance: true,
    publishedAt: '2025-06-01T10:00:00.000Z',
    createdAt: '2025-06-01T10:00:00.000Z',
    updatedAt: '2025-06-01T10:00:00.000Z',
  },
  {
    id: 'doc-3',
    type: 'OFFER' as const,
    title: 'Публичная оферта',
    version: '1.0',
    content: '<h1>Публичная оферта</h1><p>Условия предоставления услуг.</p>',
    isActive: true,
    requiresAcceptance: false,
    publishedAt: '2025-05-15T10:00:00.000Z',
    createdAt: '2025-05-15T10:00:00.000Z',
    updatedAt: '2025-05-15T10:00:00.000Z',
  },
];

const MOCK_DOCUMENTS_RESPONSE = {
  success: true,
  data: {
    items: MOCK_DOCUMENTS,
    page: 1,
    limit: 20,
    total: 3,
    totalPages: 1,
  },
};

const MOCK_VERSIONS_RESPONSE = {
  success: true,
  data: [
    { ...MOCK_DOCUMENTS[0], version: '2.0' },
    { id: 'doc-1-old', type: 'PRIVACY_POLICY', title: 'Политика конфиденциальности', version: '1.0', isActive: false, publishedAt: '2025-01-01T10:00:00.000Z', createdAt: '2025-01-01T10:00:00.000Z' },
  ],
};

test.describe('Admin Document Management', () => {
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

    // Documents list API
    await page.route('**/api/v1/admin/documents?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_DOCUMENTS_RESPONSE),
      });
    });

    await page.route('**/api/v1/admin/documents', async (route) => {
      const method = route.request().method();
      if (method === 'POST') {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'doc-new',
              ...body,
              isActive: false,
              publishedAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_DOCUMENTS_RESPONSE),
        });
      }
    });

    // Document detail API (doc-1 = inactive, doc-2 = active)
    await page.route('**/api/v1/admin/documents/doc-1', async (route) => {
      const method = route.request().method();
      if (method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { ...MOCK_DOCUMENTS[0], ...route.request().postDataJSON() } }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_DOCUMENTS[0] }),
        });
      }
    });

    await page.route('**/api/v1/admin/documents/doc-2', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_DOCUMENTS[1] }),
      });
    });

    // Publish endpoint
    await page.route('**/api/v1/admin/documents/*/publish', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { ...MOCK_DOCUMENTS[0], isActive: true, publishedAt: new Date().toISOString() } }),
      });
    });

    // Deactivate endpoint
    await page.route('**/api/v1/admin/documents/*/deactivate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { ...MOCK_DOCUMENTS[1], isActive: false } }),
      });
    });

    // Acceptances
    await page.route('**/api/v1/admin/documents/*/acceptances*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { items: [], page: 1, limit: 20, total: 0, totalPages: 0 } }),
      });
    });

    // Versions
    await page.route('**/api/v1/admin/documents/types/*/versions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_VERSIONS_RESPONSE),
      });
    });
  });

  test('should load documents list with heading and table', async ({ page }) => {
    await page.goto('/admin/documents');

    await expect(page.getByText('Правовые документы')).toBeVisible();
    await expect(page.getByText('Управление пользовательскими соглашениями и правовыми документами')).toBeVisible();
    await expect(page.getByText('Политика конфиденциальности')).toBeVisible();
    await expect(page.getByText('Пользовательское соглашение')).toBeVisible();
  });

  test('should display document types in filter dropdown', async ({ page }) => {
    await page.goto('/admin/documents');

    await expect(page.getByText('Тип документа')).toBeVisible();
    await expect(page.getByText('Все типы')).toBeVisible();
  });

  test('should load create form at /admin/documents/new', async ({ page }) => {
    await page.goto('/admin/documents/new');

    await expect(page.getByText('Создать документ').first()).toBeVisible();
    await expect(page.getByText('Параметры документа')).toBeVisible();
  });

  test('should display document type selector on create form', async ({ page }) => {
    await page.goto('/admin/documents/new');

    await expect(page.getByText('Тип документа', { exact: false }).first()).toBeVisible();
    const selectTrigger = page.locator('#type');
    await expect(selectTrigger).toBeVisible();
  });

  test('should display title input on create form', async ({ page }) => {
    await page.goto('/admin/documents/new');

    await expect(page.getByText('Заголовок')).toBeVisible();
    const titleInput = page.locator('#title');
    await expect(titleInput).toBeVisible();
  });

  test('should display content textarea on create form', async ({ page }) => {
    await page.goto('/admin/documents/new');

    await expect(page.getByText('Содержание', { exact: false }).first()).toBeVisible();
    const contentTextarea = page.locator('#content');
    await expect(contentTextarea).toBeVisible();
  });

  test('should disable submit button when form is empty', async ({ page }) => {
    await page.goto('/admin/documents/new');

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
  });

  test('should load existing document data on edit page', async ({ page }) => {
    await page.goto('/admin/documents/doc-1');

    await expect(page.getByText('Политика конфиденциальности').first()).toBeVisible();
    await expect(page.getByText('Неактивен')).toBeVisible();
    await expect(page.getByText('2.0', { exact: true })).toBeVisible();
  });

  test('should show publish button for inactive document', async ({ page }) => {
    await page.goto('/admin/documents/doc-1');

    await expect(page.getByText('Опубликовать')).toBeVisible();
  });

  test('should display version number on detail page', async ({ page }) => {
    await page.goto('/admin/documents/doc-1');

    await expect(page.getByText('Версия')).toBeVisible();
    await expect(page.getByText('2.0', { exact: true })).toBeVisible();
  });
});
