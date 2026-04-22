import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { TaxStatus, WithdrawalStatus } from '@prisma/client';

/**
 * User info for withdrawal display
 */
export class WithdrawalUserDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'Иван' })
  firstName!: string;

  @ApiPropertyOptional({ example: 'Иванов' })
  lastName?: string | null;

  @ApiProperty({ example: 'ABC12345' })
  referralCode!: string;
}

/**
 * Payment details for withdrawal
 */
export class AdminPaymentDetailsDto {
  @ApiProperty({ enum: ['card', 'bank_account'] })
  type!: 'card' | 'bank_account';

  @ApiPropertyOptional({ example: '4111****1111', description: 'Masked card number' })
  cardNumber?: string;

  @ApiPropertyOptional({ example: '40702810****0000', description: 'Masked bank account' })
  bankAccount?: string;

  @ApiPropertyOptional({ example: 'Сбербанк' })
  bankName?: string;

  @ApiPropertyOptional({ example: '044525225' })
  bik?: string;

  @ApiProperty({ example: 'Иванов Иван Иванович' })
  recipientName!: string;
}

/**
 * Withdrawal DTO for admin views
 */
export class AdminWithdrawalDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ type: WithdrawalUserDto, description: 'User requesting withdrawal' })
  user!: WithdrawalUserDto;

  @ApiProperty({ example: 5000, description: 'Gross withdrawal amount (RUB)' })
  amount!: number;

  @ApiProperty({ enum: TaxStatus, example: TaxStatus.SELF_EMPLOYED })
  taxStatus!: TaxStatus;

  @ApiProperty({ example: 0.04, description: 'Tax rate applied' })
  taxRate!: number;

  @ApiProperty({ example: 200, description: 'Tax amount (RUB)' })
  taxAmount!: number;

  @ApiProperty({ example: 4800, description: 'Net amount to pay (RUB)' })
  netAmount!: number;

  @ApiProperty({ enum: WithdrawalStatus, example: WithdrawalStatus.PENDING })
  status!: WithdrawalStatus;

  @ApiProperty({ type: AdminPaymentDetailsDto })
  paymentDetails!: AdminPaymentDetailsDto;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: '2024-01-20T10:30:00Z' })
  approvedAt?: Date | null;

  @ApiPropertyOptional({ example: '2024-01-25T10:30:00Z' })
  completedAt?: Date | null;

  @ApiPropertyOptional({ example: 'Недостаточно документов для проверки' })
  rejectionReason?: string | null;

  @ApiPropertyOptional({ description: 'Admin who processed the withdrawal' })
  processedBy?: WithdrawalUserDto | null;
}

/**
 * Paginated withdrawal list response for admin
 */
export class AdminWithdrawalListDto {
  @ApiProperty({ type: [AdminWithdrawalDto] })
  items!: AdminWithdrawalDto[];

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;

  @ApiProperty({ example: 50000, description: 'Sum of filtered withdrawal amounts' })
  totalAmount!: number;

  @ApiProperty({ example: 48000, description: 'Sum of net amounts' })
  totalNetAmount!: number;
}

/**
 * DTO for rejecting a withdrawal
 */
export class RejectWithdrawalDto {
  @ApiProperty({
    example: 'Недостаточно документов для проверки. Пожалуйста, предоставьте подтверждение налогового статуса.',
    description: 'Reason for rejection (shown to user)',
  })
  @IsString()
  @MinLength(10)
  reason!: string;
}

/**
 * Response for withdrawal action
 */
export class WithdrawalActionResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Withdrawal approved successfully' })
  message!: string;

  @ApiProperty({ type: AdminWithdrawalDto })
  withdrawal!: AdminWithdrawalDto;
}

/**
 * Withdrawal statistics for admin
 */
export class AdminWithdrawalStatsDto {
  @ApiProperty({ example: 8, description: 'Pending withdrawals count' })
  pendingCount!: number;

  @ApiProperty({ example: 25000, description: 'Pending withdrawals total (RUB)' })
  pendingAmount!: number;

  @ApiProperty({ example: 3, description: 'Approved (ready to process) count' })
  approvedCount!: number;

  @ApiProperty({ example: 15000, description: 'Approved amount (RUB)' })
  approvedAmount!: number;

  @ApiProperty({ example: 2, description: 'Processing count' })
  processingCount!: number;

  @ApiProperty({ example: 10000, description: 'Processing amount (RUB)' })
  processingAmount!: number;

  @ApiProperty({ example: 150, description: 'Completed this month' })
  completedThisMonth!: number;

  @ApiProperty({ example: 180000, description: 'Completed amount this month (RUB)' })
  completedAmountThisMonth!: number;
}
