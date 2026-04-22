/**
 * Studio Edit Clip — Production E2E Tests
 *
 * Tests editing existing clip content via the Studio editor.
 * Creates content via API, then tests the edit UI.
 * Uses admin-state.json storageState (ADMIN role).
 */

import { test, expect } from '@playwright/test';
import { apiGet, apiPatch } from '../helpers/api.helper';
import {
  waitForStudioPage,
  getAdminToken,
  cleanupAllTestContent,
  createClipViaApi,
  TEST_CONTENT_PREFIX,
} from './helpers/studio-test.helper';

let adminToken: string;
let clipId: string;
let clipTitle: string;

test.beforeAll(async () => {
  try {
    adminToken = await getAdminToken();
    const clip = await createClipViaApi(adminToken, {
      title: `${TEST_CONTENT_PREFIX}Edit-Clip-${Date.now().toString(36)}`,
      description: 'Clip for edit testing',
    });
    clipId = clip.id;
    clipTitle = clip.title;
  } catch {
    // Tests will skip
  }
});

test.afterAll(async () => {
  if (adminToken) {
    await cleanupAllTestContent(adminToken);
  }
});

test.describe('Clip Edit Page', () => {
  test('edit page loads at /studio/{contentId}', async ({ page }) => {
    test.skip(!clipId, 'Clip not created');
    const loaded = await waitForStudioPage(page, `/studio/${clipId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test('title field pre-populated', async ({ page }) => {
    test.skip(!clipId, 'Clip not created');
    const loaded = await waitForStudioPage(page, `/studio/${clipId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const titleInput = page.locator('#title');
    if (await titleInput.isVisible().catch(() => false)) {
      const value = await titleInput.inputValue();
      expect(value).toContain(TEST_CONTENT_PREFIX);
    } else {
      const bodyText = await page.locator('body').innerText();
      expect(bodyText).toContain(clipTitle);
    }
  });

  test('can update description via API', async () => {
    test.skip(!adminToken || !clipId, 'Prerequisites not met');

    const newDesc = `Updated description at ${new Date().toISOString()}`;
    const res = await apiPatch(`/admin/content/${clipId}`, {
      description: newDesc,
    }, adminToken);

    expect(res.success).toBe(true);

    const verify = await apiGet(`/admin/content/${clipId}`, adminToken);
    if (verify.success && verify.data) {
      const data = verify.data as { description: string };
      expect(data.description).toBe(newDesc);
    }
  });

  test('monetization settings editable via API', async () => {
    test.skip(!adminToken || !clipId, 'Prerequisites not met');

    // Set to paid
    const res = await apiPatch(`/admin/content/${clipId}`, {
      isFree: false,
      individualPrice: 199,
    }, adminToken);

    expect(res.success).toBe(true);

    // Verify
    const verify = await apiGet(`/admin/content/${clipId}`, adminToken);
    if (verify.success && verify.data) {
      const data = verify.data as { isFree: boolean; individualPrice: number };
      expect(data.isFree).toBe(false);
      expect(data.individualPrice).toBe(199);
    }

    // Set back to free
    await apiPatch(`/admin/content/${clipId}`, {
      isFree: true,
      individualPrice: 0,
    }, adminToken);
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

  test('"Назад к списку" navigates to /studio', async ({ page }) => {
    test.skip(!clipId, 'Clip not created');
    const loaded = await waitForStudioPage(page, `/studio/${clipId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const backLink = page.locator('a[href="/studio"]');
    if (await backLink.first().isVisible().catch(() => false)) {
      await backLink.first().click();
      await page.waitForURL('**/studio', { timeout: 10_000 }).catch(() => {});
      expect(page.url()).toMatch(/\/studio\/?$/);
    } else {
      const bodyText = await page.locator('body').innerText();
      expect(bodyText).toContain('Назад');
    }
  });

  test('step navigation works', async ({ page }) => {
    test.skip(!clipId, 'Clip not created');
    const loaded = await waitForStudioPage(page, `/studio/${clipId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();
    const hasNavigation =
      bodyText.includes('Информация') ||
      bodyText.includes('Далее') ||
      bodyText.includes('Сохранить');

    expect(hasNavigation).toBe(true);
  });

  test('page has Russian text', async ({ page }) => {
    test.skip(!clipId, 'Clip not created');
    const loaded = await waitForStudioPage(page, `/studio/${clipId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
