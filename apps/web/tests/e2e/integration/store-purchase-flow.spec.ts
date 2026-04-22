import { test, expect } from '../fixtures/integration.fixture';
import { injectAuthState, mockCommonApi } from '../fixtures/integration.fixture';

const MOCK_STORE_PRODUCT = {
  id: 'prod-1',
  name: 'Футболка MoviePlatform',
  slug: 'futbolka-movieplatform',
  description: 'Стильная футболка с логотипом',
  category: { id: 'cat-1', name: 'Мерч', slug: 'merch', order: 1 },
  price: 2490,
  bonusPrice: 1990,
  allowsPartialBonus: true,
  stockQuantity: 50,
  inStock: true,
  images: ['https://picsum.photos/400/400'],
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
};

const MOCK_CART = {
  items: [
    { id: 'ci-1', product: MOCK_STORE_PRODUCT, quantity: 1, price: 2490 },
  ],
  total: 2490,
  itemCount: 1,
};

test.describe('Store Purchase Flow', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await mockCommonApi(page);

    // Mock products list
    await page.route('**/api/v1/store/products?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [MOCK_STORE_PRODUCT],
          total: 1,
          page: 1,
          limit: 20,
        }),
      });
    });

    await page.route('**/api/v1/store/products', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [MOCK_STORE_PRODUCT],
            total: 1,
            page: 1,
            limit: 20,
          }),
        });
      } else {
        await route.fallback();
      }
    });

    // Mock product by slug
    await page.route('**/api/v1/store/products/slug/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_STORE_PRODUCT),
      });
    });

    // Mock categories
    await page.route('**/api/v1/store/products/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'cat-1', name: 'Мерч', slug: 'merch', order: 1 },
        ]),
      });
    });

    // Mock cart
    await page.route('**/api/v1/store/cart', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_CART }),
        });
      } else {
        await route.fallback();
      }
    });

    // Mock cart summary
    await page.route('**/api/v1/store/cart/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { total: 2490, itemCount: 1 } }),
      });
    });

    // Mock add to cart
    await page.route('**/api/v1/store/cart/items', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_CART }),
        });
      } else {
        await route.fallback();
      }
    });

    // Mock orders
    await page.route('**/api/v1/store/orders', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              status: 'COMPLETED',
              orderId: 'order-1',
              transactionId: 'tx-store-1',
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: [{
                id: 'order-1',
                status: 'PROCESSING',
                total: 2490,
                items: [{ product: MOCK_STORE_PRODUCT, quantity: 1, price: 2490 }],
                createdAt: new Date().toISOString(),
              }],
              total: 1,
              page: 1,
              limit: 20,
            },
          }),
        });
      }
    });

    // Mock bonus balance
    await page.route('**/api/v1/bonuses/balance', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { balance: 500, pending: 0 } }),
      });
    });

    // Mock bonus max-applicable
    await page.route('**/api/v1/bonuses/max-applicable*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { maxApplicable: 200 } }),
      });
    });
  });

  test('browse store products', async ({ page }) => {
    await page.goto('/store');
    await expect(page.getByText('Футболка MoviePlatform').first()).toBeVisible({ timeout: 10000 });
  });

  test('view product detail page', async ({ page }) => {
    await page.goto('/store/futbolka-movieplatform');
    await expect(page.getByText('Футболка MoviePlatform').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('2 490').first()).toBeVisible();
  });

  test('navigate to cart page', async ({ page }) => {
    await page.goto('/store/cart');
    await expect(page.getByText(/футболка|корзина/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('view orders after purchase', async ({ page }) => {
    await page.goto('/store/orders');
    await expect(page.getByText(/заказ|order/i).first()).toBeVisible({ timeout: 10000 });
  });
});
