import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes.enum';

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  statusCode: number;
  errorCode: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path?: string;
}

/**
 * Base exception class for all domain-specific exceptions
 * Provides consistent error response structure
 */
export class BaseException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    message: string,
    statusCode: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super(
      {
        errorCode,
        message,
        details,
      },
      statusCode,
    );
  }
}

// ==================== AUTH EXCEPTIONS ====================

export class InvalidCredentialsException extends BaseException {
  constructor(message = 'Invalid email or password') {
    super(ErrorCode.AUTH_INVALID_CREDENTIALS, message, HttpStatus.UNAUTHORIZED);
  }
}

export class EmailExistsException extends BaseException {
  constructor(email: string) {
    super(
      ErrorCode.AUTH_EMAIL_EXISTS,
      `Email '${email}' is already registered`,
      HttpStatus.CONFLICT,
      { email },
    );
  }
}

export class UserNotFoundException extends BaseException {
  constructor(identifier?: string) {
    super(
      ErrorCode.AUTH_USER_NOT_FOUND,
      identifier ? `User '${identifier}' not found` : 'User not found',
      HttpStatus.NOT_FOUND,
      identifier ? { identifier } : undefined,
    );
  }
}

export class InsufficientPermissionsException extends BaseException {
  constructor(requiredRoles?: string[]) {
    super(
      ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
      'You do not have permission to perform this action',
      HttpStatus.FORBIDDEN,
      requiredRoles ? { requiredRoles } : undefined,
    );
  }
}

// ==================== INVENTORY EXCEPTIONS ====================

export class ProductNotFoundException extends BaseException {
  constructor(productId: string) {
    super(
      ErrorCode.INVENTORY_PRODUCT_NOT_FOUND,
      `Product '${productId}' not found`,
      HttpStatus.NOT_FOUND,
      { productId },
    );
  }
}

export class WarehouseNotFoundException extends BaseException {
  constructor(warehouseId: string) {
    super(
      ErrorCode.INVENTORY_WAREHOUSE_NOT_FOUND,
      `Warehouse '${warehouseId}' not found`,
      HttpStatus.NOT_FOUND,
      { warehouseId },
    );
  }
}

export class CategoryNotFoundException extends BaseException {
  constructor(categoryId: string) {
    super(
      ErrorCode.INVENTORY_CATEGORY_NOT_FOUND,
      `Category '${categoryId}' not found`,
      HttpStatus.NOT_FOUND,
      { categoryId },
    );
  }
}

export class InsufficientStockException extends BaseException {
  constructor(
    productId: string,
    available: number,
    requested: number,
    warehouseId?: string,
  ) {
    super(
      ErrorCode.INVENTORY_INSUFFICIENT_STOCK,
      `Insufficient stock for product '${productId}'. Available: ${available}, Requested: ${requested}`,
      HttpStatus.BAD_REQUEST,
      { productId, available, requested, warehouseId },
    );
  }
}

export class DuplicateSkuException extends BaseException {
  constructor(sku: string) {
    super(
      ErrorCode.INVENTORY_DUPLICATE_SKU,
      `Product with SKU '${sku}' already exists`,
      HttpStatus.CONFLICT,
      { sku },
    );
  }
}

// ==================== PRODUCTION EXCEPTIONS ====================

export class BOMNotFoundException extends BaseException {
  constructor(bomId: string) {
    super(
      ErrorCode.PRODUCTION_BOM_NOT_FOUND,
      `Bill of Materials '${bomId}' not found`,
      HttpStatus.NOT_FOUND,
      { bomId },
    );
  }
}

export class BOMExistsException extends BaseException {
  constructor(productId: string) {
    super(
      ErrorCode.PRODUCTION_BOM_EXISTS,
      `Product '${productId}' already has a Bill of Materials`,
      HttpStatus.CONFLICT,
      { productId },
    );
  }
}

export class ProductionOrderNotFoundException extends BaseException {
  constructor(orderId: string) {
    super(
      ErrorCode.PRODUCTION_ORDER_NOT_FOUND,
      `Production order '${orderId}' not found`,
      HttpStatus.NOT_FOUND,
      { orderId },
    );
  }
}

export class InvalidProductionStatusException extends BaseException {
  constructor(currentStatus: string, requiredStatus: string, action: string) {
    super(
      ErrorCode.PRODUCTION_INVALID_STATUS,
      `Cannot ${action}: Order status is '${currentStatus}', required '${requiredStatus}'`,
      HttpStatus.BAD_REQUEST,
      { currentStatus, requiredStatus, action },
    );
  }
}

// ==================== SUPPLIER EXCEPTIONS ====================

export class SupplierNotFoundException extends BaseException {
  constructor(supplierId: string) {
    super(
      ErrorCode.SUPPLIER_NOT_FOUND,
      `Supplier '${supplierId}' not found`,
      HttpStatus.NOT_FOUND,
      { supplierId },
    );
  }
}

// ==================== PURCHASE ORDER EXCEPTIONS ====================

export class PurchaseOrderNotFoundException extends BaseException {
  constructor(orderId: string) {
    super(
      ErrorCode.PURCHASE_ORDER_NOT_FOUND,
      `Purchase order '${orderId}' not found`,
      HttpStatus.NOT_FOUND,
      { orderId },
    );
  }
}

export class InvalidPurchaseOrderStatusException extends BaseException {
  constructor(currentStatus: string, action: string) {
    super(
      ErrorCode.PURCHASE_ORDER_INVALID_STATUS,
      `Cannot ${action}: Purchase order status is '${currentStatus}'`,
      HttpStatus.BAD_REQUEST,
      { currentStatus, action },
    );
  }
}

// ==================== DATABASE EXCEPTIONS ====================

export class UniqueConstraintException extends BaseException {
  constructor(field: string, value?: string) {
    super(
      ErrorCode.DB_UNIQUE_CONSTRAINT,
      value
        ? `${field} '${value}' already exists`
        : `${field} must be unique`,
      HttpStatus.CONFLICT,
      { field, value },
    );
  }
}

export class ForeignKeyConstraintException extends BaseException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      ErrorCode.DB_FOREIGN_KEY_CONSTRAINT,
      message,
      HttpStatus.BAD_REQUEST,
      details,
    );
  }
}

export class RecordNotFoundException extends BaseException {
  constructor(entity: string, id?: string) {
    super(
      ErrorCode.DB_RECORD_NOT_FOUND,
      id ? `${entity} with ID '${id}' not found` : `${entity} not found`,
      HttpStatus.NOT_FOUND,
      { entity, id },
    );
  }
}
