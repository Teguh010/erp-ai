import { Test, TestingModule } from '@nestjs/testing';
import { PrismaHealthIndicator } from './prisma.health';
import { PrismaService } from '../../database/prisma.service';
import { HealthCheckError } from '@nestjs/terminus';

describe('PrismaHealthIndicator', () => {
  let indicator: PrismaHealthIndicator;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaHealthIndicator,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    indicator = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
    prisma = module.get(PrismaService);
  });

  describe('isHealthy', () => {
    it('should return healthy status when database is reachable', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);

      const result = await indicator.isHealthy('database');

      expect(result).toEqual({
        database: {
          status: 'up',
        },
      });
    });

    it('should throw HealthCheckError when database is not reachable', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('Connection failed'));

      await expect(indicator.isHealthy('database')).rejects.toThrow(
        HealthCheckError,
      );
    });
  });

  describe('checkResponseTime', () => {
    it('should return healthy status when response time is within threshold', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);

      const result = await indicator.checkResponseTime('database', 5000);

      expect(result).toMatchObject({
        database: {
          status: 'up',
        },
      });
      expect(result.database).toHaveProperty('responseTime');
    });

    it('should throw HealthCheckError when database query fails', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('Query timeout'));

      await expect(indicator.checkResponseTime('database', 1000)).rejects.toThrow(
        HealthCheckError,
      );
    });
  });
});
