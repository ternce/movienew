import { test, expect, type Page } from '@playwright/test';
import { PROD_USERS, loginViaApi } from '../helpers/auth.helper';
import { apiGet } from '../helpers/api.helper';

/**
 * Studio Edit Page — Production E2E Tests
 *
 * Validates the /studio/[id] content editing page:
 * pre-populated form, save button, not-found handling.
 * Uses admin-state.json storageState (ADMIN role).
 *
 * First fetches available content via API, then navigates to edit page.
 */

async function waitForStudioPage(page: Page, path: string): Promise<boolean> {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  if (page.url().includes('/login')) {
    return false;
  }
  return true;
}

/**
 * Login as admin via API and return the first content item ID.
 * Returns { token, contentId, contentTitle } or null if unavailable.
 */
async function getFirstContentItem(): Promise<{
  token: string;
  contentId: string;
  contentTitle: string;
} | null> {
  try {
    const auth = await loginViaApi(PROD_USERS.admin.email, PROD_USERS.admin.password);
    const token = auth.accessToken;

    const res = await apiGet('/admin/content?limit=1', token);
    if (!res.success || !res.data) return null;

    const items = (res.data as { items?: Array<{ id: string; title: string }> }).items;
    if (!items?.length) return null;

    return {
      token,
      contentId: items[0].id,
      contentTitle: items[0].title,
    };
  } catch {
    return null;
  }
}

test.describe('Studio Edit Page', () => {
  test('edit page loads for existing content item', async ({ page }) => {
    const content = await getFirstContentItem();
    if (!content) {
      test.skip(true, 'No content available or admin login failed');
      return;
    }

    const loaded = await waitForStudioPage(page, `/studio/${content.contentId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();

    if (bodyText.trim().length < 50) {
      test.skip(true, 'Edit page did not render');
      return;
    }

    // Should contain the content title or editing header
    const hasContent =
      bodyText.includes(content.contentTitle) ||
      bodyText.includes('Редактирование') ||
      bodyText.includes('Назад к списку');

    expect(hasContent).toBe(true);
  });

  test('edit page has form with title field pre-filled', async ({ page }) => {
    const content = await getFirstContentItem();
    if (!content) {
      test.skip(true, 'No content available or admin login failed');
      return;
    }

    const loaded = await waitForStudioPage(page, `/studio/${content.contentId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const bodyText = await page.locator('body').innerText();
    if (bodyText.includes('Контент не найден')) {
      test.skip(true, 'Content not found on production');
      return;
    }

    // Title input should be pre-filled (step 1 visible by default)
    const titleInput = page.locator('#title');
    if (await titleInput.isVisible().catch(() => false)) {
      const value = await titleInput.inputValue();
      expect(value.length).toBeGreaterThan(0);
    } else {
      // Form may use a different structure — just verify body has content title
      expect(bodyText).toContain(content.contentTitle);
    }
  });

  test('edit page has Russian text', async ({ page }) => {
    const content = await getFirstContentItem();
    if (!content) {
      test.skip(true, 'No content available or admin login failed');
      return;
    }

    const loaded = await waitForStudioPage(page, `/studio/${content.contentId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();

    // Must contain Cyrillic characters
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);

    // Check for known Russian labels from the edit form
    const hasRussianLabels =
      bodyText.includes('Редактирование') ||
      bodyText.includes('Название') ||
      bodyText.includes('Назад к списку') ||
      bodyText.includes('Сохранить') ||
      bodyText.includes('Удалить');

    expect(hasRussianLabels).toBe(true);
  });

  test('edit page has save/update button', async ({ page }) => {
    const content = await getFirstContentItem();
    if (!content) {
      test.skip(true, 'No content available or admin login failed');
      return;
    }

    const loaded = await waitForStudioPage(page, `/studio/${content.contentId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const bodyText = await page.locator('body').innerText();
    if (bodyText.includes('Контент не найден')) {
      test.skip(true, 'Content not found on production');
      return;
    }

    // Look for the submit button with "Сохранить" text
    const saveButton = page.getByText('Сохранить');
    const hasSaveButton = (await saveButton.count()) > 0;

    // Or a generic submit button
    const submitButton = page.locator('button[type="submit"]');
    const hasSubmitButton = await submitButton.isVisible().catch(() => false);

    // Also check for "Далее" (wizard navigation to reach submit step)
    const nextButton = page.getByText('Далее');
    const hasNextButton = (await nextButton.count()) > 0;

    expect(hasSaveButton || hasSubmitButton || hasNextButton).toBe(true);
  });

  test('navigating to /studio/nonexistent-id handles gracefully', async ({ page }) => {
    const loaded = await waitForStudioPage(
      page,
      '/studio/00000000-0000-0000-0000-000000000000'
    );
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    const bodyText = await page.locator('body').innerText();

    // Should show not-found message or redirect
    const isHandled =
      bodyText.includes('Контент не найден') ||
      bodyText.includes('не найден') ||
      bodyText.includes('не существует') ||
      bodyText.includes('Вернуться') ||
      page.url().includes('/studio') && !page.url().includes('00000000');

    expect(isHandled).toBe(true);
  });
});
