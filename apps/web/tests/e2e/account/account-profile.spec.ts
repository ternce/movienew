import { test, expect } from '../fixtures/account.fixture';

test.describe('Account Profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/account/profile');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Display', () => {
    test('should display "Профиль" heading', async ({ page }) => {
      await expect(page.getByText('Профиль', { exact: false })).toBeVisible();
    });

    test('should show avatar section', async ({ page }) => {
      await expect(
        page.getByText('Нажмите на аватар, чтобы загрузить новое фото')
      ).toBeVisible();
    });

    test('should show personal data card', async ({ page }) => {
      await expect(page.getByText('Личные данные')).toBeVisible();
    });

    test('should show account info card', async ({ page }) => {
      await expect(page.getByText('Информация об аккаунте')).toBeVisible();
    });
  });

  test.describe('Form Pre-fill', () => {
    test('should pre-fill first name field', async ({ page }) => {
      const input = page.locator('input#firstName');
      await expect(input).toHaveValue('Тест');
    });

    test('should pre-fill last name field', async ({ page }) => {
      const input = page.locator('input#lastName');
      await expect(input).toHaveValue('Пользователь');
    });

    test('should show email as read-only', async ({ page }) => {
      const input = page.locator('input#email');
      await expect(input).toBeDisabled();
    });

    test('should pre-fill phone field', async ({ page }) => {
      const input = page.locator('input#phone');
      await expect(input).toHaveValue('+71234567890');
    });
  });

  test.describe('Form Validation', () => {
    test('should show error for empty first name', async ({ page }) => {
      const input = page.locator('input#firstName');
      await input.clear();
      await input.fill('A');

      // Submit the form
      const submitButton = page.getByRole('button', { name: /сохранить/i });
      await submitButton.click();

      // Should show validation error
      await expect(page.getByText('Минимум 2 символа')).toBeVisible();
    });

    test('should show error for invalid phone format', async ({ page }) => {
      const phoneInput = page.locator('input#phone');
      await phoneInput.clear();
      await phoneInput.fill('12345');

      const submitButton = page.getByRole('button', { name: /сохранить/i });
      await submitButton.click();

      await expect(page.getByText('Формат: +7XXXXXXXXXX')).toBeVisible();
    });

    test('should disable submit when form is unchanged', async ({ page }) => {
      const submitButton = page.getByRole('button', { name: /сохранить/i });
      await expect(submitButton).toBeDisabled();
    });

    test('should enable submit when form is modified', async ({ page }) => {
      const input = page.locator('input#firstName');
      await input.clear();
      await input.fill('НовоеИмя');

      const submitButton = page.getByRole('button', { name: /сохранить/i });
      await expect(submitButton).toBeEnabled();
    });
  });

  test.describe('Form Submission', () => {
    test('should save profile successfully', async ({ page }) => {
      const input = page.locator('input#firstName');
      await input.clear();
      await input.fill('НовоеИмя');

      const submitButton = page.getByRole('button', { name: /сохранить/i });
      await submitButton.click();

      // Should show success toast
      await expect(page.getByText('Профиль успешно обновлён')).toBeVisible();
    });
  });

  test.describe('Avatar Upload', () => {
    test('should show camera overlay on avatar hover', async ({ page }) => {
      const avatarArea = page.locator('.group.cursor-pointer').first();
      await avatarArea.hover();
      // Camera icon should become visible on hover
      const overlay = page.locator('.group-hover\\:opacity-100');
      await expect(overlay).toBeVisible();
    });

    test('should accept valid image file types', async ({ page }) => {
      // Hidden file input should accept correct formats
      const fileInput = page.locator('input[type="file"]').first();
      await expect(fileInput).toHaveAttribute('accept', /image\/jpeg/);
    });
  });

  test.describe('Read-only Info', () => {
    test('should display role', async ({ page }) => {
      await expect(page.getByText('Роль')).toBeVisible();
      await expect(page.getByText('Пользователь')).toBeVisible();
    });

    test('should display referral code', async ({ page }) => {
      await expect(page.getByText('Реферальный код')).toBeVisible();
      await expect(page.getByText('TESTREF123')).toBeVisible();
    });

    test('should not allow editing email', async ({ page }) => {
      const emailInput = page.locator('input#email');
      await expect(emailInput).toBeDisabled();
      await expect(page.getByText('Email нельзя изменить')).toBeVisible();
    });
  });
});
