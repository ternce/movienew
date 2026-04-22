import { test, expect, MOCK_PRODUCTS, MOCK_CATEGORIES } from '../fixtures/store.fixture';

test.describe('Store Listing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/store');
  });

  test('should display page title and product count', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Магазин' })).toBeVisible();
    await expect(page.getByText(/\d+ товар/)).toBeVisible();
  });

  test('should display product grid with all products', async ({ page }) => {
    for (const product of MOCK_PRODUCTS) {
      await expect(page.getByText(product.name)).toBeVisible();
    }
  });

  test('should display product prices', async ({ page }) => {
    await expect(page.getByText('1 990 ₽').first()).toBeVisible();
  });

  test('should display bonus prices when available', async ({ page }) => {
    await expect(page.getByText(/бонусов/).first()).toBeVisible();
  });

  test('should display in stock badges', async ({ page }) => {
    await expect(page.getByText('В наличии').first()).toBeVisible();
  });

  test('should display out of stock badge', async ({ page }) => {
    await expect(page.getByText('Нет в наличии')).toBeVisible();
  });

  test('should have sort dropdown', async ({ page }) => {
    await expect(page.getByText('Сначала новые')).toBeVisible();
  });

  test('should toggle filters sidebar', async ({ page }) => {
    const filtersButton = page.getByRole('button', { name: /фильтры/i });
    await expect(filtersButton).toBeVisible();
    await filtersButton.click();
    await expect(page.getByText('Категории')).toBeVisible();
  });

  test('should display category filters when sidebar is open', async ({ page }) => {
    await page.getByRole('button', { name: /фильтры/i }).click();
    for (const cat of MOCK_CATEGORIES) {
      await expect(page.getByText(cat.name)).toBeVisible();
    }
  });

  test('should display price range filter', async ({ page }) => {
    await page.getByRole('button', { name: /фильтры/i }).click();
    await expect(page.getByText('Цена')).toBeVisible();
    await expect(page.getByPlaceholder('от')).toBeVisible();
    await expect(page.getByPlaceholder('до')).toBeVisible();
  });

  test('should display in-stock toggle', async ({ page }) => {
    await page.getByRole('button', { name: /фильтры/i }).click();
    await expect(page.getByText('Только в наличии')).toBeVisible();
  });

  test('should have search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/поиск товаров/i).first()).toBeVisible();
  });

  test('should show empty state when no products match', async ({ page, mockApi: _ }) => {
    await page.route('**/api/v1/store/products?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: [], total: 0, page: 1, limit: 12 },
        }),
      });
    });
    await page.reload();
    await expect(page.getByText('Товары не найдены')).toBeVisible();
  });

  test('should navigate to product detail on click', async ({ page }) => {
    await page.getByText(MOCK_PRODUCTS[0].name).click();
    await expect(page).toHaveURL(`/store/${MOCK_PRODUCTS[0].slug}`);
  });
});
