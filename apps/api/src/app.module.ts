import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ProductionModule } from './modules/production/production.module';
import { AiAgentModule } from './modules/ai-agent/ai-agent.module';
// import { NotificationsModule } from './modules/notifications/notifications.module';
// Note: NotificationsModule requires Redis. Uncomment when Redis is available.

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    InventoryModule,
    ProductionModule,
    AiAgentModule,
    // NotificationsModule, // Requires Redis - enable when Redis is running
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
