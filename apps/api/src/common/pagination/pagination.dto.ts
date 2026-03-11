import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Sort direction enum
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Base pagination query DTO with cursor support
 */
export class CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Cursor for pagination (base64 encoded)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Number of items to return', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}

/**
 * Offset-based pagination query DTO (legacy support)
 */
export class OffsetPaginationDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

/**
 * Cursor pagination result metadata
 */
export interface CursorPaginationMeta {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
  totalCount?: number;
}

/**
 * Cursor paginated response
 */
export interface CursorPaginatedResponse<T> {
  data: T[];
  meta: CursorPaginationMeta;
}

/**
 * Edge type for cursor pagination (GraphQL-style)
 */
export interface Edge<T> {
  node: T;
  cursor: string;
}

/**
 * Connection type for cursor pagination (GraphQL-style)
 */
export interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: CursorPaginationMeta;
  totalCount?: number;
}

/**
 * Offset pagination result metadata
 */
export interface OffsetPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Offset paginated response
 */
export interface OffsetPaginatedResponse<T> {
  data: T[];
  meta: OffsetPaginationMeta;
}
