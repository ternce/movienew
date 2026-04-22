/**
 * Product Factory for Tests
 *
 * Generates test product and category data for store module testing.
 */

import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';

// Product status
export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

export interface MockProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string | null;
  price: Prisma.Decimal;
  bonusPrice: Prisma.Decimal | null;
  allowsPartialBonus: boolean;
  stockQuantity: number;
  images: string[];
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockProductCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductOptions {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  categoryId?: string | null;
  price?: number;
  bonusPrice?: number | null;
  allowsPartialBonus?: boolean;
  stockQuantity?: number;
  images?: string[];
  status?: ProductStatus;
}

export interface CreateCategoryOptions {
  id?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  parentId?: string | null;
  order?: number;
}

/**
 * Generate a URL-friendly slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Create a mock product
 */
export function createMockProduct(options: CreateProductOptions = {}): MockProduct {
  const id = options.id || uuidv4();
  const name = options.name || `Test Product ${id.slice(0, 8)}`;
  const slug = options.slug || generateSlug(name);
  const now = new Date();

  return {
    id,
    name,
    slug,
    description: options.description || `Description for ${name}`,
    categoryId: options.categoryId ?? null,
    price: new Prisma.Decimal(options.price ?? 999),
    bonusPrice: options.bonusPrice != null ? new Prisma.Decimal(options.bonusPrice) : null,
    allowsPartialBonus: options.allowsPartialBonus ?? false,
    stockQuantity: options.stockQuantity ?? 100,
    images: options.images || [`https://cdn.example.com/products/${id}/image1.jpg`],
    status: options.status || ProductStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create an active product with stock
 */
export function createActiveProduct(options: Omit<CreateProductOptions, 'status'> = {}): MockProduct {
  return createMockProduct({
    ...options,
    status: ProductStatus.ACTIVE,
    stockQuantity: options.stockQuantity ?? 100,
  });
}

/**
 * Create an out-of-stock product
 */
export function createOutOfStockProduct(
  options: Omit<CreateProductOptions, 'status' | 'stockQuantity'> = {},
): MockProduct {
  return createMockProduct({
    ...options,
    status: ProductStatus.OUT_OF_STOCK,
    stockQuantity: 0,
  });
}

/**
 * Create an inactive product
 */
export function createInactiveProduct(options: Omit<CreateProductOptions, 'status'> = {}): MockProduct {
  return createMockProduct({
    ...options,
    status: ProductStatus.INACTIVE,
  });
}

/**
 * Create a product with bonus price enabled
 */
export function createProductWithBonusPrice(
  options: Omit<CreateProductOptions, 'bonusPrice' | 'allowsPartialBonus'> = {},
): MockProduct {
  const price = options.price ?? 999;
  return createMockProduct({
    ...options,
    price,
    bonusPrice: Math.round(price * 0.5), // 50% can be paid with bonus
    allowsPartialBonus: true,
  });
}

/**
 * Create a mock product category
 */
export function createMockProductCategory(options: CreateCategoryOptions = {}): MockProductCategory {
  const id = options.id || uuidv4();
  const name = options.name || `Category ${id.slice(0, 8)}`;
  const slug = options.slug || generateSlug(name);
  const now = new Date();

  return {
    id,
    name,
    slug,
    description: options.description ?? null,
    parentId: options.parentId ?? null,
    order: options.order ?? 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a category hierarchy (parent and children)
 */
export function createCategoryHierarchy(
  parentName: string = 'Parent Category',
  childCount: number = 3,
): { parent: MockProductCategory; children: MockProductCategory[] } {
  const parent = createMockProductCategory({ name: parentName, order: 0 });
  const children: MockProductCategory[] = [];

  for (let i = 0; i < childCount; i++) {
    children.push(
      createMockProductCategory({
        name: `Child Category ${i + 1}`,
        parentId: parent.id,
        order: i + 1,
      }),
    );
  }

  return { parent, children };
}

/**
 * Create multiple products for a category
 */
export function createProductsForCategory(
  categoryId: string,
  count: number = 5,
): MockProduct[] {
  const products: MockProduct[] = [];

  for (let i = 0; i < count; i++) {
    products.push(
      createMockProduct({
        name: `Product ${i + 1}`,
        categoryId,
        price: (i + 1) * 100,
        stockQuantity: (i + 1) * 10,
      }),
    );
  }

  return products;
}

/**
 * Create products with various prices for filtering tests
 */
export function createProductsWithPriceRange(): MockProduct[] {
  return [
    createMockProduct({ name: 'Cheap Product', price: 100 }),
    createMockProduct({ name: 'Budget Product', price: 500 }),
    createMockProduct({ name: 'Mid-range Product', price: 1000 }),
    createMockProduct({ name: 'Premium Product', price: 5000 }),
    createMockProduct({ name: 'Luxury Product', price: 10000 }),
  ];
}

/**
 * Product factory object with all creation methods
 */
export const productFactory = {
  create: createMockProduct,
  createActive: createActiveProduct,
  createOutOfStock: createOutOfStockProduct,
  createInactive: createInactiveProduct,
  createWithBonusPrice: createProductWithBonusPrice,
  createCategory: createMockProductCategory,
  createCategoryHierarchy,
  createProductsForCategory,
  createProductsWithPriceRange,
  generateSlug,
};

export default productFactory;
