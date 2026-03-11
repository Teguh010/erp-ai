import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;

  beforeEach(async () => {
    const mockHealthCheckService = {
      check: jest.fn(),
    };

    const mockPrismaHealth = {
      isHealthy: jest.fn(),
      checkResponseTime: jest.fn(),
    };

    const mockMemoryHealth = {
      checkHeap: jest.fn(),
      checkRSS: jest.fn(),
    };

    const mockDiskHealth = {
      checkStorage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: PrismaHealthIndicator,
          useValue: mockPrismaHealth,
        },
        {
          provide: MemoryHealthIndicator,
          useValue: mockMemoryHealth,
        },
        {
          provide: DiskHealthIndicator,
          useValue: mockDiskHealth,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check (liveness)', () => {
    it('should return healthy status', async () => {
      const expectedResult: HealthCheckResult = {
        status: 'ok',
        info: {},
        error: {},
        details: {},
      };
      healthCheckService.check.mockResolvedValue(expectedResult);

      const result = await controller.check();

      expect(result).toEqual(expectedResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([]);
    });
  });

  describe('readiness', () => {
    it('should check database readiness', async () => {
      const expectedResult: HealthCheckResult = {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      };
      healthCheckService.check.mockResolvedValue(expectedResult);

      const result = await controller.readiness();

      expect(result).toEqual(expectedResult);
      expect(healthCheckService.check).toHaveBeenCalled();
    });
  });

  describe('full', () => {
    it('should perform full health check', async () => {
      const expectedResult: HealthCheckResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          disk: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          disk: { status: 'up' },
        },
      };
      healthCheckService.check.mockResolvedValue(expectedResult);

      const result = await controller.full();

      expect(result).toEqual(expectedResult);
      expect(healthCheckService.check).toHaveBeenCalled();
    });
  });

  describe('database', () => {
    it('should check database health', async () => {
      const expectedResult: HealthCheckResult = {
        status: 'ok',
        info: { database: { status: 'up', responseTime: 50 } },
        error: {},
        details: { database: { status: 'up', responseTime: 50 } },
      };
      healthCheckService.check.mockResolvedValue(expectedResult);

      const result = await controller.database();

      expect(result).toEqual(expectedResult);
      expect(healthCheckService.check).toHaveBeenCalled();
    });
  });
});
