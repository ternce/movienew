'use client';

import {
  Envelope,
  PaperPlaneTilt,
  Clock,
  CaretDown,
  Question,
  FileText,
  ArrowRight,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useState } from 'react';

import { Container } from '@/components/ui/container';
import { Card, CardContent } from '@/components/ui/card';

const contactChannels = [
  {
    icon: Envelope,
    label: 'Email',
    value: 'support@movieplatform.ru',
    href: 'mailto:support@movieplatform.ru',
    description: 'Для любых вопросов и обращений',
  },
  {
    icon: PaperPlaneTilt,
    label: 'Telegram',
    value: '@movieplatform_support',
    href: 'https://t.me/movieplatform_support',
    description: 'Быстрые ответы в мессенджере',
  },
  {
    icon: Clock,
    label: 'Время работы',
    value: 'Пн-Пт, 10:00-19:00 МСК',
    href: undefined,
    description: 'Ответим в рабочее время',
  },
];

const faqItems = [
  {
    question: 'Как оформить подписку?',
    answer:
      'Перейдите на страницу тарифов, выберите подходящий план и следуйте инструкциям по оплате. Мы поддерживаем оплату картой, СБП и ЮKassa.',
    link: { label: 'Перейти к тарифам', href: '/pricing' },
  },
  {
    question: 'Как стать партнером?',
    answer:
      'Зарегистрируйтесь на платформе и перейдите в раздел партнерской программы. Вы получите уникальную реферальную ссылку и сможете зарабатывать комиссии с покупок приглашённых пользователей.',
    link: { label: 'Партнерская программа', href: '/partner' },
  },
  {
    question: 'Как изменить данные профиля?',
    answer:
      'Перейдите в раздел "Профиль" в вашем аккаунте. Там вы можете изменить имя, email, аватар и другие настройки.',
    link: { label: 'Настройки профиля', href: '/account/profile' },
  },
  {
    question: 'Проблемы с воспроизведением видео?',
    answer:
      'Попробуйте обновить страницу, проверьте скорость интернет-соединения и убедитесь, что ваш браузер обновлён до последней версии. Рекомендуем использовать Chrome, Firefox или Safari.',
  },
  {
    question: 'Как работает бонусная система?',
    answer:
      'Вы получаете бонусы за активность на платформе: покупки, рефералов, достижения. Бонусы можно тратить на подписки и товары в магазине.',
  },
  {
    question: 'Как вывести заработанные средства?',
    answer:
      'Перейдите в раздел бонусов в вашем аккаунте и выберите "Вывод средств". Минимальная сумма для вывода — 1000 бонусов. Выплаты обрабатываются в течение 1-3 рабочих дней.',
  },
];

const documentLinks = [
  { label: 'Условия использования', href: '/documents/terms' },
  { label: 'Политика конфиденциальности', href: '/documents/privacy' },
  { label: 'Партнерское соглашение', href: '/documents/partner' },
];

function FaqItem({ question, answer, link }: (typeof faqItems)[number]) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-mp-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-mp-surface/50 transition-colors"
      >
        <span className="text-sm font-medium text-mp-text-primary">{question}</span>
        <CaretDown
          className={`w-4 h-4 text-mp-text-secondary shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 -mt-1">
          <p className="text-sm text-mp-text-secondary leading-relaxed">{answer}</p>
          {link && (
            <Link
              href={link.href}
              className="inline-flex items-center gap-1.5 text-sm text-mp-accent-primary hover:underline mt-3 font-medium"
            >
              {link.label}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function SupportPage() {
  return (
    <Container size="lg" as="article" className="py-8">
      {/* Hero */}
      <section className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-mp-accent-secondary/10 text-mp-accent-secondary px-4 py-2 rounded-full text-sm font-medium mb-6">
          <Question className="w-4 h-4" />
          Центр помощи
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-mp-text-primary mb-4">
          Поддержка
        </h1>
        <p className="text-lg text-mp-text-secondary max-w-2xl mx-auto">
          Мы здесь, чтобы помочь. Найдите ответ в FAQ или свяжитесь с нашей командой.
        </p>
      </section>

      {/* Contact channels */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {contactChannels.map((channel) => (
            <Card key={channel.label} className="border-mp-border bg-mp-surface/50">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-mp-accent-primary/10 flex items-center justify-center mx-auto mb-4">
                  <channel.icon className="w-6 h-6 text-mp-accent-primary" />
                </div>
                <h3 className="text-sm font-semibold text-mp-text-primary mb-1">
                  {channel.label}
                </h3>
                {channel.href ? (
                  <a
                    href={channel.href}
                    className="text-sm text-mp-accent-primary hover:underline font-medium"
                    target={channel.href.startsWith('https') ? '_blank' : undefined}
                    rel={channel.href.startsWith('https') ? 'noopener noreferrer' : undefined}
                  >
                    {channel.value}
                  </a>
                ) : (
                  <p className="text-sm text-mp-text-primary font-medium">{channel.value}</p>
                )}
                <p className="text-xs text-mp-text-secondary mt-2">{channel.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-mp-text-primary text-center mb-8">
          Часто задаваемые вопросы
        </h2>
        <div className="max-w-3xl mx-auto space-y-3">
          {faqItems.map((item) => (
            <FaqItem key={item.question} {...item} />
          ))}
        </div>
      </section>

      {/* Documents */}
      <section className="text-center">
        <Card className="border-mp-border bg-mp-surface/50">
          <CardContent className="p-8">
            <FileText className="w-10 h-10 text-mp-accent-secondary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-mp-text-primary mb-4">Документы</h2>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {documentLinks.map((doc) => (
                <Link
                  key={doc.href}
                  href={doc.href}
                  className="inline-flex items-center gap-1.5 text-sm text-mp-text-secondary hover:text-mp-accent-primary transition-colors"
                >
                  {doc.label}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </Container>
  );
}
