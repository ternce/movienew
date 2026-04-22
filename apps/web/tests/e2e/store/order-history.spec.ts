import { test, expect, MOCK_ORDERS } from '../fixtures/store.fixture';

test.describe('Order History Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/store/orders');
  });

  test('should display page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Мои заказы' })).toBeVisible();
  });

  test('should display filter tabs', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Все' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Активные' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Доставленные' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Отменённые' })).toBeVisible();
  });

  test('should display order cards', async ({ page }) => {
    for (const order of MOCK_ORDERS) {
      await expect(page.getByText(`#${order.id.slice(0, 8)}`)).toBeVisible();
    }
  });

  test('should display order status badges', async ({ page }) => {
    await expect(page.getByText('Доставлен')).toBeVisible();
    await expect(page.getByText('В обработке')).toBeVisible();
    await expect(page.getByText('Ожидает оплаты')).toBeVisible();
  });

  test('should display order amounts', async ({ page }) => {
    await expect(page.getByText('1 990 ₽').first()).toBeVisible();
  });

  test('should display item counts', async ({ page }) => {
    await expect(page.getByText(/1 товар/).first()).toBeVisible();
  });

  test('should navigate to order detail on click', async ({ page }) => {
    await page.getByText(`#${MOCK_ORDERS[0].id.slice(0, 8)}`).click();
    await expect(page).toHaveURL(`/store/orders/${MOCK_ORDERS[0].id}`);
  });

  test('should switch tabs', async ({ page }) => {
    await page.getByRole('tab', { name: 'Активные' }).click();
    // Tab should be selected
    await expect(page.getByRole('tab', { name: 'Активные' })).toHaveAttribute('data-state', 'active');
  });

  test('should show empty state message', async ({ page }) => {
    await page.route('**/api/v1/store/orders?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: [], total: 0, page: 1, limit: 10 },
        }),
      });
    });
    await page.reload();
    await expect(page.getByText('У вас пока нет заказов')).toBeVisible();
    await expect(page.getByRole('link', { name: /перейти в магазин/i })).toBeVisible();
  });
});
