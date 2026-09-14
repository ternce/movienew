"use client";

import { DownloadSimple, SpinnerGap } from "@phosphor-icons/react";
import { toast } from "sonner";

import { IosInstallGuide } from "@/components/pwa/ios-install-guide";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { cn } from "@/lib/utils";
import * as React from "react";

interface PwaInstallActionProps {
  className?: string;
  mobileMenuItem?: boolean;
  nativeOnly?: boolean;
  onNativePromptComplete?: () => void;
}

export function PwaInstallAction({
  className,
  mobileMenuItem = false,
  nativeOnly = false,
  onNativePromptComplete,
}: PwaInstallActionProps) {
  const { install, installMethod, isPrompting } = usePwaInstall();
  const [showIosGuide, setShowIosGuide] = React.useState(false);

  if (installMethod === "unavailable") return null;
  if (nativeOnly && installMethod !== "native-prompt") return null;

  const handleClick = async () => {
    if (installMethod === "ios-instructions") {
      setShowIosGuide(true);
      return;
    }

    const result = await install();
    onNativePromptComplete?.();

    if (result.outcome === "accepted") {
      toast.success("Установка SESH началась");
    } else if (result.outcome === "error") {
      toast.error("Не удалось открыть установку SESH");
    }
  };

  const icon = isPrompting ? (
    <SpinnerGap className="h-4 w-4 animate-spin" />
  ) : (
    <DownloadSimple className="h-4 w-4" />
  );

  return (
    <>
      {mobileMenuItem ? (
        <button
          type="button"
          onClick={handleClick}
          disabled={isPrompting}
          className={cn(
            "relative flex w-full items-center text-[13px] font-normal text-white/78 transition-colors hover:bg-white/[0.045] hover:text-white disabled:opacity-50",
            "h-[32px] gap-3 px-[32px]",
            className,
          )}
        >
          <span className="text-white/48">{icon}</span>
          <span className="truncate">Установить SESH</span>
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={isPrompting}
          className={cn("h-8 shrink-0 px-3 text-white/80", className)}
        >
          {icon}
          Установить SESH
        </Button>
      )}

      <IosInstallGuide open={showIosGuide} onOpenChange={setShowIosGuide} />
    </>
  );
}
