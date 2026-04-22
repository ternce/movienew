import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Partner user info for admin views
 */
export class AdminPartnerUserDto {
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

  @ApiProperty({ example: '2024-01-10T08:00:00Z' })
  createdAt!: Date;
}

/**
 * Partner list item DTO for admin
 */
export class AdminPartnerDto {
  @ApiProperty({ type: AdminPartnerUserDto })
  user!: AdminPartnerUserDto;

  @ApiProperty({ example: 2, description: 'Current partner level (1-5)' })
  currentLevel!: number;

  @ApiProperty({ example: 'Бронза', description: 'Level name in Russian' })
  levelName!: string;

  @ApiProperty({ example: 15, description: 'Direct referrals count' })
  directReferrals!: number;

  @ApiProperty({ example: 8, description: 'Active referrals (with transactions)' })
  activeReferrals!: number;

  @ApiProperty({ example: 45, description: 'Total team size across all levels' })
  teamSize!: number;

  @ApiProperty({ example: 25000, description: 'Total team volume (RUB)' })
  teamVolume!: number;

  @ApiProperty({ example: 15000.5, description: 'Total earnings (APPROVED, RUB)' })
  totalEarnings!: number;

  @ApiProperty({ example: 2500, description: 'Pending earnings (RUB)' })
  pendingEarnings!: number;

  @ApiProperty({ example: 8000, description: 'Total withdrawn (RUB)' })
  totalWithdrawn!: number;

  @ApiProperty({ example: 4500.5, description: 'Available balance (RUB)' })
  availableBalance!: number;
}

/**
 * Paginated partner list response for admin
 */
export class AdminPartnerListDto {
  @ApiProperty({ type: [AdminPartnerDto] })
  items!: AdminPartnerDto[];

  @ApiProperty({ example: 150 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 8 })
  totalPages!: number;
}

/**
 * Partner program statistics for admin dashboard
 */
export class AdminPartnerStatsDto {
  @ApiProperty({ example: 1250, description: 'Total partners in program' })
  totalPartners!: number;

  @ApiProperty({ example: 450, description: 'Partners who joined this month' })
  newPartnersThisMonth!: number;

  @ApiProperty({ example: 350, description: 'Active partners (with referrals)' })
  activePartners!: number;

  @ApiProperty({ description: 'Partner count by level' })
  partnersByLevel!: {
    level1: number;
    level2: number;
    level3: number;
    level4: number;
    level5: number;
  };

  @ApiProperty({ example: 250000, description: 'Total commissions paid (RUB)' })
  totalCommissionsPaid!: number;

  @ApiProperty({ example: 45000, description: 'Pending commissions (RUB)' })
  pendingCommissions!: number;

  @ApiProperty({ example: 15, description: 'Pending commission count' })
  pendingCommissionCount!: number;

  @ApiProperty({ example: 180000, description: 'Total withdrawals processed (RUB)' })
  totalWithdrawals!: number;

  @ApiProperty({ example: 25000, description: 'Pending withdrawals (RUB)' })
  pendingWithdrawals!: number;

  @ApiProperty({ example: 8, description: 'Pending withdrawal count' })
  pendingWithdrawalCount!: number;

  @ApiProperty({ example: 75000, description: 'Commissions this month (RUB)' })
  commissionsThisMonth!: number;

  @ApiProperty({ example: 55000, description: 'Withdrawals this month (RUB)' })
  withdrawalsThisMonth!: number;
}

/**
 * Detailed partner view for admin
 */
export class AdminPartnerDetailDto extends AdminPartnerDto {
  @ApiProperty({ description: 'Recent commissions (last 10)' })
  recentCommissions!: Array<{
    id: string;
    sourceUserName: string;
    level: number;
    amount: number;
    status: string;
    createdAt: Date;
  }>;

  @ApiProperty({ description: 'Recent withdrawals (last 5)' })
  recentWithdrawals!: Array<{
    id: string;
    amount: number;
    netAmount: number;
    status: string;
    createdAt: Date;
  }>;

  @ApiProperty({ description: 'Direct referrals preview' })
  directReferralsList!: Array<{
    id: string;
    firstName: string;
    lastName?: string;
    email: string;
    joinedAt: Date;
    totalSpent: number;
    isActive: boolean;
  }>;

  @ApiPropertyOptional({ description: 'Referred by user info' })
  referredBy?: {
    id: string;
    firstName: string;
    lastName?: string;
    email: string;
    referralCode: string;
  } | null;
}
