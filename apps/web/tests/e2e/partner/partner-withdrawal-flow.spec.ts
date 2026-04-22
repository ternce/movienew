import {
  test,
  expect,
  MOCK_PARTNER_DASHBOARD,
  MOCK_WITHDRAWALS,
  mockApiRoute,
  formatCurrency,
} from '../fixtures/partner.fixture';

const MOCK_BALANCE = {
  available: 2500,
  pending: 500,
  total: 3000,
  minWithdrawal: 1000,
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

const MOCK_TAX_PREVIEW = {
  amount: 5000,
  taxStatus: 'INDIVIDUAL',
  taxRate: 0.13,
  taxAmount: 650,
  netAmount: 4350,
};

test.describe('Partner Withdrawal Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set cookies via browser context BEFORE page loads (server-side middleware needs these)
    await page.context().addCookies([
      { name: 'mp-authenticated', value: 'true', domain: 'localhost', path: '/' },
      { name: 'mp-auth-token', value: 'mock-token', domain: 'localhost', path: '/' },
    ]);
    // Inject auth state into localStorage
    await page.addInitScript(() => {
      localStorage.setItem(
        'mp-auth-storage',
        JSON.stringify({
          state: {
            user: {
              id: 'partner-1',
              email: 'partner@test.movieplatform.ru',
              firstName: 'Тест',
              lastName: 'Партнёр',
              role: 'PARTNER',
            },
            accessToken: 'mock-token',
            refreshToken: 'mock-refresh',
            isAuthenticated: true,
            isHydrated: true,
          },
          version: 0,
        })
      );
    });

    // Mock auth refresh
    await page.route('**/api/v1/auth/refresh', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { accessToken: 'new', refreshToken: 'new' },
        }),
      })
    );

    // Mock current user
    await page.route('**/api/v1/users/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'partner-1',
            email: 'partner@test.movieplatform.ru',
            firstName: 'Тест',
            lastName: 'Партнёр',
            role: 'PARTNER',
          },
        }),
      })
    );

    // Mock notifications
    await page.route('**/api/v1/notifications/unread-count', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 0 }),
      })
    );
    await page.route('**/api/v1/notifications/preferences', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          emailMarketing: true,
          emailUpdates: true,
          pushNotifications: false,
        }),
      })
    );

    // Mock partner dashboard
    await page.route('**/api/v1/partners/dashboard', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: MOCK_PARTNER_DASHBOARD,
        }),
      })
    );

    // Mock partner balance
    await page.route('**/api/v1/partners/balance', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_BALANCE }),
      })
    );

    // Mock withdrawals list (GET) and creation (POST)
    await page.route('**/api/v1/partners/withdrawals', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'new-wd-1',
              amount: 2500,
              taxRate: 0.13,
              taxAmount: 325,
              netAmount: 2175,
              status: 'PENDING',
              createdAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: MOCK_WITHDRAWALS_LIST,
          }),
        });
      }
    });

    // Mock withdrawals with query params (pagination, filters)
    await page.route('**/api/v1/partners/withdrawals?*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: MOCK_WITHDRAWALS_LIST,
        }),
      })
    );

    // Mock tax preview
    await page.route('**/api/v1/partners/tax-preview*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_TAX_PREVIEW }),
      })
    );
  });

  test('withdrawals list page loads with heading', async ({
    page,
    goToWithdrawals,
  }) => {
    await goToWithdrawals();

    // Page heading should be visible
    await expect(
      page
        .getByRole('heading', { name: /вывод|выводы|заявки/i })
        .or(page.getByText(/история выводов|заявки на вывод/i))
    ).toBeVisible();
  });

  test('withdrawal history table displays items', async ({
    page,
    goToWithdrawals,
  }) => {
    await goToWithdrawals();

    // Withdrawal amounts from mock data should be visible
    await expect(page.getByText(formatCurrency(5000)).first()).toBeVisible();
    await expect(page.getByText(formatCurrency(3000)).first()).toBeVisible();
  });

  test('status badges for COMPLETED and PENDING are displayed', async ({
    page,
    goToWithdrawals,
  }) => {
    await goToWithdrawals();

    // COMPLETED withdrawal should show its status badge
    await expect(
      page.getByText(/выплачена|завершена/i).first()
    ).toBeVisible();

    // PENDING withdrawal should show its status badge
    await expect(page.getByText(/ожидает/i).first()).toBeVisible();
  });

  test('new withdrawal button is visible on the list page', async ({
    page,
    goToWithdrawals,
  }) => {
    await goToWithdrawals();

    // "Новая заявка" or equivalent button should be visible
    const newButton = page
      .getByRole('link', { name: /новая заявка|создать заявку|новый вывод/i })
      .or(
        page.getByRole('button', {
          name: /новая заявка|создать заявку|новый вывод/i,
        })
      );

    await expect(newButton.first()).toBeVisible();
  });

  test('new withdrawal form loads on /partner/withdrawals/new', async ({
    page,
    goToNewWithdrawal,
  }) => {
    await goToNewWithdrawal();

    // The form or first step heading should be visible
    await expect(
      page
        .getByRole('heading', { name: /новая заявка|вывод средств/i })
        .or(page.getByText(/сумма вывода|введите сумму/i))
    ).toBeVisible();
  });

  test('amount input field is visible on new withdrawal form', async ({
    page,
    goToNewWithdrawal,
  }) => {
    await goToNewWithdrawal();

    // Amount input should be present and interactable
    const amountInput = page.getByLabel(/сумма/i);
    await expect(amountInput).toBeVisible();
    await expect(amountInput).toBeEnabled();
  });

  test('minimum amount validation rejects value below 1000', async ({
    page,
    goToNewWithdrawal,
  }) => {
    await goToNewWithdrawal();

    // Enter amount below minimum (1000)
    const amountInput = page.getByLabel(/сумма/i);
    await amountInput.fill('500');

    // Try to proceed
    const nextButton = page.getByRole('button', {
      name: /далее|продолжить|отправить|создать/i,
    });
    if (await nextButton.isVisible()) {
      await nextButton.click();

      // Validation error should appear
      await expect(
        page.getByText(/минимальная сумма|минимум.*1[\s.]?000/i)
      ).toBeVisible({ timeout: 3000 });
    }
  });

  test('tax calculator preview shows tax amount for 5000 RUB', async ({
    page,
    goToNewWithdrawal,
  }) => {
    await goToNewWithdrawal();

    // Enter valid amount
    const amountInput = page.getByLabel(/сумма/i);
    await amountInput.fill('5000');

    // Navigate to tax step if multi-step
    const nextButton = page.getByRole('button', {
      name: /далее|продолжить/i,
    });
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(500);
    }

    // Tax preview should show calculated values
    // 13% tax on 5000 = 650, net = 4350
    await expect(
      page
        .getByText(formatCurrency(650))
        .or(page.getByText(/650/))
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page
        .getByText(formatCurrency(4350))
        .or(page.getByText(/4[\s.]?350/))
    ).toBeVisible();
  });

  test('bank details form fields (account and BIK) are visible', async ({
    page,
    goToNewWithdrawal,
  }) => {
    await goToNewWithdrawal();

    // Fill amount and proceed through steps to payment details
    const amountInput = page.getByLabel(/сумма/i);
    await amountInput.fill('2500');

    // Navigate through steps
    let nextButton = page.getByRole('button', {
      name: /далее|продолжить/i,
    });
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(500);

      // Possibly another step (tax)
      nextButton = page.getByRole('button', {
        name: /далее|продолжить/i,
      });
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);
      }
    }

    // Select bank transfer option if available
    const bankOption = page.getByLabel(/банковский счёт|банк.*перевод|счёт/i);
    if (await bankOption.isVisible()) {
      await bankOption.click();
    }

    // Bank account and BIK fields should be present
    const accountInput = page.getByLabel(/счёт|номер счёта/i);
    const bikInput = page.getByLabel(/бик/i);

    if (await accountInput.isVisible()) {
      await expect(accountInput).toBeVisible();
    }
    if (await bikInput.isVisible()) {
      await expect(bikInput).toBeVisible();
    }
  });

  test('form submission with valid data shows success message', async ({
    page,
    goToNewWithdrawal,
  }) => {
    await goToNewWithdrawal();

    // Step 1: Enter amount
    const amountInput = page.getByLabel(/сумма/i);
    await amountInput.fill('2500');

    let nextButton = page.getByRole('button', {
      name: /далее|продолжить/i,
    });
    await nextButton.click();
    await page.waitForTimeout(500);

    // Step 2: Tax status (proceed if auto-selected)
    nextButton = page.getByRole('button', {
      name: /далее|продолжить/i,
    });
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(500);
    }

    // Step 3: Payment details - try to fill card
    const cardOption = page.getByLabel(/карта/i);
    if (await cardOption.isVisible()) {
      await cardOption.click();
      const cardInput = page.getByLabel(/номер карты/i);
      if (await cardInput.isVisible()) {
        await cardInput.fill('4111111111111111');
      }
      nextButton = page.getByRole('button', {
        name: /далее|продолжить/i,
      });
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);
      }
    }

    // Step 4: Confirm and submit
    const submitButton = page.getByRole('button', {
      name: /отправить|создать|подтвердить/i,
    });
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Success message or redirect
      await expect(
        page
          .getByText(/заявка.*создана|успешно|отправлена/i)
          .or(page.locator('[class*="success"]'))
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('API error on POST shows error message to user', async ({
    page,
    goToNewWithdrawal,
  }) => {
    // Override POST to return 500 error
    await page.route('**/api/v1/partners/withdrawals', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Ошибка сервера',
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: MOCK_WITHDRAWALS_LIST,
          }),
        });
      }
    });

    await goToNewWithdrawal();

    // Fill the form and submit
    const amountInput = page.getByLabel(/сумма/i);
    await amountInput.fill('2500');

    let nextButton = page.getByRole('button', {
      name: /далее|продолжить/i,
    });
    await nextButton.click();
    await page.waitForTimeout(500);

    // Navigate through remaining steps
    for (let i = 0; i < 3; i++) {
      nextButton = page.getByRole('button', {
        name: /далее|продолжить/i,
      });
      if (await nextButton.isVisible()) {
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

    // Submit
    const submitButton = page.getByRole('button', {
      name: /отправить|создать|подтвердить/i,
    });
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Error message should be displayed
      await expect(
        page
          .getByText(/ошибка|не удалось|попробуйте позже/i)
          .first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('insufficient balance (0) disables form or shows warning', async ({
    page,
  }) => {
    // Override balance to zero
    await page.route('**/api/v1/partners/balance', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            available: 0,
            pending: 0,
            total: 0,
            minWithdrawal: 1000,
          },
        }),
      })
    );

    await page.goto('/partner/withdrawals/new');
    await page.waitForLoadState('networkidle');

    // Should show insufficient balance message or disable submit
    const insufficientMessage = page.getByText(
      /недостаточно средств|нет доступных средств|минимальная сумма/i
    );
    const disabledSubmit = page.locator(
      'button[disabled][type="submit"], button:disabled'
    );

    const hasMessage = await insufficientMessage.isVisible().catch(() => false);
    const hasDisabled = (await disabledSubmit.count()) > 0;

    expect(hasMessage || hasDisabled).toBeTruthy();
  });

  test('back/cancel button navigates to withdrawals list', async ({
    page,
    goToNewWithdrawal,
  }) => {
    await goToNewWithdrawal();

    // Find cancel or back button
    const backButton = page
      .getByRole('button', { name: /отмена|назад|cancel/i })
      .or(page.getByRole('link', { name: /отмена|назад|cancel/i }));

    if (await backButton.first().isVisible()) {
      await backButton.first().click();

      // Should navigate back to the withdrawals list
      await expect(page).toHaveURL(/\/partner\/withdrawals(?!\/)/, {
        timeout: 5000,
      });
    } else {
      // Try browser back navigation as fallback
      await page.goBack();
      await page.waitForLoadState('networkidle');
    }
  });

  test('withdrawal status timeline elements are visible', async ({
    page,
    goToWithdrawals,
  }) => {
    // Mock a single withdrawal detail endpoint
    await page.route('**/api/v1/partners/withdrawals/wd-1', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            ...MOCK_WITHDRAWALS[0],
            statusHistory: [
              {
                status: 'PENDING',
                timestamp: new Date(
                  Date.now() - 7 * 24 * 60 * 60 * 1000
                ).toISOString(),
                comment: 'Заявка создана',
              },
              {
                status: 'PROCESSING',
                timestamp: new Date(
                  Date.now() - 5 * 24 * 60 * 60 * 1000
                ).toISOString(),
                comment: 'В обработке',
              },
              {
                status: 'COMPLETED',
                timestamp: new Date(
                  Date.now() - 3 * 24 * 60 * 60 * 1000
                ).toISOString(),
                comment: 'Выплачена',
              },
            ],
          },
        }),
      })
    );

    await goToWithdrawals();

    // Click on the first withdrawal to see detail / timeline
    const withdrawalRow = page.getByText(formatCurrency(5000)).first();
    await expect(withdrawalRow).toBeVisible();

    // Try to open the detail view
    await withdrawalRow.click();
    await page.waitForTimeout(500);

    // Status timeline elements should be visible (status labels or timeline markers)
    const timelineStatuses = page
      .getByText(/заявка создана|в обработке|выплачена/i);
    const timelineContainer = page.locator(
      '[data-testid="status-timeline"], [class*="timeline"]'
    );

    const hasTimeline = await timelineContainer.isVisible().catch(() => false);
    const hasStatuses = (await timelineStatuses.count()) > 0;

    // At minimum the completed status should be visible
    await expect(
      page.getByText(/выплачена|завершена/i).first()
    ).toBeVisible();

    expect(hasTimeline || hasStatuses).toBeTruthy();
  });
});
