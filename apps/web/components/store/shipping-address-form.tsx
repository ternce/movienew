'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ShippingAddressDto } from '@/types/store.types';

const shippingSchema = z.object({
  fullName: z.string().min(2, 'Укажите ФИО').max(100),
  phone: z
    .string()
    .min(11, 'Укажите номер телефона')
    .regex(/^\+?7\d{10}$/, 'Формат: +7XXXXXXXXXX'),
  postalCode: z
    .string()
    .min(6, 'Укажите индекс')
    .max(6, 'Индекс — 6 цифр')
    .regex(/^\d{6}$/, 'Индекс — 6 цифр'),
  city: z.string().min(2, 'Укажите город').max(100),
  address: z.string().min(5, 'Укажите адрес').max(300),
  instructions: z.string().max(500).optional(),
});

type ShippingFormData = z.infer<typeof shippingSchema>;

interface ShippingAddressFormProps {
  defaultValues?: ShippingAddressDto | null;
  onSubmit: (data: ShippingAddressDto) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  className?: string;
}

export function ShippingAddressForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Продолжить',
  isSubmitting = false,
  className,
}: ShippingAddressFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      fullName: defaultValues?.fullName ?? '',
      phone: defaultValues?.phone ?? '+7',
      postalCode: defaultValues?.postalCode ?? '',
      city: defaultValues?.city ?? '',
      address: defaultValues?.address ?? '',
      instructions: defaultValues?.instructions ?? '',
    },
  });

  const handleFormSubmit = (data: ShippingFormData) => {
    onSubmit({
      fullName: data.fullName,
      phone: data.phone,
      postalCode: data.postalCode,
      city: data.city,
      address: data.address,
      instructions: data.instructions || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className={cn('space-y-4', className)}
    >
      <div className="space-y-2">
        <Label htmlFor="fullName">ФИО получателя</Label>
        <Input
          id="fullName"
          placeholder="Иванов Иван Иванович"
          {...register('fullName')}
        />
        {errors.fullName && (
          <p className="text-xs text-mp-error-text">{errors.fullName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Телефон</Label>
        <Input
          id="phone"
          placeholder="+71234567890"
          {...register('phone')}
        />
        {errors.phone && (
          <p className="text-xs text-mp-error-text">{errors.phone.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="postalCode">Индекс</Label>
          <Input
            id="postalCode"
            placeholder="123456"
            maxLength={6}
            {...register('postalCode')}
          />
          {errors.postalCode && (
            <p className="text-xs text-mp-error-text">{errors.postalCode.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">Город</Label>
          <Input
            id="city"
            placeholder="Москва"
            {...register('city')}
          />
          {errors.city && (
            <p className="text-xs text-mp-error-text">{errors.city.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Адрес</Label>
        <Input
          id="address"
          placeholder="ул. Примерная, д. 1, кв. 1"
          {...register('address')}
        />
        {errors.address && (
          <p className="text-xs text-mp-error-text">{errors.address.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Комментарий к доставке (необязательно)</Label>
        <Textarea
          id="instructions"
          placeholder="Код домофона, этаж, ориентиры..."
          rows={3}
          {...register('instructions')}
        />
        {errors.instructions && (
          <p className="text-xs text-mp-error-text">{errors.instructions.message}</p>
        )}
      </div>

      <Button
        type="submit"
        variant="gradient"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Сохранение...' : submitLabel}
      </Button>
    </form>
  );
}
