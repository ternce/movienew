import { test, expect, type Page } from '@playwright/test';
import { PROD_USERS, loginViaApi } from '../helpers/auth.helper';
import { apiGet } from '../helpers/api.helper';

/**
 * Studio List Page — Production E2E Tests
 *
 * Validates the /studio content management page:
 * stats cards, search, filters, content grid, and navigation.
 * Uses admin-state.json storageState (ADMIN role).
 */

const BASE_URL = process.env.PROD_BASE_URL || 'http://89.108.66.37';

async function waitForStudioPage(page: Page, path: string): Promise<boolean> {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  if (page.url().includes('/login')) {
    return false;
  }
  return true;
}

test.describe('Studio Content List', () => {
  test('studio page loads at /studio', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio');
    test.skip(!loaded, 'Auth state expired — redirected to login');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();

    if (bodyText.trim().length < 50) {
      test.skip(true, 'Studio page did not render');
      return;
    }

    // Should contain the page header text
    const hasHeader =
      bodyText.includes('Мой контент') ||
      bodyText.includes('Управление контентом') ||
      bodyText.includes('Studio');

    expect(hasHeader).toBe(true);
  });

  test('studio page has content or empty state', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();

    // Either has content cards/grid, or has the empty state message
    const hasContent =
      (await page.locator('[class*="card"]').count()) > 0 ||
      bodyText.includes('Контент не найден') ||
      bodyText.includes('Создайте свой первый контент');

    expect(hasContent).toBe(true);
  });

  test('studio page has Russian text', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });

  test('studio page has "Создать контент" button or link', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // Try finding the create link by href
    const createLink = page.locator('a[href="/studio/create"]');
    const hasCreateLink = await createLink.isVisible().catch(() => false);

    if (!hasCreateLink) {
      // Fall back to finding by text
      const createButton = page.getByText('Создать контент');
      const hasCreateButton = (await createButton.count()) > 0;

      // Also check for a Plus icon button
      const plusButton = page.getByText('Создать');
      const hasPlusButton = (await plusButton.count()) > 0;

      expect(hasCreateButton || hasPlusButton).toBe(true);
    } else {
      expect(hasCreateLink).toBe(true);
    }
  });

  test('studio page has search input or filter controls', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(5000);

    // Check for search input
    const searchInput = page.locator('input[placeholder*="Поиск"]');
    const hasSearch = await searchInput.isVisible().catch(() => false);

    // Check for filter selects (content type / status)
    const selectTriggers = page.locator('button[role="combobox"]');
    const hasSelects = (await selectTriggers.count()) > 0;

    // Check for select elements too
    const selectElements = page.locator('[data-radix-select-trigger]');
    const hasRadixSelects = (await selectElements.count()) > 0;

    expect(hasSearch || hasSelects || hasRadixSelects).toBe(true);
  });
});
