import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, IsUUID, MinLength } from 'class-validator';
import { CommissionStatus } from '@prisma/client';

/**
 * User info for commission display
 */
export class CommissionUserDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'Иван' })
  firstName!: string;

  @ApiPropertyOptional({ example: 'Иванов' })
  lastName?: string | null;
}

/**
 * Commission DTO for admin views
 */
export class AdminCommissionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ type: CommissionUserDto, description: 'Partner who earned the commission' })
  partner!: CommissionUserDto;

  @ApiProperty({ type: CommissionUserDto, description: 'User who made the purchase' })
  sourceUser!: CommissionUserDto;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Transaction ID' })
  sourceTransactionId!: string;

  @ApiProperty({ example: 1, description: 'Commission level (1-5)' })
  level!: number;

  @ApiProperty({ example: 0.1, description: 'Commission rate applied' })
  rate!: number;

  @ApiProperty({ example: 500.5, description: 'Commission amount (RUB)' })
  amount!: number;

  @ApiProperty({ enum: CommissionStatus, example: CommissionStatus.PENDING })
  status!: CommissionStatus;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: '2024-01-20T10:30:00Z' })
  approvedAt?: Date | null;

  @ApiPropertyOptional({ example: '2024-01-25T10:30:00Z' })
  paidAt?: Date | null;

  @ApiPropertyOptional({ description: 'Admin who approved/rejected' })
  reviewedBy?: CommissionUserDto | null;
}

/**
 * Paginated commission list response for admin
 */
export class AdminCommissionListDto {
  @ApiProperty({ type: [AdminCommissionDto] })
  items!: AdminCommissionDto[];

  @ApiProperty({ example: 500 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 25 })
  totalPages!: number;

  @ApiProperty({ example: 25000.5, description: 'Sum of filtered commissions' })
  totalAmount!: number;
}

/**
 * DTO for rejecting a commission
 */
export class RejectCommissionDto {
  @ApiProperty({
    example: 'Комиссия отменена из-за возврата средств по транзакции.',
    description: 'Reason for rejection',
  })
  @IsString()
  @MinLength(5)
  reason!: string;
}

/**
 * DTO for batch commission approval
 */
export class BatchApproveCommissionsDto {
  @ApiProperty({
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'],
    description: 'Array of commission IDs to approve',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}

/**
 * Response for commission action
 */
export class CommissionActionResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Commission approved successfully' })
  message!: string;

  @ApiProperty({ type: AdminCommissionDto })
  commission!: AdminCommissionDto;
}

/**
 * Response for batch commission approval
 */
export class BatchCommissionActionResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Successfully approved 5 commissions' })
  message!: string;

  @ApiProperty({ example: 5, description: 'Number of commissions approved' })
  approvedCount!: number;

  @ApiProperty({ type: [String], description: 'IDs of approved commissions' })
  approvedIds!: string[];

  @ApiProperty({ type: [String], description: 'IDs that failed (if any)' })
  failedIds!: string[];
}
