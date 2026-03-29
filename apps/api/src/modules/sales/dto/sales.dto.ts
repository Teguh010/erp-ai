import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { SalesOrderStatus } from '@prisma/client';

export class CreateSalesOrderItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  price: number;
}

export class CreateSalesOrderDto {
  @IsString()
  customerId: string;

  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderItemDto)
  items: CreateSalesOrderItemDto[];
}

export class UpdateSalesOrderStatusDto {
  @IsEnum(SalesOrderStatus)
  status: SalesOrderStatus;

  @IsOptional()
  @IsDateString()
  shippingDate?: string;

  @IsOptional()
  @IsDateString()
  receivedDate?: string;
}

export class CreateCustomerDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
