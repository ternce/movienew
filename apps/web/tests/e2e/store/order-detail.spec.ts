import { test, expect, MOCK_ORDERS } from '../fixtures/store.fixture';

const deliveredOrder = MOCK_ORDERS[0]; // DELIVERED with tracking
const pendingOrder = MOCK_ORDERS[2]; // PENDING, cancellable

test.describe('Order Detail Page — Delivered Order', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/store/orders/${deliveredOrder.id}`);
  });

  test('should display order ID', async ({ page }) => {
    await expect(page.getByText(`#${deliveredOrder.id.slice(0, 8)}`)).toBeVisible();
  });

  test('should display order status badge', async ({ page }) => {
    await expect(page.getByText('Доставлен')).toBeVisible();
  });

  test('should display order date', async ({ page }) => {
    await expect(page.getByText(/2024/)).toBeVisible();
  });

  test('should display breadcrumbs', async ({ page }) => {
    await expect(page.getByText('Магазин').first()).toBeVisible();
    await expect(page.getByText('Мои заказы').first()).toBeVisible();
  });

  test('should display status timeline', async ({ page }) => {
    await expect(page.getByText('Статус заказа')).toBeVisible();
    await expect(page.getByText('Заказ создан')).toBeVisible();
    await expect(page.getByText('Оплачен')).toBeVisible();
  });

  test('should display order items', async ({ page }) => {
    await expect(page.getByText('Товары')).toBeVisible();
    for (const item of deliveredOrder.items) {
      await expect(page.getByText(item.productName)).toBeVisible();
    }
  });

  test('should display shipping address', async ({ page }) => {
    await expect(page.getByText('Адрес доставки')).toBeVisible();
    await expect(page.getByText(deliveredOrder.shippingAddress.fullName)).toBeVisible();
    await expect(page.getByText(deliveredOrder.shippingAddress.phone)).toBeVisible();
    await expect(page.getByText(deliveredOrder.shippingAddress.city)).toBeVisible();
  });

  test('should display tracking number', async ({ page }) => {
    await expect(page.getByText('Отслеживание')).toBeVisible();
    await expect(page.getByText(deliveredOrder.trackingNumber!)).toBeVisible();
  });

  test('should have copy tracking button', async ({ page }) => {
    const copyBtn = page.getByRole('button').filter({ has: page.locator('[class*="copy"], [class*="Copy"]') });
    await expect(copyBtn.first()).toBeVisible();
  });

  test('should display payment summary', async ({ page }) => {
    await expect(page.getByText('Оплата')).toBeVisible();
    await expect(page.getByText('Оплачено')).toBeVisible();
    await expect(page.getByText('1 990 ₽').first()).toBeVisible();
  });

  test('should not show cancel button for delivered order', async ({ page }) => {
    await expect(page.getByRole('button', { name: /отменить заказ/i })).not.toBeVisible();
  });
});

test.describe('Order Detail Page — Pending Order (Cancellable)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/store/orders/${pendingOrder.id}`);
  });

  test('should display pending status', async ({ page }) => {
    await expect(page.getByText('Ожидает оплаты')).toBeVisible();
  });

  test('should show cancel button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /отменить заказ/i })).toBeVisible();
  });

  test('should open cancel confirmation dialog', async ({ page }) => {
    await page.getByRole('button', { name: /отменить заказ/i }).click();
    await expect(page.getByText('Отменить заказ?')).toBeVisible();
    await expect(page.getByText(/вы уверены/i)).toBeVisible();
  });

  test('should have confirm and cancel buttons in dialog', async ({ page }) => {
    await page.getByRole('button', { name: /отменить заказ/i }).click();
    await expect(page.getByRole('button', { name: /да, отменить/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /нет, оставить/i })).toBeVisible();
  });

  test('should close dialog on cancel', async ({ page }) => {
    await page.getByRole('button', { name: /отменить заказ/i }).click();
    await page.getByRole('button', { name: /нет, оставить/i }).click();
    await expect(page.getByText('Отменить заказ?')).not.toBeVisible();
  });

  test('should not display tracking for pending order', async ({ page }) => {
    await expect(page.getByText('Отслеживание')).not.toBeVisible();
  });
});

test.describe('Order Detail — Back Navigation', () => {
  test('should have back to orders link', async ({ page }) => {
    await page.goto(`/store/orders/${deliveredOrder.id}`);
    await expect(page.getByRole('link', { name: /назад к заказам/i })).toBeVisible();
  });
});
