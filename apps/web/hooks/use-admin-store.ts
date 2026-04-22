/**
 * Re-export all admin store hooks from split modules.
 * This file exists for backward compatibility — new code should import
 * directly from '@/hooks/admin' or the specific sub-module.
 */
export * from './admin/use-admin-products';
export * from './admin/use-admin-categories';
export * from './admin/use-admin-orders';
