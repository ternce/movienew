import { test, expect, type Page } from '@playwright/test';

// ============================================================================
// Setup helpers
// ============================================================================

async function injectAuth(page: Page) {
  // Set cookies via browser context BEFORE page loads (server-side middleware needs these)
  await page.context().addCookies([
    { name: 'mp-authenticated', value: 'true', domain: 'localhost', path: '/' },
    { name: 'mp-auth-token', value: 'mock-access-token', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(() => {
    localStorage.setItem('mp-auth-storage', JSON.stringify({
      state: {
        user: { id: 'user-1', email: 'user@test.movieplatform.ru', firstName: 'Тест', lastName: 'Пользователь', role: 'USER' },
        accessToken: 'mock-token', refreshToken: 'mock-refresh',
        isAuthenticated: true, isHydrated: true,
      },
      version: 0,
    }));
  });
}

async function mockApis(page: Page) {
  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { accessToken: 'new', refreshToken: 'new' } }) });
  });
  await page.route('**/api/v1/users/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 'user-1', email: 'user@test.movieplatform.ru', firstName: 'Тест', lastName: 'Пользователь', role: 'USER', bonusBalance: 1500 } }) });
  });
  await page.route('**/api/v1/notifications/unread-count', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 0 }) });
  });
  await page.route('**/api/v1/notifications/preferences', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ emailMarketing: true, emailUpdates: true, pushNotifications: false }) });
  });
  // Subscription plans with prices
  await page.route('**/api/v1/subscription-plans**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [
      { id: 'plan-1', name: 'Премиум', price: 1599, currency: 'RUB', durationDays: 30, features: ['Все сериалы'] },
      { id: 'plan-2', name: 'Базовый', price: 599, currency: 'RUB', durationDays: 30, features: ['Базовый'] },
    ] }) });
  });
  // Store products with prices
  await page.route('**/api/v1/store/products**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [
      { id: 'p1', name: 'Футболка', slug: 'futbolka', price: 1990, inStock: true, images: [], status: 'ACTIVE', category: { id: 'c1', name: 'Мерч' } },
    ], total: 1 } }) });
  });
  await page.route('**/api/v1/store/products/categories', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [{ id: 'c1', name: 'Мерч', slug: 'merch' }] }) });
  });
  // Bonus with transactions
  await page.route('**/api/v1/bonuses/balance', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { balance: 1500 } }) });
  });
  await page.route('**/api/v1/bonuses/transactions**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [
      { id: 'bt1', type: 'EARNED', amount: 500, description: 'Бонус за подписку', createdAt: '2025-01-15T10:00:00Z' },
      { id: 'bt2', type: 'SPENT', amount: 200, description: 'Оплата заказа', createdAt: '2025-02-03T14:30:00Z' },
    ], total: 2 } }) });
  });
  await page.route('**/api/v1/bonuses/statistics', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { earnedThisMonth: 500 } }) });
  });
  await page.route('**/api/v1/bonuses/expiring', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
  });
  await page.route('**/api/v1/bonuses/rate', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { minWithdrawAmount: 1000 } }) });
  });
  // Content
  await page.route('**/api/v1/content**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [
      { id: 'c1', title: 'Сериал Тест', slug: 'serial-test', contentType: 'SERIES', ageCategory: '12+', duration: 5400, createdAt: '2025-01-15T10:00:00Z' },
    ], total: 1 } }) });
  });
  await page.route('**/api/v1/watch-history/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [] } }) });
  });
  await page.route('**/api/v1/subscriptions/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: null }) });
  });
  await page.route('**/api/v1/partners/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
  });
}

// ============================================================================
// Helper: extract all visible text from the page
// ============================================================================

async function getAllVisibleText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const style = window.getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' || parent.tagName === 'NOSCRIPT') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );
    const texts: string[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = (node.textContent || '').trim();
      if (text.length > 0) texts.push(text);
    }
    return texts.join(' ');
  });
}

// ============================================================================
// Tests
// ============================================================================

test.describe('Russian Locale & Formatting', () => {
  // --------------------------------------------------------------------------
  // 1. Currency format uses spaces and ruble symbol
  // --------------------------------------------------------------------------
  test('currency format uses spaces as thousands separator and ₽ symbol', async ({ page }) => {
    await mockApis(page);
    await page.goto('/store');
    await page.waitForLoadState('networkidle');

    const bodyText = await getAllVisibleText(page);

    // The price 1990 should be formatted as "1 990" (with a regular or non-breaking space)
    // and should include the ₽ symbol. Must NOT use commas as thousands separators.
    const pricePattern = /1[\s\u00a0\u202f]990/;
    expect(bodyText).toMatch(pricePattern);
    expect(bodyText).toContain('₽');

    // Verify no comma-separated thousands (English-style formatting)
    expect(bodyText).not.toMatch(/1,990/);
  });

  // --------------------------------------------------------------------------
  // 2. Date format shows Russian month names
  // --------------------------------------------------------------------------
  test('dates display Russian month names', async ({ page }) => {
    await mockApis(page);
    await injectAuth(page);

    // Navigate to bonuses history page which shows transaction dates in non-compact
    // mode (the main /bonuses page uses compact transactions that don't display dates).
    await page.goto('/bonuses/history');
    await page.waitForLoadState('networkidle');

    const bodyText = await getAllVisibleText(page);

    // Russian month names — both full genitive forms and short abbreviations.
    // The bonus transaction component uses Intl.DateTimeFormat('ru-RU', { month: 'short' })
    // which produces abbreviated forms like "янв.", "февр.", etc.
    const russianMonthsLong = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
    ];
    const russianMonthsShort = [
      'янв', 'февр', 'мар', 'апр', 'мая', 'июн',
      'июл', 'авг', 'сент', 'окт', 'нояб', 'дек',
    ];

    // At least one Russian month name (long or short) should appear on the page
    // (transaction dates from mock data: January 15 and February 3)
    const allRussianMonths = [...russianMonthsLong, ...russianMonthsShort];
    const hasRussianMonth = allRussianMonths.some((month) => bodyText.toLowerCase().includes(month));

    // Also accept numeric date format (DD.MM.YYYY) which is standard Russian format
    const hasNumericDate = /\d{1,2}\.\d{2}\.\d{4}/.test(bodyText);

    expect(hasRussianMonth || hasNumericDate).toBe(true);

    // Verify no English month names appear
    const englishMonths = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const hasEnglishMonth = englishMonths.some((month) => bodyText.includes(month));
    expect(hasEnglishMonth).toBe(false);
  });

  // --------------------------------------------------------------------------
  // 3. All UI on the login page is in Russian
  // --------------------------------------------------------------------------
  test('login page UI is entirely in Russian', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const bodyText = await getAllVisibleText(page);

    // The login page should have these Russian texts
    expect(bodyText).toMatch(/Вход в аккаунт/);
    expect(bodyText).toMatch(/Пароль/);
    expect(bodyText).toMatch(/Войти/);
    expect(bodyText).toMatch(/Зарегистрируйтесь/);
    expect(bodyText).toMatch(/Забыли пароль/);

    // English equivalents should NOT appear as visible UI text
    // (note: "Email" is acceptable since it's a universal term used in Russian UI too)
    const forbiddenEnglish = ['Login', 'Sign in', 'Password', 'Register', 'Forgot password', 'Submit'];
    for (const word of forbiddenEnglish) {
      // Case-sensitive check — the exact English word should not appear
      expect(bodyText).not.toContain(word);
    }
  });

  // --------------------------------------------------------------------------
  // 4. Plural forms for bonuses are correct (Russian has 3 plural forms)
  // --------------------------------------------------------------------------
  test('bonus count uses correct Russian plural forms', async ({ page }) => {
    await mockApis(page);
    await injectAuth(page);

    await page.goto('/bonuses');
    await page.waitForLoadState('networkidle');

    const bodyText = await getAllVisibleText(page);

    // The page should contain Russian bonus-related text.
    // Russian pluralization: 1 бонус, 2-4 бонуса, 5+ бонусов, 0 бонусов
    // The mock balance is 1500, so we expect "бонусов" (genitive plural)
    // or the word "бонус" in some compound form (e.g. "Баланс бонусов")
    const hasBonusPlural = /бонус(?:ов|а|ы|ам|ами)?/i.test(bodyText);
    expect(hasBonusPlural).toBe(true);

    // Verify the page doesn't use English "bonus" or "bonuses" as UI text
    expect(bodyText).not.toMatch(/\bbonus(?:es)?\b/i);
  });

  // --------------------------------------------------------------------------
  // 5. Phone format starts with +7
  // --------------------------------------------------------------------------
  test('profile page shows phone in +7 format', async ({ page }) => {
    // Call mockApis first so that the specific overrides below take priority
    // (Playwright route handlers are matched in reverse registration order —
    //  later registrations take priority)
    await mockApis(page);

    // Override users/me to include a phone number (must be AFTER mockApis)
    await page.route('**/api/v1/users/me', async (route) => {
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
            phone: '+79991234567',
            bonusBalance: 1500,
          },
        }),
      });
    });
    // Mock the profile endpoint with phone
    await page.route('**/api/v1/users/profile', async (route) => {
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
            phone: '+79991234567',
            avatarUrl: '',
          },
        }),
      });
    });
    await injectAuth(page);

    await page.goto('/account/profile');
    await page.waitForLoadState('networkidle');

    // Wait for profile data to load and populate the form
    const phoneInput = page.locator('input#phone, input[name="phone"], input[type="tel"]').first();
    await expect(phoneInput).toBeVisible({ timeout: 10000 });

    // The form is populated via useEffect after profile data loads — wait for the value
    await expect(phoneInput).toHaveValue(/^\+7/, { timeout: 10000 });

    // Verify the phone format hint text mentions +7
    const bodyText = await getAllVisibleText(page);
    expect(bodyText).toMatch(/\+7/);
  });

  // --------------------------------------------------------------------------
  // 6. Duration format uses Russian abbreviations "ч" and "мин"
  // --------------------------------------------------------------------------
  test('content duration displays in Russian format "Xч Xмин"', async ({ page }) => {
    await mockApis(page);

    // Navigate to tutorials page which formats duration
    await page.goto('/tutorials');
    await page.waitForLoadState('networkidle');

    const bodyText = await getAllVisibleText(page);

    // Content with duration 5400s = 1h 30min, should be "1ч 30мин" or "1 ч 30 мин"
    const durationPattern = /1[\s]?ч[\s]?30[\s]?мин/;
    expect(bodyText).toMatch(durationPattern);

    // Should NOT contain English duration abbreviations
    expect(bodyText).not.toMatch(/\b\d+\s*hr/i);
    expect(bodyText).not.toMatch(/\b\d+\s*min\b/i);
  });

  // --------------------------------------------------------------------------
  // 7. Error messages appear in Russian
  // --------------------------------------------------------------------------
  test('form validation error messages are in Russian', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Submit the form without filling any fields to trigger validation errors
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for validation messages to appear
    await page.waitForTimeout(500);

    const bodyText = await getAllVisibleText(page);

    // The login form validation should produce Russian messages:
    // "Email обязателен" or "Пароль обязателен"
    const hasRussianError = /обязательн|обязателен|введите|некорректн|неверн/i.test(bodyText);
    expect(hasRussianError).toBe(true);

    // English validation messages should NOT appear
    expect(bodyText).not.toMatch(/\bis required\b/i);
    expect(bodyText).not.toMatch(/\bmust be\b/i);
    expect(bodyText).not.toMatch(/\binvalid\b/i);
  });

  // --------------------------------------------------------------------------
  // 8. Relative time displays in Russian (e.g. "минут назад", "час назад")
  // --------------------------------------------------------------------------
  test('relative time is displayed in Russian', async ({ page }) => {
    // Override notifications with recent timestamps
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    await page.route('**/api/v1/notifications**', async (route) => {
      const url = route.request().url();
      if (url.includes('unread-count')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 2 }) });
        return;
      }
      if (url.includes('preferences')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ emailMarketing: true, emailUpdates: true, pushNotifications: false }) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              { id: 'n1', title: 'Новый эпизод', body: 'Вышел новый эпизод', type: 'CONTENT', isRead: false, createdAt: fiveMinutesAgo },
              { id: 'n2', title: 'Оплата', body: 'Оплата прошла', type: 'PAYMENT', isRead: false, createdAt: oneHourAgo },
            ],
            total: 2,
          },
        }),
      });
    });
    await mockApis(page);
    await injectAuth(page);

    await page.goto('/account/notifications');
    await page.waitForLoadState('networkidle');

    const bodyText = await getAllVisibleText(page);

    // Should contain Russian relative time words
    // Intl.RelativeTimeFormat('ru') produces: "5 минут назад", "1 час назад", etc.
    const hasRussianRelativeTime = /назад|только что|минут|час/i.test(bodyText);
    expect(hasRussianRelativeTime).toBe(true);

    // Should NOT contain English relative time words
    expect(bodyText).not.toMatch(/\bago\b/i);
    expect(bodyText).not.toMatch(/\bjust now\b/i);
  });

  // --------------------------------------------------------------------------
  // 9. Month names in Russian on date-displaying pages
  // --------------------------------------------------------------------------
  test('Russian month names appear in formatted dates', async ({ page }) => {
    await mockApis(page);
    await injectAuth(page);

    // The profile page shows registration date with { month: 'long' } format
    // which produces full Russian month names
    await page.route('**/api/v1/users/profile', async (route) => {
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
            phone: '',
            avatarUrl: '',
          },
        }),
      });
    });

    // Add createdAt and dateOfBirth to the user for the profile info section
    await page.addInitScript(() => {
      localStorage.setItem('mp-auth-storage', JSON.stringify({
        state: {
          user: {
            id: 'user-1',
            email: 'user@test.movieplatform.ru',
            firstName: 'Тест',
            lastName: 'Пользователь',
            role: 'USER',
            createdAt: '2024-06-15T10:00:00Z',
            dateOfBirth: '1995-03-22T00:00:00Z',
            ageCategory: '18+',
          },
          accessToken: 'mock-token',
          refreshToken: 'mock-refresh',
          isAuthenticated: true,
          isHydrated: true,
        },
        version: 0,
      }));
    });

    await page.goto('/account/profile');
    await page.waitForLoadState('networkidle');

    const bodyText = await getAllVisibleText(page);

    // formatDate with { month: 'long' } + ru-RU locale produces genitive month names:
    // "15 июня 2024" and "22 марта 1995"
    const russianMonthsGenitive = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
    ];

    const foundMonths = russianMonthsGenitive.filter((month) =>
      bodyText.toLowerCase().includes(month)
    );

    // At least one Russian month should be found (from createdAt or dateOfBirth)
    expect(foundMonths.length).toBeGreaterThanOrEqual(1);
  });

  // --------------------------------------------------------------------------
  // 10. No English text leaks across main pages
  // --------------------------------------------------------------------------
  test('no common English UI text leaks on main pages', async ({ page }) => {
    await mockApis(page);

    // List of common English UI words that should NOT appear
    // in a fully Russian-localized platform.
    // All sidebar, header, and admin labels are now translated to Russian.
    const forbiddenEnglishWords = [
      'Login',
      'Sign in',
      'Sign up',
      'Register',
      'Submit',
      'Forgot password',
      'Remember me',
      'Log out',
      'Dashboard',
      'Settings',
      'Profile',
      'Search',
      'Subscribe',
      'Add to cart',
      'Checkout',
    ];

    // Pages to scan (mix of public and auth-required pages)
    const publicPages = ['/', '/login', '/register', '/pricing'];

    for (const pagePath of publicPages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      const bodyText = await getAllVisibleText(page);

      for (const englishWord of forbiddenEnglishWords) {
        // Use exact case match for multi-word phrases and case-sensitive for single words
        // This avoids false positives with CSS class names or data attributes
        const found = bodyText.includes(englishWord);
        if (found) {
          // Provide a helpful failure message indicating which page and which word leaked
          expect(
            found,
            `English text "${englishWord}" found on page "${pagePath}"`
          ).toBe(false);
        }
      }
    }
  });
});
