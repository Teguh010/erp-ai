import { Prisma } from '@prisma/client';

/**
 * Stock query filter options
 */
export interface StockWhereInput {
  warehouseId?: string;
  productId?: string;
}

/**
 * Stock movement query filter options
 */
export interface StockMovementWhereInput {
  productId?: string;
  warehouseId?: string;
}

/**
 * Packaging report query filter options
 */
export interface PackagingReportWhereInput {
  date?: {
    gte?: Date;
    lte?: Date;
  };
}

/**
 * Production order update data
 */
export interface ProductionOrderUpdateData {
  quantity?: number;
  status?: string;
  scheduledDate?: Date;
  completedDate?: Date;
}

/**
 * Packaging report update data
 */
export interface PackagingReportUpdateData {
  date?: Date;
  aktivitas?: string;
  tenagaPerempuan?: number;
  tenagaLaki?: number;
  hasilPackaging?: number;
  hpp?: number;
}
