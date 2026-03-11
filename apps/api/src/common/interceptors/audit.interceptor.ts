import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditAction } from '../services/audit.service';

/**
 * Interface for audit log entry
 */
export interface AuditEntry {
  userId: string;
  action: AuditAction | string;
  entity: string;
  entityId: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Helper to extract entity info from request path
 */
function extractEntityFromPath(path: string): string {
  // /api/inventory/products/123 -> Product
  // /api/production/orders/456 -> ProductionOrder
  const segments = path.split('/').filter(Boolean);
  
  // Find the module segment (usually after 'api')
  const apiIndex = segments.indexOf('api');
  const moduleSegment = segments[apiIndex + 1] || segments[0];
  
  // Map common paths to entity names
  const entityMap: Record<string, string> = {
    products: 'Product',
    categories: 'Category',
    warehouses: 'Warehouse',
    stock: 'Stock',
    suppliers: 'Supplier',
    customers: 'Customer',
    users: 'User',
    orders: 'Order',
    'production-orders': 'ProductionOrder',
    'purchase-orders': 'PurchaseOrder',
    'sales-orders': 'SalesOrder',
    inventory: 'Inventory',
    production: 'Production',
    auth: 'Auth',
  };

  return entityMap[moduleSegment] || moduleSegment || 'Unknown';
}

/**
 * Helper to extract entity ID from request
 */
function extractEntityId(request: Request): string {
  // Try params first
  if (request.params?.id) {
    const id = request.params.id;
    return Array.isArray(id) ? id[0] : id;
  }
  
  // Try body for create operations
  const body = request.body as Record<string, unknown> | undefined;
  if (body?.id) {
    return String(body.id);
  }
  
  return 'N/A';
}

/**
 * Helper to map HTTP method to audit action
 */
function methodToAction(method: string): AuditAction {
  switch (method.toUpperCase()) {
    case 'POST':
      return AuditAction.CREATE;
    case 'PUT':
    case 'PATCH':
      return AuditAction.UPDATE;
    case 'DELETE':
      return AuditAction.DELETE;
    default:
      return AuditAction.CREATE;
  }
}

/**
 * User interface for typed request
 */
interface RequestUser {
  id: string;
  email?: string;
  roleId?: string;
}

/**
 * Audit Trail Interceptor
 *
 * Automatically logs create, update, and delete operations to the AuditLog table.
 * Captures the user, action, entity, and data changes.
 *
 * Usage:
 * ```ts
 * @UseInterceptors(AuditInterceptor)
 * @Controller('products')
 * export class ProductsController { ... }
 * ```
 *
 * Or globally in main.ts:
 * ```ts
 * app.useGlobalInterceptors(new AuditInterceptor(prismaService));
 * ```
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    // Only audit mutating operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = request.user as RequestUser | undefined;
    const entity = extractEntityFromPath(request.path);
    const action = methodToAction(method);
    const startTime = Date.now();

    // Capture request body for old/new data comparison
    const requestData = request.body as Record<string, unknown> | undefined;

    return next.handle().pipe(
      tap({
        next: async (responseData: unknown) => {
          // Log successful operations
          try {
            const entityId = extractEntityId(request) ||
              (responseData as Record<string, unknown>)?.id?.toString() ||
              'N/A';

            await this.createAuditLog({
              userId: user?.id || 'anonymous',
              action,
              entity,
              entityId,
              oldData: action === AuditAction.UPDATE ? undefined : undefined,
              newData: this.sanitizeData(requestData),
              metadata: {
                ip: request.ip,
                userAgent: request.headers['user-agent'],
                duration: Date.now() - startTime,
                path: request.path,
                method: request.method,
              },
            });
          } catch (error) {
            this.logger.error(
              `Failed to create audit log: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        },
        error: async (error: Error) => {
          // Log failed operations too (optional)
          this.logger.debug(
            `Operation failed, skipping audit: ${entity} ${action} - ${error.message}`,
          );
        },
      }),
    );
  }

  /**
   * Create audit log entry in database
   */
  private async createAuditLog(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          oldData: entry.oldData as Prisma.InputJsonValue | undefined,
          newData: entry.newData as Prisma.InputJsonValue | undefined,
        },
      });

      this.logger.debug(
        `Audit: ${entry.action} ${entry.entity}#${entry.entityId} by ${entry.userId}`,
      );
    } catch (error) {
      // Don't throw - audit logging should not break the main flow
      this.logger.error(
        `Audit log creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Sanitize sensitive data before logging
   */
  private sanitizeData(
    data?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (!data) return undefined;

    const sensitiveFields = [
      'password',
      'passwordHash',
      'token',
      'secret',
      'apiKey',
      'creditCard',
      'ssn',
    ];

    const sanitized = { ...data };
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
