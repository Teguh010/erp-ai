import { Module, Global, Logger } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import * as net from 'net';

/**
 * Check if Redis is available by attempting a TCP connection
 */
async function isRedisAvailable(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 1000; // 1 second timeout

    socket.setTimeout(timeout);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('CacheModule');
        const redisHost = configService.get<string>('REDIS_HOST');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);

        // Check if Redis is configured and available
        if (redisHost && redisPort) {
          const available = await isRedisAvailable(redisHost, redisPort);

          if (available) {
            try {
              // Dynamic import to avoid loading ioredis if not needed
              const { redisStore } = await import('cache-manager-ioredis-yet');

              const store = await redisStore({
                host: redisHost,
                port: redisPort,
                password: configService.get<string>('REDIS_PASSWORD'),
                ttl: configService.get<number>('CACHE_TTL', 300) * 1000,
                db: configService.get<number>('REDIS_CACHE_DB', 1),
              });

              logger.log('✅ Redis cache connected');
              return { store };
            } catch (error) {
              logger.warn(
                `⚠️ Redis store init failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              );
            }
          } else {
            logger.warn(
              `⚠️ Redis not available at ${redisHost}:${redisPort}. Using in-memory cache.`,
            );
          }
        }

        // Fallback to in-memory cache
        logger.log('📦 Using in-memory cache');
        return {
          ttl: configService.get<number>('CACHE_TTL', 300) * 1000,
          max: configService.get<number>('CACHE_MAX_ITEMS', 100),
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [NestCacheModule, CacheService],
})
export class CacheModule {}
