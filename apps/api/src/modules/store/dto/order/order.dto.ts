import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, PaymentMethodType } from '@prisma/client';

export class ShippingAddressDto {
  @ApiProperty({ example: 'Иванов Иван Иванович', description: 'Recipient name' })
  @IsString()
  @MinLength(2)
  fullName!: string;

  @ApiProperty({ example: '+79001234567', description: 'Phone number' })
  @IsString()
  phone!: string;

  @ApiProperty({ example: '123456', description: 'Postal code' })
  @IsString()
  postalCode!: string;

  @ApiProperty({ example: 'Москва', description: 'City' })
  @IsString()
  city!: string;

  @ApiProperty({ example: 'ул. Примерная, д. 1, кв. 1', description: 'Address' })
  @IsString()
  address!: string;

  @ApiPropertyOptional({ example: 'Домофон 123', description: 'Delivery instructions' })
  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: ShippingAddressDto })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;

  @ApiProperty({ enum: PaymentMethodType, example: PaymentMethodType.CARD })
  @IsEnum(PaymentMethodType)
  paymentMethod!: PaymentMethodType;

  @ApiPropertyOptional({ example: 500, description: 'Bonus amount to apply' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusAmount?: number;

  @ApiPropertyOptional({ description: 'Return URL after payment' })
  @IsOptional()
  @IsString()
  returnUrl?: string;
}

export class OrderItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  productId!: string;

  @ApiProperty({ example: 'Коллекционная кружка' })
  productName!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/product.jpg' })
  productImage?: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: 990, description: 'Price at time of purchase' })
  priceAtPurchase!: number;

  @ApiProperty({ example: 100, description: 'Bonus used for this item' })
  bonusUsed!: number;

  @ApiProperty({ example: 1880, description: 'Total for this item' })
  total!: number;
}

export class OrderDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PROCESSING })
  status!: OrderStatus;

  @ApiProperty({ type: [OrderItemDto] })
  items!: OrderItemDto[];

  @ApiProperty({ example: 2970, description: 'Total order amount' })
  totalAmount!: number;

  @ApiProperty({ example: 500, description: 'Bonus amount used' })
  bonusAmountUsed!: number;

  @ApiProperty({ example: 2470, description: 'Amount paid' })
  amountPaid!: number;

  @ApiProperty({ type: ShippingAddressDto })
  shippingAddress!: ShippingAddressDto;

  @ApiPropertyOptional({ example: 'TRACK123456789', description: 'Tracking number' })
  trackingNumber?: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: Date;
}

export class OrderQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'From date (ISO string)' })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'To date (ISO string)' })
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

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @ApiPropertyOptional({ example: 'TRACK123456789' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;
}
