import {
  IsString,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateWarehouseDto {
  @IsString()
  name: string;

  @IsString()
  location: string;
}

export class UpdateWarehouseDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  location?: string;
}

export class CreateUnitDto {
  @IsString()
  name: string;
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsUUID()
  categoryId: string;

  @IsUUID()
  unitId: string;

  @Type(() => Number)
  purchasePrice: number;

  @Type(() => Number)
  @IsOptional()
  salePrice?: number;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsUUID()
  @IsOptional()
  unitId?: string;

  @Type(() => Number)
  @IsOptional()
  purchasePrice?: number;

  @Type(() => Number)
  @IsOptional()
  salePrice?: number;
}

export class CreateCategoryDto {
  @IsString()
  name: string;
}

export enum MovementType {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  ADJUSTMENT = 'ADJUSTMENT',
  PRODUCTION_USE = 'PRODUCTION_USE',
  PRODUCTION_FINISH = 'PRODUCTION_FINISH',
}

export class CreateStockMovementDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  warehouseId: string;

  @IsEnum(MovementType)
  type: MovementType;

  @IsInt()
  @Type(() => Number)
  quantity: number;

  @IsString()
  @IsOptional()
  referenceId?: string;
}

export class StockQueryDto {
  @IsUUID()
  @IsOptional()
  warehouseId?: string;

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  // Cursor-based pagination
  @IsOptional()
  @IsString()
  cursor?: string;

  // Offset-based pagination (legacy)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  /** Hanya Bahan Baku, Bahan Tambahan, Kemasan (selaras seed UMKM — untuk PO). */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  procurementItemsOnly?: boolean;

  /** Hanya kategori Barang Jadi (produk siap jual). */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  finishedGoodsOnly?: boolean;
}

export class LowStockQueryDto {
  @IsUUID()
  @IsOptional()
  warehouseId?: string;
}
