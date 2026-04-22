import { test, expect } from '../fixtures/integration.fixture';
import { injectAuthState, mockCommonApi } from '../fixtures/integration.fixture';

test.describe('Verification Flow', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await mockCommonApi(page);

    // Mock verification status - initially unverified
    await page.route('**/api/v1/users/me/verification/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { status: 'UNVERIFIED', method: null, submittedAt: null },
        }),
      });
    });

    // Mock verification (also matches users/me/verification)
    await page.route('**/api/v1/users/me/verification', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { status: 'PENDING', method: 'DOCUMENT', submittedAt: new Date().toISOString() },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { status: 'UNVERIFIED', method: null },
          }),
        });
      }
    });

    // Mock file upload
    await page.route('**/api/v1/upload/image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { url: 'https://cdn.example.com/doc.jpg', key: 'doc-123' },
        }),
      });
    });

    // Mock sessions
    await page.route('**/api/v1/users/me/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    // Mock account subscriptions
    await page.route('**/api/v1/subscriptions/my*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: [], total: 0, page: 1, limit: 20 },
        }),
      });
    });
  });

  test('view unverified status on verification page', async ({ page }) => {
    await page.goto('/account/verification');
    await expect(page.getByText(/верификац|verification/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/не верифицирован|unverified/i).first()).toBeVisible();
  });

  test('see verification benefits listed', async ({ page }) => {
    await page.goto('/account/verification');
    // Benefits section should explain what verification unlocks
    await expect(page.getByText(/18\+|доступ|вывод|withdrawal/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('verification status updates to PENDING after submission', async ({ page }) => {
    // Override to return PENDING status
    await page.route('**/api/v1/users/me/verification/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { status: 'PENDING', method: 'DOCUMENT', submittedAt: new Date().toISOString() },
        }),
      });
    });

    await page.goto('/account/verification');
    await expect(page.getByText(/на рассмотрении|pending|ожидан/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('shows VERIFIED status when approved', async ({ page }) => {
    await page.route('**/api/v1/users/me/verification/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            status: 'VERIFIED',
            method: 'DOCUMENT',
            verifiedAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto('/account/verification');
    await expect(page.getByText(/верифицирован|verified|подтверждён/i).first()).toBeVisible({ timeout: 10000 });
  });
});
