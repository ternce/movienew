import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminOrderQueryDto {
  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Search by email or order ID' })
  search?: string;

  @ApiPropertyOptional()
  dateFrom?: string;

  @ApiPropertyOptional()
  dateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  limit?: number;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ example: 'PROCESSING' })
  status!: string;

  @ApiPropertyOptional({ example: 'TRACK-123456' })
  trackingNumber?: string;
}

export class OrderStatsDto {
  @ApiProperty()
  totalOrders!: number;

  @ApiProperty()
  pendingCount!: number;

  @ApiProperty()
  processingCount!: number;

  @ApiProperty()
  shippedCount!: number;

  @ApiProperty()
  deliveredCount!: number;

  @ApiProperty()
  cancelledCount!: number;

  @ApiProperty()
  totalRevenue!: number;
}
