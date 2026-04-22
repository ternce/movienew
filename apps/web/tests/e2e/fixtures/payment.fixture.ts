import { test as base, expect, type Page, type Locator } from '@playwright/test';
import { injectAuthState, mockCommonApi, MOCK_PLANS } from './integration.fixture';

// =============================================================================
// Mock Data
// =============================================================================

export const MOCK_PAYMENT_METHODS = {
  card: {
    id: 'method-card',
    type: 'CARD',
    name: 'Банковская карта',
    description: 'Visa, Mastercard, МИР',
    icon: 'credit-card',
    enabled: true,
  },
  sbp: {
    id: 'method-sbp',
    type: 'SBP',
    name: 'СБП',
    description: 'Система быстрых платежей',
    icon: 'sbp',
    enabled: true,
  },
  bankTransfer: {
    id: 'method-bank',
    type: 'BANK_TRANSFER',
    name: 'Банковский перевод',
    description: 'Перевод по реквизитам',
    icon: 'bank',
    enabled: true,
  },
};

export const MOCK_TRANSACTION_STATES = {
  pending: {
    id: 'tx-pending-1',
    status: 'PENDING',
    amount: 599,
    currency: 'RUB',
    paymentMethod: 'CARD',
    description: 'Подписка Премиум',
    createdAt: new Date().toISOString(),
  },
  completed: {
    id: 'tx-completed-1',
    status: 'COMPLETED',
    amount: 599,
    currency: 'RUB',
    paymentMethod: 'CARD',
    description: 'Подписка Премиум',
    confirmationNumber: 'PAY-2024-001234',
    completedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 60000).toISOString(),
  },
  failed: {
    id: 'tx-failed-1',
    status: 'FAILED',
    amount: 599,
    currency: 'RUB',
    paymentMethod: 'CARD',
    description: 'Подписка Премиум',
    errorMessage: 'Недостаточно средств на карте',
    createdAt: new Date().toISOString(),
  },
  refunded: {
    id: 'tx-refunded-1',
    status: 'REFUNDED',
    amount: 599,
    currency: 'RUB',
    paymentMethod: 'CARD',
    description: 'Подписка Премиум',
    refundedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
};

export const MOCK_QR_CODE = {
  qrUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==',
  paymentUrl: 'https://sbp.nspk.ru/pay?id=test-payment-123',
  expiresAt: new Date(Date.now() + 900000).toISOString(), // 15 min
};

export const MOCK_BANK_DETAILS = {
  bankName: 'ООО «МувиПлатформ»',
  inn: '7701234567',
  kpp: '770101001',
  bik: '044525225',
  account: '40702810000000001234',
  corrAccount: '30101810400000000225',
  paymentPurpose: 'Оплата подписки Премиум. Без НДС.',
};

export const MOCK_PAYMENT_INITIATE = {
  card: {
    transactionId: 'tx-new-card',
    paymentUrl: 'https://yookassa.ru/checkout?orderId=test-123',
    confirmationType: 'redirect',
    status: 'PENDING',
  },
  sbp: {
    transactionId: 'tx-new-sbp',
    qrCode: MOCK_QR_CODE,
    confirmationType: 'qr',
    status: 'PENDING',
  },
  bankTransfer: {
    transactionId: 'tx-new-bank',
    bankDetails: MOCK_BANK_DETAILS,
    confirmationType: 'manual',
    status: 'PENDING',
  },
};

// =============================================================================
// Page Object Model
// =============================================================================

export class PaymentPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly planName: Locator;
  readonly planPrice: Locator;
  readonly methodSelector: Locator;
  readonly cardOption: Locator;
  readonly sbpOption: Locator;
  readonly bankTransferOption: Locator;
  readonly cardForm: Locator;
  readonly qrCodeImage: Locator;
  readonly qrCodeTimer: Locator;
  readonly bankDetailsSection: Locator;
  readonly copyButtons: Locator;
  readonly submitButton: Locator;
  readonly bonusToggle: Locator;
  readonly bonusAmount: Locator;
  readonly bonusDiscount: Locator;
  readonly totalAmount: Locator;
  readonly trialBadge: Locator;
  readonly autoRenewToggle: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly processingState: Locator;
  readonly confirmationNumber: Locator;
  readonly retryButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
    this.planName = page.locator('[data-testid="plan-name"]');
    this.planPrice = page.locator('[data-testid="plan-price"]');
    this.methodSelector = page.locator('[data-testid="method-selector"], .payment-methods');
    this.cardOption = page.locator('[data-testid="method-card"], button:has-text("Банковская карта"), [data-method="card"]');
    this.sbpOption = page.locator('[data-testid="method-sbp"], button:has-text("СБП"), [data-method="sbp"]');
    this.bankTransferOption = page.locator('[data-testid="method-bank"], button:has-text("Банковский перевод"), [data-method="bank"]');
    this.cardForm = page.locator('[data-testid="card-form"], .card-form');
    this.qrCodeImage = page.locator('[data-testid="qr-code"], img[alt*="QR"], .qr-code');
    this.qrCodeTimer = page.locator('[data-testid="qr-timer"]');
    this.bankDetailsSection = page.locator('[data-testid="bank-details"], .bank-details');
    this.copyButtons = page.locator('[data-testid="copy-button"], button[aria-label*="Копировать"]');
    this.submitButton = page.locator('[data-testid="pay-button"], button[type="submit"], button:has-text("Оплатить")');
    this.bonusToggle = page.locator('[data-testid="bonus-toggle"], input[name="useBonus"]');
    this.bonusAmount = page.locator('[data-testid="bonus-amount"]');
    this.bonusDiscount = page.locator('[data-testid="bonus-discount"]');
    this.totalAmount = page.locator('[data-testid="total-amount"], .total-amount');
    this.trialBadge = page.locator('[data-testid="trial-badge"]');
    this.autoRenewToggle = page.locator('[data-testid="auto-renew"], input[name="autoRenew"]');
    this.errorMessage = page.locator('[data-testid="error-message"], [role="alert"], .error-message');
    this.successMessage = page.locator('[data-testid="success-message"], .success-message');
    this.processingState = page.locator('[data-testid="processing"], .processing-state');
    this.confirmationNumber = page.locator('[data-testid="confirmation-number"]');
    this.retryButton = page.locator('[data-testid="retry-button"], button:has-text("Попробовать снова")');
  }

  async goto(planId = 'plan-premium') {
    await this.page.goto(`/subscribe/${planId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async gotoCallback(status: 'success' | 'failure' | 'pending', txId = 'tx-1') {
    await this.page.goto(`/payment/callback?status=${status}&transactionId=${txId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async selectPaymentMethod(method: 'card' | 'sbp' | 'bankTransfer') {
    const methodMap = {
      card: this.cardOption,
      sbp: this.sbpOption,
      bankTransfer: this.bankTransferOption,
    };
    await methodMap[method].click();
  }
}

// =============================================================================
// Mock API
// =============================================================================

export async function mockPaymentApi(page: Page, scenario?: 'success' | 'failure' | 'pending') {
  // Payment methods
  await page.route('**/api/v1/payments/methods', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: Object.values(MOCK_PAYMENT_METHODS),
      }),
    });
  });

  // Initiate payment
  await page.route('**/api/v1/payments/initiate', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      const method = body?.paymentMethod || 'card';
      const methodKey = method === 'CARD' ? 'card' : method === 'SBP' ? 'sbp' : 'bankTransfer';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: MOCK_PAYMENT_INITIATE[methodKey],
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // Payment status
  await page.route('**/api/v1/payments/status/*', async (route) => {
    const state = scenario || 'completed';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: MOCK_TRANSACTION_STATES[state],
      }),
    });
  });

  // Payment callback
  await page.route('**/api/v1/payments/callback*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // Subscription plans
  await page.route('**/api/v1/subscription-plans*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_PLANS }),
    });
  });

  // Single plan
  await page.route('**/api/v1/subscription-plans/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_PLANS[0] }),
    });
  });

  // Bonus balance for payment page
  await page.route('**/api/v1/bonuses/balance', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { balance: 500 } }),
    });
  });
}

// =============================================================================
// Test Fixture
// =============================================================================

interface PaymentFixtures {
  mockPaymentApis: void;
  paymentPage: PaymentPage;
}

export const test = base.extend<PaymentFixtures>({
  mockPaymentApis: [
    async ({ page }, use) => {
      await injectAuthState(page);
      await mockCommonApi(page);
      await mockPaymentApi(page);
      await use();
    },
    { auto: true },
  ],
  paymentPage: async ({ page }, use) => {
    await use(new PaymentPage(page));
  },
});

export { expect };
