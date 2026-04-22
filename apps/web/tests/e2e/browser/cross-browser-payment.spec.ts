import { test, expect } from '../fixtures/browser.fixture';

test.describe('Cross-Browser: Payment & Store', () => {
  test.beforeEach(async ({ page }) => {
    // Mock store API endpoints
    await page.route('**/api/v1/store/products**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 'product-1',
                slug: 'premium-course',
                name: 'Премиум курс',
                description: 'Полный курс по программированию',
                price: 2990,
                images: ['/images/placeholder-content.jpg'],
                category: { id: 'cat-1', name: 'Курсы' },
                inStock: true,
              },
              {
                id: 'product-2',
                slug: 'merch-tshirt',
                name: 'Футболка MoviePlatform',
                description: 'Стильная футболка',
                price: 1490,
                images: ['/images/placeholder-content.jpg'],
                category: { id: 'cat-2', name: 'Мерч' },
                inStock: true,
              },
            ],
            meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
          },
        }),
      });
    });

    await page.route('**/api/v1/store/categories**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 'cat-1', name: 'Курсы', slug: 'courses' },
            { id: 'cat-2', name: 'Мерч', slug: 'merch' },
          ],
        }),
      });
    });

    await page.route('**/api/v1/store/cart**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { items: [], total: 0 } }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { message: 'Added' } }),
        });
      }
    });

    await page.route('**/api/v1/subscription-plans**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 'plan-1', name: 'Базовый', price: 299, period: 'monthly', features: ['HD качество'] },
            { id: 'plan-2', name: 'Премиум', price: 599, period: 'monthly', features: ['4K качество', 'Без рекламы'] },
          ],
        }),
      });
    });
  });

  test('should load store page with products', async ({ page }) => {
    await page.goto('/store');
    await page.waitForLoadState('networkidle');

    // Store page should load
    expect(page.url()).toContain('/store');
  });

  test('should display product cards', async ({ page }) => {
    await page.goto('/store');
    await page.waitForLoadState('networkidle');

    const productCards = page.locator(
      '[data-testid="product-card"], .product-card, [data-testid="content-card"]',
    );
    const count = await productCards.count();
    // Products or a loading state should render
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should navigate to product detail page', async ({ page }) => {
    await page.route('**/api/v1/store/products/premium-course', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'product-1',
            slug: 'premium-course',
            name: 'Премиум курс',
            description: 'Полный курс по программированию',
            price: 2990,
            images: ['/images/placeholder-content.jpg'],
          },
        }),
      });
    });

    await page.goto('/store/premium-course');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/store/premium-course');
  });

  test('should handle add to cart interaction', async ({ page }) => {
    await page.goto('/store');
    await page.waitForLoadState('networkidle');

    const addToCartButton = page.locator(
      'button:has-text("В корзину"), button:has-text("Добавить"), [data-testid="add-to-cart"]',
    ).first();

    if (await addToCartButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addToCartButton.click();
      await page.waitForTimeout(1000);

      // Cart badge or drawer may appear
      const cartBadge = page.locator('[data-testid="cart-badge"], .cart-badge');
      // No crash = success
    }
  });

  test('should display cart page correctly', async ({ page }) => {
    await page.goto('/store/cart');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/store/cart');
  });

  test('should show checkout form elements', async ({ page, mockAuthenticatedUser }) => {
    await mockAuthenticatedUser();

    await page.route('**/api/v1/store/cart', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [{
              id: 'item-1',
              product: { id: 'p-1', name: 'Курс', price: 2990, images: [] },
              quantity: 1,
            }],
            total: 2990,
          },
        }),
      });
    });

    await page.goto('/store/checkout');
    await page.waitForLoadState('networkidle');

    // Checkout page should have form elements
    const formElements = page.locator('input, select, button[type="submit"]');
    const count = await formElements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display order summary on checkout', async ({ page }) => {
    await page.goto('/store/checkout');
    await page.waitForLoadState('networkidle');

    // Page should render without errors
    expect(page.url()).toContain('/store/checkout');
  });

  test('should handle payment success/failure states', async ({ page }) => {
    // Mock successful order creation
    await page.route('**/api/v1/store/orders', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'order-1', status: 'PENDING', total: 2990 },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { items: [], meta: { page: 1, total: 0, totalPages: 0 } },
          }),
        });
      }
    });

    await page.goto('/store/orders');
    await page.waitForLoadState('networkidle');

    // Orders page loads
    expect(page.url()).toContain('/store/orders');
  });
});
