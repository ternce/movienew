import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodType, TransactionStatus, TransactionType } from '@prisma/client';

// BankDetailsDto must be defined before PaymentResultDto since it's used as a property type
export class BankDetailsDto {
  @ApiProperty({ example: 'ООО "Киноплатформа"', description: 'Company name' })
  companyName!: string;

  @ApiProperty({ example: '40702810000000000000', description: 'Bank account number' })
  accountNumber!: string;

  @ApiProperty({ example: 'АО "Тинькофф Банк"', description: 'Bank name' })
  bankName!: string;

  @ApiProperty({ example: '044525974', description: 'Bank BIK' })
  bik!: string;

  @ApiProperty({ example: '7710140679', description: 'Company INN' })
  inn!: string;

  @ApiProperty({ example: '771001001', description: 'Company KPP' })
  kpp!: string;

  @ApiProperty({ example: '30101810145250000974', description: 'Correspondent account' })
  correspondentAccount!: string;

  @ApiProperty({ example: 'Оплата подписки по счету №12345', description: 'Payment purpose' })
  paymentPurpose!: string;
}

export class PaymentResultDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  transactionId!: string;

  @ApiProperty({ enum: TransactionStatus, example: TransactionStatus.PENDING })
  status!: TransactionStatus;

  @ApiProperty({ enum: PaymentMethodType, example: PaymentMethodType.CARD })
  paymentMethod!: PaymentMethodType;

  @ApiProperty({ example: 499, description: 'Total amount (RUB)' })
  amount!: number;

  @ApiProperty({ example: 100, description: 'Bonus amount applied (RUB)' })
  bonusAmountUsed!: number;

  @ApiProperty({ example: 399, description: 'Amount to pay after bonus (RUB)' })
  amountToPay!: number;

  @ApiPropertyOptional({ example: 'https://yookassa.ru/checkout/...', description: 'Payment URL for redirect (CARD)' })
  paymentUrl?: string;

  @ApiPropertyOptional({ example: 'https://qr.nspk.ru/...', description: 'QR code URL (SBP)' })
  qrCodeUrl?: string;

  @ApiPropertyOptional({ description: 'Bank details for transfer (BANK_TRANSFER)' })
  bankDetails?: BankDetailsDto;

  @ApiPropertyOptional({ description: 'Invoice ID for bank transfer' })
  invoiceId?: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: '2024-01-15T10:45:00Z', description: 'Payment expiration time' })
  expiresAt?: Date;
}

export class PaymentStatusDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  transactionId!: string;

  @ApiProperty({ enum: TransactionStatus, example: TransactionStatus.COMPLETED })
  status!: TransactionStatus;

  @ApiProperty({ enum: TransactionType, example: TransactionType.SUBSCRIPTION })
  type!: TransactionType;

  @ApiProperty({ example: 499 })
  amount!: number;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: '2024-01-15T10:35:00Z' })
  completedAt?: Date;
}
