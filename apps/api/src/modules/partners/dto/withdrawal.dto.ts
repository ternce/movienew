import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TaxStatus, WithdrawalStatus } from '@prisma/client';

export class PaymentDetailsDto {
  @ApiProperty({ enum: ['card', 'bank_account'], description: 'Payment method type' })
  @IsIn(['card', 'bank_account'])
  type!: 'card' | 'bank_account';

  @ApiPropertyOptional({ example: '4111111111111111', description: 'Card number (for card type)' })
  @IsOptional()
  @IsString()
  cardNumber?: string;

  @ApiPropertyOptional({ example: '40702810000000000000', description: 'Bank account number (for bank_account type)' })
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiPropertyOptional({ example: 'Сбербанк', description: 'Bank name' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: '044525225', description: 'Bank BIK' })
  @IsOptional()
  @IsString()
  bik?: string;

  @ApiProperty({ example: 'Иванов Иван Иванович', description: 'Recipient full name' })
  @IsString()
  @MinLength(2)
  recipientName!: string;
}

export class CreateWithdrawalDto {
  @ApiProperty({ example: 5000, description: 'Withdrawal amount (RUB), minimum 100' })
  @IsNumber()
  @Min(100)
  amount!: number;

  @ApiProperty({ enum: TaxStatus, example: TaxStatus.SELF_EMPLOYED, description: 'Tax status for withholding' })
  @IsEnum(TaxStatus)
  taxStatus!: TaxStatus;

  @ApiProperty({ type: PaymentDetailsDto, description: 'Payment destination details' })
  @ValidateNested()
  @Type(() => PaymentDetailsDto)
  paymentDetails!: PaymentDetailsDto;
}

export class WithdrawalQueryDto {
  @ApiPropertyOptional({ enum: WithdrawalStatus })
  @IsOptional()
  @IsEnum(WithdrawalStatus)
  status?: WithdrawalStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class WithdrawalDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 5000, description: 'Gross withdrawal amount (RUB)' })
  amount!: number;

  @ApiProperty({ enum: TaxStatus, example: TaxStatus.SELF_EMPLOYED })
  taxStatus!: TaxStatus;

  @ApiProperty({ example: 200, description: 'Tax amount withheld (RUB)' })
  taxAmount!: number;

  @ApiProperty({ example: 4800, description: 'Net amount after tax (RUB)' })
  netAmount!: number;

  @ApiProperty({ enum: WithdrawalStatus, example: WithdrawalStatus.PENDING })
  status!: WithdrawalStatus;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: '2024-01-20T10:30:00Z' })
  processedAt?: Date;

  @ApiPropertyOptional({ example: 'Недостаточно документов' })
  rejectionReason?: string;
}

export class AvailableBalanceDto {
  @ApiProperty({ example: 15000, description: 'Total approved commissions (RUB)' })
  totalEarnings!: number;

  @ApiProperty({ example: 2000, description: 'Pending withdrawals (RUB)' })
  pendingWithdrawals!: number;

  @ApiProperty({ example: 8000, description: 'Already withdrawn (RUB)' })
  withdrawnAmount!: number;

  @ApiProperty({ example: 5000, description: 'Available for withdrawal (RUB)' })
  availableBalance!: number;
}

export class TaxCalculationDto {
  @ApiProperty({ example: 5000, description: 'Gross amount (RUB)' })
  grossAmount!: number;

  @ApiProperty({ example: 0.04, description: 'Tax rate (e.g., 0.04 = 4%)' })
  taxRate!: number;

  @ApiProperty({ example: 200, description: 'Tax amount (RUB)' })
  taxAmount!: number;

  @ApiProperty({ example: 4800, description: 'Net amount after tax (RUB)' })
  netAmount!: number;
}
