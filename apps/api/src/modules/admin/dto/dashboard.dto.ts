import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({ example: 10500 })
  totalUsers!: number;

  @ApiProperty({ example: 125 })
  newUsersToday!: number;

  @ApiProperty({ example: 850 })
  activeSubscriptions!: number;

  @ApiProperty({ example: 2500000 })
  monthlyRevenue!: number;

  @ApiProperty({ example: 50 })
  pendingOrders!: number;

  @ApiProperty({ example: 15 })
  pendingVerifications!: number;

  @ApiProperty({ example: 8 })
  pendingWithdrawals!: number;

  @ApiProperty({ example: 150 })
  contentCount!: number;

  @ApiProperty({ example: 45 })
  productCount!: number;
}

export class RevenueStatDto {
  @ApiProperty({ example: '2024-01' })
  period!: string;

  @ApiProperty({ example: 2500000 })
  subscriptionRevenue!: number;

  @ApiProperty({ example: 350000 })
  storeRevenue!: number;

  @ApiProperty({ example: 2850000 })
  totalRevenue!: number;
}

export class UserGrowthStatDto {
  @ApiProperty({ example: '2024-01-15' })
  date!: string;

  @ApiProperty({ example: 125 })
  newUsers!: number;

  @ApiProperty({ example: 10500 })
  totalUsers!: number;
}

export class RecentTransactionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  userEmail!: string;

  @ApiProperty({ example: 'SUBSCRIPTION' })
  type!: string;

  @ApiProperty({ example: 499 })
  amount!: number;

  @ApiProperty({ example: 'COMPLETED' })
  status!: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: Date;
}

export class DashboardOverviewDto {
  @ApiProperty({ type: DashboardStatsDto })
  stats!: DashboardStatsDto;

  @ApiProperty({ type: [RevenueStatDto] })
  revenueByMonth!: RevenueStatDto[];

  @ApiProperty({ type: [UserGrowthStatDto] })
  userGrowth!: UserGrowthStatDto[];

  @ApiProperty({ type: [RecentTransactionDto] })
  recentTransactions!: RecentTransactionDto[];
}
