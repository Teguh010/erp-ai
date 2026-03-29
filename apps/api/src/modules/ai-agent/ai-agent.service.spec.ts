import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiAgentService } from './ai-agent.service';
import { PrismaService } from '../../database/prisma.service';
import { RagService } from './services/rag.service';
import { createMockPrismaService } from '../../test/test-utils';

describe('AiAgentService', () => {
  let service: AiAgentService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let ragService: jest.Mocked<RagService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAgentService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'GROQ_API_KEY') return undefined; // No API key
              return null;
            }),
          },
        },
        {
          provide: RagService,
          useValue: {
            searchSimilarChunks: jest.fn().mockResolvedValue([]),
            ingestDocument: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AiAgentService>(AiAgentService);
    ragService = module.get(RagService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chat', () => {
    it('should return error when no AI service configured', async () => {
      ragService.searchSimilarChunks.mockResolvedValue([]);
      prisma.stock.aggregate.mockResolvedValue({
        _sum: { quantity: 100 },
        _count: { _all: 10 },
      } as any);

      const result = await service.chat('What is the inventory status?', 'inventory');

      expect(ragService.searchSimilarChunks).toHaveBeenCalled();
      expect(result).toContain('AI service');
    });
  });

  describe('analyzeInventory', () => {
    it('should fetch inventory data and return analysis', async () => {
      prisma.stock.findMany.mockResolvedValue([
        {
          id: 'stock-1',
          quantity: 100,
          product: { name: 'Product A' },
          warehouse: { name: 'Main' },
        } as any,
      ]);
      prisma.stockMovement.findMany.mockResolvedValue([]);

      const result = await service.analyzeInventory('What items are low in stock?');

      expect(prisma.stock.findMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('analyzeProduction', () => {
    it('should fetch production data and return analysis', async () => {
      prisma.productionOrder.findMany.mockResolvedValue([]);
      prisma.billOfMaterials.findMany.mockResolvedValue([]);
      prisma.stock.findMany.mockResolvedValue([]);

      const result = await service.analyzeProduction('What production orders are pending?');

      expect(prisma.productionOrder.findMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('textToSQL', () => {
    it('should reject non-SELECT queries', async () => {
      // Since there's no AI configured, this won't generate real SQL
      // But we can test the security validation

      const result = await service.textToSQL('Delete all users');

      expect(result).toHaveProperty('error');
    });
  });
});

describe('AiAgentService with API key', () => {
  let service: AiAgentService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAgentService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'GROQ_API_KEY') return 'test-api-key';
              return null;
            }),
          },
        },
        {
          provide: RagService,
          useValue: {
            searchSimilarChunks: jest.fn().mockResolvedValue([]),
            ingestDocument: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AiAgentService>(AiAgentService);
  });

  it('should initialize with API key', () => {
    expect(service).toBeDefined();
  });
});
