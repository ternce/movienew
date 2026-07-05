'use client';

import {
  Coins,
  CreditCard,
  ListChecks,
  Package,
  Receipt,
  ShieldCheck,
} from '@phosphor-icons/react';

import {
  FinancialCTAGroup,
  FinancialFAQ,
  FinancialInfoHero,
  FinancialInfoPageShell,
  FinancialNoticeCard,
  FinancialProcessPreview,
  FinancialStepsTimeline,
  FutureFeatureBadge,
  type FinancialStep,
} from '@/components/finance';

const tokenPurchaseSteps: FinancialStep[] = [
  {
    title: 'Уточнить продуктовую модель',
    description:
      'Пакеты, цены, валюты и ограничения должны быть подтверждены до запуска покупки токенов.',
    icon: Package,
  },
  {
    title: 'Выбрать способ оплаты',
    description:
      'Методы оплаты подключаются через платежный слой после финансовой и продуктовой настройки.',
    icon: CreditCard,
  },
  {
    title: 'Подтвердить покупку',
    description:
      'Экран подтверждения должен показывать пакет, сумму, способ оплаты и условия зачисления.',
    icon: ShieldCheck,
  },
  {
    title: 'Завершить оплату',
    description:
      'Пользователь переходит к платежному провайдеру или получает инструкции для выбранного метода.',
    icon: Receipt,
  },
  {
    title: 'Получить токены',
    description:
      'Зачисление выполняется серверной обработкой после подтверждения платежа.',
    icon: Coins,
  },
  {
    title: 'Отследить статус',
    description:
      'Статус платежа должен быть доступен в кошельке и истории операций.',
    icon: ListChecks,
  },
];

const tokenFaq = [
  {
    question: 'Можно ли купить токены с этой страницы?',
    answer:
      'Нет. Страница информационная и не запускает оплату.',
  },
  {
    question: 'Почему здесь нет пакетов и цен?',
    answer:
      'Пакеты, цены и условия покупки требуют отдельного финансового и продуктового уточнения.',
  },
  {
    question: 'Где должен отображаться статус платежа?',
    answer:
      'После запуска функциональности статус должен отображаться в кошельке и истории платежей.',
  },
  {
    question: 'Можно ли использовать этот UI для подписок?',
    answer:
      'Нет напрямую. Подписки и токены должны иметь отдельную бизнес-логику и платежные состояния.',
  },
];

export default function TokenHowToBuyPage() {
  return (
    <FinancialInfoPageShell>
      <FinancialInfoHero
        icon={Coins}
        eyebrow={<FutureFeatureBadge>Информационный раздел</FutureFeatureBadge>}
        title="Как может работать покупка токенов"
        description="Это справочная страница о возможном flow. Покупка токенов не активна, пока не подтверждены продуктовые условия, пакеты и платежная логика."
      >
        <FinancialCTAGroup
          actions={[
            { href: '/account/wallet', label: 'Открыть кошелек', variant: 'outline' },
            { href: '/account/payments', label: 'История платежей', variant: 'ghost' },
          ]}
        />
      </FinancialInfoHero>

      <FinancialNoticeCard
        title="Покупка токенов пока не является активной функцией"
        description="На странице нет цен, пакетов и платежных действий. Перед запуском нужны финансовые и продуктовые уточнения."
        tone="warning"
      />

      <FinancialStepsTimeline steps={tokenPurchaseSteps} />

      <FinancialProcessPreview
        title="Будущий платежный статус"
        description="Единый статус поможет одинаково отображать ожидание оплаты, успех, ошибку или отмену."
        items={[
          { label: 'Платеж', value: 'Ожидает оплаты' },
          { label: 'Пакет', value: 'Требует уточнения' },
          { label: 'Зачисление', value: 'После подтверждения' },
        ]}
      />

      <FinancialFAQ items={tokenFaq} />
    </FinancialInfoPageShell>
  );
}
