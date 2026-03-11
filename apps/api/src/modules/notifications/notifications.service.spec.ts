import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotificationsService, NotificationType } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockQueue: { add: jest.Mock };

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getQueueToken('notifications'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('sendNotification', () => {
    it('should queue a notification', async () => {
      const payload = {
        type: NotificationType.LOW_STOCK_ALERT,
        title: 'Test Alert',
        message: 'Test message',
        data: { test: true },
      };

      const result = await service.sendNotification(payload);

      expect(mockQueue.add).toHaveBeenCalledWith('send-notification', payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      });
      expect(result).toMatchObject({
        queued: true,
        type: NotificationType.LOW_STOCK_ALERT,
      });
    });
  });

  describe('sendLowStockAlert', () => {
    it('should queue low stock alert', async () => {
      const result = await service.sendLowStockAlert('Test Product', 5, 10);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          type: NotificationType.LOW_STOCK_ALERT,
          title: 'Low Stock Alert',
          message: 'Test Product stock is low (5/10)',
          data: { productName: 'Test Product', currentStock: 5, minLevel: 10 },
        }),
        expect.any(Object),
      );
      expect(result.queued).toBe(true);
    });
  });

  describe('sendProductionCompleteAlert', () => {
    it('should queue production complete alert', async () => {
      const result = await service.sendProductionCompleteAlert(
        'order-1',
        'Widget',
        100,
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          type: NotificationType.PRODUCTION_COMPLETE,
          title: 'Production Complete',
          message: 'Production order for 100x Widget has been completed',
          data: { orderId: 'order-1', productName: 'Widget', quantity: 100 },
        }),
        expect.any(Object),
      );
      expect(result.queued).toBe(true);
    });
  });

  describe('sendPOReceivedAlert', () => {
    it('should queue PO received alert', async () => {
      const result = await service.sendPOReceivedAlert('po-1', 'ABC Supplier');

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          type: NotificationType.PO_RECEIVED,
          title: 'Purchase Order Received',
          message: 'Goods from ABC Supplier have been received',
          data: { poId: 'po-1', supplierName: 'ABC Supplier' },
        }),
        expect.any(Object),
      );
      expect(result.queued).toBe(true);
    });
  });

  describe('sendAIReportReady', () => {
    it('should queue AI report ready notification', async () => {
      const result = await service.sendAIReportReady('Inventory Analysis', 'user-1');

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          type: NotificationType.AI_REPORT_READY,
          userId: 'user-1',
          title: 'AI Report Ready',
          message: 'Your Inventory Analysis analysis report is ready',
          data: { reportType: 'Inventory Analysis' },
        }),
        expect.any(Object),
      );
      expect(result.queued).toBe(true);
    });
  });
});
