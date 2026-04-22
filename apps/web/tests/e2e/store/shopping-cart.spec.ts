import { test, expect, MOCK_CART, MOCK_CART_SUMMARY } from '../fixtures/store.fixture';

test.describe('Cart Drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/store');
  });

  test('should display cart badge with item count in header', async ({ page }) => {
    await expect(page.getByLabel(/корзина/i).first()).toBeVisible();
  });

  test('should open cart drawer on badge click', async ({ page }) => {
    await page.getByLabel(/корзина/i).first().click();
    await expect(page.getByRole('heading', { name: /корзина/i })).toBeVisible();
  });

  test('should display cart items in drawer', async ({ page }) => {
    await page.getByLabel(/корзина/i).first().click();
    for (const item of MOCK_CART.items) {
      await expect(page.getByText(item.productName)).toBeVisible();
    }
  });

  test('should display total amount in drawer', async ({ page }) => {
    await page.getByLabel(/корзина/i).first().click();
    await expect(page.getByText('4 670 ₽')).toBeVisible();
  });

  test('should have checkout CTA in drawer', async ({ page }) => {
    await page.getByLabel(/корзина/i).first().click();
    await expect(page.getByRole('link', { name: /оформить заказ/i })).toBeVisible();
  });

  test('should have clear cart button in drawer', async ({ page }) => {
    await page.getByLabel(/корзина/i).first().click();
    await expect(page.getByRole('button', { name: /очистить корзину/i })).toBeVisible();
  });
});

test.describe('Cart Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/store/cart');
  });

  test('should display page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Корзина' })).toBeVisible();
  });

  test('should display cart items', async ({ page }) => {
    for (const item of MOCK_CART.items) {
      await expect(page.getByText(item.productName)).toBeVisible();
    }
  });

  test('should display item prices', async ({ page }) => {
    await expect(page.getByText('3 980 ₽').first()).toBeVisible(); // 1990 * 2
  });

  test('should display quantity controls', async ({ page }) => {
    const increment = page.getByLabel('Увеличить количество').first();
    const decrement = page.getByLabel('Уменьшить количество').first();
    await expect(increment).toBeVisible();
    await expect(decrement).toBeVisible();
  });

  test('should display remove buttons', async ({ page }) => {
    await expect(page.getByLabel('Удалить из корзины').first()).toBeVisible();
  });

  test('should display order summary with total', async ({ page }) => {
    await expect(page.getByText('Итого').first()).toBeVisible();
    await expect(page.getByText('4 670 ₽').first()).toBeVisible();
  });

  test('should have checkout button', async ({ page }) => {
    await expect(page.getByRole('link', { name: /оформить заказ/i })).toBeVisible();
  });

  test('should have continue shopping link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /продолжить покупки/i })).toBeVisible();
  });

  test('should have back to store link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /назад в магазин/i })).toBeVisible();
  });

  test('should have clear cart button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /очистить корзину/i })).toBeVisible();
  });
});

test.describe('Empty Cart', () => {
  test('should display empty state', async ({ page }) => {
    await page.route('**/api/v1/store/cart', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { items: [], itemCount: 0, totalQuantity: 0, totalAmount: 0, maxBonusApplicable: 0 },
          }),
        });
      } else {
        await route.fallback();
      }
    });
    await page.goto('/store/cart');
    await expect(page.getByText('Корзина пуста')).toBeVisible();
    await expect(page.getByRole('link', { name: /перейти в магазин/i })).toBeVisible();
  });
});
