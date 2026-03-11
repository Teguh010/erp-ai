import { Module, Logger, DynamicModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsController } from './notifications.controller';
import * as net from 'net';

/**
 * Check if Redis is available
 */
async function isRedisAvailable(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
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

@Module({})
export class NotificationsModule {
  static async forRootAsync(): Promise<DynamicModule> {
    const logger = new Logger('NotificationsModule');
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

    const redisAvailable = await isRedisAvailable(redisHost, redisPort);

    if (!redisAvailable) {
      logger.warn(
        `⚠️ Redis not available at ${redisHost}:${redisPort}. Notifications queue disabled.`,
      );

      // Return module without BullMQ
      return {
        module: NotificationsModule,
        imports: [ConfigModule],
        controllers: [NotificationsController],
        providers: [
          {
            provide: NotificationsService,
            useValue: new MockNotificationsService(),
          },
        ],
        exports: [NotificationsService],
      };
    }

    logger.log('✅ Redis available - notifications queue enabled');

    return {
      module: NotificationsModule,
      imports: [
        ConfigModule,
        BullModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            connection: {
              host: configService.get('REDIS_HOST') || 'localhost',
              port: configService.get('REDIS_PORT') || 6379,
            },
          }),
          inject: [ConfigService],
        }),
        BullModule.registerQueue({
          name: 'notifications',
        }),
      ],
      controllers: [NotificationsController],
      providers: [NotificationsService, NotificationsProcessor],
      exports: [NotificationsService],
    };
  }
}

/**
 * Mock service when Redis is not available
 */
class MockNotificationsService {
  private readonly logger = new Logger('MockNotificationsService');

  async sendNotification(data: {
    type: string;
    payload: unknown;
  }): Promise<{ queued: boolean; message: string }> {
    this.logger.warn(`Notification not sent (Redis unavailable): ${data.type}`);
    return {
      queued: false,
      message: 'Redis not available - notification not queued',
    };
  }

  async getQueueStats() {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      message: 'Queue disabled - Redis not available',
    };
  }
}
