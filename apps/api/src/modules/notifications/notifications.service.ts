import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export enum NotificationType {
  LOW_STOCK_ALERT = 'LOW_STOCK_ALERT',
  PRODUCTION_COMPLETE = 'PRODUCTION_COMPLETE',
  PO_RECEIVED = 'PO_RECEIVED',
  AI_REPORT_READY = 'AI_REPORT_READY',
}

export interface NotificationPayload {
  type: NotificationType;
  userId?: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@InjectQueue('notifications') private notificationQueue: Queue) {}

  /**
   * Queue a notification for processing
   */
  async sendNotification(payload: NotificationPayload) {
    this.logger.log(`Queueing notification: ${payload.type}`);

    await this.notificationQueue.add('send-notification', payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });

    return { queued: true, type: payload.type };
  }

  /**
   * Queue low stock alert
   */
  async sendLowStockAlert(
    productName: string,
    currentStock: number,
    minLevel: number,
  ) {
    return this.sendNotification({
      type: NotificationType.LOW_STOCK_ALERT,
      title: 'Low Stock Alert',
      message: `${productName} stock is low (${currentStock}/${minLevel})`,
      data: { productName, currentStock, minLevel },
    });
  }

  /**
   * Queue production complete notification
   */
  async sendProductionCompleteAlert(
    orderId: string,
    productName: string,
    quantity: number,
  ) {
    return this.sendNotification({
      type: NotificationType.PRODUCTION_COMPLETE,
      title: 'Production Complete',
      message: `Production order for ${quantity}x ${productName} has been completed`,
      data: { orderId, productName, quantity },
    });
  }

  /**
   * Queue PO received notification
   */
  async sendPOReceivedAlert(poId: string, supplierName: string) {
    return this.sendNotification({
      type: NotificationType.PO_RECEIVED,
      title: 'Purchase Order Received',
      message: `Goods from ${supplierName} have been received`,
      data: { poId, supplierName },
    });
  }

  /**
   * Queue AI report ready notification
   */
  async sendAIReportReady(reportType: string, userId: string) {
    return this.sendNotification({
      type: NotificationType.AI_REPORT_READY,
      userId,
      title: 'AI Report Ready',
      message: `Your ${reportType} analysis report is ready`,
      data: { reportType },
    });
  }
}
