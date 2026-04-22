import { ApiProperty } from '@nestjs/swagger';

export class BonusBalanceDto {
  @ApiProperty({ example: 1500.5, description: 'Current bonus balance' })
  balance!: number;

  @ApiProperty({ example: 500, description: 'Pending earnings not yet available' })
  pendingEarnings!: number;

  @ApiProperty({ example: 10000, description: 'Total bonuses earned lifetime' })
  lifetimeEarned!: number;

  @ApiProperty({ example: 8500, description: 'Total bonuses spent lifetime' })
  lifetimeSpent!: number;
}
