import { test as base, expect, type Page } from '@playwright/test';

/**
 * Partner test user credentials
 */
export const PARTNER_USER = {
  email: 'partner@test.movieplatform.ru',
  password: 'TestPartner123!',
  firstName: 'Тест',
  lastName: 'Партнёр',
  referralCode: 'TESTPARTNER',
};

export const REFERRAL_USER = {
  email: 'referral@test.movieplatform.ru',
  password: 'TestReferral123!',
  firstName: 'Тест',
  lastName: 'Реферал',
};

export const ADMIN_USER = {
  email: 'admin@test.movieplatform.ru',
  password: 'TestAdmin123!',
  firstName: 'Тест',
  lastName: 'Админ',
};

/**
 * Mock partner dashboard data
 */
export const MOCK_PARTNER_DASHBOARD = {
  userId: 'test-user-id',
  level: 'BRONZE',
  referralCode: 'TESTPARTNER',
  stats: {
    totalReferrals: 5,
    activeReferrals: 3,
    totalEarnings: 15000,
    pendingEarnings: 2500,
    paidEarnings: 12500,
  },
  levelProgress: {
    currentLevel: 'BRONZE',
    nextLevel: 'SILVER',
    currentReferrals: 3,
    requiredReferrals: 10,
    currentEarnings: 15000,
    requiredEarnings: 50000,
  },
};

/**
 * Mock commissions data
 */
export const MOCK_COMMISSIONS = [
  {
    id: 'comm-1',
    amount: 1000,
    rate: 0.1,
    level: 1,
    status: 'APPROVED',
    sourceUserId: 'ref-1',
    sourceUserName: 'Иван Иванов',
    sourceUserEmail: 'ivan@test.ru',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'comm-2',
    amount: 500,
    rate: 0.05,
    level: 2,
    status: 'PENDING',
    sourceUserId: 'ref-2',
    sourceUserName: 'Пётр Петров',
    sourceUserEmail: 'petr@test.ru',
    createdAt: new Date().toISOString(),
  },
];

/**
 * Mock withdrawals data
 */
export const MOCK_WITHDRAWALS = [
  {
    id: 'wd-1',
    amount: 5000,
    taxRate: 0.13,
    taxAmount: 650,
    netAmount: 4350,
    status: 'COMPLETED',
    paymentDetails: {
      type: 'card',
      cardNumber: '4111 **** **** 1234',
    },
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'wd-2',
    amount: 3000,
    taxRate: 0.04,
    taxAmount: 120,
    netAmount: 2880,
    status: 'PENDING',
    paymentDetails: {
      type: 'bank',
      bankAccount: '40817810099910004312',
      bik: '044525225',
    },
    createdAt: new Date().toISOString(),
  },
];

/**
 * Extended test fixture with partner helpers
 */
interface PartnerFixtures {
  partnerPage: Page;
  adminPage: Page;
  loginAsPartner: () => Promise<void>;
  loginAsAdmin: () => Promise<void>;
  goToPartnerDashboard: () => Promise<void>;
  goToReferrals: () => Promise<void>;
  goToCommissions: () => Promise<void>;
  goToWithdrawals: () => Promise<void>;
  goToNewWithdrawal: () => Promise<void>;
  goToAdminPartners: () => Promise<void>;
  goToAdminCommissions: () => Promise<void>;
  goToAdminWithdrawals: () => Promise<void>;
}

/**
 * Create extended test with partner fixtures
 */
export const test = base.extend<PartnerFixtures>({
  partnerPage: async ({ page }, use) => {
    await use(page);
  },

  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  loginAsPartner: async ({ page }, use) => {
    const login = async () => {
      await page.goto('/login');
      await page.fill('input[name="email"]', PARTNER_USER.email);
      await page.fill('input[name="password"]', PARTNER_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
    };
    await use(login);
  },

  loginAsAdmin: async ({ adminPage }, use) => {
    const login = async () => {
      await adminPage.goto('/login');
      await adminPage.fill('input[name="email"]', ADMIN_USER.email);
      await adminPage.fill('input[name="password"]', ADMIN_USER.password);
      await adminPage.click('button[type="submit"]');
      await adminPage.waitForURL('/admin/**');
    };
    await use(login);
  },

  goToPartnerDashboard: async ({ page }, use) => {
    const navigate = async () => {
      await page.goto('/partner');
      await page.waitForLoadState('networkidle');
    };
    await use(navigate);
  },

  goToReferrals: async ({ page }, use) => {
    const navigate = async () => {
      await page.goto('/partner/referrals');
      await page.waitForLoadState('networkidle');
    };
    await use(navigate);
  },

  goToCommissions: async ({ page }, use) => {
    const navigate = async () => {
      await page.goto('/partner/commissions');
      await page.waitForLoadState('networkidle');
    };
    await use(navigate);
  },

  goToWithdrawals: async ({ page }, use) => {
    const navigate = async () => {
      await page.goto('/partner/withdrawals');
      await page.waitForLoadState('networkidle');
    };
    await use(navigate);
  },

  goToNewWithdrawal: async ({ page }, use) => {
    const navigate = async () => {
      await page.goto('/partner/withdrawals/new');
      await page.waitForLoadState('networkidle');
    };
    await use(navigate);
  },

  goToAdminPartners: async ({ adminPage }, use) => {
    const navigate = async () => {
      await adminPage.goto('/admin/partners');
      await adminPage.waitForLoadState('networkidle');
    };
    await use(navigate);
  },

  goToAdminCommissions: async ({ adminPage }, use) => {
    const navigate = async () => {
      await adminPage.goto('/admin/partners/commissions');
      await adminPage.waitForLoadState('networkidle');
    };
    await use(navigate);
  },

  goToAdminWithdrawals: async ({ adminPage }, use) => {
    const navigate = async () => {
      await adminPage.goto('/admin/partners/withdrawals');
      await adminPage.waitForLoadState('networkidle');
    };
    await use(navigate);
  },
});

export { expect };

/**
 * Helper to format currency for assertions
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Helper to wait for API response
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 10000
): Promise<void> {
  await page.waitForResponse(
    (response) =>
      (typeof urlPattern === 'string'
        ? response.url().includes(urlPattern)
        : urlPattern.test(response.url())) && response.status() === 200,
    { timeout }
  );
}

/**
 * Helper to intercept and mock API calls
 */
export async function mockApiRoute<T>(
  page: Page,
  urlPattern: string | RegExp,
  mockData: T
): Promise<void> {
  await page.route(urlPattern, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: mockData }),
    });
  });
}
