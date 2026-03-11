import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

/**
 * Cache key prefixes for different domains
 */
export enum CachePrefix {
  PRODUCT = 'product:',
  PRODUCTS_LIST = 'products:list:',
  CATEGORY = 'category:',
  CATEGORIES_LIST = 'categories:list',
  WAREHOUSE = 'warehouse:',
  WAREHOUSES_LIST = 'warehouses:list',
  STOCK = 'stock:',
  SUPPLIER = 'supplier:',
  SUPPLIERS_LIST = 'suppliers:list',
  USER = 'user:',
  BOM = 'bom:',
  PRODUCTION_ORDER = 'production:order:',
}

/**
 * Cache TTL values in seconds
 */
export enum CacheTTL {
  SHORT = 60, // 1 minute - for frequently changing data
  MEDIUM = 300, // 5 minutes - default
  LONG = 900, // 15 minutes - for rarely changing data
  VERY_LONG = 3600, // 1 hour - for static data
}

// Extended cache interface for accessing store methods
interface ExtendedCache extends Cache {
  store?: {
    keys?: (pattern: string) => Promise<string[]>;
  };
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: ExtendedCache) {}

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      this.logger.warn(`Cache get error for key ${key}: ${error}`);
      return undefined;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const ttl = ttlSeconds ? ttlSeconds * 1000 : undefined;
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      this.logger.warn(`Cache set error for key ${key}: ${error}`);
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.warn(`Cache delete error for key ${key}: ${error}`);
    }
  }

  /**
   * Delete multiple keys matching a pattern (prefix)
   * Note: This is a simplified version for in-memory cache
   * For Redis, use SCAN with pattern matching
   */
  async delByPrefix(prefix: string): Promise<void> {
    try {
      // For Redis store, we can use keys command
      const store = this.cacheManager.store as {
        keys?: (pattern: string) => Promise<string[]>;
      };
      if (store.keys) {
        const keys = await store.keys(`${prefix}*`);
        await Promise.all(keys.map((key) => this.cacheManager.del(key)));
        this.logger.debug(`Deleted ${keys.length} keys with prefix ${prefix}`);
      }
    } catch (error) {
      this.logger.warn(`Cache delete by prefix error for ${prefix}: ${error}`);
    }
  }

  /**
   * Get or set pattern - fetch from cache or execute callback and cache result
   */
  async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    ttlSeconds: number = CacheTTL.MEDIUM,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      this.logger.debug(`Cache hit for key ${key}`);
      return cached;
    }

    this.logger.debug(`Cache miss for key ${key}`);
    const value = await callback();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Invalidate product-related caches
   */
  async invalidateProduct(productId: string): Promise<void> {
    await Promise.all([
      this.del(`${CachePrefix.PRODUCT}${productId}`),
      this.delByPrefix(CachePrefix.PRODUCTS_LIST),
      this.delByPrefix(`${CachePrefix.STOCK}${productId}`),
    ]);
  }

  /**
   * Invalidate warehouse-related caches
   */
  async invalidateWarehouse(warehouseId: string): Promise<void> {
    await Promise.all([
      this.del(`${CachePrefix.WAREHOUSE}${warehouseId}`),
      this.delByPrefix(CachePrefix.WAREHOUSES_LIST),
    ]);
  }

  /**
   * Invalidate stock-related caches
   */
  async invalidateStock(productId: string, warehouseId: string): Promise<void> {
    await Promise.all([
      this.del(`${CachePrefix.STOCK}${productId}:${warehouseId}`),
      this.delByPrefix(`${CachePrefix.STOCK}${productId}`),
      this.del(`${CachePrefix.PRODUCT}${productId}`),
    ]);
  }

  /**
   * Invalidate supplier-related caches
   */
  async invalidateSupplier(supplierId: string): Promise<void> {
    await Promise.all([
      this.del(`${CachePrefix.SUPPLIER}${supplierId}`),
      this.delByPrefix(CachePrefix.SUPPLIERS_LIST),
    ]);
  }

  /**
   * Invalidate category-related caches
   */
  async invalidateCategory(categoryId: string): Promise<void> {
    await Promise.all([
      this.del(`${CachePrefix.CATEGORY}${categoryId}`),
      this.del(CachePrefix.CATEGORIES_LIST),
      this.delByPrefix(CachePrefix.PRODUCTS_LIST), // Products depend on categories
    ]);
  }

  /**
   * Clear all caches
   */
  async reset(): Promise<void> {
    try {
      await this.cacheManager.clear();
      this.logger.log('Cache reset completed');
    } catch (error) {
      this.logger.warn(`Cache reset error: ${error}`);
    }
  }

  /**
   * Build a cache key with prefix
   */
  buildKey(prefix: CachePrefix, ...parts: string[]): string {
    return `${prefix}${parts.join(':')}`;
  }
}
