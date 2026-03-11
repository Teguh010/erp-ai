import {
  IsString,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

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

export class CreateProductDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  categoryId: string;

  @IsString()
  unit: string;

  @Type(() => Number)
  purchasePrice: number;

  @Type(() => Number)
  @IsOptional()
  salePrice?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minStockLevel?: number;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @Type(() => Number)
  @IsOptional()
  purchasePrice?: number;

  @Type(() => Number)
  @IsOptional()
  salePrice?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minStockLevel?: number;
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
}

export class LowStockQueryDto {
  @IsUUID()
  @IsOptional()
  warehouseId?: string;
}
