import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationPayload, NotificationType } from './notifications.service';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  async process(job: Job<NotificationPayload>): Promise<any> {
    this.logger.log(`Processing notification job ${job.id}: ${job.data.type}`);

    const payload = job.data;

    try {
      switch (payload.type) {
        case NotificationType.LOW_STOCK_ALERT:
          await this.handleLowStockAlert(payload);
          break;
        case NotificationType.PRODUCTION_COMPLETE:
          await this.handleProductionComplete(payload);
          break;
        case NotificationType.PO_RECEIVED:
          await this.handlePOReceived(payload);
          break;
        case NotificationType.AI_REPORT_READY:
          await this.handleAIReportReady(payload);
          break;
        default:
          this.logger.warn(`Unknown notification type: ${payload.type}`);
      }

      return { success: true, processedAt: new Date().toISOString() };
    } catch (error) {
      this.logger.error(`Failed to process notification: ${error.message}`);
      throw error;
    }
  }

  private async handleLowStockAlert(payload: NotificationPayload) {
    // In production, this would send email, push notification, or webhook
    this.logger.log(`🔴 LOW STOCK ALERT: ${payload.message}`);
    // Example: await this.emailService.send(...);
    // Example: await this.webhookService.trigger(...);
  }

  private async handleProductionComplete(payload: NotificationPayload) {
    this.logger.log(`✅ PRODUCTION COMPLETE: ${payload.message}`);
  }

  private async handlePOReceived(payload: NotificationPayload) {
    this.logger.log(`📦 PO RECEIVED: ${payload.message}`);
  }

  private async handleAIReportReady(payload: NotificationPayload) {
    this.logger.log(`🤖 AI REPORT READY: ${payload.message}`);
  }
}
