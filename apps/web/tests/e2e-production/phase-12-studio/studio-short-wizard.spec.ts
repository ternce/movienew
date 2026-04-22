/**
 * Studio Short Wizard — Production E2E Tests
 *
 * Validates the /studio/create/short single-page wizard:
 * - Left panel: vertical video upload with 9:16 and 60s hints
 * - Right panel: title, description, tags, age rating
 * - Actions: save draft (DRAFT) and publish (PENDING)
 * - Always free (isFree: true), contentType: 'SHORT'
 * Uses admin-state.json storageState (ADMIN role).
 */

import { test, expect } from '@playwright/test';
import {
  waitForStudioPage,
  getAdminToken,
  cleanupAllTestContent,
  TEST_CONTENT_PREFIX,
  findContentByTitle,
} from './helpers/studio-test.helper';

let adminToken: string;

test.beforeAll(async () => {
  try {
    adminToken = await getAdminToken();
  } catch {
    // Tests will skip via adminToken check
  }
});

test.afterAll(async () => {
  if (adminToken) {
    await cleanupAllTestContent(adminToken);
  }
});

// ============================================================
// Short Wizard Page
// ============================================================

test.describe('Short Wizard Page', () => {
  test('page loads at /studio/create/short', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/short');
    test.skip(!loaded, 'Auth state expired — redirected to login');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test('displays "Создать Short" heading', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/short');
    test.skip(!loaded, 'Auth state expired');

    await expect(page.getByText('Создать Short')).toBeVisible({ timeout: 10_000 });
  });

  test('displays subheading about vertical video', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/short');
    test.skip(!loaded, 'Auth state expired');

    await expect(
      page.getByText('Короткое вертикальное видео до 60 секунд')
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ============================================================
// Left Panel — Video
// ============================================================

test.describe('Left Panel — Video', () => {
  test('shows "Видео" section heading', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/short');
    test.skip(!loaded, 'Auth state expired');

    // Use h2 selector to avoid matching sidebar "Видео" links
    const videoHeading = page.locator('h2').filter({ hasText: 'Видео' });
    await expect(videoHeading).toBeVisible({ timeout: 10_000 });
  });

  test('shows "Вертикальное видео 9:16" hint', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/short');
    test.skip(!loaded, 'Auth state expired');

    // Hint is inside the left panel card
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Вертикальное видео 9:16');
  });

  test('shows "Максимум 60 секунд" hint', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/short');
    test.skip(!loaded, 'Auth state expired');

    await expect(
      page.getByText('Максимум 60 секунд')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('has video upload zone', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/short');
    test.skip(!loaded, 'Auth state expired');

    // The VideoUpload component renders a drop zone or file input area
    const bodyText = await page.locator('body').innerText();
    const hasUploadIndicator =
      bodyText.includes('Загрузите') ||
      bodyText.includes('Видео Short') ||
      bodyText.includes('MP4') ||
      bodyText.includes('WebM');

    expect(hasUploadIndicator).toBe(true);
  });
});

// ============================================================
// Right Panel — Form Fields
// ============================================================

test.describe('Right Panel — Form Fields', () => {
  test('has title input with correct placeholder', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/short');
    test.skip(!loaded, 'Auth state expired');

    const titleInput = page.locator('#short-title');
    await expect(titleInput).toBeVisible({ timeout: 10_000 });
    await expect(titleInput).toHaveAttribute('placeholder', 'Введите название');
    await expect(titleInput).toHaveAttribute('maxlength', '200');
  });

  test('has description textarea with correct placeholder', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/short');
    test.skip(!loaded, 'Auth state expired');

    const descriptionInput = page.locator('#short-description');
    await expect(descriptionInput).toBeVisible({ timeout: 10_000 });
    await expect(descriptionInput).toHaveAttribute(
      'placeholder',
      'Краткое описание шорта...'
    );
    await expect(descriptionInput).toHaveAttribute('maxlength', '5000');
  });

  test('shows character counters "0 / 200" and "0 / 5000"', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/short');
    test.skip(!loaded, 'Auth state expired');

    await expect(page.getByText('0 / 200')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('0 / 5000')).toBeVisible({ timeout: 10_000 });
  });

  test('has "Название *" and "Описание" labels', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/short');
    test.skip(!loaded, 'Auth state expired');

    await expect(page.getByText('Название *')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Описание', { exact: false })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('has "Теги" label and tag input with placeholder', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/short');
    test.skip(!loaded, 'Auth state expired');

    await expect(page.getByText('Теги')).toBeVisible({ timeout: 10_000 });

    const tagInput = page.getByPlaceholder('Добавить тег...');
    await expect(tagInput).toBeVisible({ timeout: 10_000 });
  });

  test('has "Возрастное ограничение *" label with age buttons', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/short');
    test.skip(!loaded, 'Auth state expired');

    await expect(
      page.getByText('Возрастное ограничение *')
    ).toBeVisible({ timeout: 10_000 });

    // AgeRatingSelector renders plain <button type="button"> elements
    for (const rating of ['0+', '6+', '12+', '16+', '18+']) {
      const ageButton = page
        .locator('button[type="button"]')
        .filter({ hasText: rating })
        .first();
      await expect(ageButton).toBeVisible({ timeout: 5_000 });
    }
  });
});

// ============================================================
// Actions
// ============================================================

test.describe('Actions', () => {
  test('has "Сохранить черновик" button', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/short');
    test.skip(!loaded, 'Auth state expired');

    const draftBtn = page.getByRole('button', { name: 'Сохранить черновик' });
    await expect(draftBtn).toBeVisible({ timeout: 10_000 });
  });

  test('has "Опубликовать" button', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/short');
    test.skip(!loaded, 'Auth state expired');

    const publishBtn = page.getByRole('button', { name: 'Опубликовать' });
    await expect(publishBtn).toBeVisible({ timeout: 10_000 });
  });

  test('has "Назад к списку" link pointing to /studio', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/short');
    test.skip(!loaded, 'Auth state expired');

    const backLink = page.locator('a[href="/studio"]').filter({
      hasText: 'Назад к списку',
    });
    await expect(backLink).toBeVisible({ timeout: 10_000 });
  });
});

// ============================================================
// Form Submission
// ============================================================

test.describe('Form Submission', () => {
  test('submitting as draft sends POST /admin/content with status DRAFT', async ({
    page,
  }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/short');
    test.skip(!loaded, 'Auth state expired');
    test.skip(!adminToken, 'Admin login failed');

    const timestamp = Date.now().toString(36);
    const testTitle = `${TEST_CONTENT_PREFIX}Short-Draft-${timestamp}`;

    // Fill title
    const titleInput = page.locator('#short-title');
    await titleInput.fill(testTitle);

    // Fill description
    const descriptionInput = page.locator('#short-description');
    await descriptionInput.fill('E2E draft short description');

    // Select age rating "0+"
    const ageButton = page
      .locator('button[type="button"]')
      .filter({ hasText: '0+' })
      .first();
    await ageButton.click();
    await page.waitForTimeout(300);

    // Intercept POST /admin/content and verify payload
    const requestPromise = page.waitForRequest(
      (req) =>
        req.method() === 'POST' &&
        req.url().includes('/admin/content') &&
        !req.url().includes('/series'),
      { timeout: 15_000 }
    );

    // Click "Сохранить черновик"
    const draftBtn = page.getByRole('button', { name: 'Сохранить черновик' });
    await draftBtn.click();

    const request = await requestPromise;
    const postData = request.postDataJSON();

    expect(postData.contentType).toBe('SHORT');
    expect(postData.isFree).toBe(true);
    expect(postData.status).toBe('DRAFT');
    expect(postData.title).toBe(testTitle);
  });

  test('submitting as publish sends POST /admin/content with status PENDING', async ({
    page,
  }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/short');
    test.skip(!loaded, 'Auth state expired');
    test.skip(!adminToken, 'Admin login failed');

    const timestamp = Date.now().toString(36);
    const testTitle = `${TEST_CONTENT_PREFIX}Short-Publish-${timestamp}`;

    // Fill title
    const titleInput = page.locator('#short-title');
    await titleInput.fill(testTitle);

    // Fill description
    const descriptionInput = page.locator('#short-description');
    await descriptionInput.fill('E2E published short description');

    // Select age rating "12+"
    const ageButton = page
      .locator('button[type="button"]')
      .filter({ hasText: '12+' })
      .first();
    await ageButton.click();
    await page.waitForTimeout(300);

    // Intercept POST /admin/content and verify payload
    const requestPromise = page.waitForRequest(
      (req) =>
        req.method() === 'POST' &&
        req.url().includes('/admin/content') &&
        !req.url().includes('/series'),
      { timeout: 15_000 }
    );

    // Click "Опубликовать"
    const publishBtn = page.getByRole('button', { name: 'Опубликовать' });
    await publishBtn.click();

    const request = await requestPromise;
    const postData = request.postDataJSON();

    expect(postData.contentType).toBe('SHORT');
    expect(postData.isFree).toBe(true);
    expect(postData.status).toBe('PENDING');
    expect(postData.title).toBe(testTitle);
  });
});
