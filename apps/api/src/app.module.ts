import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './modules/cache/cache.module';
import { AuthModule } from './modules/auth/auth.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ProductionModule } from './modules/production/production.module';
import { AiAgentModule } from './modules/ai-agent/ai-agent.module';
import { HealthModule } from './modules/health/health.module';
// import { NotificationsModule } from './modules/notifications/notifications.module';
// Note: NotificationsModule requires Redis. Uncomment when Redis is available.

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting configuration
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: config.get<number>('THROTTLE_SHORT_TTL', 1000), // 1 second
            limit: config.get<number>('THROTTLE_SHORT_LIMIT', 3), // 3 requests per second
          },
          {
            name: 'medium',
            ttl: config.get<number>('THROTTLE_MEDIUM_TTL', 10000), // 10 seconds
            limit: config.get<number>('THROTTLE_MEDIUM_LIMIT', 20), // 20 requests per 10 seconds
          },
          {
            name: 'long',
            ttl: config.get<number>('THROTTLE_LONG_TTL', 60000), // 1 minute
            limit: config.get<number>('THROTTLE_LONG_LIMIT', 100), // 100 requests per minute
          },
        ],
      }),
    }),
    DatabaseModule,
    CacheModule,
    HealthModule,
    AuthModule,
    InventoryModule,
    ProductionModule,
    AiAgentModule,
    // NotificationsModule, // Requires Redis - enable when Redis is running
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global throttler guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
