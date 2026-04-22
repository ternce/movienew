import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class AddToCartDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 1, description: 'Quantity to add' })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class UpdateCartItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 2, description: 'New quantity (0 to remove)' })
  @IsInt()
  @Min(0)
  quantity!: number;
}

export class CartItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  productId!: string;

  @ApiProperty({ example: 'Коллекционная кружка' })
  productName!: string;

  @ApiProperty({ example: 'collectible-mug' })
  productSlug!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/product.jpg' })
  productImage?: string;

  @ApiProperty({ example: 990, description: 'Unit price' })
  price!: number;

  @ApiPropertyOptional({ example: 500, description: 'Bonus price per unit' })
  bonusPrice?: number;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: 1980, description: 'Total price for this item' })
  totalPrice!: number;

  @ApiProperty({ example: true })
  inStock!: boolean;

  @ApiProperty({ example: 100 })
  availableQuantity!: number;
}

export class CartDto {
  @ApiProperty({ type: [CartItemDto] })
  items!: CartItemDto[];

  @ApiProperty({ example: 2, description: 'Total number of unique products' })
  itemCount!: number;

  @ApiProperty({ example: 3, description: 'Total quantity of all items' })
  totalQuantity!: number;

  @ApiProperty({ example: 2970, description: 'Total cart value in RUB' })
  totalAmount!: number;

  @ApiPropertyOptional({ example: 1500, description: 'Maximum bonus that can be applied' })
  maxBonusApplicable?: number;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  updatedAt!: Date;
}

export class CartSummaryDto {
  @ApiProperty({ example: 3 })
  itemCount!: number;

  @ApiProperty({ example: 2970 })
  totalAmount!: number;
}
