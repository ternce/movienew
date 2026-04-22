import { test as base, expect, type Page, type Locator } from '@playwright/test';

// =============================================================================
// Landing Page POM
// =============================================================================

export class LandingPage {
  readonly page: Page;

  // Navigation
  readonly nav: Locator;
  readonly logo: Locator;
  readonly navLinks: Locator;
  readonly loginButton: Locator;
  readonly registerButton: Locator;
  readonly mobileMenuButton: Locator;

  // Hero Section
  readonly heroSection: Locator;
  readonly heroTitle: Locator;
  readonly heroSubtitle: Locator;
  readonly heroCTAPrimary: Locator;
  readonly heroCTASecondary: Locator;
  readonly heroEyebrow: Locator;
  readonly heroImage: Locator;
  readonly floatingCards: Locator;
  readonly scrollIndicator: Locator;

  // Stats Section
  readonly statsSection: Locator;
  readonly statCounters: Locator;

  // Content Preview
  readonly contentPreviewSection: Locator;
  readonly bentoGrid: Locator;
  readonly contentRows: Locator;
  readonly contentCards: Locator;

  // Features
  readonly featuresSection: Locator;
  readonly featureCards: Locator;

  // Pricing
  readonly pricingSection: Locator;
  readonly pricingCards: Locator;

  // CTA
  readonly ctaSection: Locator;
  readonly ctaButton: Locator;
  readonly ctaAvatars: Locator;

  // Footer
  readonly footer: Locator;
  readonly footerLinks: Locator;
  readonly socialIcons: Locator;
  readonly newsletterInput: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navigation
    this.nav = page.locator('header').first();
    this.logo = page.getByText('MoviePlatform').first();
    this.navLinks = page.locator('header nav a');
    this.loginButton = page.getByRole('link', { name: 'Войти' });
    this.registerButton = page.getByRole('link', { name: 'Начать' }).first();
    this.mobileMenuButton = page.locator('header button[aria-label]');

    // Hero
    this.heroSection = page.locator('section').first();
    this.heroTitle = page.locator('h1');
    this.heroSubtitle = page.getByText('Тысячи сериалов');
    this.heroCTAPrimary = page.getByRole('link', { name: 'Начать бесплатно' }).first();
    this.heroCTASecondary = page.getByRole('link', { name: 'Узнать о тарифах' }).first();
    this.heroEyebrow = page.getByText('Стриминговая платформа нового поколения');
    this.heroImage = page.locator('section').first().locator('img').first();
    this.floatingCards = page.locator('section').first().locator('.backdrop-blur-xl');
    this.scrollIndicator = page.getByText('Прокрутите');

    // Stats
    this.statsSection = page.locator('section:has-text("Единиц контента")');
    this.statCounters = page.locator('section:has-text("Единиц контента") span.text-3xl, section:has-text("Единиц контента") span.text-4xl, section:has-text("Единиц контента") span.text-5xl');

    // Content
    this.contentPreviewSection = page.locator('section:has-text("Популярное сейчас")');
    this.bentoGrid = page.locator('section:has-text("Популярное сейчас") .grid');
    this.contentRows = page.locator('text=Смотреть все');
    this.contentCards = page.locator('section:has-text("Популярное сейчас") .group, section:has-text("Сериалы") .group, section:has-text("Обучающие курсы") .group');

    // Features
    this.featuresSection = page.locator('section:has-text("Почему выбирают нас")');
    this.featureCards = page.locator('section:has-text("Почему выбирают нас") .rounded-2xl .rounded-2xl');

    // Pricing
    this.pricingSection = page.locator('section:has-text("Выберите свой тариф")');
    this.pricingCards = page.locator('section:has-text("Выберите свой тариф") h3');

    // CTA
    this.ctaSection = page.locator('section:has-text("Готовы начать смотреть")');
    this.ctaButton = page.locator('section:has-text("Готовы начать смотреть")').getByRole('link', { name: 'Начать бесплатно' });
    this.ctaAvatars = page.locator('section:has-text("Готовы начать смотреть") .rounded-full img');

    // Footer
    this.footer = page.locator('footer');
    this.footerLinks = page.locator('footer a');
    this.socialIcons = page.locator('footer a[aria-label]');
    this.newsletterInput = page.locator('footer input[type="email"]');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }
}

// =============================================================================
// Test Fixture
// =============================================================================

interface HomeFixtures {
  landingPage: LandingPage;
}

export const test = base.extend<HomeFixtures>({
  landingPage: async ({ page }, use) => {
    await use(new LandingPage(page));
  },
});

export { expect };
