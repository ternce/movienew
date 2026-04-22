import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Classes must be defined before being used as property types

export class YooKassaAmount {
  @ApiProperty({ example: '499.00' })
  value!: string;

  @ApiProperty({ example: 'RUB' })
  currency!: string;
}

export class YooKassaPaymentObject {
  @ApiProperty({ example: '2a654f9d-000f-5000-8000-1d267f1e0123' })
  id!: string;

  @ApiProperty({ example: 'succeeded', description: 'Payment status' })
  status!: string;

  @ApiProperty({ example: true })
  paid!: boolean;

  @ApiProperty()
  amount!: YooKassaAmount;

  @ApiPropertyOptional()
  refundable?: boolean;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00.000Z' })
  created_at?: string;

  @ApiPropertyOptional({ example: '2024-01-15T10:35:00.000Z' })
  captured_at?: string;
}

/**
 * YooKassa webhook notification payload.
 */
export class YooKassaWebhookDto {
  @ApiProperty({ example: 'notification', description: 'Event type' })
  type!: string;

  @ApiProperty({ example: 'payment.succeeded', description: 'Event name' })
  event!: string;

  @ApiProperty({ description: 'Payment object' })
  object!: YooKassaPaymentObject;
}

/**
 * SBP webhook notification payload (mock structure).
 */
export class SbpWebhookDto {
  @ApiProperty({ example: 'payment_notification', description: 'Event type' })
  eventType!: string;

  @ApiProperty({ example: 'sbp_payment_123456' })
  paymentId!: string;

  @ApiProperty({ example: 'SUCCESS', description: 'Payment status' })
  status!: string;

  @ApiProperty({ example: 499 })
  amount!: number;

  @ApiProperty({ example: 'RUB' })
  currency!: string;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiProperty({ example: '2024-01-15T10:35:00Z' })
  timestamp!: string;
}

/**
 * Generic webhook response.
 */
export class WebhookResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;
}
