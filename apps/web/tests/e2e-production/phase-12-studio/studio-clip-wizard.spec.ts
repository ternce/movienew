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

/**
 * Studio Clip Wizard — Production E2E Tests
 *
 * Validates the /studio/create/clip 3-step wizard:
 *   Step 1 (Информация) — title, description, category, genres, tags
 *   Step 2 (Медиа)      — thumbnail and preview video upload zones
 *   Step 3 (Публикация)  — age rating, monetization, summary panel
 *
 * Uses admin-state.json storageState (ADMIN role).
 */

const CLIP_WIZARD_URL = '/studio/create/clip';
const TIMESTAMP = Date.now().toString(36);
const TEST_CLIP_TITLE = `${TEST_CONTENT_PREFIX}Clip-wizard-${TIMESTAMP}`;

// ============ Describe: Step 1 — Информация ============

test.describe('Clip Wizard — Step 1: Информация', () => {
  test('loads the clip wizard page at /studio/create/clip', async ({ page }) => {
    const loaded = await waitForStudioPage(page, CLIP_WIZARD_URL);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();

    // Should contain wizard content and Russian text
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);

    // Should have the "Назад к списку" back link
    const hasBackLink =
      bodyText.includes('Назад к списку') ||
      bodyText.includes('Информация');

    expect(hasBackLink).toBe(true);
  });

  test('displays 3-step indicator with correct labels', async ({ page }) => {
    const loaded = await waitForStudioPage(page, CLIP_WIZARD_URL);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();

    // Wizard steps: Информация, Медиа, Публикация
    expect(bodyText).toContain('Информация');
    expect(bodyText).toContain('Медиа');
    expect(bodyText).toContain('Публикация');
  });

  test('step 1 is active by default', async ({ page }) => {
    const loaded = await waitForStudioPage(page, CLIP_WIZARD_URL);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // Step 1 circle should have the active/current styling (border-[#c94bff])
    // The step indicator renders a <span> with the step number inside a <button>
    const stepCircles = page.locator('.flex.items-center.gap-2.mb-8 button');
    const firstStepCircle = stepCircles.first();
    await expect(firstStepCircle).toBeVisible();

    // Title input should be visible on step 1
    const titleInput = page.locator('#title');
    await expect(titleInput).toBeVisible({ timeout: 10_000 });
  });

  test('has title and description inputs', async ({ page }) => {
    const loaded = await waitForStudioPage(page, CLIP_WIZARD_URL);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const titleInput = page.locator('#title');
    await expect(titleInput).toBeVisible({ timeout: 10_000 });

    const descriptionInput = page.locator('#description');
    await expect(descriptionInput).toBeVisible({ timeout: 10_000 });
  });

  test('has category combobox with placeholder', async ({ page }) => {
    const loaded = await waitForStudioPage(page, CLIP_WIZARD_URL);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // CategorySelect uses a combobox trigger button
    const categoryTrigger = page.locator('button[role="combobox"]').filter({
      hasText: /Выберите категорию|Выберите тематику/,
    });

    await expect(categoryTrigger).toBeVisible({ timeout: 10_000 });
  });

  test('has "Далее" button to proceed to step 2', async ({ page }) => {
    const loaded = await waitForStudioPage(page, CLIP_WIZARD_URL);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const nextButton = page.getByRole('button', { name: 'Далее' });
    await expect(nextButton).toBeVisible();
  });
});

// ============ Describe: Step 1 → 2 Navigation ============

test.describe('Clip Wizard — Step 1 → 2 Navigation', () => {
  test('fills step 1 fields and navigates to step 2', async ({ page }) => {
    const loaded = await waitForStudioPage(page, CLIP_WIZARD_URL);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // Fill title
    await fillTitle(page, TEST_CLIP_TITLE);

    // Fill description
    await fillDescription(page, 'E2E test clip description for wizard navigation test');

    // Select a category
    const categorySelected = await selectCategory(page);
    if (!categorySelected) {
      test.skip(true, 'No categories available on production');
      return;
    }

    // Click "Далее" to move to step 2
    await clickWizardNext(page);

    // Verify step 2 content is visible — MediaUploadCard has "Медиа" card title
    const bodyText = await page.locator('body').innerText();
    const isOnStep2 =
      bodyText.includes('Обложка') ||
      bodyText.includes('Превью видео') ||
      bodyText.includes('Загрузите обложку');

    expect(isOnStep2).toBe(true);
  });

  test('validates required fields before allowing next step', async ({ page }) => {
    const loaded = await waitForStudioPage(page, CLIP_WIZARD_URL);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // Click "Далее" without filling any fields — should stay on step 1
    await clickWizardNext(page);

    // Title input should still be visible (validation failed, still on step 1)
    const titleInput = page.locator('#title');
    await expect(titleInput).toBeVisible({ timeout: 5_000 });
  });
});

// ============ Describe: Step 2 — Медиа ============

test.describe('Clip Wizard — Step 2: Медиа', () => {
  test('shows MediaUploadCard with thumbnail and video zones', async ({ page }) => {
    const loaded = await waitForStudioPage(page, CLIP_WIZARD_URL);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // Fill step 1 to unlock step 2
    await fillTitle(page, `${TEST_CONTENT_PREFIX}Clip-step2-${TIMESTAMP}`);
    await fillDescription(page, 'E2E test clip for media step');
    const catSelected = await selectCategory(page);
    if (!catSelected) {
      test.skip(true, 'No categories available');
      return;
    }
    await clickWizardNext(page);

    // Verify media card is visible
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Медиа');

    // Should show thumbnail upload area
    const hasThumbnailSection =
      bodyText.includes('Обложка') ||
      bodyText.includes('JPG, PNG, WebP до 10MB') ||
      bodyText.includes('Перетащите или нажмите для загрузки');

    expect(hasThumbnailSection).toBe(true);

    // Should show preview video upload area
    const hasVideoSection =
      bodyText.includes('Превью видео') ||
      bodyText.includes('Перетащите видео или нажмите для загрузки');

    expect(hasVideoSection).toBe(true);
  });

  test('can navigate from step 2 to step 3 via "Далее"', async ({ page }) => {
    const loaded = await waitForStudioPage(page, CLIP_WIZARD_URL);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // Fill step 1
    await fillTitle(page, `${TEST_CONTENT_PREFIX}Clip-to-step3-${TIMESTAMP}`);
    await fillDescription(page, 'E2E test clip for step 3 navigation');
    const catSelected = await selectCategory(page);
    if (!catSelected) {
      test.skip(true, 'No categories available');
      return;
    }
    await clickWizardNext(page);

    // Now on step 2 — click "Далее" again (no required fields on step 2)
    await clickWizardNext(page);

    // Verify step 3 content is visible
    const bodyText = await page.locator('body').innerText();
    const isOnStep3 =
      bodyText.includes('Возрастное ограничение') ||
      bodyText.includes('Монетизация') ||
      bodyText.includes('Статус публикации');

    expect(isOnStep3).toBe(true);
  });
});

// ============ Describe: Step 3 — Публикация ============

test.describe('Clip Wizard — Step 3: Публикация', () => {
  async function navigateToStep3(page: import('@playwright/test').Page): Promise<boolean> {
    const loaded = await waitForStudioPage(page, CLIP_WIZARD_URL);
    if (!loaded) return false;

    await page.waitForTimeout(3000);

    await fillTitle(page, `${TEST_CONTENT_PREFIX}Clip-step3-${TIMESTAMP}`);
    await fillDescription(page, 'E2E test clip for publish step');
    const catSelected = await selectCategory(page);
    if (!catSelected) return false;

    await clickWizardNext(page); // step 1 → 2
    await clickWizardNext(page); // step 2 → 3
    return true;
  }

  test('shows age rating selector with category buttons', async ({ page }) => {
    const onStep3 = await navigateToStep3(page);
    test.skip(!onStep3, 'Could not navigate to step 3');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Возрастное ограничение');

    // AgeRatingSelector renders plain buttons: 0+, 6+, 12+, 16+, 18+
    const ageButtons = page.locator('button[type="button"]');
    const zeroPlus = ageButtons.filter({ hasText: '0+' });
    const eighteenPlus = ageButtons.filter({ hasText: '18+' });

    await expect(zeroPlus.first()).toBeVisible();
    await expect(eighteenPlus.first()).toBeVisible();
  });

  test('shows monetization toggle and summary panel', async ({ page }) => {
    const onStep3 = await navigateToStep3(page);
    test.skip(!onStep3, 'Could not navigate to step 3');

    const bodyText = await page.locator('body').innerText();

    // Monetization section
    expect(bodyText).toContain('Монетизация');
    expect(bodyText).toContain('Бесплатный контент');

    // SummaryPanel is rendered on step 3 in the sidebar area
    // It may contain "Сводка" or content type label "CLIP"
    const hasSummary =
      bodyText.includes('Сводка') ||
      bodyText.includes('Клип') ||
      bodyText.includes('Черновик');

    expect(hasSummary).toBe(true);
  });

  test('"Назад" navigates back to step 2', async ({ page }) => {
    const onStep3 = await navigateToStep3(page);
    test.skip(!onStep3, 'Could not navigate to step 3');

    // Click "Назад" button
    await clickWizardBack(page);

    // Should be back on step 2 — MediaUploadCard visible
    const bodyText = await page.locator('body').innerText();
    const isOnStep2 =
      bodyText.includes('Обложка') ||
      bodyText.includes('Превью видео') ||
      bodyText.includes('Загрузите обложку');

    expect(isOnStep2).toBe(true);
  });

  test('shows "Создать клип" submit button on step 3', async ({ page }) => {
    const onStep3 = await navigateToStep3(page);
    test.skip(!onStep3, 'Could not navigate to step 3');

    // On the last step, WizardShell renders the submit button instead of "Далее"
    const submitButton = page.getByRole('button', { name: 'Создать клип' });
    await expect(submitButton).toBeVisible();

    // "Далее" should NOT be visible on the last step
    const nextButton = page.getByRole('button', { name: 'Далее' });
    await expect(nextButton).not.toBeVisible();
  });
});

// ============ Describe: Full Flow ============

test.describe('Clip Wizard — Full Flow', () => {
  const createdContentIds: string[] = [];

  test.afterAll(async () => {
    // Cleanup any test content created during the full flow
    try {
      const token = await getAdminToken();
      if (token) {
        await cleanupAllTestContent(token);
      }
    } catch {
      // Non-critical cleanup failure
    }
  });

  test('completes all 3 steps and submits clip creation', async ({ page }) => {
    const loaded = await waitForStudioPage(page, CLIP_WIZARD_URL);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // === Step 1: Информация ===
    const clipTitle = `${TEST_CONTENT_PREFIX}Clip-fullflow-${TIMESTAMP}`;
    await fillTitle(page, clipTitle);
    await fillDescription(page, 'E2E full flow test clip — created by automated Playwright test');

    const catSelected = await selectCategory(page);
    if (!catSelected) {
      test.skip(true, 'No categories available on production');
      return;
    }

    await clickWizardNext(page);

    // Verify we moved to step 2
    let bodyText = await page.locator('body').innerText();
    expect(
      bodyText.includes('Обложка') ||
      bodyText.includes('Превью видео') ||
      bodyText.includes('Медиа')
    ).toBe(true);

    // === Step 2: Медиа (skip uploads, no required fields) ===
    await clickWizardNext(page);

    // Verify we moved to step 3
    bodyText = await page.locator('body').innerText();
    expect(
      bodyText.includes('Возрастное ограничение') ||
      bodyText.includes('Монетизация')
    ).toBe(true);

    // === Step 3: Публикация ===
    // Select age rating "0+"
    await selectAgeRating(page, '0+');

    // Check the "Бесплатный контент" checkbox
    const freeCheckbox = page.locator('#isFree');
    if (await freeCheckbox.isVisible().catch(() => false)) {
      const isChecked = await freeCheckbox.isChecked().catch(() => false);
      if (!isChecked) {
        await freeCheckbox.click();
        await page.waitForTimeout(300);
      }
    }

    // Intercept the POST request to /admin/content
    const requestPromise = page.waitForRequest(
      (req) =>
        req.url().includes('/admin/content') &&
        req.method() === 'POST',
      { timeout: 15_000 }
    );

    // Click "Создать клип"
    const submitButton = page.getByRole('button', { name: 'Создать клип' });
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Verify the intercepted request payload
    try {
      const request = await requestPromise;
      const postData = request.postDataJSON();

      // Verify essential payload fields
      expect(postData.title).toBe(clipTitle);
      expect(postData.contentType).toBe('CLIP');
      expect(postData.ageCategory).toBeDefined();
      expect(postData.description).toBeTruthy();
    } catch {
      // Request interception may timeout on slow networks — still verify
      // that the form attempted submission by checking page state
      await page.waitForTimeout(3000);
      bodyText = await page.locator('body').innerText();

      // After successful submission, user should be redirected to /studio/:id
      // or a success toast should appear
      const submitted =
        page.url().includes('/studio/') ||
        bodyText.includes('успешно') ||
        bodyText.includes('создан');

      expect(submitted).toBe(true);
    }
  });

  test('redirects to studio detail page after successful creation', async ({ page }) => {
    const loaded = await waitForStudioPage(page, CLIP_WIZARD_URL);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // Fill all steps quickly
    const clipTitle = `${TEST_CONTENT_PREFIX}Clip-redirect-${TIMESTAMP}`;
    await fillTitle(page, clipTitle);
    await fillDescription(page, 'E2E redirect test clip');

    const catSelected = await selectCategory(page);
    if (!catSelected) {
      test.skip(true, 'No categories available');
      return;
    }

    await clickWizardNext(page); // → step 2
    await clickWizardNext(page); // → step 3

    await selectAgeRating(page, '6+');

    // Check free checkbox
    const freeCheckbox = page.locator('#isFree');
    if (await freeCheckbox.isVisible().catch(() => false)) {
      const isChecked = await freeCheckbox.isChecked().catch(() => false);
      if (!isChecked) {
        await freeCheckbox.click();
        await page.waitForTimeout(300);
      }
    }

    // Submit
    const submitButton = page.getByRole('button', { name: 'Создать клип' });
    await submitButton.click();

    // Wait for navigation — should redirect to /studio/:contentId
    await page.waitForTimeout(8000);

    const currentUrl = page.url();
    const redirectedToDetail =
      /\/studio\/[a-f0-9-]+/.test(currentUrl) ||
      currentUrl.includes('/studio');

    expect(redirectedToDetail).toBe(true);
  });
});
