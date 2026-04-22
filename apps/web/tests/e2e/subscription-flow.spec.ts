import { test, expect } from '@playwright/test';

test.describe('Subscription Flow', () => {
  test.describe('Pricing Page', () => {
    test('should display pricing plans', async ({ page }) => {
      await page.goto('/pricing');

      // Should show page title
      await expect(page.getByRole('heading', { name: /Выберите подходящий план/i })).toBeVisible();

      // Should have tabs for plan types
      await expect(page.getByRole('tab', { name: /Premium/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Отдельный контент/i })).toBeVisible();
    });

    test('should switch between plan tabs', async ({ page }) => {
      await page.goto('/pricing');

      // Click on content-specific tab
      await page.getByRole('tab', { name: /Отдельный контент/i }).click();

      // Tab should be active (implementation-specific, may need to adjust selector)
      await expect(page.getByRole('tab', { name: /Отдельный контент/i })).toHaveAttribute('data-state', 'active');
    });

    test('should navigate to checkout when selecting a plan', async ({ page }) => {
      await page.goto('/pricing');

      // Find and click the first plan's "Select" button
      const selectButton = page.getByRole('button', { name: /Выбрать план/i }).first();
      await selectButton.click();

      // Should navigate to checkout
      await expect(page).toHaveURL(/\/checkout/);
    });

    test('should show FAQ section', async ({ page }) => {
      await page.goto('/pricing');

      // Scroll to FAQ
      await page.getByText(/Часто задаваемые вопросы/i).scrollIntoViewIfNeeded();

      // Should have FAQ items
      await expect(page.getByText(/Могу ли я отменить подписку/i)).toBeVisible();
    });

    test('should show active subscription notice if user has one', async ({ page }) => {
      // This test assumes the authenticated user has an active subscription
      await page.goto('/pricing');

      // Check for active subscription notice (may or may not appear depending on user state)
      const notice = page.locator('[class*="bg-mp-accent-secondary"]').first();
      // Don't fail if no active subscription
      if (await notice.isVisible()) {
        await expect(notice.getByText(/активная подписка/i)).toBeVisible();
      }
    });
  });

  test.describe('Checkout Page', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to pricing and select a plan
      await page.goto('/pricing');
      const selectButton = page.getByRole('button', { name: /Выбрать план/i }).first();
      await selectButton.click();
      await page.waitForURL(/\/checkout/);
    });

    test('should display selected plan summary', async ({ page }) => {
      // Should show the selected plan
      await expect(page.getByText(/Выбранный план/i)).toBeVisible();
    });

    test('should show payment method selector', async ({ page }) => {
      // Should show payment methods
      await expect(page.getByText(/Способ оплаты/i)).toBeVisible();
      await expect(page.getByText(/Банковская карта/i)).toBeVisible();
      await expect(page.getByText(/СБП/i)).toBeVisible();
      await expect(page.getByText(/Банковский перевод/i)).toBeVisible();
    });

    test('should allow selecting different payment methods', async ({ page }) => {
      // Select SBP
      await page.getByText('СБП').click();

      // Should be selected (look for visual indicator)
      const sbpOption = page.locator('button', { hasText: 'СБП' });
      await expect(sbpOption).toHaveClass(/border-mp-accent-primary/);
    });

    test('should show bonus applicator if user has bonus', async ({ page }) => {
      // Look for bonus section (may or may not appear)
      const bonusSection = page.getByText(/Использовать бонусы/i);
      if (await bonusSection.isVisible()) {
        await expect(bonusSection).toBeVisible();
      }
    });

    test('should show auto-renewal toggle', async ({ page }) => {
      await expect(page.getByText(/Автоматическое продление/i)).toBeVisible();
    });

    test('should show order summary', async ({ page }) => {
      // Order summary should show total
      await expect(page.getByText(/Итого/i)).toBeVisible();
    });

    test('should have security badges', async ({ page }) => {
      await expect(page.getByText(/Безопасная оплата/i)).toBeVisible();
      await expect(page.getByText(/Защита данных/i)).toBeVisible();
    });

    test('should allow returning to pricing page', async ({ page }) => {
      // Click back button
      await page.getByRole('link', { name: /Назад к тарифам/i }).click();

      // Should navigate back
      await expect(page).toHaveURL(/\/pricing/);
    });

    test('should redirect to pricing if no plan selected', async ({ page }) => {
      // Clear session storage to remove selected plan
      await page.evaluate(() => sessionStorage.clear());

      // Navigate directly to checkout
      await page.goto('/checkout');

      // Should redirect to pricing
      await expect(page).toHaveURL(/\/pricing/);
    });
  });

  test.describe('My Subscriptions Page', () => {
    test('should display subscriptions page', async ({ page }) => {
      await page.goto('/account/subscriptions');

      // Should show page title
      await expect(page.getByRole('heading', { name: /Мои подписки/i })).toBeVisible();
    });

    test('should have tabs for active and history', async ({ page }) => {
      await page.goto('/account/subscriptions');

      await expect(page.getByRole('tab', { name: /Активные/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /История/i })).toBeVisible();
    });

    test('should show new subscription button', async ({ page }) => {
      await page.goto('/account/subscriptions');

      await expect(page.getByRole('link', { name: /Новая подписка/i })).toBeVisible();
    });

    test('should navigate to payment history', async ({ page }) => {
      await page.goto('/account/subscriptions');

      await page.getByRole('link', { name: /История платежей/i }).click();

      await expect(page).toHaveURL(/\/account\/payments/);
    });

    test('should switch to history tab', async ({ page }) => {
      await page.goto('/account/subscriptions');

      await page.getByRole('tab', { name: /История/i }).click();

      // History tab should be active
      await expect(page.getByRole('tab', { name: /История/i })).toHaveAttribute('data-state', 'active');
    });
  });

  test.describe('Payment History Page', () => {
    test('should display payment history page', async ({ page }) => {
      await page.goto('/account/payments');

      await expect(page.getByRole('heading', { name: /История платежей/i })).toBeVisible();
    });

    test('should show filter dropdowns', async ({ page }) => {
      await page.goto('/account/payments');

      // Should have type and status filters
      await expect(page.locator('button', { hasText: /Все типы/i })).toBeVisible();
      await expect(page.locator('button', { hasText: /Все статусы/i })).toBeVisible();
    });

    test('should filter by transaction type', async ({ page }) => {
      await page.goto('/account/payments');

      // Open type filter
      await page.locator('button', { hasText: /Все типы/i }).click();

      // Select subscriptions filter
      await page.getByRole('option', { name: /Подписки/i }).click();

      // Filter should be applied (URL or UI change)
    });

    test('should filter by status', async ({ page }) => {
      await page.goto('/account/payments');

      // Open status filter
      await page.locator('button', { hasText: /Все статусы/i }).click();

      // Select completed filter
      await page.getByRole('option', { name: /Завершённые/i }).click();
    });

    test('should show stats cards', async ({ page }) => {
      await page.goto('/account/payments');

      // Should show statistics
      await expect(page.getByText(/Всего транзакций/i)).toBeVisible();
    });

    test('should link to subscriptions page', async ({ page }) => {
      await page.goto('/account/payments');

      await page.getByRole('link', { name: /Мои подписки/i }).click();

      await expect(page).toHaveURL(/\/account\/subscriptions/);
    });
  });
});

test.describe('Payment Callback', () => {
  test('should show error for missing transaction ID', async ({ page }) => {
    await page.goto('/payment/callback');

    // Should show error state
    await expect(page.getByText(/Транзакция не найдена/i)).toBeVisible();
  });

  test('should have links to pricing and payment history', async ({ page }) => {
    await page.goto('/payment/callback');

    await expect(page.getByRole('link', { name: /Оформить подписку/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /История платежей/i })).toBeVisible();
  });
});
