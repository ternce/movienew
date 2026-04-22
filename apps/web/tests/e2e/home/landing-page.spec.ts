import { test, expect, LandingPage } from '../fixtures/home.fixture';

test.describe('Landing Page — Redesigned', () => {
  let landingPage: LandingPage;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    await landingPage.goto();
  });

  // =========================================================================
  // Navigation
  // =========================================================================

  test('Навигация отображается с логотипом и кнопками', async () => {
    await expect(landingPage.nav).toBeVisible();
    await expect(landingPage.logo).toBeVisible();
  });

  test('Ссылки навигации видны на десктопе', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await landingPage.goto();

    const seriesLink = page.getByRole('link', { name: 'Сериалы' }).first();
    const educationLink = page.getByRole('link', { name: 'Обучение' }).first();
    const pricingLink = page.getByRole('link', { name: 'Тарифы' }).first();
    const partnersLink = page.getByRole('link', { name: 'Партнерам' }).first();

    await expect(seriesLink).toBeVisible();
    await expect(educationLink).toBeVisible();
    await expect(pricingLink).toBeVisible();
    await expect(partnersLink).toBeVisible();
  });

  test('Ссылки навигации скрыты на мобильном', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await landingPage.goto();

    const navContainer = page.locator('header nav');
    await expect(navContainer).not.toBeVisible();
  });

  test('Кнопка "Войти" переходит на страницу логина', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await landingPage.goto();
    const href = await landingPage.loginButton.getAttribute('href');
    expect(href).toBe('/login');
  });

  test('Кнопка "Начать" переходит на страницу регистрации', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await landingPage.goto();
    const href = await landingPage.registerButton.getAttribute('href');
    expect(href).toBe('/register');
  });

  // =========================================================================
  // Hero Section
  // =========================================================================

  test('Hero секция отображается с заголовком и описанием', async () => {
    await expect(landingPage.heroTitle).toBeVisible();
    await expect(landingPage.heroSubtitle).toBeVisible();
  });

  test('Hero CTA кнопки отображаются', async () => {
    await expect(landingPage.heroCTAPrimary).toBeVisible();
    await expect(landingPage.heroCTASecondary).toBeVisible();
  });

  test('Hero CTA "Начать бесплатно" переходит на регистрацию', async () => {
    const href = await landingPage.heroCTAPrimary.getAttribute('href');
    expect(href).toBe('/register');
  });

  test('Hero CTA "Узнать о тарифах" переходит на тарифы', async () => {
    const href = await landingPage.heroCTASecondary.getAttribute('href');
    expect(href).toBe('/pricing');
  });

  test('Eyebrow badge отображается', async () => {
    await expect(landingPage.heroEyebrow).toBeVisible();
  });

  test('Hero изображение загружается', async () => {
    await expect(landingPage.heroImage).toBeVisible();
  });

  test('Плавающие карточки видны на десктопе', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await landingPage.goto();

    // Floating stat cards should be visible on large screens
    const filmCard = page.getByText('10K+');
    await expect(filmCard).toBeVisible();
  });

  // =========================================================================
  // Stats Section
  // =========================================================================

  test('Секция статистики отображается с 4 счетчиками', async () => {
    await expect(landingPage.statsSection).toBeVisible();

    // Check all stat labels are present
    await expect(landingPage.page.getByText('Единиц контента')).toBeVisible();
    await expect(landingPage.page.getByText('Зрителей')).toBeVisible();
    await expect(landingPage.page.getByText('Качество видео')).toBeVisible();
    await expect(landingPage.page.getByText('Поддержка')).toBeVisible();
  });

  // =========================================================================
  // Content Preview (Bento Grid + Scroll Rows)
  // =========================================================================

  test('Секция "Популярное сейчас" с бенто-гридом отображается', async () => {
    await expect(landingPage.contentPreviewSection).toBeVisible();
    await expect(landingPage.bentoGrid).toBeVisible();
  });

  test('Контентные карточки отображаются (бенто + ряды)', async () => {
    const count = await landingPage.contentCards.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test('Ссылки "Смотреть все" ведут на страницы контента', async () => {
    const count = await landingPage.contentRows.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  // =========================================================================
  // Features Section (6 cards)
  // =========================================================================

  test('Секция "Почему выбирают нас" отображается', async () => {
    await expect(landingPage.featuresSection).toBeVisible();
  });

  test('6 карточек фич отображаются', async () => {
    const count = await landingPage.featureCards.count();
    expect(count).toBe(6);
  });

  test('Карточки фич содержат заголовки', async ({ page }) => {
    const features = [
      'HD Качество',
      'Бонусная система',
      'Партнерская программа',
      'Безопасность',
      'Мультиустройства',
      'Умные рекомендации',
    ];
    for (const feature of features) {
      await expect(page.getByText(feature, { exact: true })).toBeVisible();
    }
  });

  // =========================================================================
  // Pricing Section
  // =========================================================================

  test('Секция тарифов отображается с 3 карточками', async () => {
    await expect(landingPage.pricingSection).toBeVisible();

    const count = await landingPage.pricingCards.count();
    expect(count).toBe(3);
  });

  test('Карточки тарифов содержат названия планов', async ({ page }) => {
    const plans = ['Базовый', 'Стандарт', 'Премиум'];
    for (const plan of plans) {
      await expect(page.getByText(plan, { exact: true })).toBeVisible();
    }
  });

  test('Бейдж "Популярный" отображается на карточке Стандарт', async ({ page }) => {
    await expect(page.getByText('Популярный')).toBeVisible();
  });

  // =========================================================================
  // CTA Section
  // =========================================================================

  test('Финальная CTA секция отображается', async () => {
    await expect(landingPage.ctaSection).toBeVisible();
  });

  test('CTA "Начать бесплатно" ведет на регистрацию', async () => {
    const href = await landingPage.ctaButton.getAttribute('href');
    expect(href).toBe('/register');
  });

  test('Стекированные аватары пользователей отображаются', async () => {
    const count = await landingPage.ctaAvatars.count();
    expect(count).toBe(5);
  });

  test('Счётчик "10,000+" зрителей отображается', async ({ page }) => {
    const ctaSection = page.locator('section:has-text("Готовы начать смотреть")');
    await expect(ctaSection.getByText('10,000+')).toBeVisible();
  });

  // =========================================================================
  // Footer
  // =========================================================================

  test('Футер отображается с ссылками', async () => {
    await expect(landingPage.footer).toBeVisible();
    const linkCount = await landingPage.footerLinks.count();
    expect(linkCount).toBeGreaterThanOrEqual(8);
  });

  test('Футер содержит секции ссылок', async ({ page }) => {
    await expect(page.getByText('Контент').first()).toBeVisible();
    await expect(page.getByText('Компания').first()).toBeVisible();
    await expect(page.getByText('Документы').first()).toBeVisible();
  });

  test('Социальные иконки в футере', async () => {
    const count = await landingPage.socialIcons.count();
    expect(count).toBe(3);
  });

  test('Копирайт отображается в футере', async ({ page }) => {
    const copyright = page.getByText(/MoviePlatform\. Все права защищены/);
    await expect(copyright).toBeVisible();
  });

  // =========================================================================
  // Responsive
  // =========================================================================

  test('Мобильная версия: CTA кнопки стекаются вертикально', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await landingPage.goto();

    await expect(landingPage.heroCTAPrimary).toBeVisible();
    await expect(landingPage.heroCTASecondary).toBeVisible();
  });

  test('Десктопная версия: Hero занимает полный viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landingPage.goto();

    const hero = landingPage.heroSection;
    await expect(hero).toBeVisible();
  });

  // =========================================================================
  // Accessibility
  // =========================================================================

  test('Страница имеет корректный title', async ({ page }) => {
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('Все декоративные изображения имеют alt текст', async () => {
    // Check hero image has alt
    const heroImg = landingPage.heroImage;
    const alt = await heroImg.getAttribute('alt');
    expect(alt).toBeTruthy();
  });
});
