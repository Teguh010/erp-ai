import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST');
        const redisPort = configService.get<number>('REDIS_PORT');

        // If Redis is configured, use Redis store
        if (redisHost && redisPort) {
          return {
            store: await redisStore({
              host: redisHost,
              port: redisPort,
              password: configService.get<string>('REDIS_PASSWORD'),
              ttl: configService.get<number>('CACHE_TTL', 300) * 1000, // Default 5 minutes
              db: configService.get<number>('REDIS_CACHE_DB', 1),
            }),
          };
        }

        // Fallback to in-memory cache for development
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
