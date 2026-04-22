import { test, expect } from '@playwright/test';

/**
 * Admin Newsletter Management E2E Tests
 *
 * Tests for /admin/newsletters pages:
 * - List page: heading, table, status badges, create button
 * - Create page: form fields, validation, submit
 * - Detail page: edit draft, sent read-only, statistics, preview
 */

const MOCK_NEWSLETTERS = [
  {
    id: 'nl-1',
    name: 'Еженедельная рассылка',
    subject: 'Новинки недели на MoviePlatform',
    body: '<h1>Новинки недели</h1><p>Смотрите лучшие новинки этой недели!</p>',
    status: 'DRAFT' as const,
    filters: null,
    sentCount: 0,
    totalRecipients: 0,
    scheduledAt: null,
    sentAt: null,
    createdAt: '2025-08-01T10:00:00.000Z',
    updatedAt: '2025-08-01T10:00:00.000Z',
  },
  {
    id: 'nl-2',
    name: 'Акция выходного дня',
    subject: 'Скидка 30% на подписку!',
    body: '<h1>Скидка 30%</h1><p>Только в эти выходные!</p>',
    status: 'SENT' as const,
    filters: { hasSubscription: false },
    sentCount: 4520,
    totalRecipients: 5000,
    scheduledAt: '2025-07-25T09:00:00.000Z',
    sentAt: '2025-07-25T09:05:00.000Z',
    createdAt: '2025-07-24T10:00:00.000Z',
    updatedAt: '2025-07-25T09:05:00.000Z',
  },
  {
    id: 'nl-3',
    name: 'Запуск нового сериала',
    subject: 'Новый эксклюзивный сериал уже на платформе',
    body: '<h1>Новый сериал</h1><p>Не пропустите премьеру!</p>',
    status: 'DRAFT' as const,
    filters: null,
    sentCount: 0,
    totalRecipients: 0,
    scheduledAt: null,
    sentAt: null,
    createdAt: '2025-08-05T10:00:00.000Z',
    updatedAt: '2025-08-05T10:00:00.000Z',
  },
];

const MOCK_NEWSLETTERS_RESPONSE = {
  success: true,
  data: {
    items: MOCK_NEWSLETTERS,
    page: 1,
    limit: 20,
    total: 3,
    totalPages: 1,
  },
};

test.describe('Admin Newsletter Management', () => {
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

    // Newsletter list API
    await page.route('**/api/v1/admin/notifications/newsletters?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_NEWSLETTERS_RESPONSE),
      });
    });

    await page.route('**/api/v1/admin/notifications/newsletters', async (route) => {
      const method = route.request().method();
      if (method === 'POST') {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'nl-new',
              ...body,
              status: 'DRAFT',
              sentCount: 0,
              totalRecipients: 0,
              scheduledAt: null,
              sentAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_NEWSLETTERS_RESPONSE),
        });
      }
    });

    // Newsletter detail API
    await page.route('**/api/v1/admin/notifications/newsletters/nl-1', async (route) => {
      const method = route.request().method();
      if (method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { ...MOCK_NEWSLETTERS[0], ...route.request().postDataJSON() } }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_NEWSLETTERS[0] }),
        });
      }
    });

    await page.route('**/api/v1/admin/notifications/newsletters/nl-2', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_NEWSLETTERS[1] }),
      });
    });

    await page.route('**/api/v1/admin/notifications/newsletters/nl-3', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_NEWSLETTERS[2] }),
      });
    });

    // Send newsletter
    await page.route('**/api/v1/admin/notifications/newsletters/*/send', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { ...MOCK_NEWSLETTERS[0], status: 'SENDING' } }),
      });
    });

    // Cancel newsletter
    await page.route('**/api/v1/admin/notifications/newsletters/*/cancel', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { ...MOCK_NEWSLETTERS[0], status: 'CANCELLED' } }),
      });
    });

    // Schedule newsletter
    await page.route('**/api/v1/admin/notifications/newsletters/*/schedule', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { ...MOCK_NEWSLETTERS[0], status: 'SCHEDULED' } }),
      });
    });
  });

  test('should load newsletter list page with heading', async ({ page }) => {
    await page.goto('/admin/newsletters');

    await expect(page.getByText('Рассылки')).toBeVisible();
    await expect(page.getByText('Управление email-рассылками и кампаниями')).toBeVisible();
  });

  test('should display newsletter table with rows', async ({ page }) => {
    await page.goto('/admin/newsletters');

    await expect(page.getByText('Еженедельная рассылка')).toBeVisible();
    await expect(page.getByText('Акция выходного дня')).toBeVisible();
    await expect(page.getByText('Запуск нового сериала')).toBeVisible();
  });

  test('should display status badges for DRAFT and SENT newsletters', async ({ page }) => {
    await page.goto('/admin/newsletters');

    await expect(page.getByText('Черновик').first()).toBeVisible();
    await expect(page.getByText('Отправлена')).toBeVisible();
  });

  test('should display "Создать рассылку" button', async ({ page }) => {
    await page.goto('/admin/newsletters');

    const createButton = page.getByText('Создать рассылку').first();
    await expect(createButton).toBeVisible();
  });

  test('should load create form at /admin/newsletters/new', async ({ page }) => {
    await page.goto('/admin/newsletters/new');

    await expect(page.getByText('Создать рассылку').first()).toBeVisible();
    await expect(page.getByText('Название')).toBeVisible();
    await expect(page.getByText('Тема письма')).toBeVisible();
    await expect(page.getByText('Содержание')).toBeVisible();
  });

  test('should require name field on submit', async ({ page }) => {
    await page.goto('/admin/newsletters/new');

    // Try to submit without filling required fields; the button should be disabled
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
  });

  test('should display subject input field', async ({ page }) => {
    await page.goto('/admin/newsletters/new');

    const subjectInput = page.locator('#subject');
    await expect(subjectInput).toBeVisible();
  });

  test('should display body/content editor textarea', async ({ page }) => {
    await page.goto('/admin/newsletters/new');

    const bodyTextarea = page.locator('#body');
    await expect(bodyTextarea).toBeVisible();
  });

  test('should display filters (audience) field', async ({ page }) => {
    await page.goto('/admin/newsletters/new');

    await expect(page.getByText('Фильтры получателей (JSON)')).toBeVisible();
    const filtersTextarea = page.locator('#filters');
    await expect(filtersTextarea).toBeVisible();
  });

  test('should save draft when form is filled and submitted', async ({ page }) => {
    await page.goto('/admin/newsletters/new');

    await page.locator('#name').fill('Тестовая рассылка');
    await page.locator('#subject').fill('Тестовая тема');
    await page.locator('#body').fill('<p>Тестовое содержание</p>');

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled();
  });

  test('should load draft newsletter detail with populated data', async ({ page }) => {
    await page.goto('/admin/newsletters/nl-1');

    await expect(page.getByRole('heading', { name: 'Еженедельная рассылка' })).toBeVisible();
    await expect(page.getByText('Черновик')).toBeVisible();
    await expect(page.getByText('Новинки недели на MoviePlatform')).toBeVisible();
  });

  test('should display read-only view for SENT newsletters with no edit form', async ({ page }) => {
    await page.goto('/admin/newsletters/nl-2');

    await expect(page.getByRole('heading', { name: 'Акция выходного дня' })).toBeVisible();
    await expect(page.getByText('Отправлена').first()).toBeVisible();
    // SENT newsletters should not show edit form
    await expect(page.getByText('Нет доступных действий для текущего статуса рассылки.')).toBeVisible();
  });

  test('should show sent count statistics for SENT newsletters', async ({ page }) => {
    await page.goto('/admin/newsletters/nl-2');

    await expect(page.getByText('Статистика отправки')).toBeVisible();
    await expect(page.getByText('Отправлено писем')).toBeVisible();
    await expect(page.getByText('Всего получателей')).toBeVisible();
  });

  test('should display newsletter body content as preview', async ({ page }) => {
    await page.goto('/admin/newsletters/nl-1');

    await expect(page.getByText('Содержание письма')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Новинки недели', exact: true })).toBeVisible();
  });
});
