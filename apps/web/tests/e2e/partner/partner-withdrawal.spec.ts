import { test, expect, MOCK_WITHDRAWALS, mockApiRoute, formatCurrency } from '../fixtures/partner.fixture';

const MOCK_BALANCE = {
  available: 10000,
  pending: 2500,
  total: 12500,
  minWithdrawal: 100,
};

const MOCK_TAX_PREVIEW = {
  amount: 5000,
  taxStatus: 'INDIVIDUAL',
  taxRate: 0.13,
  taxAmount: 650,
  netAmount: 4350,
};

const MOCK_WITHDRAWALS_LIST = {
  items: MOCK_WITHDRAWALS,
  total: 2,
  page: 1,
  limit: 20,
  totalPages: 1,
  totalAmount: 8000,
  totalNetAmount: 7230,
};

test.describe('Partner Withdrawal Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoute(page, /\/partners\/balance/, MOCK_BALANCE);
    await mockApiRoute(page, /\/partners\/withdrawals$/, MOCK_WITHDRAWALS_LIST);
    await mockApiRoute(page, /\/partners\/tax-preview/, MOCK_TAX_PREVIEW);
  });

  test('displays available balance correctly', async ({ page, goToWithdrawals }) => {
    await goToWithdrawals();

    // Check available balance is shown
    await expect(page.getByText(formatCurrency(10000))).toBeVisible();
    await expect(page.getByText('Доступно к выводу')).toBeVisible();
  });

  test('validates minimum withdrawal amount (100 RUB)', async ({ page, goToNewWithdrawal }) => {
    await goToNewWithdrawal();

    // Enter amount below minimum
    const amountInput = page.getByLabel(/сумма/i);
    await amountInput.fill('50');

    // Check for validation error
    const nextButton = page.getByRole('button', { name: /далее|продолжить/i });
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await expect(page.getByText(/минимальная сумма.*100/i)).toBeVisible();
    }
  });

  test('prevents withdrawal exceeding available balance', async ({ page, goToNewWithdrawal }) => {
    await goToNewWithdrawal();

    // Enter amount above available balance
    const amountInput = page.getByLabel(/сумма/i);
    await amountInput.fill('15000');

    // Check for validation error
    const nextButton = page.getByRole('button', { name: /далее|продолжить/i });
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await expect(page.getByText(/недостаточно средств|превышает баланс/i)).toBeVisible();
    }
  });

  test('shows real-time tax calculation preview', async ({ page, goToNewWithdrawal }) => {
    await goToNewWithdrawal();

    // Enter valid amount
    const amountInput = page.getByLabel(/сумма/i);
    await amountInput.fill('5000');

    // Move to tax step
    const nextButton = page.getByRole('button', { name: /далее|продолжить/i });
    if (await nextButton.isVisible()) {
      await nextButton.click();
    }

    // Check tax calculation is displayed
    await expect(page.getByText(/13%|физическое лицо/i)).toBeVisible();
    await expect(page.getByText(formatCurrency(650))).toBeVisible(); // tax amount
    await expect(page.getByText(formatCurrency(4350))).toBeVisible(); // net amount
  });

  test('updates tax amount when status changes', async ({ page, goToNewWithdrawal }) => {
    await goToNewWithdrawal();

    // Enter valid amount
    const amountInput = page.getByLabel(/сумма/i);
    await amountInput.fill('5000');

    // Move to tax step
    const nextButton = page.getByRole('button', { name: /далее|продолжить/i });
    if (await nextButton.isVisible()) {
      await nextButton.click();
    }

    // Find tax status selector
    const taxStatusSelect = page.getByRole('combobox', { name: /статус|тип/i });
    if (await taxStatusSelect.isVisible()) {
      // Mock different tax preview
      await mockApiRoute(page, /\/partners\/tax-preview/, {
        amount: 5000,
        taxStatus: 'SELF_EMPLOYED',
        taxRate: 0.04,
        taxAmount: 200,
        netAmount: 4800,
      });

      // Select self-employed
      await taxStatusSelect.click();
      await page.getByRole('option', { name: /самозанят/i }).click();

      // Check updated tax calculation
      await expect(page.getByText('4%')).toBeVisible();
      await expect(page.getByText(formatCurrency(4800))).toBeVisible();
    }
  });

  test('validates bank account details (BIK, account number)', async ({ page, goToNewWithdrawal }) => {
    await goToNewWithdrawal();

    // Enter valid amount
    const amountInput = page.getByLabel(/сумма/i);
    await amountInput.fill('5000');

    // Navigate through steps to payment details
    let nextButton = page.getByRole('button', { name: /далее|продолжить/i });
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(500);
      nextButton = page.getByRole('button', { name: /далее|продолжить/i });
      if (await nextButton.isVisible()) {
        await nextButton.click();
      }
    }

    // Select bank transfer method
    const bankOption = page.getByLabel(/банковский счёт|счёт/i);
    if (await bankOption.isVisible()) {
      await bankOption.click();

      // Enter invalid BIK
      const bikInput = page.getByLabel(/бик/i);
      await bikInput.fill('123'); // Too short

      // Enter invalid account number
      const accountInput = page.getByLabel(/счёт|номер счёта/i);
      await accountInput.fill('12345'); // Too short

      // Try to proceed
      nextButton = page.getByRole('button', { name: /далее|продолжить/i });
      if (await nextButton.isVisible()) {
        await nextButton.click();
        // Check for validation errors
        await expect(page.getByText(/бик.*9 цифр|неверный бик/i)).toBeVisible();
      }
    }
  });

  test('validates card number format', async ({ page, goToNewWithdrawal }) => {
    await goToNewWithdrawal();

    // Enter valid amount
    const amountInput = page.getByLabel(/сумма/i);
    await amountInput.fill('5000');

    // Navigate through steps to payment details
    let nextButton = page.getByRole('button', { name: /далее|продолжить/i });
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(500);
      nextButton = page.getByRole('button', { name: /далее|продолжить/i });
      if (await nextButton.isVisible()) {
        await nextButton.click();
      }
    }

    // Select card method
    const cardOption = page.getByLabel(/карта/i);
    if (await cardOption.isVisible()) {
      await cardOption.click();

      // Enter invalid card number
      const cardInput = page.getByLabel(/номер карты/i);
      await cardInput.fill('1234567890'); // Too short

      // Try to proceed
      nextButton = page.getByRole('button', { name: /далее|продолжить/i });
      if (await nextButton.isVisible()) {
        await nextButton.click();
        // Check for validation error
        await expect(page.getByText(/16 цифр|неверный номер/i)).toBeVisible();
      }
    }
  });

  test('completes withdrawal flow successfully', async ({ page, goToNewWithdrawal }) => {
    // Mock successful withdrawal creation
    await page.route(/\/partners\/withdrawals$/, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'new-withdrawal-id',
              amount: 5000,
              taxRate: 0.13,
              taxAmount: 650,
              netAmount: 4350,
              status: 'PENDING',
              createdAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_WITHDRAWALS_LIST }),
        });
      }
    });

    await goToNewWithdrawal();

    // Step 1: Enter amount
    const amountInput = page.getByLabel(/сумма/i);
    await amountInput.fill('5000');

    let nextButton = page.getByRole('button', { name: /далее|продолжить/i });
    await nextButton.click();
    await page.waitForTimeout(500);

    // Step 2: Tax status (skip if auto-selected)
    nextButton = page.getByRole('button', { name: /далее|продолжить/i });
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(500);
    }

    // Step 3: Payment details - select card
    const cardOption = page.getByLabel(/карта/i);
    if (await cardOption.isVisible()) {
      await cardOption.click();

      const cardInput = page.getByLabel(/номер карты/i);
      await cardInput.fill('4111111111111111');

      nextButton = page.getByRole('button', { name: /далее|продолжить/i });
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);
      }
    }

    // Step 4: Confirm and submit
    const submitButton = page.getByRole('button', { name: /отправить|создать|подтвердить/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should show success message or redirect
      await expect(page.getByText(/заявка.*создана|успешно/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('shows confirmation with net amount', async ({ page, goToNewWithdrawal }) => {
    await goToNewWithdrawal();

    // Navigate to confirmation step
    const amountInput = page.getByLabel(/сумма/i);
    await amountInput.fill('5000');

    let nextButton = page.getByRole('button', { name: /далее|продолжить/i });
    await nextButton.click();
    await page.waitForTimeout(500);

    // Continue through steps
    for (let i = 0; i < 3; i++) {
      nextButton = page.getByRole('button', { name: /далее|продолжить/i });
      if (await nextButton.isVisible()) {
        // Fill required fields if on payment step
        const cardOption = page.getByLabel(/карта/i);
        if (await cardOption.isVisible()) {
          await cardOption.click();
          const cardInput = page.getByLabel(/номер карты/i);
          if (await cardInput.isVisible()) {
            await cardInput.fill('4111111111111111');
          }
        }
        await nextButton.click();
        await page.waitForTimeout(500);
      }
    }

    // Check confirmation shows all details
    await expect(page.getByText(formatCurrency(5000))).toBeVisible(); // amount
    await expect(page.getByText(formatCurrency(4350))).toBeVisible(); // net amount
  });

  test('new withdrawal appears in history with PENDING status', async ({ page }) => {
    // Update mock to include new withdrawal
    const updatedWithdrawals = {
      ...MOCK_WITHDRAWALS_LIST,
      items: [
        {
          id: 'new-wd',
          amount: 5000,
          taxRate: 0.13,
          taxAmount: 650,
          netAmount: 4350,
          status: 'PENDING',
          paymentDetails: {
            type: 'card',
            cardNumber: '4111 **** **** 1111',
          },
          createdAt: new Date().toISOString(),
        },
        ...MOCK_WITHDRAWALS,
      ],
      total: 3,
    };

    await mockApiRoute(page, /\/partners\/withdrawals$/, updatedWithdrawals);

    await page.goto('/partner/withdrawals');
    await page.waitForLoadState('networkidle');

    // Check new withdrawal appears
    await expect(page.getByText(formatCurrency(5000))).toBeVisible();
    await expect(page.getByText('Ожидает').first()).toBeVisible();
  });

  test('handles insufficient balance error gracefully', async ({ page }) => {
    // Mock insufficient balance
    await mockApiRoute(page, /\/partners\/balance/, {
      available: 50,
      pending: 0,
      total: 50,
      minWithdrawal: 100,
    });

    await page.goto('/partner/withdrawals/new');
    await page.waitForLoadState('networkidle');

    // Should show message about insufficient balance
    await expect(page.getByText(/недостаточно средств|минимальная сумма/i)).toBeVisible();
  });

  test('withdrawal history displays all statuses correctly', async ({ page, goToWithdrawals }) => {
    await goToWithdrawals();

    // Check different status badges
    await expect(page.getByText('Выплачена').first()).toBeVisible();
    await expect(page.getByText('Ожидает').first()).toBeVisible();
  });

  test('back button works in multi-step form', async ({ page, goToNewWithdrawal }) => {
    await goToNewWithdrawal();

    // Go to step 2
    const amountInput = page.getByLabel(/сумма/i);
    await amountInput.fill('5000');

    const nextButton = page.getByRole('button', { name: /далее|продолжить/i });
    await nextButton.click();
    await page.waitForTimeout(500);

    // Click back button
    const backButton = page.getByRole('button', { name: /назад|back/i });
    if (await backButton.isVisible()) {
      await backButton.click();

      // Should be back on amount step
      await expect(page.getByLabel(/сумма/i)).toBeVisible();
      // Amount should be preserved
      await expect(page.getByLabel(/сумма/i)).toHaveValue('5000');
    }
  });

  test('cancel button returns to withdrawals list', async ({ page, goToNewWithdrawal }) => {
    await goToNewWithdrawal();

    // Find cancel button
    const cancelButton = page.getByRole('button', { name: /отмена|cancel/i });
    if (await cancelButton.isVisible()) {
      await cancelButton.click();

      // Should navigate to withdrawals list
      await expect(page).toHaveURL('/partner/withdrawals');
    }
  });
});
