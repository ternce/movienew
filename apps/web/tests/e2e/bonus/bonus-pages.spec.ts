import {
  test,
  expect,
  BonusDashboardPage,
  BonusHistoryPage,
  BonusWithdrawPage,
  MOCK_BONUS_BALANCE,
  MOCK_BONUS_TRANSACTIONS,
} from '../fixtures/bonus.fixture';

test.describe('Bonus System', () => {
  // ===========================================================================
  // Dashboard (/bonuses) — 8 tests
  // ===========================================================================

  test.describe('Дашборд бонусов', () => {
    test('заголовок "Мои бонусы" отображается', async ({ bonusDashboardPage }) => {
      await bonusDashboardPage.goto();
      await expect(bonusDashboardPage.heading).toBeVisible();
    });

    test('секция баланса бонусов отображается', async ({ bonusDashboardPage }) => {
      await bonusDashboardPage.goto();
      await expect(bonusDashboardPage.page.getByText('Баланс бонусов')).toBeVisible();
    });

    test('информация о доступном балансе видна', async ({ bonusDashboardPage }) => {
      await bonusDashboardPage.goto();
      await expect(bonusDashboardPage.page.getByText('Доступно для использования')).toBeVisible();
    });

    test('кнопки быстрых действий видны', async ({ bonusDashboardPage }) => {
      await bonusDashboardPage.goto();
      // Quick actions: История, Вывести, Использовать
      await expect(bonusDashboardPage.page.getByRole('link', { name: /История/i }).first()).toBeVisible();
      await expect(bonusDashboardPage.page.getByRole('link', { name: /Вывести/i })).toBeVisible();
      await expect(bonusDashboardPage.page.getByRole('link', { name: /Использовать/i })).toBeVisible();
    });

    test('секция "Последние операции" отображается', async ({ bonusDashboardPage }) => {
      await bonusDashboardPage.goto();
      await expect(bonusDashboardPage.page.getByRole('heading', { name: /Последние операции/i })).toBeVisible();
    });

    test('секция "Как заработать бонусы" видна', async ({ bonusDashboardPage }) => {
      await bonusDashboardPage.goto();
      await expect(bonusDashboardPage.howToEarnSection).toBeVisible();
    });

    test('секция "Статистика бонусов" отображается', async ({ bonusDashboardPage }) => {
      await bonusDashboardPage.goto();
      await expect(bonusDashboardPage.page.getByRole('heading', { name: /Статистика бонусов/i })).toBeVisible();
    });

    test('ссылки навигации к истории и выводу доступны', async ({ bonusDashboardPage }) => {
      await bonusDashboardPage.goto();
      await expect(bonusDashboardPage.historyLink).toBeVisible();
      await expect(bonusDashboardPage.withdrawLink).toBeVisible();
    });
  });

  // ===========================================================================
  // History (/bonuses/history) — 6 tests
  // ===========================================================================

  test.describe('История бонусов', () => {
    test('заголовок "История бонусов" отображается', async ({ bonusHistoryPage }) => {
      await bonusHistoryPage.goto();
      await expect(bonusHistoryPage.heading).toBeVisible();
    });

    test('общее количество операций отображается', async ({ bonusHistoryPage }) => {
      await bonusHistoryPage.goto();
      // "Всего операций: X"
      await expect(bonusHistoryPage.page.getByText(/Всего операций/i)).toBeVisible();
    });

    test('фильтр по типу отображается', async ({ bonusHistoryPage }) => {
      await bonusHistoryPage.goto();
      // Type filter is a Select component
      await expect(bonusHistoryPage.typeFilter).toBeVisible();
    });

    test('фильтр по дате отображается', async ({ bonusHistoryPage }) => {
      await bonusHistoryPage.goto();
      await expect(bonusHistoryPage.dateFilter).toBeVisible();
    });

    test('описание транзакции отображается', async ({ bonusHistoryPage }) => {
      await bonusHistoryPage.goto();
      // Verify first transaction description from mock data is shown
      const firstDesc = MOCK_BONUS_TRANSACTIONS[0].description;
      await expect(bonusHistoryPage.page.getByText(firstDesc)).toBeVisible();
    });

    test('кнопка "Назад к бонусам" видна', async ({ bonusHistoryPage }) => {
      await bonusHistoryPage.goto();
      await expect(bonusHistoryPage.page.getByRole('link', { name: /Назад к бонусам/i })).toBeVisible();
    });
  });

  // ===========================================================================
  // Withdraw (/bonuses/withdraw) — 6 tests
  // ===========================================================================

  test.describe('Вывод бонусов', () => {
    test('заголовок "Вывод бонусов" отображается', async ({ bonusWithdrawPage }) => {
      await bonusWithdrawPage.goto();
      await expect(bonusWithdrawPage.heading).toBeVisible();
    });

    test('информация о доступном балансе отображается', async ({ bonusWithdrawPage }) => {
      await bonusWithdrawPage.goto();
      await expect(bonusWithdrawPage.balanceDisplay).toBeVisible();
    });

    test('форма вывода с полем суммы видна', async ({ bonusWithdrawPage }) => {
      await bonusWithdrawPage.goto();
      // Amount step shows input and "Далее" button
      await expect(bonusWithdrawPage.amountInput).toBeVisible();
      await expect(bonusWithdrawPage.nextButton).toBeVisible();
    });

    test('курс конвертации отображается', async ({ bonusWithdrawPage }) => {
      await bonusWithdrawPage.goto();
      await expect(bonusWithdrawPage.page.getByText(/Курс конвертации/i)).toBeVisible();
    });

    test('информация о процессе вывода отображается', async ({ bonusWithdrawPage }) => {
      await bonusWithdrawPage.goto();
      // "Как работает вывод" section
      await expect(bonusWithdrawPage.page.getByText(/Как работает вывод/i)).toBeVisible();
    });

    test('предупреждение при недостаточном балансе', async ({ bonusWithdrawPage, page }) => {
      // Override balance to 0 so warning shows
      await page.route('**/api/v1/bonuses/balance', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { ...MOCK_BONUS_BALANCE, balance: 0 },
          }),
        });
      });
      await bonusWithdrawPage.goto();
      await expect(bonusWithdrawPage.insufficientWarning).toBeVisible();
    });
  });
});
