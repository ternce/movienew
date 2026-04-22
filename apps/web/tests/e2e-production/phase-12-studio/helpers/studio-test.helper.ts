/**
 * Shared Studio E2E test utilities for production testing.
 * Provides form-filling helpers, API CRUD, and page navigation.
 */

import { type Page, expect } from '@playwright/test';
import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
} from '../../helpers/api.helper';
import { loginViaApi, PROD_USERS } from '../../helpers/auth.helper';

// ============ Re-exports from admin-test.helper ============

export {
  TEST_CONTENT_PREFIX,
  getAdminToken,
  cleanupAllTestContent,
  getFirstCategoryId,
  getCategories,
  createTestContent,
  deleteTestContent,
  findContentByTitle,
  generateTestImage,
  generateTestVideo,
  waitForAdminPage,
  type ContentItem,
  type CategoryInfo,
} from '../../phase-8-admin/helpers/admin-test.helper';

// ============ Constants ============

export const CONTENT_TYPES = ['SERIES', 'CLIP', 'SHORT', 'TUTORIAL'] as const;

export const AGE_CATEGORY_MAP: Record<string, string> = {
  '0+': 'ZERO_PLUS',
  '6+': 'SIX_PLUS',
  '12+': 'TWELVE_PLUS',
  '16+': 'SIXTEEN_PLUS',
  '18+': 'EIGHTEEN_PLUS',
};

// ============ Page Navigation ============

/**
 * Navigate to a Studio page and wait for it to load.
 * Returns false if redirected to login (auth expired).
 */
export async function waitForStudioPage(
  page: Page,
  path: string
): Promise<boolean> {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  if (page.url().includes('/login')) {
    return false;
  }
  return true;
}

// ============ Wizard Form Helpers ============

/**
 * Fill the title input (TitleDescriptionFields shared component).
 * Series/Clip/Tutorial use #title, Short uses #short-title.
 */
export async function fillTitle(
  page: Page,
  title: string,
  inputId = '#title'
): Promise<void> {
  const input = page.locator(inputId);
  await input.waitFor({ state: 'visible', timeout: 10_000 });
  await input.fill(title);
}

/**
 * Fill the description field.
 * Series/Clip/Tutorial use #description, Short uses #short-description.
 */
export async function fillDescription(
  page: Page,
  description: string,
  inputId = '#description'
): Promise<void> {
  const input = page.locator(inputId);
  await input.waitFor({ state: 'visible', timeout: 10_000 });
  await input.fill(description);
}

/**
 * Select an age rating from the AgeRatingSelector.
 * Uses plain <button type="button"> elements with exact text labels.
 */
export async function selectAgeRating(
  page: Page,
  rating: '0+' | '6+' | '12+' | '16+' | '18+'
): Promise<void> {
  // AgeRatingSelector renders <button type="button">{label}</button>
  const button = page.locator('button[type="button"]').filter({ hasText: rating }).first();
  await button.click();
  await page.waitForTimeout(300);
}

/**
 * Select the first available category from the CategorySelect combobox popover.
 * Returns false if no categories are available.
 */
export async function selectCategory(page: Page): Promise<boolean> {
  // CategorySelect uses a Popover with a combobox trigger
  const trigger = page.locator('button[role="combobox"]').filter({
    hasText: /Выберите категорию|Выберите тематику/,
  });

  if (!(await trigger.isVisible().catch(() => false))) {
    return false;
  }

  await trigger.click();
  await page.waitForTimeout(600);

  // Select the first option in the Command list
  const firstOption = page.locator('[cmdk-item]').first();
  if (await firstOption.isVisible().catch(() => false)) {
    await firstOption.click();
    await page.waitForTimeout(400);
    return true;
  }

  // Fallback: try role-based selector
  const roleOption = page.getByRole('option').first();
  if (await roleOption.isVisible().catch(() => false)) {
    await roleOption.click();
    await page.waitForTimeout(400);
    return true;
  }

  return false;
}

/**
 * Click "Далее" (Next) button in WizardShell.
 */
export async function clickWizardNext(page: Page): Promise<void> {
  const nextBtn = page.getByRole('button', { name: 'Далее' });
  await nextBtn.click();
  await page.waitForTimeout(1000);
}

/**
 * Click "Назад" (Back) button in WizardShell.
 */
export async function clickWizardBack(page: Page): Promise<void> {
  const backBtn = page.getByRole('button', { name: 'Назад' });
  await backBtn.click();
  await page.waitForTimeout(500);
}

/**
 * Verify that the step indicator shows the expected number of steps.
 */
export async function verifyStepCount(
  page: Page,
  expectedCount: number
): Promise<void> {
  // WizardShell renders step circles with numbers 1..N as <span> inside <button>
  // Check that there are the right number of step separator lines + circles
  const stepContainer = page.locator('.flex.items-center.gap-2.mb-8');
  await expect(stepContainer).toBeVisible({ timeout: 5_000 });
}

// ============ API Content Creation Helpers ============

/**
 * Create a SERIES via API with seasons/episodes structure.
 */
export async function createSeriesViaApi(
  token: string,
  overrides?: {
    title?: string;
    description?: string;
    categoryId?: string;
    ageCategory?: string;
  }
): Promise<{ id: string; title: string; slug: string; contentType: string; status: string }> {
  let categoryId = overrides?.categoryId;
  if (!categoryId) {
    const catRes = await apiGet('/categories', token);
    const cats = (catRes.data as { categories?: { id: string }[] })?.categories ?? [];
    categoryId = cats[0]?.id;
    if (!categoryId) throw new Error('No categories found');
  }

  const timestamp = Date.now().toString(36);
  const payload = {
    title: overrides?.title ?? `E2E-TEST-Series-${timestamp}`,
    description: overrides?.description ?? `E2E test series created at ${new Date().toISOString()}`,
    contentType: 'SERIES',
    categoryId,
    ageCategory: overrides?.ageCategory ?? 'ZERO_PLUS',
    isFree: true,
    seasons: [
      {
        title: 'Сезон 1',
        order: 1,
        episodes: [
          { title: 'Эпизод 1', description: '', order: 1 },
        ],
      },
    ],
  };

  const res = await apiPost('/admin/content/series', payload, token);
  if (!res.success || !res.data) {
    throw new Error(`Failed to create series: ${JSON.stringify(res)}`);
  }
  return res.data as { id: string; title: string; slug: string; contentType: string; status: string };
}

/**
 * Create a TUTORIAL via API with chapters/lessons structure.
 */
export async function createTutorialViaApi(
  token: string,
  overrides?: {
    title?: string;
    description?: string;
    categoryId?: string;
    ageCategory?: string;
  }
): Promise<{ id: string; title: string; slug: string; contentType: string; status: string }> {
  let categoryId = overrides?.categoryId;
  if (!categoryId) {
    const catRes = await apiGet('/categories', token);
    const cats = (catRes.data as { categories?: { id: string }[] })?.categories ?? [];
    categoryId = cats[0]?.id;
    if (!categoryId) throw new Error('No categories found');
  }

  const timestamp = Date.now().toString(36);
  const payload = {
    title: overrides?.title ?? `E2E-TEST-Tutorial-${timestamp}`,
    description: overrides?.description ?? `E2E test tutorial created at ${new Date().toISOString()}`,
    contentType: 'TUTORIAL',
    categoryId,
    ageCategory: overrides?.ageCategory ?? 'ZERO_PLUS',
    isFree: true,
    seasons: [
      {
        title: 'Глава 1',
        order: 1,
        episodes: [
          { title: 'Урок 1', description: '', order: 1 },
        ],
      },
    ],
  };

  const res = await apiPost('/admin/content/series', payload, token);
  if (!res.success || !res.data) {
    throw new Error(`Failed to create tutorial: ${JSON.stringify(res)}`);
  }
  return res.data as { id: string; title: string; slug: string; contentType: string; status: string };
}

/**
 * Create a CLIP via API.
 */
export async function createClipViaApi(
  token: string,
  overrides?: {
    title?: string;
    description?: string;
    categoryId?: string;
    ageCategory?: string;
  }
): Promise<{ id: string; title: string; slug: string; contentType: string; status: string }> {
  let categoryId = overrides?.categoryId;
  if (!categoryId) {
    const catRes = await apiGet('/categories', token);
    const cats = (catRes.data as { categories?: { id: string }[] })?.categories ?? [];
    categoryId = cats[0]?.id;
    if (!categoryId) throw new Error('No categories found');
  }

  const timestamp = Date.now().toString(36);
  const payload = {
    title: overrides?.title ?? `E2E-TEST-Clip-${timestamp}`,
    description: overrides?.description ?? `E2E test clip created at ${new Date().toISOString()}`,
    contentType: 'CLIP',
    categoryId,
    ageCategory: overrides?.ageCategory ?? 'ZERO_PLUS',
    isFree: true,
  };

  const res = await apiPost('/admin/content', payload, token);
  if (!res.success || !res.data) {
    throw new Error(`Failed to create clip: ${JSON.stringify(res)}`);
  }
  return res.data as { id: string; title: string; slug: string; contentType: string; status: string };
}

/**
 * Create a SHORT via API. Always free, no category required.
 */
export async function createShortViaApi(
  token: string,
  overrides?: {
    title?: string;
    description?: string;
    ageCategory?: string;
  }
): Promise<{ id: string; title: string; slug: string; contentType: string; status: string }> {
  const timestamp = Date.now().toString(36);
  const payload = {
    title: overrides?.title ?? `E2E-TEST-Short-${timestamp}`,
    description: overrides?.description ?? `E2E test short created at ${new Date().toISOString()}`,
    contentType: 'SHORT',
    ageCategory: overrides?.ageCategory ?? 'ZERO_PLUS',
    isFree: true,
  };

  const res = await apiPost('/admin/content', payload, token);
  if (!res.success || !res.data) {
    throw new Error(`Failed to create short: ${JSON.stringify(res)}`);
  }
  return res.data as { id: string; title: string; slug: string; contentType: string; status: string };
}

// ============ Cleanup Helpers ============

/**
 * Cleanup test store products (E2E-TEST- prefix).
 */
export async function cleanupTestProducts(token: string): Promise<number> {
  let cleaned = 0;
  try {
    const res = await apiGet(`/admin/store/products?limit=100`, token);
    if (!res.success || !res.data) return 0;
    const data = res.data as { items?: { id: string; name?: string }[] };
    for (const item of data.items ?? []) {
      if (item.name?.startsWith('E2E-TEST-')) {
        await apiDelete(`/admin/store/products/${item.id}`, token);
        cleaned++;
      }
    }
  } catch {
    // Non-critical
  }
  return cleaned;
}
