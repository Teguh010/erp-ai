import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { PrismaService } from '../../database/prisma.service';

/**
 * Custom health indicator for Prisma/Database connectivity
 */
@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /**
   * Check if the database is reachable
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Execute a simple query to check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Prisma health check failed',
        this.getStatus(key, false, {
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * Check database response time
   */
  async checkResponseTime(
    key: string,
    thresholdMs: number = 1000,
  ): Promise<HealthIndicatorResult> {
    const start = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;

      if (responseTime > thresholdMs) {
        throw new HealthCheckError(
          `Database response time exceeded threshold (${responseTime}ms > ${thresholdMs}ms)`,
          this.getStatus(key, false, { responseTime, threshold: thresholdMs }),
        );
      }

      return this.getStatus(key, true, { responseTime });
    } catch (error) {
      if (error instanceof HealthCheckError) {
        throw error;
      }
      throw new HealthCheckError(
        'Database response time check failed',
        this.getStatus(key, false, {
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }
}
