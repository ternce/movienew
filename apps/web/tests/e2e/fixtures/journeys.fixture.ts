import { test as base, expect, type Page } from '@playwright/test';
import { TEST_USERS } from './auth.fixture';
import { injectAuthState, mockCommonApi, MOCK_PLANS, MOCK_ACTIVE_SUBSCRIPTION } from './integration.fixture';
import { mockStoreApi, MOCK_PRODUCTS, MOCK_CART, MOCK_ORDERS } from './store.fixture';
import { mockBonusApi, MOCK_BONUS_BALANCE } from './bonus.fixture';
import { mockDashboardApi } from './dashboard.fixture';
import { MOCK_CONTENT } from './content.fixture';

// =============================================================================
// Journey-specific Mock Data
// =============================================================================

export const MOCK_REFERRAL_REGISTRATION = {
  referralCode: 'TESTPARTNER',
  referrerName: 'Тест Партнёр',
  bonusAmount: 100,
};

export const MOCK_FREE_CONTENT_LIST = {
  items: [
    {
      id: 'free-1',
      slug: 'free-intro-series',
      title: 'Бесплатный вводный курс',
      contentType: 'SERIES',
      ageCategory: '0+',
      thumbnailUrl: '/images/free-intro.jpg',
      isFree: true,
      duration: 1800,
    },
    {
      id: 'free-2',
      slug: 'free-clip-demo',
      title: 'Демо-клип',
      contentType: 'CLIP',
      ageCategory: '0+',
      thumbnailUrl: '/images/free-clip.jpg',
      isFree: true,
      duration: 300,
    },
  ],
  total: 2,
  page: 1,
  limit: 20,
};

export const MOCK_PREMIUM_CONTENT_LIST = {
  items: [
    {
      id: 'premium-1',
      slug: 'premium-exclusive',
      title: 'Эксклюзивный сериал',
      contentType: 'SERIES',
      ageCategory: '16+',
      thumbnailUrl: '/images/premium-exclusive.jpg',
      isFree: false,
      duration: 3600,
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
};

export const MOCK_ADMIN_CONTENT_DETAIL = {
  id: 'content-admin-1',
  slug: 'admin-test-content',
  title: 'Тестовый контент от админа',
  description: 'Описание контента',
  contentType: 'SERIES',
  ageCategory: '12+',
  status: 'DRAFT',
  isFree: false,
  duration: 0,
  thumbnailUrl: null,
  createdAt: new Date().toISOString(),
};

// =============================================================================
// Composite Mock Setup Functions
// =============================================================================

/**
 * Setup for new user onboarding journey:
 * Landing → Register → Verify → Dashboard → Browse → Watch → Subscribe → Watch Premium
 */
export async function setupNewUserJourney(page: Page) {
  // Auth endpoints
  await page.route('**/api/v1/auth/register', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: { ...TEST_USERS.user, id: 'new-user-1' },
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            message: 'Письмо с подтверждением отправлено',
          },
        }),
      });
    } else {
      await route.fallback();
    }
  });

  await page.route('**/api/v1/auth/verify-email/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { verified: true } }),
    });
  });

  await page.route('**/api/v1/auth/login', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: TEST_USERS.user,
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
          },
        }),
      });
    } else {
      await route.fallback();
    }
  });

  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { accessToken: 'new-token', refreshToken: 'new-refresh' },
      }),
    });
  });

  // Content
  await page.route('**/api/v1/content?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_FREE_CONTENT_LIST }),
    });
  });

  await page.route('**/api/v1/series/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          ...MOCK_CONTENT.freeContent,
          episodes: [
            { id: 'ep-1', title: 'Серия 1', episodeNumber: 1, seasonNumber: 1, duration: 1800 },
          ],
        },
      }),
    });
  });

  // Streaming
  await page.route('**/api/v1/streaming/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          streamUrl: 'https://test.cdn.movieplatform.ru/videos/free/master.m3u8',
          title: 'Бесплатный сериал — Серия 1',
          duration: 1800,
        },
      }),
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

  // User profile
  await page.route('**/api/v1/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'new-user-1',
          email: TEST_USERS.user.email,
          firstName: 'Тест',
          lastName: 'Пользователь',
          role: 'USER',
          ageCategory: 'EIGHTEEN_PLUS',
          bonusBalance: 0,
        },
      }),
    });
  });

  // Notifications
  await page.route('**/api/v1/notifications/unread-count', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ count: 0 }),
    });
  });

  await page.route('**/api/v1/notifications/preferences', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        emailMarketing: true,
        emailUpdates: true,
        pushNotifications: false,
      }),
    });
  });

  // HLS mock
  await page.route('**/*.m3u8', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/vnd.apple.mpegurl',
      body: `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:10\n#EXTINF:10.0,\nsegment0.ts\n#EXT-X-ENDLIST`,
    });
  });

  await page.route('**/*.ts', async (route) => {
    if (route.request().url().includes('segment')) {
      await route.fulfill({ status: 200, contentType: 'video/mp2t', body: Buffer.from([]) });
    } else {
      await route.fallback();
    }
  });
}

/**
 * Setup for partner referral journey
 */
export async function setupPartnerJourney(page: Page) {
  await setupNewUserJourney(page);

  // Referral validation
  await page.route('**/api/v1/partners/validate-referral*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { valid: true, referrerName: MOCK_REFERRAL_REGISTRATION.referrerName },
      }),
    });
  });

  // Partner dashboard for referrer
  await page.route('**/api/v1/partners/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          level: 'BRONZE',
          referralCode: 'TESTPARTNER',
          stats: { totalReferrals: 6, activeReferrals: 4 },
        },
      }),
    });
  });
}

/**
 * Setup for store purchase journey
 */
export async function setupStorePurchaseJourney(page: Page) {
  await injectAuthState(page);
  await mockCommonApi(page);
  await mockStoreApi(page);
}

/**
 * Setup for bonus lifecycle journey
 */
export async function setupBonusJourney(page: Page) {
  await injectAuthState(page);
  await mockCommonApi(page);
  await mockBonusApi(page);

  // Subscription plans with bonus discount
  await page.route('**/api/v1/subscription-plans*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_PLANS }),
    });
  });

  // Payment initiation with bonus
  await page.route('**/api/v1/payments/initiate', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      const bonusUsed = body?.bonusAmount || 0;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            transactionId: 'tx-bonus-1',
            amount: 599 - bonusUsed,
            bonusUsed,
            status: 'COMPLETED',
          },
        }),
      });
    } else {
      await route.fallback();
    }
  });
}

/**
 * Setup for admin content publishing journey
 */
export async function setupAdminPublishingJourney(page: Page) {
  const adminUser = { ...TEST_USERS.admin, id: 'admin-1', role: 'ADMIN' };
  await injectAuthState(page, adminUser);
  await mockCommonApi(page);

  // Admin content list
  await page.route('**/api/v1/admin/content?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { items: [MOCK_ADMIN_CONTENT_DETAIL], total: 1, page: 1, limit: 10 },
      }),
    });
  });

  // Create content
  await page.route('**/api/v1/admin/content', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { ...MOCK_ADMIN_CONTENT_DETAIL, id: 'content-new-1' },
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // Content detail
  await page.route(/\/api\/v1\/admin\/content\/[^/]+$/, async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_ADMIN_CONTENT_DETAIL }),
      });
    } else if (method === 'PATCH') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { ...MOCK_ADMIN_CONTENT_DETAIL, ...body },
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // Video upload
  await page.route('**/api/v1/admin/content/*/video/upload', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { jobId: 'job-1', message: 'Video uploaded' },
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // Video status
  await page.route('**/api/v1/admin/content/*/video/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { status: 'COMPLETED', availableQualities: ['480p', '720p', '1080p'] },
      }),
    });
  });
}

/**
 * Setup for account management journey
 */
export async function setupAccountJourney(page: Page) {
  await injectAuthState(page);
  await mockCommonApi(page);

  // Profile
  await page.route('**/api/v1/users/me/profile', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'user-1',
            email: TEST_USERS.user.email,
            firstName: 'Тест',
            lastName: 'Пользователь',
            phone: '+71234567890',
            dateOfBirth: '1995-06-15',
            ageCategory: '18+',
            verificationStatus: 'UNVERIFIED',
          },
        }),
      });
    } else if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: body }),
      });
    }
  });

  // Password change
  await page.route('**/api/v1/auth/change-password', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // Sessions
  await page.route('**/api/v1/auth/sessions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { id: 'session-1', deviceName: 'Chrome', current: true, lastActive: new Date().toISOString() },
          { id: 'session-2', deviceName: 'Safari', current: false, lastActive: new Date(Date.now() - 3600000).toISOString() },
        ],
      }),
    });
  });

  await page.route('**/api/v1/auth/sessions/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.fallback();
    }
  });

  // Verification
  await page.route('**/api/v1/verification/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { status: 'UNVERIFIED' } }),
    });
  });

  // Notification preferences
  await page.route('**/api/v1/users/me/preferences', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          emailNotifications: true,
          pushNotifications: false,
          marketingEmails: false,
        },
      }),
    });
  });

  // Subscriptions
  await page.route('**/api/v1/subscriptions/active', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_ACTIVE_SUBSCRIPTION }),
    });
  });

  await page.route('**/api/v1/subscriptions/*/auto-renew', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { ...MOCK_ACTIVE_SUBSCRIPTION, autoRenew: false },
        }),
      });
    } else {
      await route.fallback();
    }
  });
}

/**
 * Setup for error recovery journey
 */
export async function setupErrorRecoveryJourney(page: Page) {
  await injectAuthState(page);
  await mockCommonApi(page);

  let errorPageCallCount = 0;

  await page.route('**/api/v1/content?*', async (route) => {
    errorPageCallCount++;
    if (errorPageCallCount === 1) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'SRV_001', message: 'Internal server error' },
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              { id: 'rec-1', slug: 'recovered', title: 'Восстановленный контент', contentType: 'SERIES', ageCategory: '0+' },
            ],
            total: 1,
          },
        }),
      });
    }
  });
}

// =============================================================================
// Test Fixture
// =============================================================================

interface JourneyFixtures {
  setupNewUser: () => Promise<void>;
  setupPartner: () => Promise<void>;
  setupStorePurchase: () => Promise<void>;
  setupBonus: () => Promise<void>;
  setupAdminPublishing: () => Promise<void>;
  setupAccount: () => Promise<void>;
  setupSubscriptionCancellation: () => Promise<void>;
  setupErrorRecovery: () => Promise<void>;
}

export const test = base.extend<JourneyFixtures>({
  setupNewUser: async ({ page }, use) => {
    await use(async () => {
      await setupNewUserJourney(page);
    });
  },
  setupPartner: async ({ page }, use) => {
    await use(async () => {
      await setupPartnerJourney(page);
    });
  },
  setupStorePurchase: async ({ page }, use) => {
    await use(async () => {
      await setupStorePurchaseJourney(page);
    });
  },
  setupBonus: async ({ page }, use) => {
    await use(async () => {
      await setupBonusJourney(page);
    });
  },
  setupAdminPublishing: async ({ page }, use) => {
    await use(async () => {
      await setupAdminPublishingJourney(page);
    });
  },
  setupAccount: async ({ page }, use) => {
    await use(async () => {
      await setupAccountJourney(page);
    });
  },
  setupSubscriptionCancellation: async ({ page }, use) => {
    await use(async () => {
      await setupAccountJourney(page);
    });
  },
  setupErrorRecovery: async ({ page }, use) => {
    await use(async () => {
      await setupErrorRecoveryJourney(page);
    });
  },
});

export { expect };
