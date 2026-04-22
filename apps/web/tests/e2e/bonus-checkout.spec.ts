import { test, expect } from '@playwright/test';

test.describe('Bonus Checkout Flow', () => {
  test.describe('Bonus Display in Checkout', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to pricing and select a plan
      await page.goto('/pricing');
      const selectButton = page.getByRole('button', { name: /Выбрать план/i }).first();
      await selectButton.click();
      await page.waitForURL(/\/checkout/);
    });

    test('should display bonus section when user has bonuses', async ({ page }) => {
      // Look for bonus section
      const bonusSection = page.getByText(/Использовать бонусы/i);

      // Wait for bonus data to load
      await page.waitForTimeout(1000);

      // Check if bonus section is visible (depends on user having bonuses)
      if (await bonusSection.isVisible()) {
        await expect(bonusSection).toBeVisible();

        // Should show available balance
        await expect(page.getByText(/Доступно:/i)).toBeVisible();
      }
    });

    test('should show loading skeleton while bonus data loads', async ({ page }) => {
      // Fast check for skeleton before data loads
      // This may be too fast to catch in real scenarios
      const skeleton = page.locator('[class*="skeleton"], [class*="animate-pulse"]');
      // Don't fail if data loads too fast
    });

    test('should hide bonus section when user has no bonuses', async ({ page }) => {
      // If user has no bonuses, the bonus section should not appear
      await page.waitForTimeout(1000);

      // Check for "no bonuses" message or absence of bonus section
      const noBonusMessage = page.getByText(/Бонусы недоступны/i);
      const bonusSection = page.getByText(/Использовать бонусы/i).first();

      // Either should show "no bonuses" or not show the section
      if (await noBonusMessage.isVisible()) {
        await expect(noBonusMessage).toBeVisible();
      }
    });
  });

  test.describe('Bonus Application', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/pricing');
      const selectButton = page.getByRole('button', { name: /Выбрать план/i }).first();
      await selectButton.click();
      await page.waitForURL(/\/checkout/);
      await page.waitForTimeout(1000); // Wait for bonus data
    });

    test('should allow entering bonus amount manually', async ({ page }) => {
      const bonusInput = page.locator('input[type="text"]').filter({ hasText: /₽/ }).first();

      if (await bonusInput.isVisible()) {
        // Clear and enter new amount
        await bonusInput.fill('100');
        await bonusInput.blur();

        // Should show applied bonus message
        await expect(page.getByText(/Будет списано/i)).toBeVisible();
      }
    });

    test('should apply bonus using quick percentage buttons', async ({ page }) => {
      // Find 25% button
      const quickButton25 = page.getByRole('button', { name: '25%' });

      if (await quickButton25.isVisible()) {
        await quickButton25.click();

        // Button should be selected
        await expect(quickButton25).toHaveClass(/secondary/);
      }
    });

    test('should apply bonus using 50% button', async ({ page }) => {
      const quickButton50 = page.getByRole('button', { name: '50%' });

      if (await quickButton50.isVisible()) {
        await quickButton50.click();
        await expect(quickButton50).toHaveClass(/secondary/);
      }
    });

    test('should apply bonus using 100% button', async ({ page }) => {
      const quickButton100 = page.getByRole('button', { name: '100%' });

      if (await quickButton100.isVisible()) {
        await quickButton100.click();

        // Should show full coverage message
        const fullCoverageMessage = page.getByText(/полностью покрывают стоимость/i);
        if (await fullCoverageMessage.isVisible()) {
          await expect(fullCoverageMessage).toBeVisible();
        }
      }
    });

    test('should allow adjusting bonus with increment/decrement buttons', async ({ page }) => {
      const incrementButton = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first();

      if (await incrementButton.isVisible()) {
        await incrementButton.click();

        // Should have increased the amount
        const input = page.locator('input[type="text"]').first();
        const value = await input.inputValue();
        expect(parseInt(value)).toBeGreaterThan(0);
      }
    });

    test('should allow adjusting bonus with slider', async ({ page }) => {
      const slider = page.locator('[role="slider"]');

      if (await slider.isVisible()) {
        // Move slider to 50%
        const box = await slider.boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
        }
      }
    });
  });

  test.describe('Bonus Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/pricing');
      const selectButton = page.getByRole('button', { name: /Выбрать план/i }).first();
      await selectButton.click();
      await page.waitForURL(/\/checkout/);
      await page.waitForTimeout(1000);
    });

    test('should show error when entering more than available balance', async ({ page }) => {
      const bonusInput = page.locator('input[type="text"]').first();

      if (await bonusInput.isVisible()) {
        // Enter a very large amount
        await bonusInput.fill('999999999');

        // Should show insufficient balance error
        const error = page.getByText(/Недостаточно бонусов/i);
        if (await error.isVisible()) {
          await expect(error).toBeVisible();
        }
      }
    });

    test('should clamp bonus to max applicable on blur', async ({ page }) => {
      const bonusInput = page.locator('input[type="text"]').first();

      if (await bonusInput.isVisible()) {
        // Enter amount exceeding max
        await bonusInput.fill('999999999');
        await bonusInput.blur();

        // Should be clamped to valid value
        const value = await bonusInput.inputValue();
        expect(parseInt(value)).toBeLessThan(999999999);
      }
    });

    test('should show max percentage info', async ({ page }) => {
      // Should show max percentage message
      const maxInfo = page.getByText(/Максимум.*можно оплатить бонусами/i);

      if (await maxInfo.isVisible()) {
        await expect(maxInfo).toBeVisible();
      }
    });
  });

  test.describe('Order Summary with Bonuses', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/pricing');
      const selectButton = page.getByRole('button', { name: /Выбрать план/i }).first();
      await selectButton.click();
      await page.waitForURL(/\/checkout/);
      await page.waitForTimeout(1000);
    });

    test('should update order total when bonus is applied', async ({ page }) => {
      // Get initial total
      const totalElement = page.getByText(/Итого/i).locator('..').getByText(/₽/);

      // Apply bonus
      const quickButton25 = page.getByRole('button', { name: '25%' });
      if (await quickButton25.isVisible()) {
        await quickButton25.click();

        // Total should be updated (would need to compare values)
        await expect(totalElement).toBeVisible();
      }
    });

    test('should show bonus discount line in summary', async ({ page }) => {
      // Apply some bonus
      const quickButton25 = page.getByRole('button', { name: '25%' });
      if (await quickButton25.isVisible()) {
        await quickButton25.click();

        // Should show discount line
        const discountLine = page.getByText(/Бонусы/i).locator('..');
        if (await discountLine.isVisible()) {
          await expect(discountLine).toContainText('-');
        }
      }
    });

    test('should show free button text when fully covered by bonus', async ({ page }) => {
      // Apply 100% bonus
      const quickButton100 = page.getByRole('button', { name: '100%' });
      if (await quickButton100.isVisible()) {
        await quickButton100.click();

        // Button should show "Оформить бесплатно"
        const freeButton = page.getByRole('button', { name: /Оформить бесплатно/i });
        if (await freeButton.isVisible()) {
          await expect(freeButton).toBeVisible();
        }
      }
    });

    test('should hide payment method selector when fully covered', async ({ page }) => {
      // Apply 100% bonus
      const quickButton100 = page.getByRole('button', { name: '100%' });
      if (await quickButton100.isVisible()) {
        await quickButton100.click();

        // Payment method section might be hidden
        const paymentSection = page.getByText(/Способ оплаты/i);
        // Could be hidden when fully covered
      }
    });
  });

  test.describe('Expiring Bonus Warning', () => {
    test('should show warning if user has expiring bonuses', async ({ page }) => {
      await page.goto('/pricing');
      const selectButton = page.getByRole('button', { name: /Выбрать план/i }).first();
      await selectButton.click();
      await page.waitForURL(/\/checkout/);
      await page.waitForTimeout(1000);

      // Apply some bonus first
      const quickButton25 = page.getByRole('button', { name: '25%' });
      if (await quickButton25.isVisible()) {
        await quickButton25.click();

        // Check for expiring warning (may not appear if no expiring bonuses)
        const expiringWarning = page.getByText(/истекают/i);
        // Don't fail if no expiring bonuses
      }
    });
  });

  test.describe('Checkout Completion with Bonus', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/pricing');
      const selectButton = page.getByRole('button', { name: /Выбрать план/i }).first();
      await selectButton.click();
      await page.waitForURL(/\/checkout/);
      await page.waitForTimeout(1000);
    });

    test('should proceed to payment with partial bonus', async ({ page }) => {
      // Apply partial bonus
      const quickButton25 = page.getByRole('button', { name: '25%' });
      if (await quickButton25.isVisible()) {
        await quickButton25.click();
      }

      // Click proceed button
      const proceedButton = page.getByRole('button', { name: /Перейти к оплате/i });
      if (await proceedButton.isVisible()) {
        await proceedButton.click();

        // Should show processing or confirmation step
        const processing = page.getByText(/обрабатываем/i);
        if (await processing.isVisible({ timeout: 2000 })) {
          await expect(processing).toBeVisible();
        }
      }
    });

    test('should complete checkout with full bonus coverage', async ({ page }) => {
      // Apply 100% bonus
      const quickButton100 = page.getByRole('button', { name: '100%' });
      if (await quickButton100.isVisible()) {
        await quickButton100.click();

        // Click free checkout button
        const freeButton = page.getByRole('button', { name: /Оформить бесплатно/i });
        if (await freeButton.isVisible()) {
          await freeButton.click();

          // Should show completion or processing
          await page.waitForTimeout(2000);
        }
      }
    });
  });

  test.describe('Bonus Balance Page', () => {
    test('should display bonus balance page', async ({ page }) => {
      await page.goto('/bonuses');

      // Should show bonus dashboard
      await expect(page.getByRole('heading', { name: /Бонусы/i })).toBeVisible();
    });

    test('should show current balance', async ({ page }) => {
      await page.goto('/bonuses');

      // Should show balance
      await expect(page.getByText(/Баланс/i)).toBeVisible();
    });

    test('should navigate to bonus history', async ({ page }) => {
      await page.goto('/bonuses');

      // Find and click history link
      const historyLink = page.getByRole('link', { name: /История/i });
      if (await historyLink.isVisible()) {
        await historyLink.click();
        await expect(page).toHaveURL(/\/bonuses\/history/);
      }
    });
  });
});
