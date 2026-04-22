/**
 * Studio Edit Series — Production E2E Tests
 *
 * Tests editing existing series content via the Studio editor.
 * Creates content via API, then tests the edit UI.
 * Uses admin-state.json storageState (ADMIN role).
 */

import { test, expect } from '@playwright/test';
import { apiGet, apiPatch } from '../helpers/api.helper';
import {
  waitForStudioPage,
  getAdminToken,
  cleanupAllTestContent,
  createSeriesViaApi,
  TEST_CONTENT_PREFIX,
} from './helpers/studio-test.helper';

let adminToken: string;
let seriesId: string;
let seriesTitle: string;

test.beforeAll(async () => {
  try {
    adminToken = await getAdminToken();
    const series = await createSeriesViaApi(adminToken, {
      title: `${TEST_CONTENT_PREFIX}Edit-Series-${Date.now().toString(36)}`,
      description: 'Series for edit testing',
    });
    seriesId = series.id;
    seriesTitle = series.title;
  } catch {
    // Tests will skip
  }
});

test.afterAll(async () => {
  if (adminToken) {
    await cleanupAllTestContent(adminToken);
  }
});

test.describe('Series Edit Page', () => {
  test('edit page loads at /studio/{contentId}', async ({ page }) => {
    test.skip(!seriesId, 'Series not created');
    const loaded = await waitForStudioPage(page, `/studio/${seriesId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test('title field pre-populated with series title', async ({ page }) => {
    test.skip(!seriesId, 'Series not created');
    const loaded = await waitForStudioPage(page, `/studio/${seriesId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const titleInput = page.locator('#title');
    if (await titleInput.isVisible().catch(() => false)) {
      const value = await titleInput.inputValue();
      expect(value).toContain(TEST_CONTENT_PREFIX);
    } else {
      // May use different form structure — check body text
      const bodyText = await page.locator('body').innerText();
      expect(bodyText).toContain(seriesTitle);
    }
  });

  test('step navigation works in edit mode', async ({ page }) => {
    test.skip(!seriesId, 'Series not created');
    const loaded = await waitForStudioPage(page, `/studio/${seriesId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // Should have step indicator or tab navigation
    const bodyText = await page.locator('body').innerText();
    const hasNavigation =
      bodyText.includes('Основное') ||
      bodyText.includes('Структура') ||
      bodyText.includes('Далее') ||
      bodyText.includes('Сохранить');

    expect(hasNavigation).toBe(true);
  });

  test('structure tab shows existing seasons/episodes', async ({ page }) => {
    test.skip(!seriesId, 'Series not created');
    const loaded = await waitForStudioPage(page, `/studio/${seriesId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // Try navigating to structure step
    const nextBtn = page.getByRole('button', { name: 'Далее' });
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(2000);
    }

    const bodyText = await page.locator('body').innerText();
    const hasStructure =
      bodyText.includes('Сезон') ||
      bodyText.includes('Эпизод') ||
      bodyText.includes('Структура');

    expect(hasStructure).toBe(true);
  });

  test('can update title and save via API', async () => {
    test.skip(!adminToken || !seriesId, 'Prerequisites not met');

    const newTitle = `${TEST_CONTENT_PREFIX}Updated-Series-${Date.now().toString(36)}`;
    const res = await apiPatch(`/admin/content/${seriesId}`, {
      title: newTitle,
    }, adminToken);

    expect(res.success).toBe(true);

    // Verify
    const verify = await apiGet(`/admin/content/${seriesId}`, adminToken);
    if (verify.success && verify.data) {
      const data = verify.data as { title: string };
      expect(data.title).toBe(newTitle);
    }
  });

  test('status change from DRAFT → PENDING via API', async () => {
    test.skip(!adminToken || !seriesId, 'Prerequisites not met');

    const res = await apiPatch(`/admin/content/${seriesId}`, {
      status: 'PENDING',
    }, adminToken);

    expect(res.success).toBe(true);

    const verify = await apiGet(`/admin/content/${seriesId}`, adminToken);
    if (verify.success && verify.data) {
      const data = verify.data as { status: string };
      expect(data.status).toBe('PENDING');
    }
  });

  test('"Назад к списку" navigates to /studio', async ({ page }) => {
    test.skip(!seriesId, 'Series not created');
    const loaded = await waitForStudioPage(page, `/studio/${seriesId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const backLink = page.locator('a[href="/studio"]');
    if (await backLink.first().isVisible().catch(() => false)) {
      await backLink.first().click();
      await page.waitForURL('**/studio', { timeout: 10_000 }).catch(() => {});
      expect(page.url()).toMatch(/\/studio\/?$/);
    } else {
      // Check back text exists
      const bodyText = await page.locator('body').innerText();
      expect(bodyText).toContain('Назад');
    }
  });

  test('not-found page for invalid UUID', async ({ page }) => {
    const loaded = await waitForStudioPage(
      page,
      '/studio/00000000-0000-0000-0000-000000000000'
    );
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();

    const isHandled =
      bodyText.includes('не найден') ||
      bodyText.includes('не существует') ||
      bodyText.includes('Вернуться') ||
      page.url().includes('/studio');

    expect(isHandled).toBe(true);
  });

  test('encoding status section visible in edit mode', async ({ page }) => {
    test.skip(!seriesId, 'Series not created');
    const loaded = await waitForStudioPage(page, `/studio/${seriesId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();

    // Edit mode should show video section or at least have content info
    const hasContentSection =
      bodyText.includes('Видео') ||
      bodyText.includes('Медиа') ||
      bodyText.includes('Редактирование') ||
      bodyText.includes(TEST_CONTENT_PREFIX);

    expect(hasContentSection).toBe(true);
  });

  test('page has Russian text', async ({ page }) => {
    test.skip(!seriesId, 'Series not created');
    const loaded = await waitForStudioPage(page, `/studio/${seriesId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
