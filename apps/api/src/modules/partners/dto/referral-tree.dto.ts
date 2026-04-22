import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReferralNodeDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  userId!: string;

  @ApiProperty({ example: 'Иван' })
  firstName!: string;

  @ApiPropertyOptional({ example: 'Петров' })
  lastName?: string;

  @ApiProperty({ example: 'ivan@example.com' })
  email!: string;

  @ApiProperty({ example: 1, description: 'Level in referral tree (1=direct, 2-5=indirect)' })
  level!: number;

  @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'When user joined' })
  joinedAt!: Date;

  @ApiProperty({ example: 5000, description: 'Total amount spent by this referral (RUB)' })
  totalSpent!: number;

  @ApiProperty({ example: true, description: 'Whether user is active (has transactions)' })
  isActive!: boolean;

  @ApiProperty({ type: [ReferralNodeDto], description: 'Child referrals (if depth requested)' })
  children!: ReferralNodeDto[];
}

export class ReferralTreeDto {
  @ApiProperty({ type: [ReferralNodeDto], description: 'Direct referrals (level 1)' })
  directReferrals!: ReferralNodeDto[];

  @ApiProperty({ example: 10, description: 'Total direct referrals count' })
  directCount!: number;

  @ApiProperty({ example: 25, description: 'Total team size (all levels)' })
  totalTeamSize!: number;
}
