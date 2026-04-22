'use client';

import { ShareNetwork, QrCode, ChatCircle, Envelope, PaperPlaneTilt } from '@phosphor-icons/react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { ReferralLinkDisplay } from './referral-link-display';

interface PartnerInviteCardProps {
  referralCode?: string;
  referralUrl?: string;
  isLoading?: boolean;
  className?: string;
}

export function PartnerInviteCard({
  referralCode,
  referralUrl,
  isLoading,
  className,
}: PartnerInviteCardProps) {
  if (isLoading) {
    return <PartnerInviteCardSkeleton className={className} />;
  }

  if (!referralCode || !referralUrl) {
    return null;
  }

  const shareText = `Присоединяйся к MoviePlatform! Используй мой код ${referralCode} и получи бонусы при регистрации.`;

  const shareLinks = [
    {
      name: 'Telegram',
      icon: PaperPlaneTilt,
      color: 'hover:bg-[#0088cc]/20 hover:text-[#0088cc]',
      url: `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      name: 'WhatsApp',
      icon: ChatCircle,
      color: 'hover:bg-[#25D366]/20 hover:text-[#25D366]',
      url: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + referralUrl)}`,
    },
    {
      name: 'VK',
      icon: ShareNetwork,
      color: 'hover:bg-[#4C75A3]/20 hover:text-[#4C75A3]',
      url: `https://vk.com/share.php?url=${encodeURIComponent(referralUrl)}&title=${encodeURIComponent(shareText)}`,
    },
    {
      name: 'Email',
      icon: Envelope,
      color: 'hover:bg-mp-accent-primary/20 hover:text-mp-accent-primary',
      url: `mailto:?subject=${encodeURIComponent('Приглашение в MoviePlatform')}&body=${encodeURIComponent(shareText + '\n\n' + referralUrl)}`,
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShareNetwork className="h-5 w-5 text-mp-accent-primary" />
          Пригласить друзей
        </CardTitle>
        <CardDescription>
          Поделитесь своей реферальной ссылкой и получайте комиссию с каждой покупки
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ReferralLinkDisplay
          referralCode={referralCode}
          referralUrl={referralUrl}
        />

        <div className="space-y-3">
          <p className="text-sm font-medium text-mp-text-secondary">
            Поделиться в соцсетях
          </p>
          <div className="flex flex-wrap gap-2">
            {shareLinks.map((link) => (
              <Button
                key={link.name}
                variant="outline"
                size="sm"
                className={cn('gap-2 transition-colors', link.color)}
                asChild
              >
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  <link.icon className="h-4 w-4" />
                  {link.name}
                </a>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loader
 */
function PartnerInviteCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-36" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
