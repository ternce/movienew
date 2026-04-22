import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsObject, IsOptional, Min } from 'class-validator';
import { TaxStatus } from '@prisma/client';

export class WithdrawBonusDto {
  @ApiProperty({ example: 1000, description: 'Amount of bonuses to withdraw' })
  @IsNumber()
  @Min(1000, { message: 'Minimum withdrawal amount is 1000 bonuses' })
  amount!: number;

  @ApiProperty({ enum: TaxStatus, example: TaxStatus.INDIVIDUAL })
  @IsEnum(TaxStatus)
  taxStatus!: TaxStatus;

  @ApiPropertyOptional({
    example: { bankName: 'Сбербанк', accountNumber: '40817810000000000000', bik: '044525225' },
    description: 'Payment details for withdrawal',
  })
  @IsOptional()
  @IsObject()
  paymentDetails?: Record<string, unknown>;
}

export class WithdrawalResultDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 1000 })
  bonusAmount!: number;

  @ApiProperty({ example: 1000 })
  currencyAmount!: number;

  @ApiProperty({ example: 1.0 })
  rate!: number;

  @ApiProperty({ example: 130 })
  taxAmount!: number;

  @ApiProperty({ example: 870 })
  netAmount!: number;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  withdrawalId?: string;

  @ApiPropertyOptional({ example: 'Withdrawal request created successfully' })
  message?: string;
}

export class WithdrawalPreviewDto {
  @ApiProperty({ example: 1000 })
  bonusAmount!: number;

  @ApiProperty({ example: 1000 })
  currencyAmount!: number;

  @ApiProperty({ example: 1.0 })
  rate!: number;

  @ApiProperty({ example: 130, description: 'Estimated tax amount' })
  estimatedTax!: number;

  @ApiProperty({ example: 870, description: 'Estimated net amount after tax' })
  estimatedNet!: number;

  @ApiProperty({ example: 0.13, description: 'Tax rate applied' })
  taxRate!: number;
}
