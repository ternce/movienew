"use client";

import { CheckCircle, Desktop, Info } from "@phosphor-icons/react";

import { PwaInstallAction } from "@/components/pwa/pwa-install-action";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export function PwaInstallCard() {
  const { installMethod, isInstalled, isStandalone, platform } =
    usePwaInstall();
  const isInstalledOrStandalone = isInstalled || isStandalone;
  const canShowInstallAction = installMethod !== "unavailable";
  const installCopy =
    platform === "ios"
      ? "Добавьте SESH на экран «Домой», чтобы открывать его как приложение."
      : "Откройте SESH в отдельном окне без лишних элементов браузера.";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Desktop className="h-5 w-5 text-mp-accent-primary" />
          Приложение SESH
        </CardTitle>
        <CardDescription>
          Установите SESH на устройство для быстрого запуска.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isInstalledOrStandalone ? (
          <div className="flex items-start gap-3 rounded-lg border border-mp-border bg-mp-surface/50 p-4">
            <CheckCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-mp-success-text"
              weight="fill"
            />
            <div>
              <p className="text-sm font-medium text-mp-text-primary">
                Приложение установлено
              </p>
              <p className="mt-0.5 text-sm text-mp-text-secondary">
                SESH уже открыт как установленное приложение.
              </p>
            </div>
          </div>
        ) : canShowInstallAction ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-mp-text-secondary">{installCopy}</p>
            <PwaInstallAction className="shrink-0" />
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-mp-border bg-mp-surface/50 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-mp-text-secondary" />
            <p className="text-sm text-mp-text-secondary">
              Установка доступна через меню браузера, если он поддерживает
              установку веб-приложений.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
