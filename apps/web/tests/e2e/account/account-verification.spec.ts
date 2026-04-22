import { test, expect } from '../fixtures/account.fixture';

test.describe('Account Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Set auth cookie at network level BEFORE navigation (middleware checks this server-side)
    await page.context().addCookies([
      { name: 'mp-authenticated', value: 'true', domain: 'localhost', path: '/' },
      { name: 'mp-auth-token', value: 'mock-access-token', domain: 'localhost', path: '/' },
    ]);

    // Inject auth state into localStorage for client-side hydration
    await page.addInitScript(() => {
      localStorage.setItem('mp-auth-storage', JSON.stringify({
        state: {
          user: {
            id: 'user-1',
            email: 'user@test.movieplatform.ru',
            firstName: 'Тест',
            lastName: 'Пользователь',
            role: 'USER',
          },
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          isAuthenticated: true,
          isHydrated: true,
        },
        version: 0,
      }));
    });

    // Mock common auth-related endpoints
    await page.route('**/api/v1/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { count: 0 } }),
      });
    });

    await page.route('**/api/v1/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            accessToken: 'mock-access-token-refreshed',
            refreshToken: 'mock-refresh-token-refreshed',
          },
        }),
      });
    });

    await page.route('**/api/v1/users/me', async (route) => {
      if (route.request().url().includes('/verification') || route.request().url().includes('/profile') || route.request().url().includes('/preferences')) {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'user-1',
            email: 'user@test.movieplatform.ru',
            firstName: 'Тест',
            lastName: 'Пользователь',
            role: 'USER',
          },
        }),
      });
    });
  });

  test('should display current verification status as not verified', async ({ page }) => {
    await page.goto('/account/verification');
    await page.waitForLoadState('networkidle');

    // The page shows "Аккаунт не верифицирован" for UNVERIFIED status
    await expect(page.getByText('Аккаунт не верифицирован')).toBeVisible();
    // The header should say "Верификация"
    await expect(page.getByRole('heading', { name: 'Верификация', level: 1 })).toBeVisible();
  });

  test('should show verification options — payment and document', async ({ page }) => {
    await page.goto('/account/verification');
    await page.waitForLoadState('networkidle');

    // The form should be visible with method select
    await expect(page.getByText('Подать заявку')).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Способ верификации' })).toBeVisible();

    // Open the method select dropdown (Radix Select renders as role="combobox")
    const selectTrigger = page.getByRole('combobox');
    await selectTrigger.click();

    // Both payment and document options should be available
    await expect(page.getByRole('option', { name: 'Оплата' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Загрузка документа' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Через партнёра' })).toBeVisible();
  });

  test('should initiate payment verification charge flow', async ({ page }) => {
    await page.goto('/account/verification');
    await page.waitForLoadState('networkidle');

    // Payment method is selected by default — description text is shown below select
    await expect(page.getByText('Подтверждение через платёж')).toBeVisible();

    // Click the submit button to initiate payment flow
    const submitButton = page.getByRole('button', { name: /Отправить заявку/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Should show success toast after submission (from the page-level onSuccess callback)
    await expect(page.getByText('Заявка на верификацию отправлена')).toBeVisible({ timeout: 5000 });
  });

  test('should allow file upload when document verification is selected', async ({ page }) => {
    await page.goto('/account/verification');
    await page.waitForLoadState('networkidle');

    // Open method select and choose DOCUMENT
    const selectTrigger = page.getByRole('combobox');
    await selectTrigger.click();
    await page.getByRole('option', { name: 'Загрузка документа' }).click();

    // Document upload area should be visible
    await expect(page.getByText('Перетащите файл сюда')).toBeVisible();
    await expect(page.getByText('или нажмите для выбора')).toBeVisible();
    await expect(page.getByText('JPEG, PNG, WebP, PDF. Максимум 10 МБ')).toBeVisible();

    // Hidden file input should exist
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveCount(1);
    await expect(fileInput).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp,application/pdf');
  });

  test('should show pending state after submission', async ({ page }) => {
    // Override verification status to PENDING (must be set BEFORE mockAccountApi auto-fixture)
    await page.route('**/api/v1/users/me/verification/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            status: 'PENDING',
            createdAt: '2024-12-15T10:00:00Z',
            reviewedAt: null,
            rejectionReason: null,
          },
        }),
      });
    });

    await page.goto('/account/verification');
    await page.waitForLoadState('networkidle');

    // Should show pending status card
    await expect(page.getByText('Заявка на рассмотрении')).toBeVisible();
    await expect(
      page.getByText('Ваша заявка была отправлена и находится на рассмотрении')
    ).toBeVisible();

    // The form should NOT be visible (cannot submit while pending)
    await expect(page.getByText('Подать заявку')).not.toBeVisible();
  });

  test('should show verified state with checkmark badge when approved', async ({ page }) => {
    // Override verification status to VERIFIED
    await page.route('**/api/v1/users/me/verification/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            status: 'VERIFIED',
            createdAt: '2024-12-01T10:00:00Z',
            reviewedAt: '2024-12-03T14:30:00Z',
            rejectionReason: null,
          },
        }),
      });
    });

    await page.goto('/account/verification');
    await page.waitForLoadState('networkidle');

    // Should show verified status card
    await expect(page.getByText('Аккаунт верифицирован')).toBeVisible();
    await expect(
      page.getByText('Ваш аккаунт успешно верифицирован', { exact: false })
    ).toBeVisible();

    // Badge with checkmark text
    await expect(page.getByText('Верифицирован', { exact: true })).toBeVisible();

    // The form should NOT be visible (already verified)
    await expect(page.getByText('Подать заявку')).not.toBeVisible();
  });

  test('should show rejection with reason text', async ({ page }) => {
    // Override verification status to REJECTED with reason
    await page.route('**/api/v1/users/me/verification/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            status: 'REJECTED',
            createdAt: '2024-12-01T10:00:00Z',
            reviewedAt: '2024-12-05T10:00:00Z',
            rejectionReason: 'Документ нечитаемый. Пожалуйста, загрузите фото в лучшем качестве.',
          },
        }),
      });
    });

    await page.goto('/account/verification');
    await page.waitForLoadState('networkidle');

    // Should show rejected status card
    await expect(page.getByText('Заявка отклонена')).toBeVisible();
    await expect(
      page.getByText('ваша заявка на верификацию была отклонена', { exact: false })
    ).toBeVisible();

    // Rejection reason should be displayed
    await expect(
      page.getByText('Документ нечитаемый. Пожалуйста, загрузите фото в лучшем качестве.')
    ).toBeVisible();
  });

  test('should handle file upload size limits', async ({ page }) => {
    await page.goto('/account/verification');
    await page.waitForLoadState('networkidle');

    // Select DOCUMENT method
    const selectTrigger = page.getByRole('combobox');
    await selectTrigger.click();
    await page.getByRole('option', { name: 'Загрузка документа' }).click();

    // Wait for the upload area to appear
    await expect(page.getByText('Перетащите файл сюда')).toBeVisible();

    // Simulate a large file via the processFile logic (file > 10 MB)
    // We inject a file through JavaScript since the file input is hidden
    await page.evaluate(() => {
      // Create a mock File larger than 10 MB
      const largeFile = new File(
        [new ArrayBuffer(11 * 1024 * 1024)],
        'large-document.pdf',
        { type: 'application/pdf' }
      );

      // Trigger the hidden file input change event
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(largeFile);
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Should show error toast about file size limit
    await expect(page.getByText('Максимальный размер файла: 10 МБ')).toBeVisible({ timeout: 5000 });
  });

  test('should reject unsupported file types', async ({ page }) => {
    await page.goto('/account/verification');
    await page.waitForLoadState('networkidle');

    // Select DOCUMENT method
    const selectTrigger = page.getByRole('combobox');
    await selectTrigger.click();
    await page.getByRole('option', { name: 'Загрузка документа' }).click();

    // Wait for the upload area to appear
    await expect(page.getByText('Перетащите файл сюда')).toBeVisible();

    // Attempt to upload an unsupported .exe file
    await page.evaluate(() => {
      const exeFile = new File(
        [new ArrayBuffer(1024)],
        'malware.exe',
        { type: 'application/x-msdownload' }
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(exeFile);
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Should show error toast about unsupported format
    await expect(page.getByText('Допустимые форматы: JPEG, PNG, WebP, PDF')).toBeVisible({ timeout: 5000 });
  });

  test('should allow resubmission after rejection', async ({ page }) => {
    // Override verification status to REJECTED
    await page.route('**/api/v1/users/me/verification/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            status: 'REJECTED',
            createdAt: '2024-12-01T10:00:00Z',
            reviewedAt: '2024-12-05T10:00:00Z',
            rejectionReason: 'Данные не совпадают. Попробуйте снова.',
          },
        }),
      });
    });

    await page.goto('/account/verification');
    await page.waitForLoadState('networkidle');

    // Should show rejected status
    await expect(page.getByText('Заявка отклонена')).toBeVisible();

    // The form should still be visible for resubmission (canSubmit is true for REJECTED)
    await expect(page.getByText('Подать заявку')).toBeVisible();

    // Submit button should be available
    const submitButton = page.getByRole('button', { name: /Отправить заявку/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test('should show verified badge on verification page when approved', async ({ page }) => {
    // Override verification status to VERIFIED
    await page.route('**/api/v1/users/me/verification/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            status: 'VERIFIED',
            createdAt: '2024-12-01T10:00:00Z',
            reviewedAt: '2024-12-03T14:30:00Z',
            rejectionReason: null,
          },
        }),
      });
    });

    await page.goto('/account/verification');
    await page.waitForLoadState('networkidle');

    // Verification page should show verified status
    await expect(page.getByText('Аккаунт верифицирован')).toBeVisible();

    // The "Верифицирован" badge is rendered on the verification page
    await expect(page.getByText('Верифицирован', { exact: true })).toBeVisible();

    // Verification date should be displayed
    await expect(page.getByText(/Дата верификации/)).toBeVisible();

    // The benefits section and form should NOT be visible (already verified)
    await expect(page.getByText('Подать заявку')).not.toBeVisible();
    await expect(page.getByText('Преимущества верификации')).not.toBeVisible();
  });

  test('should display age category on verification page', async ({ page }) => {
    await page.goto('/account/verification');
    await page.waitForLoadState('networkidle');

    // The verification page shows benefits including age-related content access
    await expect(page.getByText('Доступ к контенту 18+', { exact: true })).toBeVisible();
    // The step indicator and status sections are visible
    await expect(page.getByRole('heading', { name: 'Верификация', level: 1 })).toBeVisible();
    // Benefits section should mention age category access
    await expect(
      page.getByText('Смотрите контент без возрастных ограничений')
    ).toBeVisible();
  });
});
