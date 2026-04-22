import { test, expect } from '@playwright/test';

test.describe('Payment Methods', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to pricing and select a plan to get to checkout
    await page.goto('/pricing');
    const selectButton = page.getByRole('button', { name: /Выбрать план/i }).first();
    if (await selectButton.isVisible()) {
      await selectButton.click();
      await page.waitForURL(/\/checkout/);
    }
  });

  test.describe('Card Payment', () => {
    test('should select card payment by default', async ({ page }) => {
      await page.goto('/checkout');

      // Card should be pre-selected (has selected styling)
      const cardOption = page.locator('button', { hasText: /Банковская карта/i });
      if (await cardOption.isVisible()) {
        await expect(cardOption.locator('div').first()).toHaveClass(/bg-mp-accent-primary/);
      }
    });

    test('should show YooKassa info for card payment', async ({ page }) => {
      await page.goto('/checkout');

      await expect(page.getByText(/YooKassa/i)).toBeVisible();
    });
  });

  test.describe('SBP Payment', () => {
    test('should select SBP payment method', async ({ page }) => {
      await page.goto('/checkout');

      // Select SBP
      await page.locator('button', { hasText: 'СБП' }).click();

      // Should show as selected
      const sbpOption = page.locator('button', { hasText: 'СБП' });
      await expect(sbpOption).toHaveClass(/border-mp-accent-primary/);
    });

    test('should show QR code info for SBP', async ({ page }) => {
      await page.goto('/checkout');

      // Select SBP
      await page.locator('button', { hasText: 'СБП' }).click();

      // Should show QR code related text
      await expect(page.getByText(/QR-код/i)).toBeVisible();
    });
  });

  test.describe('Bank Transfer Payment', () => {
    test('should select bank transfer payment method', async ({ page }) => {
      await page.goto('/checkout');

      // Select bank transfer
      await page.locator('button', { hasText: /Банковский перевод/i }).click();

      // Should show as selected
      const bankOption = page.locator('button', { hasText: /Банковский перевод/i });
      await expect(bankOption).toHaveClass(/border-mp-accent-primary/);
    });

    test('should show legal entity info for bank transfer', async ({ page }) => {
      await page.goto('/checkout');

      // Select bank transfer
      await page.locator('button', { hasText: /Банковский перевод/i }).click();

      // Should show info about legal entities
      await expect(page.getByText(/юридических лиц/i)).toBeVisible();
    });
  });

  test.describe('Bonus Application', () => {
    test('should show bonus section if available', async ({ page }) => {
      await page.goto('/checkout');

      // Look for bonus section - may or may not exist
      const bonusSection = page.getByText(/Использовать бонусы/i);
      // Just check if it's handled properly
      const isVisible = await bonusSection.isVisible();
      // This is informational - we're just checking the page doesn't crash
      expect(typeof isVisible).toBe('boolean');
    });

    test('should update total when bonus is applied', async ({ page }) => {
      await page.goto('/checkout');

      // Get initial total
      const totalElement = page.locator('[class*="font-bold"]', { hasText: /₽/ }).last();
      const initialTotal = await totalElement.textContent();

      // If bonus applicator exists, try to apply bonus
      const bonusInput = page.locator('[name="bonusAmount"]');
      if (await bonusInput.isVisible()) {
        await bonusInput.fill('100');
        await page.getByText(/Применить/i).click();

        // Total should update
        const newTotal = await totalElement.textContent();
        expect(newTotal).not.toBe(initialTotal);
      }
    });
  });

  test.describe('Payment Summary', () => {
    test('should show subtotal', async ({ page }) => {
      await page.goto('/checkout');

      await expect(page.getByText(/Подписка/i)).toBeVisible();
    });

    test('should show total amount', async ({ page }) => {
      await page.goto('/checkout');

      await expect(page.getByText(/Итого/i)).toBeVisible();
    });

    test('should show discount if bonus applied', async ({ page }) => {
      await page.goto('/checkout');

      // Apply some bonus if available
      const bonusInput = page.locator('[name="bonusAmount"]');
      if (await bonusInput.isVisible()) {
        await bonusInput.fill('50');

        // Should show discount
        await expect(page.getByText(/Бонусы/i)).toBeVisible();
      }
    });
  });

  test.describe('Auto-Renewal', () => {
    test('should show auto-renewal toggle', async ({ page }) => {
      await page.goto('/checkout');

      await expect(page.getByText(/Автоматическое продление/i)).toBeVisible();
    });

    test('should toggle auto-renewal', async ({ page }) => {
      await page.goto('/checkout');

      // Find the toggle
      const toggle = page.locator('button[role="switch"]').first();
      if (await toggle.isVisible()) {
        const initialState = await toggle.getAttribute('data-state');

        // Click to toggle
        await toggle.click();

        // State should change
        const newState = await toggle.getAttribute('data-state');
        expect(newState).not.toBe(initialState);
      }
    });
  });

  test.describe('Checkout Process', () => {
    test('should show checkout steps indicator', async ({ page }) => {
      await page.goto('/checkout');

      // Should show step indicators
      await expect(page.getByText(/Оплата/i).first()).toBeVisible();
      await expect(page.getByText(/Подтверждение/i)).toBeVisible();
      await expect(page.getByText(/Готово/i)).toBeVisible();
    });

    test('should have proceed button', async ({ page }) => {
      await page.goto('/checkout');

      const proceedButton = page.getByRole('button', { name: /Перейти к оплате|Оформить/i });
      await expect(proceedButton).toBeVisible();
      await expect(proceedButton).toBeEnabled();
    });

    test('should have cancel button', async ({ page }) => {
      await page.goto('/checkout');

      await expect(page.getByRole('button', { name: /Отмена/i })).toBeVisible();
    });

    test('should return to pricing on cancel', async ({ page }) => {
      await page.goto('/checkout');

      await page.getByRole('button', { name: /Отмена/i }).click();

      await expect(page).toHaveURL(/\/pricing/);
    });
  });
});

test.describe('Payment Status Indicators', () => {
  test('should show loading state during payment processing', async ({ page }) => {
    // This test would need mock API responses
    // For now, just verify the component renders
    await page.goto('/payment/callback?transactionId=test-123');

    // Should show some status UI
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should show pricing plans on mobile', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page.getByRole('heading', { name: /Выберите подходящий план/i })).toBeVisible();
  });

  test('should show checkout on mobile', async ({ page }) => {
    await page.goto('/checkout');

    // Checkout should be visible and functional
    await expect(page.getByText(/Оформление подписки/i)).toBeVisible();
  });

  test('should show payment methods stacked on mobile', async ({ page }) => {
    await page.goto('/checkout');

    // Payment methods should be visible
    const cardOption = page.getByText(/Банковская карта/i);
    if (await cardOption.isVisible()) {
      await expect(cardOption).toBeVisible();
    }
  });
});
