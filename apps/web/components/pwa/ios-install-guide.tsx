"use client";

import { Export, House, Plus, X } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface IosInstallGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  {
    icon: Export,
    text: "Нажмите кнопку «Поделиться» в Safari.",
  },
  {
    icon: House,
    text: "Выберите «На экран «Домой»».",
  },
  {
    icon: Plus,
    text: "Нажмите «Добавить».",
  },
];

export function IosInstallGuide({ open, onOpenChange }: IosInstallGuideProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md overflow-y-auto border-white/10 bg-[#090512]/95 p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:rounded-xl">
        <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-5">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle className="text-xl text-white">
              Установить SESH
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-white/68">
              Добавьте SESH на экран «Домой», чтобы открывать его как
              приложение.
            </DialogDescription>
          </DialogHeader>

          <ol className="mt-5 space-y-3">
            {steps.map((step, index) => (
              <li
                key={step.text}
                className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mp-accent-primary/18 text-mp-accent-primary">
                  <step.icon className="h-4 w-4" />
                </div>
                <p className="text-sm leading-6 text-white/82">
                  <span className="mr-1 text-white/42">{index + 1}.</span>
                  {step.text}
                </p>
              </li>
            ))}
          </ol>

          <DialogClose asChild>
            <Button type="button" variant="outline" className="mt-5 w-full">
              <X className="h-4 w-4" />
              Закрыть
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
