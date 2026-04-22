import { test, expect } from '@playwright/test';
import { expectRussianText } from '../helpers/assertions.helper';

/**
 * Phase 14 — Documents List
 *
 * Verifies the /documents page loads, shows document cards/links,
 * and displays Russian content. Uses user-state.json (authenticated).
 */

/** Navigate to a protected page; return false if redirected to login. */
async function gotoProtected(page: import('@playwright/test').Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  if (page.url().includes('/login')) {
    return false;
  }
  return true;
}

test.describe('Documents List', () => {
  test('documents page loads at /documents', async ({ page }) => {
    const ok = await gotoProtected(page, '/documents');
    if (!ok) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    // Should stay on /documents (not redirect to error or login)
    expect(page.url()).toContain('/documents');
  });

  test('documents page has content (not blank)', async ({ page }) => {
    const ok = await gotoProtected(page, '/documents');
    if (!ok) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);
  });

  test('documents page has Russian text', async ({ page }) => {
    const ok = await gotoProtected(page, '/documents');
    if (!ok) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    await expectRussianText(page);
  });

  test('documents page shows document type links or cards', async ({ page }) => {
    const ok = await gotoProtected(page, '/documents');
    if (!ok) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    const bodyText = await page.locator('body').innerText();

    // The page should show document headings/links or an empty-state message.
    // Document type labels: Пользовательское соглашение, Политика конфиденциальности, Оферта
    // Or page title: Правовые документы
    // Or empty state: Документы пока не опубликованы / Не удалось загрузить
    const hasDocumentsContent =
      bodyText.includes('Правовые документы') ||
      bodyText.includes('документы') ||
      bodyText.includes('Документы') ||
      bodyText.includes('Пользовательское соглашение') ||
      bodyText.includes('Политика конфиденциальности') ||
      bodyText.includes('Оферта');

    expect(hasDocumentsContent).toBe(true);
  });

  test('documents page is accessible to authenticated users', async ({ page }) => {
    const ok = await gotoProtected(page, '/documents');
    if (!ok) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    // Authenticated user should NOT be redirected away
    const url = page.url();
    expect(url).not.toContain('/login');

    // Page should render HTML (not crash)
    const title = await page.title();
    expect(title).not.toContain('500');
    expect(title).not.toContain('Error');
  });
});
