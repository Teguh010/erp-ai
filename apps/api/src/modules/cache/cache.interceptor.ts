import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Logger,
} from '@nestjs/common';
import { Observable, of, tap } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';

export const CACHE_KEY_METADATA = 'cache_key_metadata';
export const CACHE_TTL_METADATA = 'cache_ttl_metadata';

/**
 * Custom decorator to set cache key pattern
 */
export const CacheKey = (key: string) =>
  (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(CACHE_KEY_METADATA, key, descriptor.value as object);
    return descriptor;
  };

/**
 * Custom decorator to set cache TTL in seconds
 */
export const CacheTTLDecorator = (ttl: number) =>
  (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(CACHE_TTL_METADATA, ttl, descriptor.value as object);
    return descriptor;
  };

/**
 * HTTP Cache Interceptor that caches GET requests
 * Supports dynamic cache keys based on request parameters
 */
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpCacheInterceptor.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Get custom cache key or generate from URL
    const handler = context.getHandler();
    const customKey = this.reflector.get<string>(
      CACHE_KEY_METADATA,
      handler,
    );
    const cacheKey = customKey || this.generateCacheKey(request);

    // Get TTL from decorator or use default (5 minutes)
    const ttl = this.reflector.get<number>(CACHE_TTL_METADATA, handler) || 300;

    try {
      // Try to get from cache
      const cachedResponse = await this.cacheManager.get(cacheKey);
      if (cachedResponse) {
        this.logger.debug(`Cache hit: ${cacheKey}`);
        return of(cachedResponse);
      }
    } catch (error) {
      this.logger.warn(`Cache get error: ${error}`);
    }

    // Cache miss - execute handler and cache result
    this.logger.debug(`Cache miss: ${cacheKey}`);
    return next.handle().pipe(
      tap(async (response) => {
        try {
          await this.cacheManager.set(cacheKey, response, ttl * 1000);
        } catch (error) {
          this.logger.warn(`Cache set error: ${error}`);
        }
      }),
    );
  }

  /**
   * Generate cache key from request URL and query params
   */
  private generateCacheKey(request: Request): string {
    const { url, query } = request;
    const queryString = Object.keys(query)
      .sort()
      .map((key) => `${key}=${query[key]}`)
      .join('&');
    return queryString ? `${url}?${queryString}` : url;
  }
}
