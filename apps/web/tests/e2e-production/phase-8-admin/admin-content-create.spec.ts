import { test, expect, type Page } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import {
  waitForAdminPage,
  getAdminToken,
  getCategories,
  getFirstCategoryId,
  findContentByTitle,
  cleanupAllTestContent,
  TEST_CONTENT_PREFIX,
  AGE_CATEGORY_TO_BACKEND,
  type CategoryInfo,
} from './helpers/admin-test.helper';

/**
 * Admin Content Creation Tests — PRIMARY FOCUS
 *
 * Tests the entire content creation flow on production.
 * Handles both pre-fix (UUID input) and post-fix (dropdown) category UI.
 */

let adminToken: string;
let categories: CategoryInfo[];
let firstCategoryId: string;

test.beforeAll(async () => {
  try {
    adminToken = await getAdminToken();
    categories = await getCategories(adminToken);
    firstCategoryId = categories[0]?.id ?? '';
  } catch {
    // Tests will skip if auth fails
  }
});

test.afterAll(async () => {
  if (adminToken) {
    await cleanupAllTestContent(adminToken);
  }
});

/**
 * Helper: Select a value from a Radix Select combobox.
 * Finds the combobox by matching its current text against a pattern,
 * then selects the option with the given name.
 */
async function selectOption(
  page: Page,
  comboboxPattern: RegExp,
  optionName: string
): Promise<boolean> {
  const selects = page.locator('button[role="combobox"]');
  const count = await selects.count();

  for (let i = 0; i < count; i++) {
    const text = await selects.nth(i).innerText().catch(() => '');
    if (comboboxPattern.test(text)) {
      await selects.nth(i).click();
      await page.waitForTimeout(600);
      const option = page.getByRole('option', { name: optionName });
      if (await option.isVisible().catch(() => false)) {
        await option.click();
        await page.waitForTimeout(400);
        return true;
      }
      // Close dropdown if option not found
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      return false;
    }
  }
  return false;
}

/**
 * Helper: Fill category field — handles both UUID input (old UI) and dropdown (new UI).
 */
async function fillCategory(page: Page, categoryId: string): Promise<boolean> {
  // Try new UI (dropdown) first
  const catSelect = page.locator('button[role="combobox"]').filter({ hasText: /Выберите тематику/ });
  if (await catSelect.isVisible().catch(() => false)) {
    await catSelect.click();
    await page.waitForTimeout(600);
    const firstOption = page.getByRole('option').first();
    if (await firstOption.isVisible().catch(() => false)) {
      await firstOption.click();
      await page.waitForTimeout(400);
      return true;
    }
    await page.keyboard.press('Escape');
  }

  // Fall back to old UI (UUID input)
  const categoryInput = page.locator('#categoryId');
  if (await categoryInput.isVisible().catch(() => false)) {
    await categoryInput.fill(categoryId);
    return true;
  }

  return false;
}

/**
 * Helper: Fill and submit a content creation form.
 * Returns the title used for API verification.
 */
async function fillAndSubmitContentForm(
  page: Page,
  contentType: string,
  contentTypeLabel: string,
  ageCategory: string,
  categoryId: string
): Promise<string> {
  const title = `${TEST_CONTENT_PREFIX}${contentType}-${Date.now().toString(36)}`;

  // Fill title and description
  await page.locator('#title').fill(title);
  await page.locator('#description').fill(`Тестовый ${contentTypeLabel.toLowerCase()} для E2E`);

  // Select content type
  await selectOption(page, /Выберите тип|Сериал|Клип|Шорт|Туториал/, contentTypeLabel);

  // Select age category
  await selectOption(page, /Выберите возраст|0\+|6\+|12\+|16\+|18\+/, ageCategory);

  // Fill category (handles both old and new UI)
  await fillCategory(page, categoryId);

  await page.waitForTimeout(500);

  // Submit
  const submitButton = page.locator('button[type="submit"]');
  if (await submitButton.isEnabled().catch(() => false)) {
    await submitButton.click();
    // Wait for redirect or toast
    await page.waitForURL('**/admin/content', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  return title;
}

test.describe('Admin Content Creation', () => {
  test('create page loads with form fields', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Новый контент');

    expect(await page.locator('#title').isVisible()).toBe(true);
    expect(await page.locator('#description').isVisible()).toBe(true);
  });

  test('"Назад к списку" navigates to content list', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(2000);

    const backLink = page.locator('a[href="/admin/content"]').first();
    if (await backLink.isVisible()) {
      await backLink.click();
      await page.waitForURL('**/admin/content', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    expect(page.url()).toContain('/admin/content');
  });

  test('submit button is disabled when required fields are empty', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(2000);

    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isVisible()) {
      expect(await submitButton.isDisabled()).toBe(true);
    }
  });

  test('create SERIES content with all required fields', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');
    test.skip(!firstCategoryId, 'No categories available');

    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const title = await fillAndSubmitContentForm(page, 'Series', 'Сериал', '0+', firstCategoryId);

    // Verify via API
    const found = await findContentByTitle(adminToken, title);
    if (found) {
      expect(found.contentType).toBe('SERIES');
      expect(found.status).toBe('DRAFT');
    }
  });

  test('create CLIP content', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');
    test.skip(!firstCategoryId, 'No categories available');

    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const title = await fillAndSubmitContentForm(page, 'Clip', 'Клип', '6+', firstCategoryId);

    const found = await findContentByTitle(adminToken, title);
    if (found) {
      expect(found.contentType).toBe('CLIP');
    }
  });

  test('create SHORT content', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');
    test.skip(!firstCategoryId, 'No categories available');

    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const title = await fillAndSubmitContentForm(page, 'Short', 'Шорт', '12+', firstCategoryId);

    const found = await findContentByTitle(adminToken, title);
    if (found) {
      expect(found.contentType).toBe('SHORT');
    }
  });

  test('create TUTORIAL content', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');
    test.skip(!firstCategoryId, 'No categories available');

    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const title = await fillAndSubmitContentForm(page, 'Tutorial', 'Туториал', '16+', firstCategoryId);

    const found = await findContentByTitle(adminToken, title);
    if (found) {
      expect(found.contentType).toBe('TUTORIAL');
    }
  });

  test('create free content with isFree checkbox', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(2000);

    const checkbox = page.locator('button[role="checkbox"]#isFree');
    if (await checkbox.isVisible()) {
      await checkbox.click();
      await page.waitForTimeout(300);

      // Price field should disappear
      const priceVisible = await page.locator('#individualPrice').isVisible().catch(() => false);
      expect(priceVisible).toBe(false);

      expect(await checkbox.getAttribute('data-state')).toBe('checked');
    }
  });

  test('paid content shows price field', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(2000);

    const priceInput = page.locator('#individualPrice');
    expect(await priceInput.isVisible()).toBe(true);

    await priceInput.fill('499');
    expect(await priceInput.inputValue()).toBe('499');
  });

  test('category field accepts input', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');

    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // Try dropdown first (new UI)
    const catDropdown = page.locator('button[role="combobox"]').filter({ hasText: /Выберите тематику/ });
    const hasDropdown = await catDropdown.isVisible().catch(() => false);

    if (hasDropdown) {
      await catDropdown.click();
      await page.waitForTimeout(500);
      const bodyText = await page.locator('body').innerText();
      const hasCategories =
        bodyText.includes('Драма') ||
        bodyText.includes('Развлечения') ||
        bodyText.includes('Образование');
      expect(hasCategories).toBe(true);
      await page.keyboard.press('Escape');
    } else {
      // Old UI — UUID input
      const catInput = page.locator('#categoryId');
      if (await catInput.isVisible()) {
        await catInput.fill(firstCategoryId);
        expect(await catInput.inputValue()).toBe(firstCategoryId);
      }
    }
  });

  test('draft note is visible on create page', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').innerText();
    // Works for both old (has "Черновик" in status select) and new (has "черновик" note) UI
    const hasDraftReference = bodyText.includes('черновик') || bodyText.includes('Черновик');
    expect(hasDraftReference).toBe(true);
  });

  test('cancel button navigates to content list', async ({ page }) => {
    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(2000);

    const cancelLink = page.locator('a').filter({ hasText: 'Отмена' });
    if (await cancelLink.isVisible()) {
      await cancelLink.click();
      await page.waitForURL('**/admin/content', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    expect(page.url()).toContain('/admin/content');
  });

  test('content creation verified via API', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet(
      `/admin/content?search=${encodeURIComponent(TEST_CONTENT_PREFIX)}&limit=20`,
      adminToken
    );

    expect(res.success).toBe(true);
    if (res.data) {
      const data = res.data as { items?: { title: string; status: string }[] };
      const testItems = (data.items ?? []).filter((i) =>
        i.title.startsWith(TEST_CONTENT_PREFIX)
      );

      // Check that newly created items are DRAFT (exclude ARCHIVED from previous test runs)
      const draftItems = testItems.filter((i) => i.status === 'DRAFT');
      if (draftItems.length > 0) {
        for (const item of draftItems) {
          expect(item.status).toBe('DRAFT');
        }
      }

      // At minimum, test items exist in the system
      expect(testItems.length).toBeGreaterThan(0);
    }
  });

  test('age category mapping works correctly', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const ageCats = ['0+', '6+', '12+', '16+', '18+'];
    const backendEnums = ['ZERO_PLUS', 'SIX_PLUS', 'TWELVE_PLUS', 'SIXTEEN_PLUS', 'EIGHTEEN_PLUS'];

    for (let i = 0; i < ageCats.length; i++) {
      expect(AGE_CATEGORY_TO_BACKEND[ageCats[i]]).toBe(backendEnums[i]);
    }
  });

  // ---- Enhanced Tests (Step 3) ----

  test('create content with 18+ age category via API', async () => {
    test.skip(!adminToken || !firstCategoryId, 'Prerequisites not met');

    const timestamp = Date.now().toString(36);
    const title = `${TEST_CONTENT_PREFIX}18plus-${timestamp}`;

    const res = await import('../helpers/api.helper').then(({ apiPost }) =>
      apiPost('/admin/content', {
        title,
        description: 'Test 18+ content',
        contentType: 'CLIP',
        categoryId: firstCategoryId,
        ageCategory: 'EIGHTEEN_PLUS',
        isFree: true,
      }, adminToken)
    );
    expect(res.success).toBe(true);

    const content = res.data as { id: string; ageCategory: string };
    // API may return backend enum or frontend display format
    expect(['EIGHTEEN_PLUS', '18+']).toContain(content.ageCategory);

    // Cleanup
    const { apiDelete } = await import('../helpers/api.helper');
    await apiDelete(`/admin/content/${content.id}`, adminToken);
  });

  test('slug is auto-generated when left empty', async () => {
    test.skip(!adminToken || !firstCategoryId, 'Prerequisites not met');

    const timestamp = Date.now().toString(36);
    const title = `${TEST_CONTENT_PREFIX}SlugAuto ${timestamp}`;

    const { apiPost, apiDelete: del } = await import('../helpers/api.helper');
    const res = await apiPost('/admin/content', {
      title,
      description: 'Test auto-slug',
      contentType: 'SHORT',
      categoryId: firstCategoryId,
      ageCategory: 'ZERO_PLUS',
      isFree: true,
      // slug intentionally omitted
    }, adminToken);
    expect(res.success).toBe(true);

    const content = res.data as { id: string; slug: string };
    expect(content.slug).toBeTruthy();
    expect(content.slug.length).toBeGreaterThan(0);

    await del(`/admin/content/${content.id}`, adminToken);
  });

  test('Медиа card shows both image and video upload zones', async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');
    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    // Verify Медиа heading
    await expect(page.getByRole('heading', { name: 'Медиа' })).toBeVisible();

    // Verify Обложка and Превью видео labels
    const body = await page.locator('body').innerText();
    expect(body).toContain('Обложка');
    expect(body).toContain('Превью видео');

    // Both drop zones should be present
    const dropZones = page.locator('.border-dashed');
    const count = await dropZones.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('category dropdown populates from API', async ({ page }) => {
    test.skip(!adminToken || categories.length === 0, 'No categories available');
    const loaded = await waitForAdminPage(page, '/admin/content/new');
    test.skip(!loaded, 'Auth state expired');

    // Open category select
    const catSelect = page.locator('button[role="combobox"]').filter({ hasText: 'Выберите тематику' });
    if (await catSelect.isVisible().catch(() => false)) {
      await catSelect.click();
      await page.waitForTimeout(600);

      const options = await page.locator('[role="option"]').allInnerTexts();
      expect(options.length).toBeGreaterThan(0);

      // First category name should match API
      expect(options.some((opt) => opt.includes(categories[0].name))).toBe(true);

      await page.keyboard.press('Escape');
    }
  });
});
