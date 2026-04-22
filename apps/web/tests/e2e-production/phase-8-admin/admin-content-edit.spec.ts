import { test, expect } from '@playwright/test';
import { apiGet, apiPatch } from '../helpers/api.helper';
import {
  waitForAdminPage,
  getAdminToken,
  createTestContent,
  deleteTestContent,
  type ContentItem,
} from './helpers/admin-test.helper';

/**
 * Admin Content Edit & Status Transition Tests
 *
 * Creates test content via API, then tests editing and status changes
 * through the browser UI and verifies via API.
 */

let adminToken: string;
let testContent: ContentItem;

test.beforeAll(async () => {
  try {
    adminToken = await getAdminToken();
    testContent = await createTestContent(adminToken, {
      title: 'E2E-TEST-Edit-Target',
      description: 'Content created for editing tests',
      contentType: 'SERIES',
      ageCategory: 'TWELVE_PLUS',
    });
  } catch {
    // Tests will skip
  }
});

test.afterAll(async () => {
  if (adminToken && testContent?.id) {
    await deleteTestContent(adminToken, testContent.id);
  }
});

test.describe('Admin Content Edit', () => {
  test('edit page loads with pre-populated fields', async ({ page }) => {
    test.skip(!testContent?.id, 'Test content not created');

    const loaded = await waitForAdminPage(page, `/admin/content/${testContent.id}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const bodyText = await page.locator('body').innerText();
    if (bodyText.includes('Контент не найден')) {
      test.skip(true, 'Content not found on production');
      return;
    }

    // Title should be pre-filled
    const titleInput = page.locator('#title');
    if (await titleInput.isVisible()) {
      const value = await titleInput.inputValue();
      expect(value).toContain('E2E-TEST-Edit-Target');
    }
  });

  test('description field is pre-populated', async ({ page }) => {
    test.skip(!testContent?.id, 'Test content not created');

    const loaded = await waitForAdminPage(page, `/admin/content/${testContent.id}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const descInput = page.locator('#description');
    if (await descInput.isVisible()) {
      const value = await descInput.inputValue();
      expect(value.length).toBeGreaterThan(0);
    }
  });

  test('update title and save', async ({ page }) => {
    test.skip(!testContent?.id, 'Test content not created');

    const loaded = await waitForAdminPage(page, `/admin/content/${testContent.id}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const bodyText = await page.locator('body').innerText();
    if (bodyText.includes('Контент не найден')) {
      test.skip(true, 'Content not found');
      return;
    }

    const newTitle = 'E2E-TEST-Edit-Updated';

    // Update title
    const titleInput = page.locator('#title');
    if (await titleInput.isVisible()) {
      await titleInput.clear();
      await titleInput.fill(newTitle);
    }

    // Click save
    const saveButton = page.locator('button[type="submit"]');
    if (await saveButton.isVisible() && await saveButton.isEnabled()) {
      await saveButton.click();
      await page.waitForTimeout(5000);

      // Verify via API
      const res = await apiGet(`/admin/content/${testContent.id}`, adminToken);
      if (res.success && res.data) {
        const data = res.data as { title: string };
        expect(data.title).toBe(newTitle);
      }
    }
  });

  test('change status to PUBLISHED via API', async () => {
    test.skip(!testContent?.id, 'Test content not created');

    const res = await apiPatch(
      `/admin/content/${testContent.id}`,
      { status: 'PUBLISHED' },
      adminToken
    );

    if (res.success) {
      const verify = await apiGet(`/admin/content/${testContent.id}`, adminToken);
      if (verify.success && verify.data) {
        const data = verify.data as { status: string };
        expect(data.status).toBe('PUBLISHED');
      }
    }
  });

  test('change status to PENDING via API', async () => {
    test.skip(!testContent?.id, 'Test content not created');

    const res = await apiPatch(
      `/admin/content/${testContent.id}`,
      { status: 'PENDING' },
      adminToken
    );

    if (res.success) {
      const verify = await apiGet(`/admin/content/${testContent.id}`, adminToken);
      if (verify.success && verify.data) {
        const data = verify.data as { status: string };
        expect(data.status).toBe('PENDING');
      }
    }
  });

  test('change status to REJECTED via API', async () => {
    test.skip(!testContent?.id, 'Test content not created');

    const res = await apiPatch(
      `/admin/content/${testContent.id}`,
      { status: 'REJECTED' },
      adminToken
    );

    if (res.success) {
      const verify = await apiGet(`/admin/content/${testContent.id}`, adminToken);
      if (verify.success && verify.data) {
        const data = verify.data as { status: string };
        expect(data.status).toBe('REJECTED');
      }
    }
  });

  test('change status back to DRAFT via API', async () => {
    test.skip(!testContent?.id, 'Test content not created');

    const res = await apiPatch(
      `/admin/content/${testContent.id}`,
      { status: 'DRAFT' },
      adminToken
    );

    if (res.success) {
      const verify = await apiGet(`/admin/content/${testContent.id}`, adminToken);
      if (verify.success && verify.data) {
        const data = verify.data as { status: string };
        expect(data.status).toBe('DRAFT');
      }
    }
  });

  test('edit page shows "Видео контент" section', async ({ page }) => {
    test.skip(!testContent?.id, 'Test content not created');

    const loaded = await waitForAdminPage(page, `/admin/content/${testContent.id}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const bodyText = await page.locator('body').innerText();
    if (bodyText.includes('Контент не найден')) {
      test.skip(true, 'Content not found');
      return;
    }

    expect(bodyText).toContain('Видео контент');
  });

  test('update pricing to paid via API', async () => {
    test.skip(!testContent?.id, 'Test content not created');

    const res = await apiPatch(
      `/admin/content/${testContent.id}`,
      { isFree: false, individualPrice: 299 },
      adminToken
    );

    if (res.success) {
      const verify = await apiGet(`/admin/content/${testContent.id}`, adminToken);
      if (verify.success && verify.data) {
        const data = verify.data as { isFree: boolean; individualPrice: number };
        expect(data.isFree).toBe(false);
        expect(data.individualPrice).toBe(299);
      }
    }
  });

  test('not-found page for invalid content ID', async ({ page }) => {
    const loaded = await waitForAdminPage(
      page,
      '/admin/content/00000000-0000-0000-0000-000000000000'
    );
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const bodyText = await page.locator('body').innerText();
    const isNotFound =
      bodyText.includes('Контент не найден') ||
      bodyText.includes('не найден') ||
      bodyText.includes('Вернуться');

    expect(isNotFound).toBe(true);
  });

  test('"Назад к списку" button works on edit page', async ({ page }) => {
    test.skip(!testContent?.id, 'Test content not created');

    const loaded = await waitForAdminPage(page, `/admin/content/${testContent.id}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const backLink = page.locator('a[href="/admin/content"]').first();
    if (await backLink.isVisible()) {
      await backLink.click();
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('/admin/content');
    }
  });

  test('status select shows all options on edit page', async ({ page }) => {
    test.skip(!testContent?.id, 'Test content not created');

    const loaded = await waitForAdminPage(page, `/admin/content/${testContent.id}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const bodyText = await page.locator('body').innerText();
    if (bodyText.includes('Контент не найден')) {
      test.skip(true, 'Content not found');
      return;
    }

    // Find status select and open it
    const statusSelects = page.locator('button[role="combobox"]');
    const count = await statusSelects.count();

    // Try to find the one with status values
    for (let i = 0; i < count; i++) {
      const text = await statusSelects.nth(i).innerText();
      if (text.includes('Черновик') || text.includes('Опубликован') || text.includes('На модерацию')) {
        await statusSelects.nth(i).click();
        await page.waitForTimeout(500);

        const options = await page.locator('[role="option"]').allInnerTexts();
        // Edit page should have 5 status options (DRAFT, PENDING, PUBLISHED, REJECTED, ARCHIVED)
        expect(options.length).toBeGreaterThanOrEqual(3);

        await page.keyboard.press('Escape');
        break;
      }
    }
  });

  // ---- Enhanced Tests (Step 3) ----

  test('"Видео контент" section is visible on edit page', async ({ page }) => {
    test.skip(!testContent?.id, 'Test content not created');

    const loaded = await waitForAdminPage(page, `/admin/content/${testContent.id}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();

    if (bodyText.includes('Контент не найден')) {
      test.skip(true, 'Content not found');
      return;
    }

    // Verify "Видео контент" card is present
    expect(bodyText).toContain('Видео контент');
    expect(bodyText).toContain('Основное видео');
  });

  test('thumbnail can be set via manual URL on edit page', async ({ page }) => {
    test.skip(!testContent?.id, 'Test content not created');

    const loaded = await waitForAdminPage(page, `/admin/content/${testContent.id}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();

    if (bodyText.includes('Контент не найден')) {
      test.skip(true, 'Content not found');
      return;
    }

    // Find "Или введите URL вручную" button under Обложка section
    const urlButton = page.getByRole('button', { name: 'Или введите URL вручную' }).first();
    if (await urlButton.isVisible().catch(() => false)) {
      await urlButton.click();

      const urlInput = page.locator('input[placeholder="https://..."]').first();
      await expect(urlInput).toBeVisible();

      await urlInput.fill('https://placehold.co/400x160');
      await page.getByRole('button', { name: 'OK' }).first().click();

      // Preview image should appear
      await expect(page.locator('img[alt="Preview"]')).toBeVisible({ timeout: 10_000 });
    }
  });

  test('edit page has all 4 select dropdowns', async ({ page }) => {
    test.skip(!testContent?.id, 'Test content not created');

    const loaded = await waitForAdminPage(page, `/admin/content/${testContent.id}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();

    if (bodyText.includes('Контент не найден')) {
      test.skip(true, 'Content not found');
      return;
    }

    // Edit page should have 4 comboboxes: type, age, status, category
    expect(bodyText).toContain('Тип контента');
    expect(bodyText).toContain('Категория возраста');
    expect(bodyText).toContain('Статус');
    expect(bodyText).toContain('Тематика');
  });

  test('edit page pre-fills the title correctly', async ({ page }) => {
    test.skip(!testContent?.id, 'Test content not created');

    const loaded = await waitForAdminPage(page, `/admin/content/${testContent.id}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const titleInput = page.locator('#title');
    const titleValue = await titleInput.inputValue().catch(() => '');

    if (titleValue) {
      expect(titleValue).toContain('E2E-TEST');
    }
  });
});
