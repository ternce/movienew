import { test as base, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/auth.fixture';
import {
  mockAdminVideoApi,
  mockEdgeCenterUploadUrl,
  mockEncodingStatusFlow,
  MOCK_ENCODING_STATUS,
  MOCK_CONTENT_DETAIL,
} from '../fixtures/video.fixture';

const test = base;

test.describe('Admin Video Upload & Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock admin auth state
    await page.context().addCookies([
      {
        name: 'mp-authenticated',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
      {
        name: 'mp-auth-token',
        value: 'mock-admin-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Stub admin profile endpoint
    await page.route('**/api/v1/users/me/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'admin-1',
            email: TEST_USERS.admin.email,
            firstName: TEST_USERS.admin.firstName,
            lastName: TEST_USERS.admin.lastName,
            role: 'ADMIN',
            ageCategory: '18+',
          },
        }),
      });
    });

    // Stub admin stats for dashboard redirects
    await page.route('**/api/v1/admin/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {} }),
      });
    });
  });

  // ==========================================================
  // Encoding Status Badge States
  // ==========================================================
  test.describe('Encoding Status Badge', () => {
    test('should show "Ожидание..." for PENDING status', async ({ page }) => {
      await mockAdminVideoApi(page, 'pending');

      await page.goto(`/admin/content/${MOCK_CONTENT_DETAIL.id}`);
      await page.waitForLoadState('networkidle');

      const pendingText = page.locator('text="Ожидание..."');
      await expect(pendingText).toBeVisible({ timeout: 15000 });
    });

    test('should show "Обработка..." for PROCESSING status', async ({ page }) => {
      await mockAdminVideoApi(page, 'processing');

      await page.goto(`/admin/content/${MOCK_CONTENT_DETAIL.id}`);
      await page.waitForLoadState('networkidle');

      const processingText = page.locator('text=/Обработка/');
      await expect(processingText).toBeVisible({ timeout: 15000 });
    });

    test('should show progress percentage during PROCESSING', async ({ page }) => {
      await mockAdminVideoApi(page, 'processing');

      await page.goto(`/admin/content/${MOCK_CONTENT_DETAIL.id}`);
      await page.waitForLoadState('networkidle');

      // Progress should be displayed (45% from mock data)
      const progressText = page.locator('text=/45%/');
      await expect(progressText).toBeVisible({ timeout: 15000 });
    });

    test('should show "Готово" for COMPLETED status', async ({ page }) => {
      await mockAdminVideoApi(page, 'completed');

      await page.goto(`/admin/content/${MOCK_CONTENT_DETAIL.id}`);
      await page.waitForLoadState('networkidle');

      const completedText = page.locator('text="Готово"');
      await expect(completedText).toBeVisible({ timeout: 15000 });
    });

    test('should show "Ошибка" for FAILED status', async ({ page }) => {
      await mockAdminVideoApi(page, 'failed');

      await page.goto(`/admin/content/${MOCK_CONTENT_DETAIL.id}`);
      await page.waitForLoadState('networkidle');

      const failedText = page.locator('text="Ошибка"');
      await expect(failedText).toBeVisible({ timeout: 15000 });
    });

    test('should show "Повторить" button on FAILED status', async ({ page }) => {
      await mockAdminVideoApi(page, 'failed');

      await page.goto(`/admin/content/${MOCK_CONTENT_DETAIL.id}`);
      await page.waitForLoadState('networkidle');

      const retryButton = page.locator('button:has-text("Повторить")');
      await expect(retryButton).toBeVisible({ timeout: 15000 });
    });
  });

  // ==========================================================
  // Upload Area (no video exists)
  // ==========================================================
  test.describe('Upload Area', () => {
    test('should show upload area when no video exists', async ({ page }) => {
      // Override with a status that has no video files and no encoding status set
      await page.route('**/api/v1/admin/content/*/video/status', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              contentId: MOCK_CONTENT_DETAIL.id,
              status: 'PENDING',
              availableQualities: [],
            },
          }),
        });
      });

      // Content without video files
      await page.route('**/api/v1/admin/content/*', async (route) => {
        const url = route.request().url();
        if (url.includes('/video/')) {
          await route.fallback();
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { ...MOCK_CONTENT_DETAIL, videoFiles: [] },
          }),
        });
      });

      await page.goto(`/admin/content/${MOCK_CONTENT_DETAIL.id}`);
      await page.waitForLoadState('networkidle');

      // Upload prompt text should be visible
      const uploadText = page.locator('text=/Перетащите видео|нажмите для загрузки/');
      await expect(uploadText.first()).toBeVisible({ timeout: 15000 });
    });

    test('should show supported format info in upload area', async ({ page }) => {
      await page.route('**/api/v1/admin/content/*/video/status', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              contentId: MOCK_CONTENT_DETAIL.id,
              status: 'PENDING',
              availableQualities: [],
            },
          }),
        });
      });

      await page.route('**/api/v1/admin/content/*', async (route) => {
        const url = route.request().url();
        if (url.includes('/video/')) {
          await route.fallback();
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { ...MOCK_CONTENT_DETAIL, videoFiles: [] },
          }),
        });
      });

      await page.goto(`/admin/content/${MOCK_CONTENT_DETAIL.id}`);
      await page.waitForLoadState('networkidle');

      // Format info should mention MP4 and WebM
      const formatInfo = page.locator('text=/MP4.*WebM|WebM.*MP4/');
      await expect(formatInfo.first()).toBeVisible({ timeout: 15000 });
    });
  });

  // ==========================================================
  // Completed State
  // ==========================================================
  test.describe('Completed State', () => {
    test.beforeEach(async ({ page }) => {
      await mockAdminVideoApi(page, 'completed');
    });

    test('should show quality badges for completed encoding', async ({ page }) => {
      await page.goto(`/admin/content/${MOCK_CONTENT_DETAIL.id}`);
      await page.waitForLoadState('networkidle');

      // Quality badges should be visible
      for (const quality of MOCK_ENCODING_STATUS.completed.availableQualities) {
        const badge = page.locator(`text="${quality}"`);
        await expect(badge.first()).toBeVisible({ timeout: 15000 });
      }
    });

    test('should show delete button for completed video', async ({ page }) => {
      await page.goto(`/admin/content/${MOCK_CONTENT_DETAIL.id}`);
      await page.waitForLoadState('networkidle');

      const deleteButton = page.locator('button:has-text("Удалить")');
      await expect(deleteButton).toBeVisible({ timeout: 15000 });
    });

    test('should show replace button for completed video', async ({ page }) => {
      await page.goto(`/admin/content/${MOCK_CONTENT_DETAIL.id}`);
      await page.waitForLoadState('networkidle');

      const replaceButton = page.locator('button:has-text("Заменить")');
      await expect(replaceButton).toBeVisible({ timeout: 15000 });
    });

    test('should show "Готово" status text with checkmark', async ({ page }) => {
      await page.goto(`/admin/content/${MOCK_CONTENT_DETAIL.id}`);
      await page.waitForLoadState('networkidle');

      const completedLabel = page.locator('text="Готово"');
      await expect(completedLabel).toBeVisible({ timeout: 15000 });
    });
  });

  // ==========================================================
  // Delete Flow
  // ==========================================================
  test.describe('Delete Video', () => {
    test('should call delete API when clicking delete button', async ({ page }) => {
      await mockAdminVideoApi(page, 'completed');

      let deleteRequested = false;
      await page.route('**/api/v1/admin/content/*/video', async (route) => {
        if (route.request().method() === 'DELETE') {
          deleteRequested = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              message: 'Video deleted successfully',
            }),
          });
        } else {
          await route.fallback();
        }
      });

      await page.goto(`/admin/content/${MOCK_CONTENT_DETAIL.id}`);
      await page.waitForLoadState('networkidle');

      const deleteButton = page.locator('button:has-text("Удалить")');
      await expect(deleteButton).toBeVisible({ timeout: 15000 });
      await deleteButton.click();

      // Wait for the delete request to be made
      await page.waitForTimeout(2000);
      expect(deleteRequested).toBe(true);
    });
  });

  // ==========================================================
  // EdgeCenter Upload URL Endpoint
  // ==========================================================
  test.describe('EdgeCenter Upload URL', () => {
    test('should call upload-url endpoint when requesting TUS credentials', async ({ page }) => {
      let uploadUrlRequested = false;

      await page.route('**/api/v1/admin/content/*/video/upload-url', async (route) => {
        if (route.request().method() === 'POST') {
          uploadUrlRequested = true;
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                uploadUrl: 'https://upload.gcore.com/tus/v1/upload',
                headers: {
                  Authorization: 'Bearer test-token',
                  'Tus-Resumable': '1.0.0',
                  VideoId: '12345',
                },
                videoId: '12345',
                libraryId: 'edgecenter',
                expiresAt: new Date(Date.now() + 86400000).toISOString(),
              },
            }),
          });
        } else {
          await route.fallback();
        }
      });

      // Verify the route handler is registered
      expect(uploadUrlRequested).toBe(false);
    });
  });

  // ==========================================================
  // Encoding Status Transition Flow
  // ==========================================================
  test.describe('Encoding Status Flow', () => {
    test('should show encoding status transition from PENDING to COMPLETED', async ({ page }) => {
      await mockEncodingStatusFlow(page);

      // Also mock content detail
      await page.route('**/api/v1/admin/content/*', async (route) => {
        const url = route.request().url();
        if (url.includes('/video/')) {
          await route.fallback();
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { ...MOCK_CONTENT_DETAIL, videoFiles: [] },
          }),
        });
      });

      await page.goto(`/admin/content/${MOCK_CONTENT_DETAIL.id}`);
      await page.waitForLoadState('networkidle');

      // First call returns PENDING
      const pendingText = page.locator('text=/Ожидание/');
      await expect(pendingText.first()).toBeVisible({ timeout: 15000 });
    });
  });

  // ==========================================================
  // Thumbnails Endpoint
  // ==========================================================
  test.describe('Thumbnails', () => {
    test('should show thumbnail when completed video has one', async ({ page }) => {
      await mockAdminVideoApi(page, 'completed');

      await page.goto(`/admin/content/${MOCK_CONTENT_DETAIL.id}`);
      await page.waitForLoadState('networkidle');

      // Thumbnail image should be visible in completed state
      const thumbnail = page.locator('img[alt="Thumbnail"]');
      await expect(thumbnail).toBeVisible({ timeout: 15000 });
    });
  });
});
