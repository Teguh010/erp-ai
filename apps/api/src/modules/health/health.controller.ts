import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaHealthIndicator } from './prisma.health';

/**
 * Health check endpoints for monitoring and load balancers
 */
@ApiTags('Health')
@Controller('health')
@SkipThrottle() // Health checks should not be rate limited
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  /**
   * Basic liveness probe - is the app running?
   * Used by Kubernetes/Docker for basic health checks
   */
  @Get()
  @ApiOperation({ summary: 'Basic health check (liveness probe)' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  @HealthCheck()
  check() {
    return this.health.check([]);
  }

  /**
   * Readiness probe - is the app ready to receive traffic?
   * Checks database connectivity
   */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe - checks database connectivity' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
    ]);
  }

  /**
   * Full health check - comprehensive system health
   * Includes database, memory, and disk checks
   */
  @Get('full')
  @ApiOperation({ summary: 'Full health check with all indicators' })
  @ApiResponse({ status: 200, description: 'All systems healthy' })
  @ApiResponse({ status: 503, description: 'One or more systems unhealthy' })
  @HealthCheck()
  full() {
    return this.health.check([
      // Database check with response time threshold
      () => this.prismaHealth.checkResponseTime('database', 2000),

      // Memory check - heap should not exceed 300MB
      () =>
        this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),

      // Memory check - RSS should not exceed 500MB
      () =>
        this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),

      // Disk check - storage should have at least 10% free space
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.1,
        }),
    ]);
  }

  /**
   * Database-specific health check
   */
  @Get('database')
  @ApiOperation({ summary: 'Database health check' })
  @ApiResponse({ status: 200, description: 'Database is healthy' })
  @ApiResponse({ status: 503, description: 'Database is unhealthy' })
  @HealthCheck()
  database() {
    return this.health.check([
      () => this.prismaHealth.checkResponseTime('database', 1000),
    ]);
  }
}
