import { test, expect, MOCK_PRODUCTS } from '../fixtures/store.fixture';

const product = MOCK_PRODUCTS[0]; // Футболка — in stock, has images

test.describe('Product Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/store/${product.slug}`);
  });

  test('should display product name', async ({ page }) => {
    await expect(page.getByRole('heading', { name: product.name })).toBeVisible();
  });

  test('should display breadcrumbs', async ({ page }) => {
    await expect(page.getByText('Магазин').first()).toBeVisible();
    await expect(page.getByText(product.category.name)).toBeVisible();
  });

  test('should display product price', async ({ page }) => {
    await expect(page.getByText('1 990 ₽').first()).toBeVisible();
  });

  test('should display bonus price', async ({ page }) => {
    await expect(page.getByText(/3 000 бонусов/)).toBeVisible();
  });

  test('should display stock status', async ({ page }) => {
    await expect(page.getByText(/В наличии/)).toBeVisible();
  });

  test('should display description', async ({ page }) => {
    await expect(page.getByText(product.description)).toBeVisible();
  });

  test('should display category badge', async ({ page }) => {
    await expect(page.getByText(product.category.name)).toBeVisible();
  });

  test('should have quantity selector', async ({ page }) => {
    // Default quantity is 1
    await expect(page.getByText('1', { exact: true }).first()).toBeVisible();
  });

  test('should increment quantity', async ({ page }) => {
    await page.getByLabel('Увеличить').click();
    await expect(page.getByText('2', { exact: true }).first()).toBeVisible();
  });

  test('should have add to cart button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /добавить в корзину/i })).toBeVisible();
  });

  test('should display related products section', async ({ page }) => {
    await expect(page.getByText('Похожие товары')).toBeVisible();
  });

  test('should show 404 for non-existent product', async ({ page }) => {
    await page.goto('/store/non-existent-slug');
    await expect(page.getByText('Товар не найден')).toBeVisible();
  });
});

test.describe('Product Detail - Out of Stock', () => {
  const outOfStockProduct = MOCK_PRODUCTS[2]; // Постер — out of stock

  test('should not show add to cart button for out of stock product', async ({ page }) => {
    await page.goto(`/store/${outOfStockProduct.slug}`);
    await expect(page.getByText(/Нет в наличии/)).toBeVisible();
    await expect(page.getByRole('button', { name: /добавить в корзину/i })).not.toBeVisible();
  });
});
