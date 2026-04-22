import { ApiProperty } from '@nestjs/swagger';

export class LevelProgressDto {
  @ApiProperty({ example: 2, description: 'Next level number' })
  nextLevel!: number;

  @ApiProperty({ example: 'Бронза', description: 'Next level name' })
  nextLevelName!: string;

  @ApiProperty({ example: 5, description: 'Referrals needed for next level' })
  referralsNeeded!: number;

  @ApiProperty({ example: 3, description: 'Current referral count' })
  currentReferrals!: number;

  @ApiProperty({ example: 10000, description: 'Team volume needed for next level (RUB)' })
  teamVolumeNeeded!: number;

  @ApiProperty({ example: 5000, description: 'Current team volume (RUB)' })
  currentTeamVolume!: number;

  @ApiProperty({ example: 60, description: 'Progress percentage to next level' })
  progressPercent!: number;
}

export class PartnerDashboardDto {
  @ApiProperty({ example: 1, description: 'Current partner level (1-5)' })
  currentLevel!: number;

  @ApiProperty({ example: 'Стартер', description: 'Current level name' })
  levelName!: string;

  @ApiProperty({ example: 10, description: 'Total number of direct referrals' })
  totalReferrals!: number;

  @ApiProperty({ example: 7, description: 'Number of active referrals (with activity)' })
  activeReferrals!: number;

  @ApiProperty({ example: 25, description: 'Total team size across all levels' })
  teamSize!: number;

  @ApiProperty({ example: 15000.5, description: 'Total earnings from commissions (RUB)' })
  totalEarnings!: number;

  @ApiProperty({ example: 2500, description: 'Pending commissions awaiting approval (RUB)' })
  pendingEarnings!: number;

  @ApiProperty({ example: 12500.5, description: 'Available balance for withdrawal (RUB)' })
  availableBalance!: number;

  @ApiProperty({ example: 3000, description: 'Earnings this month (RUB)' })
  thisMonthEarnings!: number;

  @ApiProperty({ example: 5000, description: 'Earnings last month (RUB)' })
  lastMonthEarnings!: number;

  @ApiProperty({ type: LevelProgressDto })
  nextLevelProgress!: LevelProgressDto;
}

export class PartnerLevelDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 1, description: 'Level number (1-5)' })
  levelNumber!: number;

  @ApiProperty({ example: 'Стартер', description: 'Level name' })
  name!: string;

  @ApiProperty({ example: 10, description: 'Commission rate percentage' })
  commissionRate!: number;

  @ApiProperty({ example: 0, description: 'Minimum referrals required' })
  minReferrals!: number;

  @ApiProperty({ example: 0, description: 'Minimum team volume (RUB)' })
  minTeamVolume!: number;

  @ApiProperty({ example: ['Базовые комиссии'], description: 'Level benefits' })
  benefits!: string[];
}
