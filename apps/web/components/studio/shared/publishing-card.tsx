'use client';

import { Check } from '@phosphor-icons/react';
import { Controller, type UseFormReturn } from 'react-hook-form';

import { AgeRatingSelector } from '@/components/studio/age-rating-selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ============ Types ============

export interface PublishingCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  isEditMode?: boolean;
  disabled?: boolean;
}

// ============ Status Card ============

function StatusCard({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start rounded-lg border p-3 text-left transition-all duration-200',
        selected
          ? 'border-[#c94bff] bg-[#c94bff]/10'
          : 'border-[#272b38] bg-[#10131c]/50 hover:border-[#5a6072]'
      )}
    >
      <span
        className={cn(
          'text-sm font-medium',
          selected ? 'text-[#c94bff]' : 'text-[#f5f7ff]'
        )}
      >
        {label}
      </span>
      <span className="text-xs text-[#9ca2bc] mt-0.5">{description}</span>
    </button>
  );
}

// ============ Component ============

export function PublishingCard({
  form,
  isEditMode = false,
  disabled = false,
}: PublishingCardProps) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;

  const isFree = watch('isFree') as boolean;

  return (
    <div className="space-y-6">
      {/* Age Rating */}
      <Card className="border-[#272b38] bg-[#10131c]/50">
        <CardHeader>
          <CardTitle className="text-lg text-[#f5f7ff]">
            Возрастное ограничение *
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            name="ageCategory"
            control={control}
            render={({ field }) => (
              <AgeRatingSelector
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
              />
            )}
          />
          {errors.ageCategory && (
            <p className="mt-2 text-xs text-[#ff9aa8]">
              {(errors.ageCategory as { message?: string }).message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Monetization */}
      <Card className="border-[#272b38] bg-[#10131c]/50">
        <CardHeader>
          <CardTitle className="text-lg text-[#f5f7ff]">
            Монетизация
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Controller
            name="isFree"
            control={control}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isFree"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                />
                <Label htmlFor="isFree" className="text-[#f5f7ff]">
                  Бесплатный контент
                </Label>
              </div>
            )}
          />

          {!isFree && (
            <div className="space-y-2">
              <Label htmlFor="individualPrice" className="text-[#f5f7ff]">
                Цена (руб.)
              </Label>
              <Input
                id="individualPrice"
                type="number"
                {...register('individualPrice')}
                placeholder="0"
                min="0"
                step="1"
                disabled={disabled}
                className="border-[#272b38] bg-[#10131c]/50 text-[#f5f7ff] placeholder:text-[#5a6072] max-w-[200px]"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status */}
      <Card className="border-[#272b38] bg-[#10131c]/50">
        <CardHeader>
          <CardTitle className="text-lg text-[#f5f7ff]">
            Статус публикации
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditMode ? (
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <StatusCard
                    label="Черновик"
                    description="Сохранить как черновик"
                    selected={field.value === 'DRAFT'}
                    onClick={() => field.onChange('DRAFT')}
                  />
                  <StatusCard
                    label="На модерацию"
                    description="Отправить на проверку"
                    selected={field.value === 'PENDING'}
                    onClick={() => field.onChange('PENDING')}
                  />
                  <StatusCard
                    label="Опубликован"
                    description="Доступен всем"
                    selected={field.value === 'PUBLISHED'}
                    onClick={() => field.onChange('PUBLISHED')}
                  />
                  <StatusCard
                    label="Архив"
                    description="Скрыть контент"
                    selected={field.value === 'ARCHIVED'}
                    onClick={() => field.onChange('ARCHIVED')}
                  />
                </div>
              )}
            />
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-[#272b38] bg-[#10131c]/50 p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5a6072]/10">
                <Check
                  weight="bold"
                  className="h-4 w-4 text-[#9ca2bc]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[#f5f7ff]">
                  Черновик
                </p>
                <p className="text-xs text-[#9ca2bc]">
                  Новый контент сохраняется как черновик. Вы сможете изменить
                  статус после создания.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
