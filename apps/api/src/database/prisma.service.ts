import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  SoftDeleteHelper,
  SoftDeleteModel,
  SOFT_DELETE_FILTER,
  ONLY_DELETED_FILTER,
} from './prisma-soft-delete.extension';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private softDeleteHelper: SoftDeleteHelper;

  /**
   * Standard filter to exclude soft-deleted records
   * Use in where clauses: { ...this.softDeleteFilter, ... }
   */
  readonly softDeleteFilter = SOFT_DELETE_FILTER;

  /**
   * Filter to get only soft-deleted records
   */
  readonly onlyDeletedFilter = ONLY_DELETED_FILTER;

  constructor() {
    super();
    this.softDeleteHelper = new SoftDeleteHelper(this);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Hard delete - permanently remove a record from database
   * Bypasses soft delete
   */
  async hardDelete(
    model: SoftDeleteModel,
    where: Record<string, unknown>,
  ): Promise<number> {
    return this.softDeleteHelper.hardDelete(model, where);
  }

  /**
   * Soft delete - set deletedAt timestamp
   */
  async softDelete(
    model: SoftDeleteModel,
    where: Record<string, unknown>,
  ): Promise<number> {
    return this.softDeleteHelper.softDelete(model, where);
  }

  /**
   * Restore a soft-deleted record
   */
  async restore(
    model: SoftDeleteModel,
    where: Record<string, unknown>,
  ): Promise<number> {
    return this.softDeleteHelper.restore(model, where);
  }

  /**
   * Build where clause that excludes soft-deleted records
   */
  excludeDeleted<T extends object>(where?: T): T & { deletedAt: null } {
    return this.softDeleteHelper.excludeDeleted(where);
  }

  /**
   * Build where clause for only soft-deleted records
   */
  onlyDeleted<T extends object>(where?: T): T & { deletedAt: { not: null } } {
    return this.softDeleteHelper.onlyDeleted(where);
  }
}
