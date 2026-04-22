'use client';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  SpinnerGap,
} from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============ Types ============

export interface WizardStep {
  id: number;
  label: string;
  icon?: React.ReactNode;
}

export interface WizardShellProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  /** Called when the user clicks "Next". Return true if validation passed. */
  onNext: () => Promise<boolean>;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitLabel?: string;
  submitIcon?: React.ReactNode;
  /** Optional secondary action shown on the last step (e.g. "Save Draft") */
  onDraftSubmit?: () => void;
  draftLabel?: string;
  cancelHref?: string;
  children: React.ReactNode;
}

// ============ Step Indicator ============

function StepIndicator({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: WizardStep[];
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const isClickable = step.id < currentStep;

        return (
          <React.Fragment key={step.id}>
            {index > 0 && (
              <div
                className={cn(
                  'h-px flex-1 transition-colors duration-300',
                  isCompleted ? 'bg-[#c94bff]' : 'bg-[#272b38]'
                )}
              />
            )}
            <button
              type="button"
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={cn(
                'flex items-center gap-2 rounded-full transition-all duration-300',
                isClickable && 'cursor-pointer hover:opacity-80',
                !isClickable && !isCurrent && 'cursor-default'
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300',
                  isCompleted && 'bg-[#c94bff] border-[#c94bff] text-white',
                  isCurrent &&
                    'border-[#c94bff] text-[#c94bff] bg-[#c94bff]/10',
                  !isCompleted &&
                    !isCurrent &&
                    'border-[#272b38] text-[#5a6072]'
                )}
              >
                {isCompleted ? (
                  <Check weight="bold" className="h-4 w-4" />
                ) : step.icon ? (
                  step.icon
                ) : (
                  step.id
                )}
              </span>
              <span
                className={cn(
                  'text-sm font-medium hidden sm:inline transition-colors duration-300',
                  isCurrent && 'text-[#f5f7ff]',
                  isCompleted && 'text-[#c94bff]',
                  !isCompleted && !isCurrent && 'text-[#5a6072]'
                )}
              >
                {step.label}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ============ Wizard Shell ============

export function WizardShell({
  steps,
  currentStep,
  onStepChange,
  onNext,
  onBack,
  onSubmit,
  isSubmitting,
  submitLabel = 'Создать',
  submitIcon,
  onDraftSubmit,
  draftLabel = 'Сохранить черновик',
  cancelHref = '/studio',
  children,
}: WizardShellProps) {
  const totalSteps = steps.length;
  const isFirstStep = currentStep === steps[0]?.id;
  const isLastStep = currentStep === steps[totalSteps - 1]?.id;

  const handleStepClick = (step: number) => {
    if (step < currentStep) {
      onStepChange(step);
    }
  };

  const handleNext = async () => {
    const passed = await onNext();
    if (passed) {
      const nextStep = Math.min(currentStep + 1, steps[totalSteps - 1].id);
      onStepChange(nextStep);
    }
  };

  return (
    <div className="w-full">
      {/* Back link */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={cancelHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к списку
          </Link>
        </Button>
      </div>

      {/* Step indicator */}
      <StepIndicator
        steps={steps}
        currentStep={currentStep}
        onStepClick={handleStepClick}
      />

      {/* Step content */}
      <div>{children}</div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        <div>
          {!isFirstStep && (
            <Button type="button" variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href={cancelHref}>Отмена</Link>
          </Button>

          {!isLastStep ? (
            <Button type="button" onClick={handleNext}>
              Далее
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <>
              {onDraftSubmit && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onDraftSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {draftLabel}
                </Button>
              )}
              <Button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitting}
                className="bg-[#c94bff] hover:bg-[#c94bff]/90 text-white"
              >
                {isSubmitting ? (
                  <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  submitIcon && (
                    <span className="mr-2 flex items-center">{submitIcon}</span>
                  )
                )}
                {submitLabel}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
