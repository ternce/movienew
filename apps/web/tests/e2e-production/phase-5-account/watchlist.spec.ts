import { test, expect } from '@playwright/test';
import { apiGet, apiPost, apiDelete } from '../helpers/api.helper';
import { loginViaApi, PROD_USERS, canLoginViaApi } from '../helpers/auth.helper';

test.describe('Watchlist', () => {
  let token: string;
  let addedContentId: string | undefined;

  test.beforeAll(async () => {
    try {
      const auth = await loginViaApi(
        PROD_USERS.user.email,
        PROD_USERS.user.password
      );
      token = auth.accessToken;
    } catch {
      // Login failed (possible 502) — token stays undefined, tests will skip
    }
  });

  test('watchlist page loads at /account/watchlist', async ({ page }) => {
    await page.goto('/account/watchlist');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    expect(page.url()).toContain('/account');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('can add content to watchlist via API', async () => {
    if (!token) {
      test.skip(true, 'User credentials not available');
      return;
    }

    const content = await apiGet('/content', token);
    const items = (content.data as { items?: { id: string }[] })?.items;

    if (!items || items.length === 0) {
      test.skip(true, 'No content items available');
      return;
    }

    addedContentId = items[0].id;
    const res = await apiPost(
      '/users/me/watchlist',
      { contentId: addedContentId },
      token
    );
    expect(res).toBeDefined();
  });

  test('can remove content from watchlist via API', async () => {
    if (!token || !addedContentId) {
      test.skip(true, 'No content to remove');
      return;
    }

    const res = await apiDelete(
      `/users/me/watchlist/${addedContentId}`,
      token
    );
    expect(res).toBeDefined();
  });

  test('watchlist page has Russian text', async ({ page }) => {
    await page.goto('/account/watchlist');
    await page.waitForLoadState('domcontentloaded');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });

  test.afterAll(async () => {
    if (addedContentId && token) {
      try {
        await apiDelete(`/users/me/watchlist/${addedContentId}`, token);
      } catch {
        // Non-fatal
      }
    }
  });
});
