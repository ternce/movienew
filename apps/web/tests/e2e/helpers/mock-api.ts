import type { Page } from '@playwright/test';

/**
 * Mock forgot password API with different scenarios
 */
export async function mockForgotPasswordApi(
  page: Page,
  scenario: 'success' | 'rate_limit' | 'error'
) {
  const responses: Record<string, { status: number; body: unknown }> = {
    success: {
      status: 200,
      body: {
        success: true,
        data: { message: 'Инструкции отправлены на email' },
      },
    },
    rate_limit: {
      status: 429,
      body: {
        success: false,
        error: {
          code: 'RATE_LIMIT',
          message: 'Слишком много запросов. Попробуйте позже.',
        },
      },
    },
    error: {
      status: 500,
      body: {
        success: false,
        error: {
          code: 'SRV_001',
          message: 'Внутренняя ошибка сервера',
        },
      },
    },
  };

  const response = responses[scenario];

  await page.route('**/api/v1/auth/forgot-password', async (route) => {
    await route.fulfill({
      status: response.status,
      contentType: 'application/json',
      body: JSON.stringify(response.body),
    });
  });
}

/**
 * Mock verify email API with different scenarios
 */
export async function mockVerifyEmailApi(
  page: Page,
  scenario: 'success' | 'expired' | 'invalid' | 'network_error'
) {
  if (scenario === 'network_error') {
    await page.route('**/api/v1/auth/verify-email/**', async (route) => {
      await route.abort('connectionrefused');
    });
    return;
  }

  const responses: Record<string, { status: number; body: unknown }> = {
    success: {
      status: 200,
      body: {
        success: true,
        data: { message: 'Email подтверждён' },
      },
    },
    expired: {
      status: 410,
      body: {
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Ссылка для подтверждения устарела',
        },
      },
    },
    invalid: {
      status: 400,
      body: {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Недействительный токен',
        },
      },
    },
  };

  const response = responses[scenario];

  await page.route('**/api/v1/auth/verify-email/**', async (route) => {
    await route.fulfill({
      status: response.status,
      contentType: 'application/json',
      body: JSON.stringify(response.body),
    });
  });
}

/**
 * Mock search suggestions API
 */
export async function mockSearchSuggestionsApi(
  page: Page,
  results: Array<{ id: string; title: string; type?: string }>
) {
  await page.route('**/api/v1/content/search*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: results,
      }),
    });
  });
}

/**
 * Mock document API
 */
export async function mockDocumentApi(
  page: Page,
  type: string,
  content: string
) {
  await page.route(`**/api/v1/documents/${type}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          type,
          content,
          version: '1.0',
          updatedAt: '2025-01-01',
        },
      }),
    });
  });
}

/**
 * Mock content listing API (clips, tutorials, series)
 */
export async function mockContentListApi(
  page: Page,
  contentType: 'clips' | 'tutorials' | 'series',
  items: unknown[],
  meta?: { page?: number; limit?: number; total?: number }
) {
  await page.route(`**/api/v1/${contentType}*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: items,
        meta: {
          page: meta?.page ?? 1,
          limit: meta?.limit ?? 12,
          total: meta?.total ?? items.length,
        },
      }),
    });
  });
}

/**
 * Mock category content API
 */
export async function mockCategoryApi(
  page: Page,
  slug: string,
  data: {
    series?: unknown[];
    clips?: unknown[];
    tutorials?: unknown[];
  }
) {
  await page.route(`**/api/v1/categories/${slug}*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data,
      }),
    });
  });
}
