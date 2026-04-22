'use client';

import {
  WarningCircle,
  CheckCircle,
  Clock,
  FileText,
  PaperPlaneTilt,
  Shield,
  ShieldWarning,
  ShieldCheck,
  UploadSimple,
  XCircle,
} from '@phosphor-icons/react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useVerificationStatus, useSubmitVerification } from '@/hooks/use-account';
import { cn, formatDate } from '@/lib/utils';

// ==============================
// Types
// ==============================

interface VerificationFormValues {
  method: string;
  documentUrl: string;
}

// ==============================
// Verification methods
// ==============================

const VERIFICATION_METHODS = [
  { value: 'PAYMENT', label: 'Оплата', description: 'Подтверждение через платёж' },
  { value: 'DOCUMENT', label: 'Загрузка документа', description: 'Загрузите документ для проверки' },
  { value: 'THIRD_PARTY', label: 'Через партнёра', description: 'Верификация через партнёра' },
];

// ==============================
// Step progress
// ==============================

const STEPS = [
  { id: 1, label: 'Способ', description: 'Выберите метод' },
  { id: 2, label: 'Данные', description: 'Загрузите документ' },
  { id: 3, label: 'Проверка', description: 'Ожидание результата' },
];

function StepProgress({ currentStep, status }: { currentStep: number; status: string }) {
  const isCompleted = status === 'VERIFIED';
  const isRejected = status === 'REJECTED';

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const isDone = step.id < currentStep || isCompleted;
          const isFailed = step.id === 3 && isRejected;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                    isDone && 'border-mp-accent-secondary bg-mp-accent-secondary/10 text-mp-accent-secondary',
                    isActive && !isDone && 'border-mp-accent-primary bg-mp-accent-primary/10 text-mp-accent-primary',
                    isFailed && 'border-red-500 bg-red-500/10 text-red-500',
                    !isDone && !isActive && !isFailed && 'border-mp-border text-mp-text-disabled'
                  )}
                >
                  {isDone ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : isFailed ? (
                    <XCircle className="h-5 w-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <div className="text-center">
                  <p className={cn(
                    'text-xs font-medium',
                    isDone && 'text-mp-accent-secondary',
                    isActive && !isDone && 'text-mp-accent-primary',
                    isFailed && 'text-red-500',
                    !isDone && !isActive && !isFailed && 'text-mp-text-disabled'
                  )}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-mp-text-disabled hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'mb-6 h-0.5 flex-1 mx-3',
                    step.id < currentStep || isCompleted
                      ? 'bg-mp-accent-secondary'
                      : 'bg-mp-border'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Verification page
 */
export default function VerificationPage() {
  const { data: verification, isLoading } = useVerificationStatus();
  const submitVerification = useSubmitVerification();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VerificationFormValues>({
    defaultValues: {
      method: 'PAYMENT',
      documentUrl: '',
    },
  });

  const selectedMethod = watch('method');
  const status = verification?.status || 'UNVERIFIED';

  // Calculate step
  const currentStep = React.useMemo(() => {
    if (status === 'VERIFIED') return 3;
    if (status === 'PENDING') return 3;
    if (status === 'REJECTED') return 3;
    // UNVERIFIED — on step 1 or 2 based on method selection
    if (selectedMethod === 'DOCUMENT') return 2;
    return 1;
  }, [status, selectedMethod]);

  const onSubmit = (data: VerificationFormValues) => {
    submitVerification.mutate(
      {
        method: data.method,
        documentUrl: data.method === 'DOCUMENT' ? data.documentUrl : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Заявка на верификацию отправлена');
        },
        onError: () => {
          toast.error('Не удалось отправить заявку');
        },
      }
    );
  };

  const canSubmit = status === 'UNVERIFIED' || status === 'REJECTED';

  // File upload handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Допустимые форматы: JPEG, PNG, WebP, PDF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Максимальный размер файла: 10 МБ');
      return;
    }
    setUploadedFile(file);
    // In production, upload to storage and get URL
    toast.info('Загрузка файлов будет доступна после подключения хранилища');
  };

  if (isLoading) {
    return (
      <div className="py-8 md:py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-8 w-40" />
          </div>
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="mb-6 h-16 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="mt-6 h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-lg bg-mp-accent-secondary/20 p-2">
            <Shield className="h-6 w-6 text-mp-accent-secondary" />
          </div>
          <h1 className="text-2xl font-bold text-mp-text-primary md:text-3xl">
            Верификация
          </h1>
        </div>
        <p className="text-mp-text-secondary">
          Подтвердите вашу личность для доступа к расширенным функциям
        </p>
      </div>

      {/* Step progress indicator */}
      <StepProgress currentStep={currentStep} status={status} />

      {/* Status display */}
      {status === 'UNVERIFIED' && (
        <Card className="mb-6 border-mp-border">
          <CardContent className="flex gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-500/10">
              <ShieldWarning className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <h2 className="font-semibold text-mp-text-primary">
                Аккаунт не верифицирован
              </h2>
              <p className="mt-1 text-sm text-mp-text-secondary">
                Пройдите верификацию, чтобы получить доступ к контенту 18+, выводу средств
                и расширенным функциям партнёрской программы.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {status === 'PENDING' && (
        <Card className="mb-6 border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="flex gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-500/10">
              <Clock className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <h2 className="font-semibold text-mp-text-primary">
                Заявка на рассмотрении
              </h2>
              <p className="mt-1 text-sm text-mp-text-secondary">
                Ваша заявка была отправлена и находится на рассмотрении.
                Мы уведомим вас о результате.
              </p>
              {verification?.createdAt && (
                <p className="mt-2 text-xs text-mp-text-secondary">
                  Дата подачи: {formatDate(verification.createdAt)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {status === 'VERIFIED' && (
        <Card className="mb-6 border-green-500/30 bg-green-500/5">
          <CardContent className="flex gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
              <ShieldCheck className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h2 className="font-semibold text-mp-text-primary">
                Аккаунт верифицирован
              </h2>
              <p className="mt-1 text-sm text-mp-text-secondary">
                Ваш аккаунт успешно верифицирован. Вам доступны все функции платформы.
              </p>
              {verification?.reviewedAt && (
                <p className="mt-2 text-xs text-mp-text-secondary">
                  Дата верификации: {formatDate(verification.reviewedAt)}
                </p>
              )}
              <Badge variant="success" className="mt-3">
                <CheckCircle className="mr-1 h-3 w-3" />
                Верифицирован
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {status === 'REJECTED' && (
        <Card className="mb-6 border-red-500/30 bg-red-500/5">
          <CardContent className="flex gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h2 className="font-semibold text-mp-text-primary">
                Заявка отклонена
              </h2>
              <p className="mt-1 text-sm text-mp-text-secondary">
                К сожалению, ваша заявка на верификацию была отклонена.
                Вы можете отправить заявку повторно.
              </p>
              {verification?.rejectionReason && (
                <div className="mt-3 rounded-lg bg-mp-error-bg p-3">
                  <p className="text-sm font-medium text-mp-error-text">
                    Причина: {verification.rejectionReason}
                  </p>
                </div>
              )}
              {verification?.reviewedAt && (
                <p className="mt-2 text-xs text-mp-text-secondary">
                  Дата отклонения: {formatDate(verification.reviewedAt)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission form */}
      {canSubmit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-mp-accent-primary" />
              Подать заявку
            </CardTitle>
            <CardDescription>
              Выберите способ верификации и заполните необходимые данные
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Method select */}
              <div className="space-y-2">
                <Label>Способ верификации</Label>
                <Select
                  value={selectedMethod}
                  onValueChange={(value) => setValue('method', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите способ" />
                  </SelectTrigger>
                  <SelectContent>
                    {VERIFICATION_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-mp-text-secondary">
                  {VERIFICATION_METHODS.find((m) => m.value === selectedMethod)?.description}
                </p>
              </div>

              {/* Document upload (shown only for DOCUMENT method) */}
              {selectedMethod === 'DOCUMENT' && (
                <div className="space-y-3">
                  <Label>
                    Документ <span className="text-mp-accent-tertiary">*</span>
                  </Label>

                  {/* Drag-and-drop area */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors',
                      isDragging
                        ? 'border-mp-accent-primary bg-mp-accent-primary/5'
                        : uploadedFile
                          ? 'border-mp-accent-secondary bg-mp-accent-secondary/5'
                          : 'border-mp-border hover:border-mp-text-disabled hover:bg-mp-surface/50'
                    )}
                  >
                    {uploadedFile ? (
                      <>
                        <CheckCircle className="mb-3 h-10 w-10 text-mp-accent-secondary" />
                        <p className="text-sm font-medium text-mp-text-primary">
                          {uploadedFile.name}
                        </p>
                        <p className="mt-1 text-xs text-mp-text-secondary">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} МБ
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedFile(null);
                          }}
                        >
                          Заменить файл
                        </Button>
                      </>
                    ) : (
                      <>
                        <UploadSimple className="mb-3 h-10 w-10 text-mp-text-disabled" />
                        <p className="text-sm font-medium text-mp-text-primary">
                          Перетащите файл сюда
                        </p>
                        <p className="mt-1 text-xs text-mp-text-secondary">
                          или нажмите для выбора
                        </p>
                        <p className="mt-3 text-xs text-mp-text-disabled">
                          JPEG, PNG, WebP, PDF. Максимум 10 МБ
                        </p>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={handleFileInputChange}
                    />
                  </div>

                  {/* URL fallback */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-mp-bg-primary px-3 text-xs text-mp-text-disabled">
                        или укажите ссылку
                      </span>
                    </div>
                  </div>

                  <Input
                    id="documentUrl"
                    type="url"
                    placeholder="https://example.com/document.pdf"
                    error={!!errors.documentUrl}
                    {...register('documentUrl', {
                      required: selectedMethod === 'DOCUMENT' && !uploadedFile
                        ? 'Загрузите документ или укажите ссылку'
                        : false,
                    })}
                  />
                  {errors.documentUrl && (
                    <p className="text-sm text-mp-error-text">
                      {errors.documentUrl.message}
                    </p>
                  )}
                </div>
              )}

              {/* Info block */}
              <div className="rounded-lg border border-mp-border bg-mp-surface/50 p-4">
                <div className="flex gap-3">
                  <WarningCircle className="mt-0.5 h-4 w-4 shrink-0 text-mp-text-secondary" />
                  <div className="text-sm text-mp-text-secondary">
                    <p>
                      После отправки заявки наши модераторы проверят данные в течение
                      1-3 рабочих дней. Вы получите уведомление о результате.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Submit */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="gradient"
                  disabled={submitVerification.isPending}
                  isLoading={submitVerification.isPending}
                >
                  <PaperPlaneTilt className="mr-2 h-4 w-4" />
                  Отправить заявку
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Benefits section */}
      {status === 'UNVERIFIED' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Преимущества верификации</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex gap-3 rounded-lg border border-mp-border bg-mp-surface/50 p-4">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-mp-accent-secondary" />
                <div>
                  <p className="font-medium text-mp-text-primary">Доступ к контенту 18+</p>
                  <p className="mt-1 text-sm text-mp-text-secondary">
                    Смотрите контент без возрастных ограничений
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg border border-mp-border bg-mp-surface/50 p-4">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-mp-accent-secondary" />
                <div>
                  <p className="font-medium text-mp-text-primary">Вывод средств</p>
                  <p className="mt-1 text-sm text-mp-text-secondary">
                    Выводите заработанные бонусы на карту
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg border border-mp-border bg-mp-surface/50 p-4">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-mp-accent-secondary" />
                <div>
                  <p className="font-medium text-mp-text-primary">Партнёрская программа</p>
                  <p className="mt-1 text-sm text-mp-text-secondary">
                    Полный доступ к партнёрским функциям
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg border border-mp-border bg-mp-surface/50 p-4">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-mp-accent-secondary" />
                <div>
                  <p className="font-medium text-mp-text-primary">Повышенное доверие</p>
                  <p className="mt-1 text-sm text-mp-text-secondary">
                    Специальный значок верифицированного пользователя
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
