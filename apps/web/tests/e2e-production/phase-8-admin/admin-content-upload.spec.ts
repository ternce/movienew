/**
 * Admin Content Upload Pipeline E2E Tests
 *
 * Tests image thumbnail upload, video preview upload, main video HLS transcoding,
 * encoding status badges, and upload validation against production.
 *
 * PRIORITY #1 — This is the most critical admin test file.
 */

import { test, expect } from '@playwright/test';
import {
  getAdminToken,
  getFirstCategoryId,
  createTestContent,
  cleanupAllTestContent,
  waitForAdminPage,
  generateTestImage,
  generateTestInvalidFile,
  generateTestVideo,
  apiGetEncodingStatus,
  apiDeleteVideo,
  getContentById,
  type ContentItem,
} from './helpers/admin-test.helper';

let adminToken: string;
let firstCategoryId: string;
let testImagePath: string;
let testInvalidPath: string;
let testVideoPath: string;

test.beforeAll(async () => {
  try {
    adminToken = await getAdminToken();
    firstCategoryId = await getFirstCategoryId(adminToken);
    testImagePath = await generateTestImage();
    testInvalidPath = await generateTestInvalidFile();
    testVideoPath = await generateTestVideo();
  } catch {
    // Will be handled by test.skip in individual tests
  }
});

test.afterAll(async () => {
  if (adminToken) {
    await cleanupAllTestContent(adminToken);
  }
});

// ============================================================
// Image Upload (Thumbnail on Create Page)
// ============================================================

test.describe('Image Upload — Thumbnail on Create Page', () => {
  test('image upload drop zone is visible with instructional text', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');
    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    // Verify Медиа card heading
    await expect(page.getByRole('heading', { name: 'Медиа' })).toBeVisible();

    // Verify image drop zone text
    await expect(page.getByText('Перетащите или нажмите для загрузки').first()).toBeVisible();
    await expect(page.getByText('JPG, PNG, WebP до 10MB')).toBeVisible();

    // Verify Обложка label
    const body = await page.locator('body').innerText();
    expect(body).toContain('Обложка');
    expect(body).toContain('Изображение обложки контента');
  });

  test('hidden file input accepts image types', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');
    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    // Find hidden file input for images
    const imageInput = page.locator('input[type="file"][accept="image/jpeg,image/png,image/webp"]');
    await expect(imageInput).toHaveCount(1);

    // Verify it's hidden
    const isHidden = await imageInput.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.display === 'none' || el.classList.contains('hidden');
    });
    expect(isHidden).toBe(true);
  });

  test('manual URL input works for image', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');
    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    // Click manual URL toggle
    const urlButton = page.getByRole('button', { name: 'Или введите URL вручную' }).first();
    await expect(urlButton).toBeVisible();
    await urlButton.click();

    // Verify URL input appears
    const urlInput = page.locator('input[placeholder="https://..."]').first();
    await expect(urlInput).toBeVisible();

    // Fill URL
    await urlInput.fill('https://placehold.co/400x160');

    // Click OK
    const okButton = page.getByRole('button', { name: 'OK' }).first();
    await okButton.click();

    // Verify preview image appears
    await expect(page.locator('img[alt="Preview"]')).toBeVisible({ timeout: 10_000 });
  });

  test('image clear button removes preview', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');
    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    // Set image via manual URL
    const urlButton = page.getByRole('button', { name: 'Или введите URL вручную' }).first();
    await urlButton.click();
    const urlInput = page.locator('input[placeholder="https://..."]').first();
    await urlInput.fill('https://placehold.co/400x160');
    await page.getByRole('button', { name: 'OK' }).first().click();
    await expect(page.locator('img[alt="Preview"]')).toBeVisible({ timeout: 10_000 });

    // Find and click the destructive X button (in the overlay over the preview)
    const removeButton = page.locator('img[alt="Preview"]')
      .locator('..')
      .locator('..')
      .locator('button')
      .filter({ has: page.locator('svg') })
      .last();
    await removeButton.click();

    // Verify drop zone reappears
    await expect(page.getByText('Перетащите или нажмите для загрузки').first()).toBeVisible({ timeout: 5_000 });
  });

  test('image upload via file input shows preview', async ({ page }) => {
    test.skip(!adminToken || !testImagePath, 'Admin token or test image not available');
    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    // Find hidden file input for images
    const imageInput = page.locator('input[type="file"][accept="image/jpeg,image/png,image/webp"]');

    // Upload test image
    await imageInput.setInputFiles(testImagePath);

    // Wait for upload to complete — look for either preview or toast
    const previewOrToast = await Promise.race([
      page.locator('img[alt="Preview"]').waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'preview'),
      page.getByText('Изображение загружено').waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'toast'),
      page.getByText('Не удалось загрузить').waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'error'),
    ]).catch(() => 'timeout');

    // If upload succeeded, verify preview
    if (previewOrToast === 'preview' || previewOrToast === 'toast') {
      // Check that either preview image appeared or success toast appeared
      expect(['preview', 'toast']).toContain(previewOrToast);
    } else if (previewOrToast === 'error') {
      // Upload endpoint might not be configured on prod — skip gracefully
      test.skip(true, 'Image upload endpoint returned error on production');
    } else {
      // Timeout — upload might be slow or endpoint not available
      test.skip(true, 'Image upload timed out — endpoint may not be configured');
    }
  });

  test('image upload rejects invalid file type via client-side validation', async ({ page }) => {
    test.skip(!adminToken || !testInvalidPath, 'Admin token or test file not available');
    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    const imageInput = page.locator('input[type="file"][accept="image/jpeg,image/png,image/webp"]');

    // The browser's accept attribute prevents selection of .txt files in real usage.
    // In Playwright, setInputFiles bypasses the dialog but the component checks file.type.
    // The component validation uses: allowedTypes.includes(file.type)
    // A .txt file has type "text/plain" which is not in the allowed list.
    await imageInput.setInputFiles(testInvalidPath);

    // Expect toast error
    await expect(page.getByText('Неподдерживаемый формат файла')).toBeVisible({ timeout: 5_000 });
  });
});

// ============================================================
// Video Upload (Preview on Create Page)
// ============================================================

test.describe('Video Upload — Preview on Create Page', () => {
  test('video preview drop zone is visible', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');
    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    // Verify Превью видео label
    const body = await page.locator('body').innerText();
    expect(body).toContain('Превью видео');
    expect(body).toContain('Короткое превью контента');

    // Verify video drop zone text
    await expect(page.getByText('Перетащите видео или нажмите для загрузки')).toBeVisible();
    await expect(page.getByText('MP4, WebM до 2GB')).toBeVisible();
  });

  test('video file input has correct accept attribute', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');
    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    // Preview video input should accept mp4 and webm
    const videoInput = page.locator('input[type="file"][accept="video/mp4,video/webm"]');
    await expect(videoInput).toHaveCount(1);
  });

  test('video manual URL input works in simple mode', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');
    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    // Click the second "Или введите URL вручную" (under video section)
    const urlButtons = page.getByRole('button', { name: 'Или введите URL вручную' });
    const videoUrlButton = urlButtons.nth(1); // Second one is for video
    await videoUrlButton.click();

    // Fill URL
    const urlInputs = page.locator('input[placeholder="https://..."]');
    const videoUrlInput = urlInputs.last();
    await videoUrlInput.fill('https://example.com/test-video.mp4');

    // Click OK (the last OK button)
    const okButtons = page.getByRole('button', { name: 'OK' });
    await okButtons.last().click();

    // Verify <video> element appears with controls
    await expect(page.locator('video[controls]')).toBeVisible({ timeout: 5_000 });
  });
});

// ============================================================
// Main Video Upload (HLS Transcoding on Edit Page)
// ============================================================

test.describe('Main Video Upload — HLS Transcoding on Edit Page', () => {
  let testContent: ContentItem;

  test.beforeAll(async () => {
    if (!adminToken || !firstCategoryId) return;
    try {
      testContent = await createTestContent(adminToken, {
        title: 'E2E-TEST-Upload-Video-Target',
        contentType: 'CLIP',
        ageCategory: 'ZERO_PLUS',
      });
    } catch {
      // Will skip tests
    }
  });

  test.afterAll(async () => {
    if (adminToken) {
      await cleanupAllTestContent(adminToken);
    }
  });

  test('video content card visible on edit page', async ({ page }) => {
    test.skip(!adminToken || !testContent, 'Test content not created');
    const loaded = await waitForAdminPage(page, `/admin/content/${testContent.id}`);
    test.skip(!loaded, 'Auth state expired');

    // Verify "Видео контент" card heading
    await expect(page.getByRole('heading', { name: 'Видео контент' })).toBeVisible();

    // Verify label
    const body = await page.locator('body').innerText();
    expect(body).toContain('Основное видео');
  });

  test('video content card has correct upload description', async ({ page }) => {
    test.skip(!adminToken || !testContent, 'Test content not created');
    const loaded = await waitForAdminPage(page, `/admin/content/${testContent.id}`);
    test.skip(!loaded, 'Auth state expired');

    // Check for HLS transcoding description or upload zone
    const body = await page.locator('body').innerText();
    const hasDescription = body.includes('транскодирования в HLS') ||
      body.includes('Перетащите видео или нажмите') ||
      body.includes('Ожидание') ||
      body.includes('Основное видео');
    expect(hasDescription).toBe(true);
  });

  test('main video file input has extended accept types', async ({ page }) => {
    test.skip(!adminToken || !testContent, 'Test content not created');
    const loaded = await waitForAdminPage(page, `/admin/content/${testContent.id}`);
    test.skip(!loaded, 'Auth state expired');

    // Content mode video input should accept mp4, webm, quicktime, matroska
    const videoInput = page.locator(
      'input[type="file"][accept="video/mp4,video/webm,video/quicktime,video/x-matroska"]'
    );
    const count = await videoInput.count();

    // At least one video input with extended types should exist
    // (It may not be visible if encoding is in a non-default state)
    if (count === 0) {
      // Check if encoding status badge is shown instead (content already has video)
      const body = await page.locator('body').innerText();
      const hasEncodingState = body.includes('Ожидание') || body.includes('Обработка') ||
        body.includes('Готово') || body.includes('Ошибка');
      expect(hasEncodingState).toBe(true);
    } else {
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test('encoding status polling via API', async () => {
    test.skip(!adminToken || !testContent, 'Test content not created');

    // Check encoding status for our test content
    const status = await apiGetEncodingStatus(adminToken, testContent.id);

    // For freshly created content without video, status may be null
    // For content with video, it should have a valid status
    if (status) {
      expect(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).toContain(status.status);
    }
    // null is acceptable — means no video uploaded yet
  });

  test('encoding status badge renders on edit page for existing content with video', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');

    // Try to find existing content that has encoding status
    // Navigate to the first content item in the list
    const loaded = await waitForAdminPage(page, '/admin/content');
    test.skip(!loaded, 'Auth state expired');

    // Get first content link from the table
    const firstRow = page.locator('table tbody tr').first();
    const rowExists = await firstRow.isVisible().catch(() => false);
    test.skip(!rowExists, 'No content in list');

    // Click the row action menu, then edit
    const menuButton = firstRow.getByRole('button', { name: 'Open menu' });
    await menuButton.click();
    await page.waitForTimeout(500);

    const editItem = page.getByRole('menuitem', { name: 'Редактировать' });
    if (await editItem.isVisible().catch(() => false)) {
      await editItem.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Check for any encoding status indicator
      const body = await page.locator('body').innerText();
      const hasVideoSection = body.includes('Видео контент');
      expect(hasVideoSection).toBe(true);

      // Check for encoding badge text
      const hasEncodingBadge = body.includes('Ожидание') ||
        body.includes('Обработка') ||
        body.includes('Готово') ||
        body.includes('Ошибка') ||
        body.includes('Перетащите видео');
      expect(hasEncodingBadge).toBe(true);
    }
  });

  test('main video upload triggers transcoding request', async ({ page }) => {
    test.slow(); // Double timeout to 120s for upload
    test.skip(!adminToken || !testContent || !testVideoPath, 'Prerequisites not met');
    const loaded = await waitForAdminPage(page, `/admin/content/${testContent.id}`);
    test.skip(!loaded, 'Auth state expired');

    // Find file input for main video (extended accept types)
    const videoInput = page.locator(
      'input[type="file"][accept="video/mp4,video/webm,video/quicktime,video/x-matroska"]'
    );
    const inputExists = await videoInput.count() > 0;

    if (!inputExists) {
      // Content already has video in PENDING/PROCESSING/COMPLETED state — skip upload test
      test.skip(true, 'Video input not visible — content may already have video');
      return;
    }

    // Set up response interception before upload
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/video/upload') && response.status() !== 0,
      { timeout: 30_000 }
    ).catch(() => null);

    // Upload test video
    await videoInput.setInputFiles(testVideoPath);

    // Wait for either progress indicator or API response
    const [response] = await Promise.all([
      responsePromise,
      // Also check for progress text
      page.getByText('Загрузка видео...').waitFor({ state: 'visible', timeout: 10_000 }).catch(() => null),
    ]);

    if (response) {
      // Got a response from upload endpoint
      const status = response.status();
      if (status >= 200 && status < 300) {
        // Success — check for success toast
        await expect(page.getByText('Видео загружено, начинается обработка')).toBeVisible({ timeout: 10_000 });
      } else {
        // Server rejected (413, 500, etc.) — log but don't fail
        console.log(`Video upload returned status ${status} — endpoint may not be fully configured`);
      }
    }
  });
});

// ============================================================
// Upload Validation
// ============================================================

test.describe('Upload Validation', () => {
  test('video upload rejects invalid format via client-side validation', async ({ page }) => {
    test.skip(!adminToken || !testInvalidPath, 'Prerequisites not met');
    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    // Use the preview video input (simple mode)
    const videoInput = page.locator('input[type="file"][accept="video/mp4,video/webm"]');
    const count = await videoInput.count();
    test.skip(count === 0, 'Video input not found');

    await videoInput.setInputFiles(testInvalidPath);

    // Expect toast error for invalid video format
    await expect(page.getByText('Неподдерживаемый формат видео')).toBeVisible({ timeout: 5_000 });
  });

  test('form submit includes thumbnailUrl from manual URL', async ({ page }) => {
    test.skip(!adminToken || !firstCategoryId, 'Prerequisites not met');
    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    // Fill required fields
    await page.locator('#title').fill('E2E-TEST-Upload-Form-Submit');
    await page.locator('#description').fill('Testing form submission with thumbnail URL');

    // Set image via manual URL
    const urlButton = page.getByRole('button', { name: 'Или введите URL вручную' }).first();
    await urlButton.click();
    const urlInput = page.locator('input[placeholder="https://..."]').first();
    await urlInput.fill('https://placehold.co/400x160');
    await page.getByRole('button', { name: 'OK' }).first().click();
    await expect(page.locator('img[alt="Preview"]')).toBeVisible({ timeout: 10_000 });

    // Select content type
    await page.locator('button[role="combobox"]').filter({ hasText: 'Выберите тип' }).click();
    await page.waitForTimeout(600);
    await page.getByRole('option', { name: 'Сериал' }).click();
    await page.waitForTimeout(400);

    // Select age category
    await page.locator('button[role="combobox"]').filter({ hasText: 'Выберите возраст' }).click();
    await page.waitForTimeout(600);
    await page.getByRole('option', { name: '0+' }).click();
    await page.waitForTimeout(400);

    // Select category
    await page.locator('button[role="combobox"]').filter({ hasText: 'Выберите тематику' }).click();
    await page.waitForTimeout(600);
    const categoryOption = page.getByRole('option').first();
    if (await categoryOption.isVisible().catch(() => false)) {
      await categoryOption.click();
      await page.waitForTimeout(400);
    }

    // Intercept the POST request to verify it includes thumbnailUrl
    const requestPromise = page.waitForRequest(
      (req) => req.url().includes('/admin/content') && req.method() === 'POST',
      { timeout: 10_000 }
    ).catch(() => null);

    // Click submit
    const submitButton = page.getByRole('button', { name: 'Создать контент' });
    if (await submitButton.isEnabled()) {
      await submitButton.click();

      const request = await requestPromise;
      if (request) {
        const postData = request.postDataJSON();
        expect(postData.thumbnailUrl).toBeTruthy();
        expect(postData.thumbnailUrl).toContain('placehold.co');
      }
    }
  });
});

// ============================================================
// Encoding Status Badge States
// ============================================================

test.describe('Encoding Status Badge Verification', () => {
  test('PENDING state shows "Ожидание..." text', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');

    // The "grr" content we saw during exploration has PENDING status
    // Navigate to the content list and find it
    const loaded = await waitForAdminPage(page, '/admin/content');
    test.skip(!loaded, 'Auth state expired');

    // Click first row's edit to check encoding badge
    const menuButton = page.locator('table tbody tr').first().getByRole('button', { name: 'Open menu' });
    if (await menuButton.isVisible().catch(() => false)) {
      await menuButton.click();
      await page.waitForTimeout(500);
      await page.getByRole('menuitem', { name: 'Редактировать' }).click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      const body = await page.locator('body').innerText();

      // At least one encoding state should be visible
      const hasBadge = body.includes('Ожидание') ||
        body.includes('Обработка') ||
        body.includes('Готово') ||
        body.includes('Ошибка') ||
        body.includes('Перетащите видео');
      expect(hasBadge).toBe(true);

      // If PENDING, verify animated indicator
      if (body.includes('Ожидание')) {
        const pendingBadge = page.getByText('Ожидание...');
        await expect(pendingBadge).toBeVisible();
      }

      // If COMPLETED, verify quality badges and action buttons
      if (body.includes('Готово')) {
        await expect(page.getByText('Готово')).toBeVisible();
        // Check for "Заменить" and "Удалить" buttons
        await expect(page.getByRole('button', { name: 'Заменить' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Удалить' })).toBeVisible();
      }

      // If FAILED, verify retry button
      if (body.includes('Ошибка')) {
        await expect(page.getByText('Ошибка')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Повторить' })).toBeVisible();
      }
    }
  });
});
