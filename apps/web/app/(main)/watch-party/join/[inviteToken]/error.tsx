"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Power } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

export default function WatchPartyJoinError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[watch-party:route] render failed", error);
    }
  }, [error]);

  return (
    <div className="sesh-watch-party-page">
      <div className="sesh-watch-party-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="sesh-glass-panel w-full max-w-lg p-6 text-center">
          <Power className="mx-auto mb-4 h-10 w-10 text-[#ff85aa]" />
          <h1 className="text-xl font-semibold text-white md:text-2xl">
            Не удалось открыть комнату совместного просмотра.
          </h1>
          <p className="mt-2 text-sm text-white/62">
            Произошла непредвиденная ошибка.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Button type="button" variant="ghost" className="rounded-full" onClick={() => router.push("/")}>
              Вернуться на главную
            </Button>
            <Button type="button" className="rounded-full" onClick={reset}>
              Повторить
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
