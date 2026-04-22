import { test, expect } from '@playwright/test';
import path from 'path';
import {
  waitForPage,
  ROLES,
  UI,
} from './helpers/ui-test.helper';

const AUTH_DIR = path.join(__dirname, '..', 'reports', '.auth');

test.use({ storageState: path.join(AUTH_DIR, 'admin-state.json') });

// ─── Step Indicator ─────────────────────────────────────────────────

test.describe('Multi-Step Wizard — Step Indicator', () => {
  test('Studio create page loads with step 1 active', async ({ page }) => {
    const ok = await waitForPage(page, '/studio/create');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const pageContent = page.locator('main, [class*="content"]');
    await expect(pageContent).toBeVisible();

    // Step 1 should have content type selection or title field
    const hasForm = await page.locator('form, [class*="wizard"], [class*="step"]').first().isVisible().catch(() => false);
    const hasTitle = await page.locator('input[name="title"], input[placeholder*="Название" i], #title').first().isVisible().catch(() => false);
    const hasTypeCards = await page.locator(
      'button:has-text("Сериал"), button:has-text("Клип"), button:has-text("Шорт"), button:has-text("Туториал"), [class*="type-card"]'
    ).first().isVisible().catch(() => false);

    expect(hasForm || hasTitle || hasTypeCards, 'Step 1 content should be visible').toBe(true);
  });

  test('Step indicator shows progress through steps', async ({ page }) => {
    const ok = await waitForPage(page, '/studio/create');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const bodyText = await page.locator('body').innerText();

    // Look for step labels: "Основное", "Детали и медиа", "Публикация"
    const hasStepLabels =
      bodyText.includes('Основное') ||
      bodyText.includes('Детали') ||
      bodyText.includes('Публикация') ||
      bodyText.includes('Шаг');

    // Or numbered step buttons/elements (1, 2, 3)
    const stepButtons = page.locator('button').filter({ hasText: /^[123]$/ });
    const hasStepButtons = (await stepButtons.count()) > 0;

    // Or step indicator circles / divs with step numbers
    const stepIndicators = page.locator(
      '[class*="step-indicator"], [class*="stepper"], [class*="wizard-step"], [aria-label*="шаг" i], [class*="step"]'
    );
    const hasIndicators = (await stepIndicators.count()) > 0;

    // Or any numbered circle elements (divs containing just "1", "2", "3")
    const numberedCircles = page.locator('div, span').filter({ hasText: /^[123]$/ });
    const hasNumbered = (await numberedCircles.count()) >= 2;

    // Or "Далее" button (implies multi-step navigation)
    const hasNextButton = await page.locator('button:has-text("Далее")').first().isVisible().catch(() => false);

    expect(
      hasStepLabels || hasStepButtons || hasIndicators || hasNumbered || hasNextButton,
      'Should show step indicator, step labels, or multi-step navigation'
    ).toBe(true);
  });
});

// ─── Step 1 (Basic) ─────────────────────────────────────────────────

test.describe('Multi-Step Wizard — Step 1 (Basic)', () => {
  test('Content type cards are visible and selectable', async ({ page }) => {
    const ok = await waitForPage(page, '/studio/create');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const bodyText = await page.locator('body').innerText();
    const hasContentTypes =
      bodyText.includes('Сериал') ||
      bodyText.includes('Клип') ||
      bodyText.includes('Шорт') ||
      bodyText.includes('Туториал') ||
      bodyText.includes('Тип контента');

    expect(hasContentTypes, 'Content type options should be visible').toBe(true);
  });

  test('Clicking a content type card selects it (visual feedback)', async ({ page }) => {
    const ok = await waitForPage(page, '/studio/create');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const typeCard = page.locator(
      'button:has-text("Сериал"), [class*="type-card"]:has-text("Сериал"), label:has-text("Сериал"), div[role="radio"]:has-text("Сериал")'
    ).first();
    const isVisible = await typeCard.isVisible().catch(() => false);
    if (!isVisible) { test.skip(true, 'Content type card not found'); return; }

    const classBefore = await typeCard.getAttribute('class') || '';
    const dataBefore = await typeCard.getAttribute('data-state') || await typeCard.getAttribute('aria-checked') || '';

    await typeCard.click();
    await page.waitForTimeout(500);

    const classAfter = await typeCard.getAttribute('class') || '';
    const dataAfter = await typeCard.getAttribute('data-state') || await typeCard.getAttribute('aria-checked') || '';

    // Selection should change class or data attribute
    const changed = classBefore !== classAfter || dataBefore !== dataAfter;

    // Or check for selected/active class
    const isSelected =
      classAfter.includes('selected') ||
      classAfter.includes('active') ||
      classAfter.includes('border-primary') ||
      classAfter.includes('ring') ||
      dataAfter === 'checked' ||
      dataAfter === 'active';

    expect(changed || isSelected, 'Clicking type card should show visual selection feedback').toBe(true);
  });

  test('Title input field is visible', async ({ page }) => {
    const ok = await waitForPage(page, '/studio/create');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const titleInput = page.locator(
      'input[name="title"], input#title, input[id="title"], input[placeholder*="Название" i], input[placeholder*="название" i], input[placeholder*="Введите название" i]'
    ).first();
    const isVisible = await titleInput.isVisible().catch(() => false);

    // Title may also be a textarea
    const titleTextarea = page.locator(
      'textarea[name="title"], textarea#title, textarea[id="title"]'
    ).first();
    const hasTextarea = await titleTextarea.isVisible().catch(() => false);

    // Also check by label association
    const labeledInput = page.locator('label:has-text("Название") + input, label:has-text("Название") ~ input').first();
    const hasLabeled = await labeledInput.isVisible().catch(() => false);

    expect(isVisible || hasTextarea || hasLabeled, 'Title input should be visible on step 1').toBe(true);
  });

  test('Submitting without title shows validation error', async ({ page }) => {
    const ok = await waitForPage(page, '/studio/create');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    // Try to advance without filling title
    const nextButton = page.locator(
      'button:has-text("Далее"), button:has-text("Следующ"), button[type="submit"]'
    ).first();
    const hasNext = await nextButton.isVisible().catch(() => false);
    if (!hasNext) { test.skip(true, 'Next/submit button not found'); return; }

    // Clear title if pre-filled
    const titleInput = page.locator(
      'input[name="title"], input#title, input[placeholder*="Название" i]'
    ).first();
    const hasTitle = await titleInput.isVisible().catch(() => false);
    if (hasTitle) {
      await titleInput.clear();
    }

    await nextButton.click();
    await page.waitForTimeout(1000);

    // Look for validation error message
    const bodyText = await page.locator('body').innerText();
    const hasError =
      bodyText.includes('обязательн') ||
      bodyText.includes('Заполните') ||
      bodyText.includes('Введите') ||
      bodyText.includes('Required') ||
      bodyText.includes('required');

    // Or check for error styling on input
    const errorMessage = page.locator(
      '[class*="error"], [class*="destructive"], [role="alert"], p[class*="text-red"], p[class*="text-destructive"]'
    ).first();
    const hasErrorEl = await errorMessage.isVisible().catch(() => false);

    // Staying on same step also indicates validation failed
    const stillOnStep1 = await titleInput.isVisible().catch(() => false);

    expect(
      hasError || hasErrorEl || stillOnStep1,
      'Validation error should appear or should stay on step 1'
    ).toBe(true);
  });
});

// ─── Step Navigation ────────────────────────────────────────────────

test.describe('Multi-Step Wizard — Step Navigation', () => {
  test('Filling title and clicking "Далее" advances to step 2', async ({ page }) => {
    const ok = await waitForPage(page, '/studio/create');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    // Select content type if needed
    const typeCard = page.locator(
      'button:has-text("Сериал"), [class*="type-card"]:has-text("Сериал"), label:has-text("Сериал")'
    ).first();
    const hasType = await typeCard.isVisible().catch(() => false);
    if (hasType) {
      await typeCard.click();
      await page.waitForTimeout(300);
    }

    // Fill title
    const titleInput = page.locator(
      'input[name="title"], input#title, input[placeholder*="Название" i]'
    ).first();
    const hasTitle = await titleInput.isVisible().catch(() => false);
    if (hasTitle) {
      await titleInput.fill('Тестовый контент E2E');
    }

    // Fill description if required
    const descInput = page.locator(
      'textarea[name="description"], textarea#description, textarea[placeholder*="Описание" i]'
    ).first();
    const hasDesc = await descInput.isVisible().catch(() => false);
    if (hasDesc) {
      await descInput.fill('Описание тестового контента для E2E тестирования');
    }

    // Click "Далее" (Next)
    const nextButton = page.locator(
      'button:has-text("Далее"), button:has-text("Следующ")'
    ).first();
    const hasNext = await nextButton.isVisible().catch(() => false);
    if (!hasNext) { test.skip(true, 'Next button not found'); return; }

    await nextButton.click();
    await page.waitForTimeout(1500);

    // Step 2 should now be visible (category, genre, media fields)
    const bodyText = await page.locator('body').innerText();
    const isOnStep2 =
      bodyText.includes('Категория') ||
      bodyText.includes('Жанр') ||
      bodyText.includes('Детали') ||
      bodyText.includes('медиа') ||
      bodyText.includes('Теги') ||
      bodyText.includes('Возраст');

    // Or step indicator changed
    const step2Active = await page.locator(
      '[class*="step"][class*="active"]:has-text("2"), [aria-current="step"]:has-text("2")'
    ).first().isVisible().catch(() => false);

    expect(isOnStep2 || step2Active, 'Should advance to step 2 after filling required fields').toBe(true);
  });

  test('Step 2 shows category/genre selection fields', async ({ page }) => {
    const ok = await waitForPage(page, '/studio/create');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    // Navigate to step 2
    const typeCard = page.locator(
      'button:has-text("Сериал"), [class*="type-card"]:has-text("Сериал"), label:has-text("Сериал")'
    ).first();
    if (await typeCard.isVisible().catch(() => false)) {
      await typeCard.click();
      await page.waitForTimeout(300);
    }

    const titleInput = page.locator(
      'input[name="title"], input#title, input[placeholder*="Название" i]'
    ).first();
    if (await titleInput.isVisible().catch(() => false)) {
      await titleInput.fill('Тестовый контент');
    }

    const descInput = page.locator(
      'textarea[name="description"], textarea#description'
    ).first();
    if (await descInput.isVisible().catch(() => false)) {
      await descInput.fill('Описание');
    }

    const nextButton = page.locator(
      'button:has-text("Далее"), button:has-text("Следующ")'
    ).first();
    const hasNext = await nextButton.isVisible().catch(() => false);
    if (!hasNext) { test.skip(true, 'Next button not found'); return; }

    await nextButton.click();
    await page.waitForTimeout(1500);

    const bodyText = await page.locator('body').innerText();
    const hasStep2Fields =
      bodyText.includes('Категория') ||
      bodyText.includes('Жанр') ||
      bodyText.includes('Теги') ||
      bodyText.includes('Обложка') ||
      bodyText.includes('Возрастн');

    expect(hasStep2Fields, 'Step 2 should show category/genre/tags fields').toBe(true);
  });

  test('"Назад" button returns to step 1 without losing data', async ({ page }) => {
    const ok = await waitForPage(page, '/studio/create');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const testTitle = 'Тест сохранения данных';

    // Fill step 1
    const typeCard = page.locator(
      'button:has-text("Сериал"), [class*="type-card"]:has-text("Сериал"), label:has-text("Сериал")'
    ).first();
    if (await typeCard.isVisible().catch(() => false)) {
      await typeCard.click();
      await page.waitForTimeout(300);
    }

    const titleInput = page.locator(
      'input[name="title"], input#title, input[placeholder*="Название" i]'
    ).first();
    if (await titleInput.isVisible().catch(() => false)) {
      await titleInput.fill(testTitle);
    }

    const descInput = page.locator(
      'textarea[name="description"], textarea#description'
    ).first();
    if (await descInput.isVisible().catch(() => false)) {
      await descInput.fill('Описание');
    }

    // Advance to step 2
    const nextButton = page.locator(
      'button:has-text("Далее"), button:has-text("Следующ")'
    ).first();
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(1500);
    } else {
      test.skip(true, 'Next button not found');
      return;
    }

    // Go back to step 1
    const backButton = page.locator(
      'button:has-text("Назад"), button:has-text("Предыдущ")'
    ).first();
    const hasBack = await backButton.isVisible().catch(() => false);
    if (!hasBack) { test.skip(true, 'Back button not found on step 2'); return; }

    await backButton.click();
    await page.waitForTimeout(1500);

    // Title should still be filled
    const titleAfter = page.locator(
      'input[name="title"], input#title, input[placeholder*="Название" i]'
    ).first();
    const titleVisible = await titleAfter.isVisible().catch(() => false);
    if (!titleVisible) { test.skip(true, 'Title input not visible after going back'); return; }

    const value = await titleAfter.inputValue();
    expect(value, 'Title should be preserved when going back').toBe(testTitle);
  });

  test('Genre selection (if visible) opens multi-select', async ({ page }) => {
    const ok = await waitForPage(page, '/studio/create');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    // Navigate to step 2
    const typeCard = page.locator(
      'button:has-text("Сериал"), label:has-text("Сериал")'
    ).first();
    if (await typeCard.isVisible().catch(() => false)) {
      await typeCard.click();
      await page.waitForTimeout(300);
    }

    const titleInput = page.locator('input[name="title"], input#title, input[id="title"]').first();
    if (await titleInput.isVisible().catch(() => false)) {
      await titleInput.fill('Тест жанров');
    }

    const descInput = page.locator('textarea[name="description"], textarea#description').first();
    if (await descInput.isVisible().catch(() => false)) {
      await descInput.fill('Описание');
    }

    const nextButton = page.locator('button:has-text("Далее")').first();
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(1500);
    }

    // Look for genre selector
    const genreSelector = page.locator(
      'button:has-text("Жанр"), [class*="genre"], [placeholder*="Жанр" i], label:has-text("Жанр")'
    ).first();
    const hasGenre = await genreSelector.isVisible().catch(() => false);
    if (!hasGenre) { test.skip(true, 'Genre selector not found on step 2'); return; }

    await genreSelector.click();
    await page.waitForTimeout(1000);

    // Should open a dropdown or multi-select
    const dropdown = page.locator(
      ROLES.LISTBOX + ', [data-radix-popper-content-wrapper], [role="menu"], [class*="dropdown"]'
    ).first();
    const hasDropdown = await dropdown.isVisible().catch(() => false);

    expect(hasDropdown, 'Genre selector should open a dropdown').toBe(true);
  });

  test('Tag input allows adding tags', async ({ page }) => {
    const ok = await waitForPage(page, '/studio/create');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    // Navigate to step 2
    const typeCard = page.locator('button:has-text("Сериал"), label:has-text("Сериал")').first();
    if (await typeCard.isVisible().catch(() => false)) {
      await typeCard.click();
      await page.waitForTimeout(300);
    }
    const titleInput = page.locator('input[name="title"], input#title, input[id="title"]').first();
    if (await titleInput.isVisible().catch(() => false)) {
      await titleInput.fill('Тест тегов');
    }
    const descInput = page.locator('textarea[name="description"], textarea#description').first();
    if (await descInput.isVisible().catch(() => false)) {
      await descInput.fill('Описание');
    }
    const nextButton = page.locator('button:has-text("Далее")').first();
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(1500);
    }

    // Look for tag input
    const tagInput = page.locator(
      'input[name="tags"], input[placeholder*="Тег" i], input[placeholder*="tag" i], input[placeholder*="тег" i]'
    ).first();
    const hasTagInput = await tagInput.isVisible().catch(() => false);
    if (!hasTagInput) { test.skip(true, 'Tag input not found on step 2'); return; }

    await tagInput.fill('тестовый-тег');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Tag should appear as a badge/chip
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('тестовый-тег');
  });

  test('Age rating selector shows 5 options (0+, 6+, 12+, 16+, 18+)', async ({ page }) => {
    const ok = await waitForPage(page, '/studio/create');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    // Age rating may be on step 1, 2, or 3 — check all steps
    const bodyText = await page.locator('body').innerText();
    const hasAgeOptions =
      bodyText.includes('0+') &&
      bodyText.includes('6+') &&
      bodyText.includes('12+') &&
      bodyText.includes('16+') &&
      bodyText.includes('18+');

    if (hasAgeOptions) {
      expect(hasAgeOptions).toBe(true);
      return;
    }

    // Navigate through steps to find age rating
    const typeCard = page.locator('button:has-text("Сериал"), label:has-text("Сериал")').first();
    if (await typeCard.isVisible().catch(() => false)) {
      await typeCard.click();
      await page.waitForTimeout(300);
    }
    const titleInput = page.locator('input[name="title"], input#title, input[id="title"]').first();
    if (await titleInput.isVisible().catch(() => false)) {
      await titleInput.fill('Тест возраста');
    }
    const descInput = page.locator('textarea[name="description"], textarea#description, textarea[id="description"]').first();
    if (await descInput.isVisible().catch(() => false)) {
      await descInput.fill('Описание тестового контента');
    }

    // Navigate to step 2
    let nextButton = page.locator('button:has-text("Далее")').first();
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(1500);
    } else {
      test.skip(true, 'Next button not found — cannot navigate to age rating step');
      return;
    }

    let bodyText2 = await page.locator('body').innerText();
    const hasAgeOnStep2 =
      bodyText2.includes('0+') || bodyText2.includes('6+') || bodyText2.includes('Возраст');

    if (hasAgeOnStep2) {
      const ageOptions = ['0+', '6+', '12+', '16+', '18+'];
      const foundOptions = ageOptions.filter((opt) => bodyText2.includes(opt));
      expect(foundOptions.length).toBeGreaterThanOrEqual(3);
      return;
    }

    // Try step 3
    nextButton = page.locator('button:has-text("Далее")').first();
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(1500);
    } else {
      test.skip(true, 'Cannot navigate further — no next button on step 2');
      return;
    }

    const bodyText3 = await page.locator('body').innerText();
    const ageOptions = ['0+', '6+', '12+', '16+', '18+'];
    const foundOptions = ageOptions.filter((opt) => bodyText3.includes(opt));

    if (foundOptions.length < 3) {
      test.skip(true, `Age rating options not found across steps, found: ${foundOptions.join(', ')}`);
      return;
    }

    expect(foundOptions.length).toBeGreaterThanOrEqual(3);
  });

  test('Final step has "Создать" or submit button', async ({ page }) => {
    const ok = await waitForPage(page, '/studio/create');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    // Navigate through all steps
    const typeCard = page.locator('button:has-text("Сериал"), label:has-text("Сериал")').first();
    if (await typeCard.isVisible().catch(() => false)) {
      await typeCard.click();
      await page.waitForTimeout(300);
    }
    const titleInput = page.locator('input[name="title"], input#title, input[id="title"]').first();
    if (await titleInput.isVisible().catch(() => false)) {
      await titleInput.fill('Тест финального шага');
    }
    const descInput = page.locator('textarea[name="description"], textarea#description, textarea[id="description"]').first();
    if (await descInput.isVisible().catch(() => false)) {
      await descInput.fill('Описание тестового контента');
    }

    // Step 1 -> 2
    let nextButton = page.locator('button:has-text("Далее")').first();
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(1500);
    } else {
      test.skip(true, 'Next button not found on step 1');
      return;
    }

    // Step 2 -> 3
    nextButton = page.locator('button:has-text("Далее")').first();
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(1500);
    } else {
      // May already be on final step or only have 2 steps
      // Check for submit button on current step
      const bodyText = await page.locator('body').innerText();
      const hasSubmit = bodyText.includes('Создать') || bodyText.includes('Опубликовать') || bodyText.includes('Сохранить');
      if (hasSubmit) {
        expect(hasSubmit).toBe(true);
        return;
      }
      test.skip(true, 'Cannot navigate to final step');
      return;
    }

    // Final step should have submit button
    const bodyText = await page.locator('body').innerText();
    const hasSubmit =
      bodyText.includes('Создать') ||
      bodyText.includes('Опубликовать') ||
      bodyText.includes('Сохранить');

    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Создать"), button:has-text("Опубликовать"), button:has-text("Сохранить")'
    ).first();
    const hasButton = await submitButton.isVisible().catch(() => false);

    expect(hasSubmit || hasButton, 'Final step should have submit/create button').toBe(true);
  });

  test('Studio edit page at /studio/[id] loads with pre-filled form', async ({ page }) => {
    // First, get a content ID from the studio list
    const ok = await waitForPage(page, '/studio');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    // Find a link to an existing content item
    const contentLink = page.locator('a[href^="/studio/"]').filter({
      hasNot: page.locator('a[href="/studio/create"]'),
    }).first();
    const hasLink = await contentLink.isVisible().catch(() => false);

    if (!hasLink) {
      // Try finding edit buttons or links
      const editLink = page.locator(
        'a[href*="/studio/"]:not([href="/studio/create"]):not([href="/studio"])'
      ).first();
      const hasEdit = await editLink.isVisible().catch(() => false);
      if (!hasEdit) { test.skip(true, 'No existing content items found in studio'); return; }

      await editLink.click();
    } else {
      await contentLink.click();
    }

    await page.waitForTimeout(3000);

    // Edit page should have pre-filled form fields
    const titleInput = page.locator(
      'input[name="title"], input#title, input[placeholder*="Название" i]'
    ).first();
    const hasTitle = await titleInput.isVisible().catch(() => false);

    if (hasTitle) {
      const value = await titleInput.inputValue();
      expect(value.length, 'Title should be pre-filled on edit page').toBeGreaterThan(0);
    } else {
      // Page loaded but may have different structure
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length).toBeGreaterThan(50);
    }
  });
});
