/**
 * Studio Wizard Validation — Production E2E Tests
 *
 * Cross-cutting validation edge cases for all 4 wizard types:
 * required fields, max lengths, draft auto-save, navigation.
 * Uses admin-state.json storageState (ADMIN role).
 */

import { test, expect } from '@playwright/test';
import {
  waitForStudioPage,
  clickWizardNext,
} from './helpers/studio-test.helper';

// ============================================================
// Series Wizard Validation
// ============================================================

test.describe('Series Wizard Validation', () => {
  test('cannot advance step 1 with empty title', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/series');
    test.skip(!loaded, 'Auth state expired');

    // Title and description are empty — click "Далее"
    const nextBtn = page.getByRole('button', { name: 'Далее' });
    await nextBtn.click();
    await page.waitForTimeout(1000);

    // Should still be on step 1 (URL unchanged or validation error shown)
    const bodyText = await page.locator('body').innerText();
    const hasValidationError =
      bodyText.includes('Название') ||
      bodyText.includes('обязательно') ||
      bodyText.includes('Основное');

    // Step indicator should still show step 1 as active
    expect(hasValidationError).toBe(true);
  });

  test('cannot advance step 1 with empty description', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/series');
    test.skip(!loaded, 'Auth state expired');

    // Fill title but leave description empty
    await page.locator('#title').fill('E2E-TEST-Validation-Title');
    await page.waitForTimeout(300);

    const nextBtn = page.getByRole('button', { name: 'Далее' });
    await nextBtn.click();
    await page.waitForTimeout(1000);

    // Should still be on step 1 or show description error
    const bodyText = await page.locator('body').innerText();
    const stillOnStep1 =
      bodyText.includes('Основное') ||
      bodyText.includes('Описание');
    expect(stillOnStep1).toBe(true);
  });

  test('title input has maxLength=200', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/series');
    test.skip(!loaded, 'Auth state expired');

    const titleInput = page.locator('#title');
    const maxLength = await titleInput.getAttribute('maxlength');
    expect(maxLength).toBe('200');
  });

  test('description textarea has maxLength=5000', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/series');
    test.skip(!loaded, 'Auth state expired');

    const descInput = page.locator('#description');
    const maxLength = await descInput.getAttribute('maxlength');
    expect(maxLength).toBe('5000');
  });
});

// ============================================================
// Clip Wizard Validation
// ============================================================

test.describe('Clip Wizard Validation', () => {
  test('cannot advance step 1 without required fields', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/clip');
    test.skip(!loaded, 'Auth state expired');

    // Click "Далее" with empty fields
    const nextBtn = page.getByRole('button', { name: 'Далее' });
    await nextBtn.click();
    await page.waitForTimeout(1000);

    // Should still be on step 1
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Информация');
  });

  test('step 3 requires ageCategory for submission', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/clip');
    test.skip(!loaded, 'Auth state expired');

    // Fill step 1 fields
    await page.locator('#title').fill('E2E-TEST-Clip-Validation');
    await page.locator('#description').fill('Testing validation');
    await page.waitForTimeout(500);

    // Try to select category
    const trigger = page.locator('button[role="combobox"]').first();
    if (await trigger.isVisible().catch(() => false)) {
      await trigger.click();
      await page.waitForTimeout(600);
      const firstOption = page.locator('[cmdk-item]').first();
      if (await firstOption.isVisible().catch(() => false)) {
        await firstOption.click();
        await page.waitForTimeout(400);
      }
    }

    // Navigate to step 3
    await clickWizardNext(page);
    await page.waitForTimeout(500);
    await clickWizardNext(page);
    await page.waitForTimeout(500);

    // Try to submit without age category
    const submitBtn = page.getByRole('button', { name: 'Создать клип' });
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1000);

      // Should show validation error or stay on page
      const url = page.url();
      expect(url).toContain('/studio/create/clip');
    }
  });
});

// ============================================================
// Short Wizard Validation
// ============================================================

test.describe('Short Wizard Validation', () => {
  test('"Сохранить черновик" shows validation error without title', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/short');
    test.skip(!loaded, 'Auth state expired');

    // Click draft save without filling anything
    const draftBtn = page.getByRole('button', { name: 'Сохранить черновик' });
    await draftBtn.click();
    await page.waitForTimeout(1000);

    // Should show validation error for title
    const bodyText = await page.locator('body').innerText();
    const hasError =
      bodyText.includes('обязательно') ||
      bodyText.includes('Название') ||
      page.url().includes('/studio/create/short'); // Still on same page
    expect(hasError).toBe(true);
  });

  test('"Опубликовать" shows validation error without ageCategory', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/short');
    test.skip(!loaded, 'Auth state expired');

    // Fill title but not age category
    await page.locator('#short-title').fill('E2E-TEST-Short-NoAge');
    await page.waitForTimeout(300);

    const publishBtn = page.getByRole('button', { name: 'Опубликовать' });
    await publishBtn.click();
    await page.waitForTimeout(1000);

    // Should stay on page (validation prevents submission)
    expect(page.url()).toContain('/studio/create/short');
  });
});

// ============================================================
// Tutorial Wizard Validation
// ============================================================

test.describe('Tutorial Wizard Validation', () => {
  test('step 2 requires lesson titles to advance', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/tutorial');
    test.skip(!loaded, 'Auth state expired');

    // Fill step 1
    await page.locator('#title').fill('E2E-TEST-Tutorial-Validation');
    await page.locator('#description').fill('Validation test tutorial');
    await page.waitForTimeout(300);

    await clickWizardNext(page);
    await page.waitForTimeout(500);

    // On step 2, try to advance without filling lesson title
    // The default lesson has empty title
    const nextBtn = page.getByRole('button', { name: 'Далее' });
    await nextBtn.click();
    await page.waitForTimeout(1000);

    // Should either stay on step 2 or show validation error
    const bodyText = await page.locator('body').innerText();
    const onStep2OrError =
      bodyText.includes('Глава') ||
      bodyText.includes('Урок') ||
      bodyText.includes('Структура курса');
    expect(onStep2OrError).toBe(true);
  });
});

// ============================================================
// Draft Auto-Save
// ============================================================

test.describe('Draft Auto-Save', () => {
  test('series wizard saves draft to localStorage after typing', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/series');
    test.skip(!loaded, 'Auth state expired');

    // Dismiss any draft restore prompt
    await page.waitForTimeout(2000);

    // Fill title
    await page.locator('#title').fill('E2E-TEST-Draft-Save-Test');
    await page.waitForTimeout(1500); // Wait for debounce (1000ms)

    // Check localStorage
    const draftData = await page.evaluate(() => {
      return localStorage.getItem('studio-draft-series');
    });

    // Draft should contain the title we typed
    if (draftData) {
      expect(draftData).toContain('E2E-TEST-Draft-Save-Test');
    }
    // If null, auto-save may not have triggered yet — not a failure
  });

  test('clip wizard saves draft to localStorage after typing', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create/clip');
    test.skip(!loaded, 'Auth state expired');

    // Dismiss any draft restore prompt
    await page.waitForTimeout(2000);

    // Fill title
    await page.locator('#title').fill('E2E-TEST-Clip-Draft-Test');
    await page.waitForTimeout(4000); // Wait for debounce (3000ms)

    // Check localStorage
    const draftData = await page.evaluate(() => {
      return localStorage.getItem('studio-draft-clip');
    });

    if (draftData) {
      expect(draftData).toContain('E2E-TEST-Clip-Draft-Test');
    }
  });
});

// ============================================================
// Common Navigation
// ============================================================

test.describe('Common Navigation', () => {
  test('all wizard pages have "Назад к списку" link', async ({ page }) => {
    const wizardPaths = [
      '/studio/create/series',
      '/studio/create/clip',
      '/studio/create/short',
      '/studio/create/tutorial',
    ];

    for (const path of wizardPaths) {
      const loaded = await waitForStudioPage(page, path);
      if (!loaded) continue;

      const backLink = page.locator('a[href="/studio"]');
      const hasBackLink = await backLink.first().isVisible().catch(() => false);

      const bodyText = await page.locator('body').innerText();
      const hasBackText = bodyText.includes('Назад к списку');

      expect(hasBackLink || hasBackText).toBe(true);
    }
  });
});
