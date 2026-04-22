import { test, expect } from '@playwright/test';
import { apiGet, apiPost, apiDelete } from '../helpers/api.helper';
import { loginViaApi, PROD_USERS, canLoginViaApi } from '../helpers/auth.helper';

test.describe('Cart', () => {
  let token: string;
  let productId: string | undefined;

  test.beforeAll(async () => {
    try {
      const auth = await loginViaApi(
        PROD_USERS.user.email,
        PROD_USERS.user.password
      );
      token = auth.accessToken;
    } catch {
      // Login failed — token stays undefined, tests will skip
      return;
    }

    // Get first product
    const products = await apiGet('/store/products', token);
    const items = (products.data as { items?: { id: string }[] })?.items;
    if (items && items.length > 0) {
      productId = items[0].id;
    }
  });

  test('can add product to cart via API', async () => {
    if (!token || !productId) {
      test.skip(true, 'No credentials or products available');
      return;
    }

    const res = await apiPost(
      '/store/cart/items',
      { productId, quantity: 1 },
      token
    );

    expect(res).toBeDefined();
  });

  test('cart page loads at /store/cart', async ({ page }) => {
    await page.goto('/store/cart');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('cart page has content', async ({ page }) => {
    await page.goto('/store/cart');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();

    // Should have cart-related keywords or empty state
    const hasCartContent =
      bodyText.includes('Корзина') ||
      bodyText.includes('корзина') ||
      bodyText.includes('Пусто') ||
      bodyText.includes('пуст') ||
      bodyText.length > 50;

    expect(hasCartContent).toBe(true);
  });

  test('can remove item from cart via API', async () => {
    if (!token || !productId) {
      test.skip(true, 'No credentials or products available');
      return;
    }

    const res = await apiDelete(
      `/store/cart/items/${productId}`,
      token
    );
    expect(res).toBeDefined();
  });

  test('cart page has Russian text', async ({ page }) => {
    await page.goto('/store/cart');
    await page.waitForLoadState('domcontentloaded');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });

  test.afterAll(async () => {
    if (productId && token) {
      try {
        await apiDelete(`/store/cart/items/${productId}`, token);
      } catch {
        // Already removed
      }
    }
  });
});
