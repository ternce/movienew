'use client';

import {
  Bank,
  CheckCircle,
  ClockCountdown,
  CurrencyRub,
  ShieldCheck,
  Wallet,
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

const withdrawalSteps: FinancialStep[] = [
  {
    title: 'Проверьте бонусный баланс',
    description:
      'Убедитесь, что на балансе достаточно бонусов для минимальной суммы вывода.',
    icon: Wallet,
  },
  {
    title: 'Откройте заявку',
    description:
      'Заявка оформляется через бонусный раздел: укажите сумму и доступный способ получения средств.',
    icon: Bank,
  },
  {
    title: 'Проверьте расчет',
    description:
      'Перед отправкой отображаются сумма, возможные удержания и условия обработки.',
    icon: CurrencyRub,
  },
  {
    title: 'Подтвердите данные',
    description:
      'Проверьте реквизиты и подтвердите заявку перед передачей на обработку.',
    icon: ShieldCheck,
  },
  {
    title: 'Отслеживайте статус',
    description:
      'Статус заявки можно проверять в истории операций и в бонусном разделе.',
    icon: ClockCountdown,
  },
  {
    title: 'Получите результат',
    description:
      'После обработки заявка получает итоговый статус: выполнена, отклонена или ожидает действия.',
    icon: CheckCircle,
  },
];

const withdrawalFaq = [
  {
    question: 'Где оформляется вывод бонусов?',
    answer:
      'Заявка оформляется в бонусном разделе. Эта страница только объясняет порядок действий.',
  },
  {
    question: 'Где смотреть статус заявки?',
    answer:
      'Статус должен отображаться в истории операций и рядом с заявкой на вывод.',
  },
  {
    question: 'Когда выполняется платежная обработка?',
    answer:
      'Платежная обработка выполняется согласно правилам платформы после проверки заявки.',
  },
  {
    question: 'Нужно ли повторно вводить реквизиты?',
    answer:
      'Реквизиты вводятся только внутри защищенного flow оформления заявки.',
  },
];

export default function BonusWithdrawalHowItWorksPage() {
  return (
    <FinancialInfoPageShell>
      <FinancialInfoHero
        icon={Wallet}
        eyebrow={<FutureFeatureBadge>Информационный раздел</FutureFeatureBadge>}
        title="Как работает вывод бонусов"
        description="Короткий порядок действий: проверьте баланс, оформите заявку в бонусном разделе и отслеживайте статус в истории операций."
      >
        <FinancialCTAGroup
          actions={[
            { href: '/bonuses', label: 'К бонусам' },
            { href: '/bonuses/withdraw', label: 'Оформить заявку', variant: 'outline' },
          ]}
        />
      </FinancialInfoHero>

      <FinancialNoticeCard
        title="Заявка оформляется через бонусный раздел"
        description="Эта страница объясняет порядок вывода бонусов. Платежная обработка и проверка выполняются согласно правилам платформы."
        tone="info"
      />

      <FinancialStepsTimeline steps={withdrawalSteps} />

      <FinancialProcessPreview
        title="Статус заявки"
        description="После отправки заявка проходит проверку и отображается в истории операций."
        items={[
          { label: 'Статус', value: 'Ожидает обработки' },
          { label: 'Операция', value: 'Вывод бонусов' },
          { label: 'Детали', value: 'Сумма, метод, дата' },
        ]}
      />

      <FinancialFAQ items={withdrawalFaq} />
    </FinancialInfoPageShell>
  );
}
