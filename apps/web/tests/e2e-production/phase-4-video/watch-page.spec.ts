import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { loginViaApi, PROD_USERS } from '../helpers/auth.helper';

test.describe('Watch Page', () => {
  let contentId: string | undefined;

  test.beforeAll(async () => {
    // Get a content item ID from the API
    try {
      const auth = await loginViaApi(
        PROD_USERS.user.email,
        PROD_USERS.user.password
      );
      const res = await apiGet('/content', auth.accessToken);
      if (res.success && res.data) {
        const items = (res.data as { items?: { id: string; slug: string }[] })
          ?.items;
        if (items && items.length > 0) {
          contentId = items[0].id;
        }
      }
    } catch {
      // Non-fatal
    }
  });

  test('watch page renders for known content', async ({ page }) => {
    if (!contentId) {
      test.skip();
      return;
    }

    await page.goto(`/watch/${contentId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Page should load (not 500 error)
    const title = await page.title();
    expect(title).not.toContain('500');

    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('watch page shows content metadata', async ({ page }) => {
    if (!contentId) {
      test.skip();
      return;
    }

    await page.goto(`/watch/${contentId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();
    // Should have some Russian text describing the content
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });

  test('watch page for non-existent content handles gracefully', async ({ page }) => {
    await page.goto('/watch/non-existent-id-12345');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // The page should not crash with a 500 error — any other behavior is acceptable:
    // - Shows 404 text
    // - Redirects to login or home
    // - Renders an empty/default page
    const title = await page.title();
    expect(title).not.toContain('500');
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
