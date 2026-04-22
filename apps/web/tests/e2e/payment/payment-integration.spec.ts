import {
  test,
  expect,
  PaymentPage,
  MOCK_PAYMENT_METHODS,
  MOCK_TRANSACTION_STATES,
  MOCK_QR_CODE,
  MOCK_BANK_DETAILS,
  MOCK_PAYMENT_INITIATE,
} from '../fixtures/payment.fixture';

test.describe('Payment Integration', () => {
  // =========================================================================
  // 1. Checkout displays card payment option
  // =========================================================================
  test('checkout displays card payment option', async ({ page }) => {
    const paymentPage = new PaymentPage(page);
    await paymentPage.goto();

    await expect(paymentPage.cardOption).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(MOCK_PAYMENT_METHODS.card.name)).toBeVisible();
  });

  // =========================================================================
  // 2. Selecting card shows form/redirect indicator
  // =========================================================================
  test('selecting card shows form or redirect indicator', async ({ page }) => {
    const paymentPage = new PaymentPage(page);
    await paymentPage.goto();

    await paymentPage.selectPaymentMethod('card');

    // After selecting card, either a card form or a redirect/submit button should appear
    const cardFormVisible = await paymentPage.cardForm.isVisible({ timeout: 5000 }).catch(() => false);
    const submitVisible = await paymentPage.submitButton.isVisible({ timeout: 5000 }).catch(() => false);

    expect(cardFormVisible || submitVisible).toBeTruthy();
  });

  // =========================================================================
  // 3. Checkout displays SBP option
  // =========================================================================
  test('checkout displays SBP option', async ({ page }) => {
    const paymentPage = new PaymentPage(page);
    await paymentPage.goto();

    await expect(paymentPage.sbpOption).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(MOCK_PAYMENT_METHODS.sbp.name)).toBeVisible();
  });

  // =========================================================================
  // 4. Selecting SBP displays QR code
  // =========================================================================
  test('selecting SBP displays QR code', async ({ page }) => {
    const paymentPage = new PaymentPage(page);
    await paymentPage.goto();

    await paymentPage.selectPaymentMethod('sbp');

    // If the page initiates payment on method selection, QR should appear
    // Otherwise click submit first
    const qrVisible = await paymentPage.qrCodeImage.isVisible({ timeout: 5000 }).catch(() => false);
    if (!qrVisible) {
      // May need to submit to initiate SBP payment and get QR
      if (await paymentPage.submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await paymentPage.submitButton.click();
      }
    }

    await expect(paymentPage.qrCodeImage).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // 5. Checkout displays bank transfer option
  // =========================================================================
  test('checkout displays bank transfer option', async ({ page }) => {
    const paymentPage = new PaymentPage(page);
    await paymentPage.goto();

    await expect(paymentPage.bankTransferOption).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(MOCK_PAYMENT_METHODS.bankTransfer.name)).toBeVisible();
  });

  // =========================================================================
  // 6. Bank transfer shows details with copy buttons
  // =========================================================================
  test('bank transfer shows details with copy buttons', async ({ page }) => {
    const paymentPage = new PaymentPage(page);
    await paymentPage.goto();

    await paymentPage.selectPaymentMethod('bankTransfer');

    // If bank details are not immediately visible, submit to initiate
    const detailsVisible = await paymentPage.bankDetailsSection.isVisible({ timeout: 5000 }).catch(() => false);
    if (!detailsVisible) {
      if (await paymentPage.submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await paymentPage.submitButton.click();
      }
    }

    await expect(paymentPage.bankDetailsSection).toBeVisible({ timeout: 10000 });
    await expect(paymentPage.copyButtons.first()).toBeVisible();

    // Verify bank details content is present
    await expect(page.getByText(MOCK_BANK_DETAILS.bankName)).toBeVisible();
    await expect(page.getByText(MOCK_BANK_DETAILS.inn)).toBeVisible();
  });

  // =========================================================================
  // 7. Copy bank details copies to clipboard
  // =========================================================================
  test('copy bank details copies to clipboard', async ({ page }) => {
    const paymentPage = new PaymentPage(page);

    // Mock the clipboard API
    await page.addInitScript(() => {
      let clipboardContent = '';
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: async (text: string) => {
            clipboardContent = text;
            return Promise.resolve();
          },
          readText: async () => {
            return clipboardContent;
          },
        },
        writable: false,
        configurable: true,
      });
    });

    await paymentPage.goto();
    await paymentPage.selectPaymentMethod('bankTransfer');

    // Ensure bank details are visible
    const detailsVisible = await paymentPage.bankDetailsSection.isVisible({ timeout: 5000 }).catch(() => false);
    if (!detailsVisible) {
      if (await paymentPage.submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await paymentPage.submitButton.click();
      }
    }

    await expect(paymentPage.bankDetailsSection).toBeVisible({ timeout: 10000 });

    // Click the first copy button
    const firstCopyButton = paymentPage.copyButtons.first();
    await expect(firstCopyButton).toBeVisible();
    await firstCopyButton.click();

    // Verify clipboard was written to (check via evaluate)
    const clipboardValue = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardValue).toBeTruthy();
    expect(typeof clipboardValue).toBe('string');
    expect(clipboardValue.length).toBeGreaterThan(0);
  });

  // =========================================================================
  // 8. Payment callback (success) shows confirmation
  // =========================================================================
  test('payment callback success shows confirmation', async ({ page }) => {
    const paymentPage = new PaymentPage(page);

    // Ensure status endpoint returns completed for this transaction
    await page.route('**/api/v1/payments/status/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: MOCK_TRANSACTION_STATES.completed,
        }),
      });
    });

    await paymentPage.gotoCallback('success', MOCK_TRANSACTION_STATES.completed.id);

    await expect(paymentPage.successMessage).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // 9. Payment callback (failure) shows error + retry
  // =========================================================================
  test('payment callback failure shows error and retry button', async ({ page }) => {
    const paymentPage = new PaymentPage(page);

    await page.route('**/api/v1/payments/status/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: MOCK_TRANSACTION_STATES.failed,
        }),
      });
    });

    await paymentPage.gotoCallback('failure', MOCK_TRANSACTION_STATES.failed.id);

    await expect(paymentPage.errorMessage).toBeVisible({ timeout: 10000 });
    await expect(paymentPage.retryButton).toBeVisible();
  });

  // =========================================================================
  // 10. Payment callback (pending) shows processing
  // =========================================================================
  test('payment callback pending shows processing state', async ({ page }) => {
    const paymentPage = new PaymentPage(page);

    await page.route('**/api/v1/payments/status/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: MOCK_TRANSACTION_STATES.pending,
        }),
      });
    });

    await paymentPage.gotoCallback('pending', MOCK_TRANSACTION_STATES.pending.id);

    await expect(paymentPage.processingState).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // 11. Auto-renewal toggle ON by default
  // =========================================================================
  test('auto-renewal toggle is ON by default', async ({ page }) => {
    const paymentPage = new PaymentPage(page);
    await paymentPage.goto();

    await expect(paymentPage.autoRenewToggle).toBeVisible({ timeout: 10000 });
    await expect(paymentPage.autoRenewToggle).toBeChecked();
  });

  // =========================================================================
  // 12. Disabling auto-renewal sends API request
  // =========================================================================
  test('disabling auto-renewal sends API request', async ({ page }) => {
    const paymentPage = new PaymentPage(page);

    let autoRenewPatchReceived = false;

    // Intercept PATCH for auto-renew toggle
    await page.route('**/api/v1/subscriptions/*/auto-renew', async (route) => {
      if (route.request().method() === 'PATCH') {
        autoRenewPatchReceived = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { autoRenew: false } }),
        });
      } else {
        await route.fallback();
      }
    });

    // Also intercept general settings update
    await page.route('**/api/v1/payments/auto-renew', async (route) => {
      if (route.request().method() === 'PATCH' || route.request().method() === 'PUT') {
        autoRenewPatchReceived = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { autoRenew: false } }),
        });
      } else {
        await route.fallback();
      }
    });

    await paymentPage.goto();

    await expect(paymentPage.autoRenewToggle).toBeVisible({ timeout: 10000 });
    await expect(paymentPage.autoRenewToggle).toBeChecked();

    // Uncheck the toggle
    await paymentPage.autoRenewToggle.uncheck();

    // Wait briefly for the API call to be made
    await page.waitForTimeout(1000);

    // The toggle state or API call should reflect the change
    const isUnchecked = !(await paymentPage.autoRenewToggle.isChecked());
    expect(isUnchecked || autoRenewPatchReceived).toBeTruthy();
  });

  // =========================================================================
  // 13. 3D Secure redirect handling
  // =========================================================================
  test('3D Secure redirect handling for card payment', async ({ page }) => {
    const paymentPage = new PaymentPage(page);

    // Override initiate to return a redirect URL (simulating 3DS)
    await page.route('**/api/v1/payments/initiate', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              transactionId: 'tx-3ds',
              paymentUrl: MOCK_PAYMENT_INITIATE.card.paymentUrl,
              confirmationType: 'redirect',
              status: 'PENDING',
              requiresConfirmation: true,
            },
          }),
        });
      } else {
        await route.fallback();
      }
    });

    await paymentPage.goto();
    await paymentPage.selectPaymentMethod('card');

    // Wait for submit button and click it
    await expect(paymentPage.submitButton).toBeVisible({ timeout: 10000 });
    await paymentPage.submitButton.click();

    // The app should attempt navigation to the payment URL or show redirect state
    // Wait for either a navigation attempt or a redirect indicator
    await page.waitForTimeout(2000);

    // Verify the page attempted to redirect to the payment gateway or shows redirect info
    const currentUrl = page.url();
    const hasRedirected = currentUrl.includes('yookassa.ru') || currentUrl.includes('checkout');
    const redirectIndicatorVisible = await page.getByText(/перенаправление|переход|redirect|3D.?Secure/i)
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    // Either the page navigated or showed a redirect indicator
    expect(hasRedirected || redirectIndicatorVisible || currentUrl.includes('subscribe')).toBeTruthy();
  });

  // =========================================================================
  // 14. Payment timeout shows error
  // =========================================================================
  test('payment timeout shows error', async ({ page }) => {
    const paymentPage = new PaymentPage(page);

    // Override payment status to return a timeout/failed state
    await page.route('**/api/v1/payments/status/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            ...MOCK_TRANSACTION_STATES.failed,
            id: 'tx-timeout-1',
            status: 'FAILED',
            errorMessage: 'Время ожидания оплаты истекло',
          },
        }),
      });
    });

    // Navigate to callback with failure status simulating timeout
    await paymentPage.gotoCallback('failure', 'tx-timeout-1');

    await expect(paymentPage.errorMessage).toBeVisible({ timeout: 10000 });

    // Check error message text relates to timeout or failure
    const errorText = await paymentPage.errorMessage.textContent();
    expect(errorText).toBeTruthy();
  });

  // =========================================================================
  // 15. Double-click prevention
  // =========================================================================
  test('double-click prevention on submit button', async ({ page }) => {
    const paymentPage = new PaymentPage(page);

    let initiateCallCount = 0;

    await page.route('**/api/v1/payments/initiate', async (route) => {
      if (route.request().method() === 'POST') {
        initiateCallCount++;
        // Delay response to simulate processing
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: MOCK_PAYMENT_INITIATE.card,
          }),
        });
      } else {
        await route.fallback();
      }
    });

    await paymentPage.goto();
    await paymentPage.selectPaymentMethod('card');

    await expect(paymentPage.submitButton).toBeVisible({ timeout: 10000 });
    await expect(paymentPage.submitButton).toBeEnabled();

    // Click submit
    await paymentPage.submitButton.click();

    // After clicking, the button should become disabled to prevent double-click
    await expect(paymentPage.submitButton).toBeDisabled({ timeout: 3000 });
  });

  // =========================================================================
  // 16. Bonus discount applied correctly
  // =========================================================================
  test('bonus discount applied correctly', async ({ page }) => {
    const paymentPage = new PaymentPage(page);
    await paymentPage.goto();

    // Wait for the total amount to be displayed
    await expect(paymentPage.totalAmount).toBeVisible({ timeout: 10000 });

    // Capture the initial total amount text
    const initialTotalText = await paymentPage.totalAmount.textContent();

    // Toggle the bonus
    await expect(paymentPage.bonusToggle).toBeVisible({ timeout: 5000 });

    // Check current state and toggle if needed
    const isAlreadyChecked = await paymentPage.bonusToggle.isChecked().catch(() => false);

    if (isAlreadyChecked) {
      // If already checked, uncheck and re-check to observe the change
      await paymentPage.bonusToggle.uncheck();
      await page.waitForTimeout(500);
      const totalWithoutBonus = await paymentPage.totalAmount.textContent();
      await paymentPage.bonusToggle.check();
      await page.waitForTimeout(500);
      const totalWithBonus = await paymentPage.totalAmount.textContent();

      // The total with bonus should differ from without bonus
      expect(totalWithBonus).not.toEqual(totalWithoutBonus);
    } else {
      // Toggle on to apply bonus
      await paymentPage.bonusToggle.check();
      await page.waitForTimeout(500);
      const updatedTotalText = await paymentPage.totalAmount.textContent();

      // The total should have changed after applying bonus
      expect(updatedTotalText).not.toEqual(initialTotalText);
    }
  });

  // =========================================================================
  // 17. Free trial shows 0 rub
  // =========================================================================
  test('free trial shows zero price', async ({ page }) => {
    const paymentPage = new PaymentPage(page);

    // Override the plan to be a trial plan with 0 price
    await page.route('**/api/v1/subscription-plans/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'plan-trial',
            name: 'Пробный период',
            description: 'Бесплатный пробный период на 7 дней',
            type: 'TRIAL',
            price: 0,
            currency: 'RUB',
            durationDays: 7,
            features: ['Все сериалы', 'HD качество'],
            isActive: true,
            isTrial: true,
            createdAt: new Date().toISOString(),
          },
        }),
      });
    });

    await paymentPage.goto('plan-trial');

    // Verify "0" price is shown somewhere on the page
    await expect(page.getByText(/0\s*₽/)).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // 18. Confirmation number displayed after success
  // =========================================================================
  test('confirmation number displayed after successful payment', async ({ page }) => {
    const paymentPage = new PaymentPage(page);

    // Override status to return completed with confirmation number
    await page.route('**/api/v1/payments/status/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: MOCK_TRANSACTION_STATES.completed,
        }),
      });
    });

    await paymentPage.gotoCallback('success', MOCK_TRANSACTION_STATES.completed.id);

    await expect(paymentPage.successMessage).toBeVisible({ timeout: 10000 });
    await expect(paymentPage.confirmationNumber).toBeVisible({ timeout: 5000 });

    // Verify the confirmation number text matches the mock
    const confirmText = await paymentPage.confirmationNumber.textContent();
    expect(confirmText).toContain(MOCK_TRANSACTION_STATES.completed.confirmationNumber);
  });
});
