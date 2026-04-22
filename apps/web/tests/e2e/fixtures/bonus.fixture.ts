import { test as base, expect, type Page, type Locator } from '@playwright/test';
import { injectAuthState, mockCommonApi } from './integration.fixture';

// =============================================================================
// Mock Data
// =============================================================================

export const MOCK_BONUS_BALANCE = {
  balance: 2500,
  pendingBalance: 300,
  totalEarned: 5000,
  totalSpent: 2200,
  expiringBalance: 150,
  expiringDate: new Date(Date.now() + 7 * 86400000).toISOString(),
};

export const MOCK_BONUS_STATS = {
  earnedThisMonth: 800,
  spentThisMonth: 200,
  earnedLastMonth: 650,
  spentLastMonth: 400,
  averageMonthlyEarnings: 700,
};

export const MOCK_BONUS_TRANSACTIONS = [
  {
    id: 'bt-1',
    type: 'EARNED',
    source: 'SUBSCRIPTION_PAYMENT',
    amount: 500,
    balance: 2500,
    description: 'Бонусы за оплату подписки Премиум',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'bt-2',
    type: 'SPENT',
    source: 'STORE_PURCHASE',
    amount: 200,
    balance: 2000,
    description: 'Оплата заказа #order-5',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'bt-3',
    type: 'EARNED',
    source: 'REFERRAL',
    amount: 300,
    balance: 2200,
    description: 'Реферальный бонус — Иван И.',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'bt-4',
    type: 'EARNED',
    source: 'PROMO',
    amount: 100,
    balance: 1900,
    description: 'Промо-акция «Добро пожаловать»',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'bt-5',
    type: 'SPENT',
    source: 'SUBSCRIPTION_PAYMENT',
    amount: 400,
    balance: 1800,
    description: 'Частичная оплата подписки бонусами',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'bt-6',
    type: 'EARNED',
    source: 'ACTIVITY',
    amount: 50,
    balance: 2200,
    description: 'Бонус за ежедневную активность',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'bt-7',
    type: 'EXPIRED',
    source: 'SYSTEM',
    amount: 100,
    balance: 2150,
    description: 'Срок действия бонусов истёк',
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: 'bt-8',
    type: 'EARNED',
    source: 'REVIEW',
    amount: 25,
    balance: 2250,
    description: 'Бонус за отзыв о контенте',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'bt-9',
    type: 'SPENT',
    source: 'WITHDRAWAL',
    amount: 1000,
    balance: 1250,
    description: 'Вывод бонусов',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'bt-10',
    type: 'EARNED',
    source: 'SUBSCRIPTION_PAYMENT',
    amount: 500,
    balance: 2250,
    description: 'Бонусы за оплату подписки',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
];

export const MOCK_EXPIRING_BONUSES = [
  {
    id: 'exp-1',
    amount: 100,
    expiresAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    source: 'PROMO',
  },
  {
    id: 'exp-2',
    amount: 50,
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    source: 'ACTIVITY',
  },
];

export const MOCK_BONUS_RATE = {
  subscriptionRate: 0.1,
  storeRate: 0.05,
  referralRate: 0.03,
  bonusToRubRate: 1,
  minWithdrawAmount: 1000,
};

export const MOCK_WITHDRAW_RESULT = {
  id: 'wd-new',
  amount: 1500,
  taxRate: 0.13,
  taxAmount: 195,
  netAmount: 1305,
  status: 'PENDING',
  createdAt: new Date().toISOString(),
};

// =============================================================================
// Page Object Models
// =============================================================================

export class BonusDashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly balanceCard: Locator;
  readonly balanceAmount: Locator;
  readonly pendingAmount: Locator;
  readonly expiringAlert: Locator;
  readonly quickActions: Locator;
  readonly recentTransactions: Locator;
  readonly transactionRow: Locator;
  readonly howToEarnSection: Locator;
  readonly statsCards: Locator;
  readonly historyLink: Locator;
  readonly withdrawLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: /Мои бонусы/i });
    this.balanceCard = page.locator('section, div').filter({ hasText: 'Баланс бонусов' }).first();
    this.balanceAmount = page.getByText(/Доступно для использования/i).locator('..');
    this.pendingAmount = page.getByText(/Ожидает начисления/i);
    this.expiringAlert = page.getByText(/Истекает/i);
    this.quickActions = page.locator('a[href="/bonuses/history"], a[href="/bonuses/withdraw"], a[href="/pricing"]').first().locator('../..');
    this.recentTransactions = page.getByRole('heading', { name: /Последние операции/i }).locator('..');
    this.transactionRow = page.locator('[class*="transaction"], [class*="bonus-item"]');
    this.howToEarnSection = page.getByRole('heading', { name: /Как заработать/i });
    this.statsCards = page.getByRole('heading', { name: /Статистика бонусов/i }).locator('..').locator('div').filter({ hasText: /Текущий баланс|Всего заработано|Всего потрачено/ });
    this.historyLink = page.getByRole('link', { name: /История/i }).first();
    this.withdrawLink = page.getByRole('link', { name: /Вывести/i });
  }

  async goto() {
    await this.page.goto('/bonuses');
    await this.page.waitForLoadState('networkidle');
  }
}

export class BonusHistoryPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly transactionList: Locator;
  readonly transactionRow: Locator;
  readonly typeFilter: Locator;
  readonly dateFilter: Locator;
  readonly pagination: Locator;
  readonly emptyState: Locator;
  readonly loadingSkeleton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: /История бонусов/i });
    this.transactionList = page.locator('main');
    this.transactionRow = page.locator('[class*="transaction"], [class*="bonus-item"], [class*="border-b"]');
    this.typeFilter = page.locator('select, [role="combobox"]').first();
    this.dateFilter = page.locator('input[type="date"]').first();
    this.pagination = page.locator('nav[aria-label*="pagination"], [class*="pagination"]');
    this.emptyState = page.getByText(/Нет операций|История пуста|нет транзакций/i);
    this.loadingSkeleton = page.locator('[class*="skeleton"], [class*="animate-pulse"]');
  }

  async goto() {
    await this.page.goto('/bonuses/history');
    await this.page.waitForLoadState('networkidle');
  }
}

export class BonusWithdrawPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly amountInput: Locator;
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly balanceDisplay: Locator;
  readonly minAmountHint: Locator;
  readonly insufficientWarning: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: /Вывод бонусов/i });
    this.amountInput = page.locator('input[type="number"]');
    this.nextButton = page.getByRole('button', { name: /Далее/i });
    this.backButton = page.getByRole('button', { name: /Отмена|Назад/i });
    this.submitButton = page.getByRole('button', { name: /Подтвердить вывод/i });
    this.errorMessage = page.locator('.text-red-400, .text-red-500, [role="alert"]');
    this.successMessage = page.getByText(/Заявка.*создана|Вывод.*успешно/i);
    this.balanceDisplay = page.getByText(/Доступно для вывода/i);
    this.minAmountHint = page.getByText(/Минимальная сумма/i);
    this.insufficientWarning = page.getByText(/Недостаточно бонусов/i);
  }

  async goto() {
    await this.page.goto('/bonuses/withdraw');
    await this.page.waitForLoadState('networkidle');
  }

  async setAmount(amount: number) {
    await this.amountInput.fill(String(amount));
  }
}

// =============================================================================
// Mock API
// =============================================================================

export async function mockBonusApi(page: Page) {
  // Balance
  await page.route('**/api/v1/bonuses/balance', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_BONUS_BALANCE }),
    });
  });

  // Statistics
  await page.route('**/api/v1/bonuses/statistics', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_BONUS_STATS }),
    });
  });

  // Transactions list
  await page.route('**/api/v1/bonuses/transactions?*', async (route) => {
    const url = route.request().url();
    const typeParam = new URL(url).searchParams.get('type');
    let filtered = MOCK_BONUS_TRANSACTIONS;
    if (typeParam) {
      filtered = MOCK_BONUS_TRANSACTIONS.filter((t) => t.type === typeParam);
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { items: filtered, total: filtered.length, page: 1, limit: 20 },
      }),
    });
  });

  await page.route('**/api/v1/bonuses/transactions', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: MOCK_BONUS_TRANSACTIONS,
            total: MOCK_BONUS_TRANSACTIONS.length,
            page: 1,
            limit: 20,
          },
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // Expiring bonuses
  await page.route('**/api/v1/bonuses/expiring', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_EXPIRING_BONUSES }),
    });
  });

  // Bonus rate / config
  await page.route('**/api/v1/bonuses/rate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_BONUS_RATE }),
    });
  });

  // Withdraw
  await page.route('**/api/v1/bonuses/withdraw', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      const amount = body?.amount || 0;

      if (amount < MOCK_BONUS_RATE.minWithdrawAmount) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { code: 'BONUS_002', message: `Минимальная сумма вывода: ${MOCK_BONUS_RATE.minWithdrawAmount} ₽` },
          }),
        });
      } else if (amount > MOCK_BONUS_BALANCE.balance) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { code: 'BONUS_003', message: 'Недостаточно бонусов' },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_WITHDRAW_RESULT }),
        });
      }
    } else {
      await route.fallback();
    }
  });
}

// =============================================================================
// Test Fixture
// =============================================================================

interface BonusFixtures {
  mockBonusApis: void;
  bonusDashboardPage: BonusDashboardPage;
  bonusHistoryPage: BonusHistoryPage;
  bonusWithdrawPage: BonusWithdrawPage;
}

export const test = base.extend<BonusFixtures>({
  mockBonusApis: [
    async ({ page }, use) => {
      await injectAuthState(page);
      await mockCommonApi(page);
      await mockBonusApi(page);
      await use();
    },
    { auto: true },
  ],
  bonusDashboardPage: async ({ page }, use) => {
    await use(new BonusDashboardPage(page));
  },
  bonusHistoryPage: async ({ page }, use) => {
    await use(new BonusHistoryPage(page));
  },
  bonusWithdrawPage: async ({ page }, use) => {
    await use(new BonusWithdrawPage(page));
  },
});

export { expect };
