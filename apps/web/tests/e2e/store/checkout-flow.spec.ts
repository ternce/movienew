import { test, expect, MOCK_CART } from '../fixtures/store.fixture';

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/store/checkout');
  });

  test('should display checkout heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /оформление заказа/i })).toBeVisible();
  });

  test('should display step indicator', async ({ page }) => {
    await expect(page.getByText('Доставка')).toBeVisible();
    await expect(page.getByText('Оплата')).toBeVisible();
    await expect(page.getByText('Подтверждение')).toBeVisible();
  });

  test('should start on shipping step', async ({ page }) => {
    await expect(page.getByText('Адрес доставки')).toBeVisible();
  });

  test('should display shipping form fields', async ({ page }) => {
    await expect(page.getByLabel('ФИО получателя')).toBeVisible();
    await expect(page.getByLabel('Телефон')).toBeVisible();
    await expect(page.getByLabel('Индекс')).toBeVisible();
    await expect(page.getByLabel('Город')).toBeVisible();
    await expect(page.getByLabel('Адрес')).toBeVisible();
  });

  test('should display optional instructions field', async ({ page }) => {
    await expect(page.getByLabel(/комментарий к доставке/i)).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: /продолжить к оплате/i }).click();
    await expect(page.getByText(/укажите фио/i)).toBeVisible();
  });

  test('should validate phone format', async ({ page }) => {
    await page.getByLabel('Телефон').fill('12345');
    await page.getByRole('button', { name: /продолжить к оплате/i }).click();
    await expect(page.getByText(/формат/i)).toBeVisible();
  });

  test('should validate postal code format', async ({ page }) => {
    await page.getByLabel('Индекс').fill('abc');
    await page.getByRole('button', { name: /продолжить к оплате/i }).click();
    await expect(page.getByText(/6 цифр/i)).toBeVisible();
  });

  test('should proceed to payment step after valid shipping', async ({ page }) => {
    await page.getByLabel('ФИО получателя').fill('Тест Пользователь');
    await page.getByLabel('Телефон').fill('+71234567890');
    await page.getByLabel('Индекс').fill('123456');
    await page.getByLabel('Город').fill('Москва');
    await page.getByLabel('Адрес').fill('ул. Тестовая, д. 1');
    await page.getByRole('button', { name: /продолжить к оплате/i }).click();

    await expect(page.getByText('Способ оплаты')).toBeVisible();
  });

  test('should display payment methods on payment step', async ({ page }) => {
    // Fill shipping
    await page.getByLabel('ФИО получателя').fill('Тест Пользователь');
    await page.getByLabel('Телефон').fill('+71234567890');
    await page.getByLabel('Индекс').fill('123456');
    await page.getByLabel('Город').fill('Москва');
    await page.getByLabel('Адрес').fill('ул. Тестовая, д. 1');
    await page.getByRole('button', { name: /продолжить к оплате/i }).click();

    await expect(page.getByText('Банковская карта')).toBeVisible();
    await expect(page.getByText('СБП')).toBeVisible();
  });

  test('should have back button on payment step', async ({ page }) => {
    await page.getByLabel('ФИО получателя').fill('Тест Пользователь');
    await page.getByLabel('Телефон').fill('+71234567890');
    await page.getByLabel('Индекс').fill('123456');
    await page.getByLabel('Город').fill('Москва');
    await page.getByLabel('Адрес').fill('ул. Тестовая, д. 1');
    await page.getByRole('button', { name: /продолжить к оплате/i }).click();

    const backBtn = page.getByRole('button', { name: /назад/i });
    await expect(backBtn).toBeVisible();
  });

  test('should display order summary sidebar', async ({ page }) => {
    await expect(page.getByText('Ваш заказ')).toBeVisible();
  });

  test('should display cart items in sidebar summary', async ({ page }) => {
    for (const item of MOCK_CART.items) {
      await expect(page.getByText(item.productName).first()).toBeVisible();
    }
  });

  test('should display total amount in sidebar', async ({ page }) => {
    await expect(page.getByText('4 670 ₽').first()).toBeVisible();
  });

  test('should display security badges', async ({ page }) => {
    await expect(page.getByText('Безопасная оплата')).toBeVisible();
    await expect(page.getByText('Защита данных')).toBeVisible();
  });

  test('should navigate full checkout flow and show success', async ({ page }) => {
    // Step 1: Shipping
    await page.getByLabel('ФИО получателя').fill('Тест Пользователь');
    await page.getByLabel('Телефон').fill('+71234567890');
    await page.getByLabel('Индекс').fill('123456');
    await page.getByLabel('Город').fill('Москва');
    await page.getByLabel('Адрес').fill('ул. Тестовая, д. 1');
    await page.getByRole('button', { name: /продолжить к оплате/i }).click();

    // Step 2: Payment — click continue
    await page.getByRole('button', { name: /продолжить/i }).last().click();

    // Step 3: Review — shows shipping address summary
    await expect(page.getByText('Тест Пользователь').first()).toBeVisible();
    await expect(page.getByText('+71234567890')).toBeVisible();

    // Place order
    await page.getByRole('button', { name: /оформить заказ/i }).click();

    // Step 5: Complete
    await expect(page.getByText('Заказ оформлен!')).toBeVisible();
    await expect(page.getByRole('link', { name: /перейти к заказам/i })).toBeVisible();
  });

  test('should have back to cart link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /назад к корзине/i })).toBeVisible();
  });
});
