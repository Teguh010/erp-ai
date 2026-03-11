import { PrismaClient } from '@prisma/client';

/**
 * Models that support soft delete
 */
export const SOFT_DELETE_MODELS = [
  'User',
  'Product',
  'Category',
  'Warehouse',
  'Supplier',
  'Customer',
] as const;

export type SoftDeleteModel = (typeof SOFT_DELETE_MODELS)[number];

/**
 * Check if a model supports soft delete
 */
export function isSoftDeleteModel(model: string): model is SoftDeleteModel {
  return SOFT_DELETE_MODELS.includes(model as SoftDeleteModel);
}

/**
 * Helper class with soft delete utility methods
 *
 * Usage:
 * ```ts
 * const helper = new SoftDeleteHelper(prisma);
 *
 * // Hard delete (bypass soft delete)
 * await helper.hardDelete('User', { id: '...' });
 *
 * // Restore soft-deleted record
 * await helper.restore('User', { id: '...' });
 *
 * // Find all including deleted
 * await helper.findWithDeleted('User');
 *
 * // Find only deleted
 * await helper.findDeleted('User');
 * ```
 */
export class SoftDeleteHelper {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Hard delete - permanently remove a record from database
   */
  async hardDelete(
    model: SoftDeleteModel,
    where: Record<string, unknown>,
  ): Promise<number> {
    const whereKey = Object.keys(where)[0];
    const whereValue = where[whereKey];

    const result = await this.prisma.$executeRawUnsafe(
      `DELETE FROM \`${model}\` WHERE \`${whereKey}\` = ?`,
      whereValue,
    );

    return result;
  }

  /**
   * Soft delete - set deletedAt timestamp
   */
  async softDelete(
    model: SoftDeleteModel,
    where: Record<string, unknown>,
  ): Promise<number> {
    const whereKey = Object.keys(where)[0];
    const whereValue = where[whereKey];

    const result = await this.prisma.$executeRawUnsafe(
      `UPDATE \`${model}\` SET \`deletedAt\` = NOW() WHERE \`${whereKey}\` = ?`,
      whereValue,
    );

    return result;
  }

  /**
   * Restore a soft-deleted record
   */
  async restore(
    model: SoftDeleteModel,
    where: Record<string, unknown>,
  ): Promise<number> {
    const whereKey = Object.keys(where)[0];
    const whereValue = where[whereKey];

    const result = await this.prisma.$executeRawUnsafe(
      `UPDATE \`${model}\` SET \`deletedAt\` = NULL WHERE \`${whereKey}\` = ?`,
      whereValue,
    );

    return result;
  }

  /**
   * Build where clause that excludes soft-deleted records
   */
  excludeDeleted<T extends object>(where?: T): T & { deletedAt: null } {
    return {
      ...where,
      deletedAt: null,
    } as T & { deletedAt: null };
  }

  /**
   * Build where clause that includes only soft-deleted records
   */
  onlyDeleted<T extends object>(where?: T): T & { deletedAt: { not: null } } {
    return {
      ...where,
      deletedAt: { not: null },
    } as T & { deletedAt: { not: null } };
  }
}

/**
 * Standard soft delete filter to add to queries
 * Use this in your service methods to exclude soft-deleted records
 *
 * @example
 * ```ts
 * const products = await prisma.product.findMany({
 *   where: {
 *     ...SOFT_DELETE_FILTER,
 *     categoryId: 'some-id',
 *   }
 * });
 * ```
 */
export const SOFT_DELETE_FILTER = { deletedAt: null } as const;

/**
 * Filter to get only soft-deleted records
 */
export const ONLY_DELETED_FILTER = { deletedAt: { not: null } } as const;
