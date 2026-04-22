import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUrl, IsUUID, Min } from 'class-validator';
import { PaymentMethodType, TransactionType } from '@prisma/client';

export class InitiatePaymentDto {
  @ApiProperty({ enum: TransactionType, example: TransactionType.SUBSCRIPTION })
  @IsEnum(TransactionType)
  type!: TransactionType;

  @ApiProperty({ example: 499, description: 'Payment amount in RUB' })
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiProperty({ enum: PaymentMethodType, example: PaymentMethodType.CARD })
  @IsEnum(PaymentMethodType)
  paymentMethod!: PaymentMethodType;

  @ApiPropertyOptional({ example: 100, description: 'Bonus amount to apply (RUB)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusAmount?: number;

  @ApiPropertyOptional({ description: 'Reference ID (e.g., subscription plan ID, order ID)' })
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @ApiPropertyOptional({ description: 'Return URL after payment completion' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { message: 'returnUrl must be a valid HTTP or HTTPS URL' })
  returnUrl?: string;

  @ApiPropertyOptional({ description: 'Additional metadata for the payment' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class RefundPaymentDto {
  @ApiProperty({ description: 'Transaction ID to refund' })
  @IsUUID()
  transactionId!: string;

  @ApiPropertyOptional({ example: 100, description: 'Partial refund amount (optional, full refund if omitted)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional({ description: 'Reason for refund' })
  @IsOptional()
  @IsString()
  reason?: string;
}
