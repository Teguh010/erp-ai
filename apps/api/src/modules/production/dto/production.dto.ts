import {
  IsString,
  IsInt,
  IsUUID,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BOMItemDto {
  @IsUUID()
  materialId: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class CreateBOMDto {
  @IsUUID()
  productId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BOMItemDto)
  items: BOMItemDto[];
}

export class UpdateBOMDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BOMItemDto)
  @IsOptional()
  items?: BOMItemDto[];
}

export enum ProductionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class CreateProductionOrderDto {
  @IsUUID()
  bomId: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;
}

export class UpdateProductionOrderDto {
  @IsEnum(ProductionStatus)
  @IsOptional()
  status?: ProductionStatus;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;
}

// ==================== SUPPLIER ====================
export class CreateSupplierDto {
  @IsString()
  name: string;

  @IsString()
  contact: string;

  @IsString()
  email: string;
}

export class UpdateSupplierDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  contact?: string;

  @IsString()
  @IsOptional()
  email?: string;
}

// ==================== PURCHASE ORDER ====================
export class PurchaseOrderItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @Type(() => Number)
  unitPrice: number;
}

export class CreatePurchaseOrderDto {
  @IsUUID()
  supplierId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}

export enum POStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export class UpdatePurchaseOrderStatusDto {
  @IsEnum(POStatus)
  status: POStatus;
}
