import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheService, CachePrefix, CacheTTL } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: jest.Mocked<Cache>;

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      clear: jest.fn(),
      store: {
        keys: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return cached value', async () => {
      const cachedValue = { id: '1', name: 'Test' };
      cacheManager.get.mockResolvedValue(cachedValue);

      const result = await service.get('test-key');

      expect(result).toEqual(cachedValue);
      expect(cacheManager.get).toHaveBeenCalledWith('test-key');
    });

    it('should return undefined on cache error', async () => {
      cacheManager.get.mockRejectedValue(new Error('Cache error'));

      const result = await service.get('test-key');

      expect(result).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should set value in cache', async () => {
      const value = { id: '1', name: 'Test' };

      await service.set('test-key', value);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'test-key',
        value,
        undefined,
      );
    });

    it('should set value with TTL', async () => {
      const value = { id: '1', name: 'Test' };

      await service.set('test-key', value, 60);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'test-key',
        value,
        60000, // TTL in milliseconds
      );
    });

    it('should not throw on cache error', async () => {
      cacheManager.set.mockRejectedValue(new Error('Cache error'));

      await expect(service.set('test-key', 'value')).resolves.not.toThrow();
    });
  });

  describe('del', () => {
    it('should delete value from cache', async () => {
      await service.del('test-key');

      expect(cacheManager.del).toHaveBeenCalledWith('test-key');
    });

    it('should not throw on cache error', async () => {
      cacheManager.del.mockRejectedValue(new Error('Cache error'));

      await expect(service.del('test-key')).resolves.not.toThrow();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const cachedValue = { id: '1', name: 'Cached' };
      cacheManager.get.mockResolvedValue(cachedValue);

      const keysMock = jest.fn().mockResolvedValue([]);
      (cacheManager as any).store = { keys: keysMock };
      const callback = jest.fn().mockResolvedValue({ id: '2', name: 'New' });

      const result = await service.getOrSet('test-key', callback);

      expect(result).toEqual(cachedValue);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should execute callback and cache result on cache miss', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      const newValue = { id: '1', name: 'New' };
      const keysMock = jest.fn().mockResolvedValue(['test-1', 'test-2']);
      (cacheManager as any).store = { keys: keysMock };
      const callback = jest.fn().mockResolvedValue(newValue);

      const result = await service.getOrSet('test-key', callback, CacheTTL.MEDIUM);

      expect(result).toEqual(newValue);
      expect(callback).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith(
        'test-key',
        newValue,
        CacheTTL.MEDIUM * 1000,
      );
    });
  });

  describe('invalidateProduct', () => {
    it('should invalidate product-related caches', async () => {
      const storeKeys = jest.spyOn((cacheManager as any).store, 'keys');
      storeKeys.mockResolvedValue([]);

      await service.invalidateProduct('product-1');

      expect(cacheManager.del).toHaveBeenCalledWith(`${CachePrefix.PRODUCT}product-1`);
    });
  });

  describe('invalidateWarehouse', () => {
    it('should invalidate warehouse-related caches', async () => {
      const storeKeys = jest.spyOn((cacheManager as any).store, 'keys');
      storeKeys.mockResolvedValue([]);

      await service.invalidateWarehouse('warehouse-1');

      expect(cacheManager.del).toHaveBeenCalledWith(`${CachePrefix.WAREHOUSE}warehouse-1`);
    });
  });

  describe('reset', () => {
    it('should reset all caches', async () => {
      await service.reset();

      expect(cacheManager.clear).toHaveBeenCalled();
    });
  });

  describe('buildKey', () => {
    it('should build cache key with prefix', () => {
      const key = service.buildKey(CachePrefix.PRODUCT, 'id-1', 'extra');

      expect(key).toBe('product:id-1:extra');
    });
  });
});
