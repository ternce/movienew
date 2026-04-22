'use client';

import { Play, Users, Gift, Shield, Television, GraduationCap, Envelope } from '@phosphor-icons/react';

import { Container } from '@/components/ui/container';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Television,
    title: 'Видеоконтент',
    description: 'Сериалы, клипы, shorts и обучающие курсы — всё в одном месте с адаптивным стримингом.',
  },
  {
    icon: Users,
    title: 'Партнёрская программа',
    description: '5-уровневая реферальная система с комиссионными. Приглашайте друзей и зарабатывайте.',
  },
  {
    icon: Gift,
    title: 'Бонусная система',
    description: 'Получайте бонусы за активность и тратьте их на подписки, товары и эксклюзивный контент.',
  },
  {
    icon: Shield,
    title: 'Безопасность',
    description: 'Возрастная маркировка контента, верификация пользователей и защита персональных данных.',
  },
  {
    icon: GraduationCap,
    title: 'Обучение',
    description: 'Профессиональные видеокурсы с отслеживанием прогресса и сертификатами об окончании.',
  },
  {
    icon: Play,
    title: 'Качество',
    description: 'Адаптивный стриминг до 4K, мультиязычные субтитры и поддержка всех устройств.',
  },
];

export default function AboutPage() {
  return (
    <Container size="lg" as="article" className="py-8">
      {/* Hero */}
      <section className="text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-mp-accent-primary/10 text-mp-accent-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
          <Play className="w-4 h-4" />
          Платформа нового поколения
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-mp-text-primary mb-4">
          О Movie<span className="text-gradient">Platform</span>
        </h1>
        <p className="text-lg text-mp-text-secondary max-w-2xl mx-auto">
          Современная платформа для просмотра и создания видеоконтента с интегрированной
          партнёрской программой, бонусной системой и магазином.
        </p>
      </section>

      {/* Mission */}
      <section className="mb-16">
        <Card className="border-mp-border bg-mp-surface/50">
          <CardContent className="p-8 sm:p-12 text-center">
            <h2 className="text-2xl font-bold text-mp-text-primary mb-4">Наша миссия</h2>
            <p className="text-mp-text-secondary max-w-3xl mx-auto leading-relaxed">
              Мы создаём экосистему, где каждый может найти интересный контент,
              учиться новому и зарабатывать, рекомендуя платформу друзьям.
              MoviePlatform объединяет лучшее от стриминговых сервисов,
              образовательных платформ и социальных сетей в едином удобном интерфейсе.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Features grid */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-mp-text-primary text-center mb-8">
          Возможности платформы
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="border-mp-border bg-mp-surface/50 hover:bg-mp-surface transition-colors">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-mp-accent-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-mp-accent-primary" />
                </div>
                <h3 className="text-lg font-semibold text-mp-text-primary mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-mp-text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="text-center">
        <Card className="border-mp-border bg-mp-surface/50">
          <CardContent className="p-8">
            <Envelope className="w-10 h-10 text-mp-accent-secondary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-mp-text-primary mb-2">Свяжитесь с нами</h2>
            <p className="text-mp-text-secondary mb-4">
              Есть вопросы или предложения? Напишите нам.
            </p>
            <a
              href="mailto:support@movieplatform.ru"
              className="inline-flex items-center gap-2 text-mp-accent-primary hover:underline font-medium"
            >
              support@movieplatform.ru
            </a>
          </CardContent>
        </Card>
      </section>
    </Container>
  );
}
