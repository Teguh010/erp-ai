import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/**
 * Audit actions
 */
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  VIEW = 'VIEW',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  COMPLETE = 'COMPLETE',
}

/**
 * Audit log creation params
 */
export interface CreateAuditLogParams {
  userId: string;
  action: AuditAction | string;
  entity: string;
  entityId: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}

/**
 * Audit log query params
 */
export interface QueryAuditLogParams {
  userId?: string;
  entity?: string;
  entityId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  skip?: number;
  take?: number;
}

/**
 * Sensitive fields to redact from audit logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'creditCard',
  'cardNumber',
  'cvv',
  'ssn',
  'socialSecurityNumber',
];

/**
 * AuditService - Manual audit logging service
 *
 * Use this service when you need fine-grained control over audit logging,
 * such as capturing old vs new data, or logging custom actions.
 *
 * @example
 * ```ts
 * // In your service
 * async updateProduct(id: string, data: UpdateProductDto) {
 *   const oldProduct = await this.prisma.product.findUnique({ where: { id } });
 *
 *   const newProduct = await this.prisma.product.update({
 *     where: { id },
 *     data,
 *   });
 *
 *   // Log the change with before/after data
 *   await this.auditService.log({
 *     userId: this.currentUserId,
 *     action: AuditAction.UPDATE,
 *     entity: 'Product',
 *     entityId: id,
 *     oldData: oldProduct,
 *     newData: newProduct,
 *   });
 *
 *   return newProduct;
 * }
 * ```
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an audit log entry
   */
  async log(params: CreateAuditLogParams): Promise<void> {
    try {
      const sanitizedOldData = this.sanitizeData(params.oldData);
      const sanitizedNewData = this.sanitizeData(params.newData);

      await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          oldData: sanitizedOldData as Prisma.InputJsonValue | undefined,
          newData: sanitizedNewData as Prisma.InputJsonValue | undefined,
        },
      });

      this.logger.debug(
        `Audit: ${params.action} ${params.entity}#${params.entityId} by ${params.userId}`,
      );
    } catch (error) {
      // Don't throw - audit logging should not break the main flow
      this.logger.error(
        `Audit log creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Log a create action
   */
  async logCreate(
    userId: string,
    entity: string,
    entityId: string,
    newData?: Record<string, unknown>,
  ): Promise<void> {
    return this.log({
      userId,
      action: AuditAction.CREATE,
      entity,
      entityId,
      newData,
    });
  }

  /**
   * Log an update action with before/after data
   */
  async logUpdate(
    userId: string,
    entity: string,
    entityId: string,
    oldData?: Record<string, unknown> | null,
    newData?: Record<string, unknown> | null,
  ): Promise<void> {
    return this.log({
      userId,
      action: AuditAction.UPDATE,
      entity,
      entityId,
      oldData,
      newData,
    });
  }

  /**
   * Log a delete action
   */
  async logDelete(
    userId: string,
    entity: string,
    entityId: string,
    oldData?: Record<string, unknown> | null,
  ): Promise<void> {
    return this.log({
      userId,
      action: AuditAction.DELETE,
      entity,
      entityId,
      oldData,
    });
  }

  /**
   * Log a restore action (for soft delete)
   */
  async logRestore(
    userId: string,
    entity: string,
    entityId: string,
  ): Promise<void> {
    return this.log({
      userId,
      action: AuditAction.RESTORE,
      entity,
      entityId,
    });
  }

  /**
   * Query audit logs with filters
   */
  async query(params: QueryAuditLogParams) {
    const where: Record<string, unknown> = {};

    if (params.userId) {
      where.userId = params.userId;
    }

    if (params.entity) {
      where.entity = params.entity;
    }

    if (params.entityId) {
      where.entityId = params.entityId;
    }

    if (params.action) {
      where.action = params.action;
    }

    if (params.startDate || params.endDate) {
      where.timestamp = {};
      if (params.startDate) {
        (where.timestamp as Record<string, Date>).gte = params.startDate;
      }
      if (params.endDate) {
        (where.timestamp as Record<string, Date>).lte = params.endDate;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: params.skip || 0,
        take: params.take || 50,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Get audit history for a specific entity
   */
  async getEntityHistory(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        entity,
        entityId,
      },
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });
  }

  /**
   * Get recent activity for a user
   */
  async getUserActivity(userId: string, limit = 20) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Sanitize sensitive data before logging
   */
  private sanitizeData(
    data?: Record<string, unknown> | null,
  ): Record<string, unknown> | undefined {
    if (!data) return undefined;

    const sanitized = { ...data };

    for (const field of SENSITIVE_FIELDS) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }

      // Also check nested objects
      for (const key of Object.keys(sanitized)) {
        const value = sanitized[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          sanitized[key] = this.sanitizeData(
            value as Record<string, unknown>,
          ) as Record<string, unknown>;
        }
      }
    }

    return sanitized;
  }
}
