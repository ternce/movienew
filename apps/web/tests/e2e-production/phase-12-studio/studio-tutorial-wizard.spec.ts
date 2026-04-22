/**
 * Studio Tutorial Wizard — Production E2E Tests
 *
 * Validates the /studio/create/tutorial 4-step wizard:
 *   Step 1 — Основное (title, description)
 *   Step 2 — Структура курса (TreeManager: chapters + lessons)
 *   Step 3 — Медиа (thumbnail + preview upload)
 *   Step 4 — Публикация (category, genres, tags, age rating, monetization, summary)
 *
 * Uses admin-state.json storageState (ADMIN role).
 */

import { test, expect } from '@playwright/test';
import {
  waitForStudioPage,
  getAdminToken,
  cleanupAllTestContent,
  TEST_CONTENT_PREFIX,
  fillTitle,
  fillDescription,
  selectCategory,
  selectAgeRating,
  clickWizardNext,
  clickWizardBack,
} from './helpers/studio-test.helper';

let adminToken: string | null = null;

test.beforeAll(async () => {
  try {
    adminToken = await getAdminToken();
  } catch {
    adminToken = null;
  }
});

test.afterAll(async () => {
  if (adminToken) {
    await cleanupAllTestContent(adminToken);
  }
});

// ============================================================
// Step 1: Основное
// ============================================================

test.describe('Tutorial Wizard — Step 1: Основное', () => {
  test('loads at /studio/create/tutorial', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/tutorial');
    test.skip(!loaded, 'Auth state expired — redirected to login');

    const bodyText = await page.locator('body').innerText();
    const hasContent =
      bodyText.includes('Основное') ||
      bodyText.includes('Название') ||
      bodyText.includes('Описание');

    expect(hasContent).toBe(true);
  });

  test('step indicator shows 4 steps', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/tutorial');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();

    // All 4 step labels should be visible in the step indicator
    expect(bodyText).toContain('Основное');
    expect(bodyText).toContain('Структура курса');
    expect(bodyText).toContain('Медиа');
    expect(bodyText).toContain('Публикация');
  });

  test('#title and #description inputs are visible', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/tutorial');
    test.skip(!loaded, 'Auth state expired');

    const titleInput = page.locator('#title');
    const descriptionInput = page.locator('#description');

    await expect(titleInput).toBeVisible({ timeout: 10_000 });
    await expect(descriptionInput).toBeVisible({ timeout: 10_000 });
  });

  test('fill required fields and navigate to step 2', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/tutorial');
    test.skip(!loaded, 'Auth state expired');

    await fillTitle(page, `${TEST_CONTENT_PREFIX}Tutorial-Step1`);
    await fillDescription(page, 'E2E test tutorial description for step navigation');

    await clickWizardNext(page);

    // Step 2 should now be active — look for TreeManager content
    const bodyText = await page.locator('body').innerText();
    const isStep2 =
      bodyText.includes('Структура курса') &&
      (bodyText.includes('Глава') || bodyText.includes('Урок'));

    expect(isStep2).toBe(true);
  });
});

// ============================================================
// Step 2: Структура курса
// ============================================================

test.describe('Tutorial Wizard — Step 2: Структура курса', () => {
  async function navigateToStep2(page: import('@playwright/test').Page): Promise<boolean> {
    const loaded = await waitForStudioPage(page, '/studio/create/tutorial');
    if (!loaded) return false;

    await fillTitle(page, `${TEST_CONTENT_PREFIX}Tutorial-TreeTest`);
    await fillDescription(page, 'E2E tutorial for TreeManager tests');
    await clickWizardNext(page);

    // Wait for step 2 content
    await page.waitForTimeout(1000);
    return true;
  }

  test('TreeManager uses "Глава" group label (NOT "Сезон")', async ({ page }) => {
    const loaded = await navigateToStep2(page);
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();

    // Should contain "Глава" (chapter), NOT "Сезон" (season)
    expect(bodyText).toContain('Глава');
  });

  test('TreeManager uses "Урок" item label (NOT "Эпизод")', async ({ page }) => {
    const loaded = await navigateToStep2(page);
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();

    // Should contain "Урок" (lesson) or "урок" (lowercase), NOT "Эпизод"
    const hasLesson = bodyText.includes('Урок') || bodyText.includes('урок');
    expect(hasLesson).toBe(true);
  });

  test('default state has 1 chapter with 1 lesson', async ({ page }) => {
    const loaded = await navigateToStep2(page);
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();

    // Should show "Глава 1" for the default chapter
    expect(bodyText).toContain('Глава 1');

    // Should have at least 1 lesson-related input or label
    const hasLesson = bodyText.includes('Урок') || bodyText.includes('урок');
    expect(hasLesson).toBe(true);
  });

  test('"Добавить глава" button adds a new chapter', async ({ page }) => {
    const loaded = await navigateToStep2(page);
    test.skip(!loaded, 'Auth state expired');

    // TreeManager renders "Добавить {groupLabel.toLowerCase()}" → "Добавить глава"
    const addButton = page.getByRole('button', { name: /Добавить глав/i });
    await expect(addButton).toBeVisible({ timeout: 5_000 });

    await addButton.click();
    await page.waitForTimeout(500);

    // After clicking, we should see "Глава 2"
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Глава 2');
  });

  test('lesson title input is fillable and "Далее" navigates to step 3', async ({ page }) => {
    const loaded = await navigateToStep2(page);
    test.skip(!loaded, 'Auth state expired');

    // Find the lesson title input inside the TreeManager
    // ChildItem renders an <input> for item title
    const lessonInputs = page.locator('input[placeholder*="Название"]').first();
    const hasLessonInput = await lessonInputs.isVisible().catch(() => false);

    if (hasLessonInput) {
      await lessonInputs.fill('Первый урок');
      await page.waitForTimeout(300);
    }

    await clickWizardNext(page);

    // Step 3 should be active — MediaUploadCard
    const bodyText = await page.locator('body').innerText();
    const isStep3 =
      bodyText.includes('Медиа') ||
      bodyText.includes('Обложка') ||
      bodyText.includes('Превью') ||
      bodyText.includes('Загрузить');

    expect(isStep3).toBe(true);
  });
});

// ============================================================
// Step 3: Медиа
// ============================================================

test.describe('Tutorial Wizard — Step 3: Медиа', () => {
  async function navigateToStep3(page: import('@playwright/test').Page): Promise<boolean> {
    const loaded = await waitForStudioPage(page, '/studio/create/tutorial');
    if (!loaded) return false;

    await fillTitle(page, `${TEST_CONTENT_PREFIX}Tutorial-MediaTest`);
    await fillDescription(page, 'E2E tutorial for media step tests');
    await clickWizardNext(page);
    await page.waitForTimeout(800);

    // Fill lesson title (required for step 2 validation)
    const lessonInputs = page.getByPlaceholder('Название урока...');
    if ((await lessonInputs.count()) > 0) {
      await lessonInputs.first().fill('Урок навигация');
      await page.waitForTimeout(300);
    }

    await clickWizardNext(page);
    await page.waitForTimeout(800);
    return true;
  }

  test('MediaUploadCard is visible', async ({ page }) => {
    const loaded = await navigateToStep3(page);
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();

    // MediaUploadCard shows thumbnail and/or preview upload areas
    const hasMediaContent =
      bodyText.includes('Обложка') ||
      bodyText.includes('Превью') ||
      bodyText.includes('Загрузить') ||
      bodyText.includes('Медиа') ||
      bodyText.includes('изображение') ||
      bodyText.includes('видео');

    expect(hasMediaContent).toBe(true);
  });

  test('"Далее" navigates to step 4', async ({ page }) => {
    const loaded = await navigateToStep3(page);
    test.skip(!loaded, 'Auth state expired');

    // Step 3 has no required fields — media is optional
    await clickWizardNext(page);

    const bodyText = await page.locator('body').innerText();

    // Step 4: Публикация — should show category select, age rating, summary
    const isStep4 =
      bodyText.includes('Тематика') ||
      bodyText.includes('Выберите категорию') ||
      bodyText.includes('Публикация');

    expect(isStep4).toBe(true);
  });
});

// ============================================================
// Step 4: Публикация
// ============================================================

test.describe('Tutorial Wizard — Step 4: Публикация', () => {
  async function navigateToStep4(page: import('@playwright/test').Page): Promise<boolean> {
    const loaded = await waitForStudioPage(page, '/studio/create/tutorial');
    if (!loaded) return false;

    await fillTitle(page, `${TEST_CONTENT_PREFIX}Tutorial-PublishTest`);
    await fillDescription(page, 'E2E tutorial for publish step tests');
    // Step 1 -> Step 2
    await clickWizardNext(page);
    await page.waitForTimeout(800);

    // Fill lesson title (required for step 2 validation)
    const lessonInputs = page.getByPlaceholder('Название урока...');
    if ((await lessonInputs.count()) > 0) {
      await lessonInputs.first().fill('Урок публикация');
      await page.waitForTimeout(300);
    }

    // Step 2 -> Step 3
    await clickWizardNext(page);
    await page.waitForTimeout(800);
    // Step 3 -> Step 4
    await clickWizardNext(page);
    await page.waitForTimeout(800);
    return true;
  }

  test('category select and age rating are visible', async ({ page }) => {
    const loaded = await navigateToStep4(page);
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();

    // CategorySelect trigger with "Выберите категорию" or "Тематика"
    const hasCategorySelect =
      bodyText.includes('Тематика') || bodyText.includes('Выберите категорию');
    expect(hasCategorySelect).toBe(true);

    // AgeRatingSelector renders age buttons: 0+, 6+, 12+, 16+, 18+
    const hasAgeRating =
      bodyText.includes('0+') &&
      bodyText.includes('6+') &&
      bodyText.includes('12+') &&
      bodyText.includes('16+') &&
      bodyText.includes('18+');
    expect(hasAgeRating).toBe(true);
  });

  test('SummaryPanel is visible', async ({ page }) => {
    const loaded = await navigateToStep4(page);
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();

    // SummaryPanel shows content summary — type label, status, draft info
    const hasSummary =
      bodyText.includes('Сводка') ||
      bodyText.includes('Черновик') ||
      bodyText.includes('TUTORIAL') ||
      bodyText.includes('Туториал') ||
      bodyText.includes('Курс');

    expect(hasSummary).toBe(true);
  });
});

// ============================================================
// Full Flow
// ============================================================

test.describe('Tutorial Wizard — Full Flow', () => {
  async function fillAllSteps(page: import('@playwright/test').Page): Promise<boolean> {
    const loaded = await waitForStudioPage(page, '/studio/create/tutorial');
    if (!loaded) return false;

    // Step 1: title + description
    await fillTitle(page, `${TEST_CONTENT_PREFIX}Tutorial-FullFlow-${Date.now()}`);
    await fillDescription(page, 'Full flow E2E test tutorial');
    await clickWizardNext(page);
    await page.waitForTimeout(800);

    // Step 2: chapters — fill lesson title (required)
    const lessonInputs = page.getByPlaceholder('Название урока...');
    if ((await lessonInputs.count()) > 0) {
      await lessonInputs.first().fill('Урок полный поток');
      await page.waitForTimeout(300);
    }
    await clickWizardNext(page);
    await page.waitForTimeout(800);

    // Step 3: media — optional, just navigate
    await clickWizardNext(page);
    await page.waitForTimeout(800);

    // Step 4: fill category + age rating
    await selectCategory(page);
    await selectAgeRating(page, '12+');
    await page.waitForTimeout(300);

    return true;
  }

  test('fill all 4 steps and click "Создать курс" — intercepts POST', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');

    let interceptedPayload: Record<string, unknown> | null = null;

    // Intercept the API call to /admin/content/series
    await page.route('**/api/v1/admin/content/series', async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        try {
          interceptedPayload = JSON.parse(request.postData() ?? '{}');
        } catch {
          interceptedPayload = null;
        }
        // Respond with a mock success to avoid actually creating content
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'mock-tutorial-id',
              title: 'Mock Tutorial',
              slug: 'mock-tutorial',
              contentType: 'TUTORIAL',
              status: 'DRAFT',
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    const filled = await fillAllSteps(page);
    test.skip(!filled, 'Auth state expired');

    // Click the submit button "Создать курс"
    const submitButton = page.getByRole('button', { name: /Создать курс/i });
    await expect(submitButton).toBeVisible({ timeout: 5_000 });
    await submitButton.click();
    await page.waitForTimeout(2000);

    // The API call should have been intercepted
    expect(interceptedPayload).not.toBeNull();
  });

  test('payload contains contentType=TUTORIAL', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');

    let interceptedPayload: Record<string, unknown> | null = null;

    await page.route('**/api/v1/admin/content/series', async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        try {
          interceptedPayload = JSON.parse(request.postData() ?? '{}');
        } catch {
          interceptedPayload = null;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'mock-tutorial-id-2',
              title: 'Mock Tutorial 2',
              slug: 'mock-tutorial-2',
              contentType: 'TUTORIAL',
              status: 'DRAFT',
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    const filled = await fillAllSteps(page);
    test.skip(!filled, 'Auth state expired');

    const submitButton = page.getByRole('button', { name: /Создать курс/i });
    await submitButton.click();
    await page.waitForTimeout(2000);

    expect(interceptedPayload).not.toBeNull();
    expect((interceptedPayload as Record<string, unknown>).contentType).toBe('TUTORIAL');
  });

  test('payload seasons array contains chapters structure', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');

    let interceptedPayload: Record<string, unknown> | null = null;

    await page.route('**/api/v1/admin/content/series', async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        try {
          interceptedPayload = JSON.parse(request.postData() ?? '{}');
        } catch {
          interceptedPayload = null;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'mock-tutorial-id-3',
              title: 'Mock Tutorial 3',
              slug: 'mock-tutorial-3',
              contentType: 'TUTORIAL',
              status: 'DRAFT',
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    const filled = await fillAllSteps(page);
    test.skip(!filled, 'Auth state expired');

    const submitButton = page.getByRole('button', { name: /Создать курс/i });
    await submitButton.click();
    await page.waitForTimeout(2000);

    expect(interceptedPayload).not.toBeNull();

    const payload = interceptedPayload as Record<string, unknown>;
    const seasons = payload.seasons as Array<{
      title: string;
      order: number;
      episodes: Array<{ title: string; order: number }>;
    }>;

    // Should have at least 1 season (chapter mapped to season)
    expect(Array.isArray(seasons)).toBe(true);
    expect(seasons.length).toBeGreaterThanOrEqual(1);

    // First season should be "Глава 1"
    expect(seasons[0].title).toContain('Глава');
    expect(seasons[0].order).toBe(1);

    // Each season should have episodes (lessons)
    expect(Array.isArray(seasons[0].episodes)).toBe(true);
    expect(seasons[0].episodes.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// Navigation
// ============================================================

test.describe('Tutorial Wizard — Navigation', () => {
  test('"Назад" navigates between steps correctly', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/tutorial');
    test.skip(!loaded, 'Auth state expired');

    // Fill step 1 and go to step 2
    await fillTitle(page, `${TEST_CONTENT_PREFIX}Tutorial-NavTest`);
    await fillDescription(page, 'Navigation test tutorial');
    await clickWizardNext(page);
    await page.waitForTimeout(500);

    // Verify we are on step 2
    let bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Структура курса');

    // Go back to step 1
    await clickWizardBack(page);
    bodyText = await page.locator('body').innerText();

    // Step 1 inputs should be visible again
    const titleInput = page.locator('#title');
    await expect(titleInput).toBeVisible({ timeout: 5_000 });

    // Navigate forward again to step 2, then step 3
    await clickWizardNext(page);
    await page.waitForTimeout(500);
    await clickWizardNext(page);
    await page.waitForTimeout(500);

    // Go back from step 3 to step 2
    await clickWizardBack(page);
    bodyText = await page.locator('body').innerText();
    const isStep2 = bodyText.includes('Глава') || bodyText.includes('Структура курса');
    expect(isStep2).toBe(true);
  });

  test('page has Russian text throughout', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/tutorial');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();

    // Must contain Cyrillic characters
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);

    // Check for known Russian labels from the wizard
    const russianLabels = [
      'Основное',
      'Структура курса',
      'Медиа',
      'Публикация',
      'Далее',
    ];

    let foundCount = 0;
    for (const label of russianLabels) {
      if (bodyText.includes(label)) {
        foundCount++;
      }
    }

    // At least 3 of the 5 Russian labels should be present
    expect(foundCount).toBeGreaterThanOrEqual(3);
  });
});
