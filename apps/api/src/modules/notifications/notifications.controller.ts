import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(@InjectQueue('notifications') private notificationQueue: Queue) {}

  /**
   * Get queue status
   */
  @Get('status')
  async getQueueStatus() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.notificationQueue.getWaitingCount(),
      this.notificationQueue.getActiveCount(),
      this.notificationQueue.getCompletedCount(),
      this.notificationQueue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
    };
  }

  /**
   * Get recent jobs
   */
  @Get('recent')
  async getRecentJobs() {
    const jobs = await this.notificationQueue.getJobs(
      ['completed', 'failed'],
      0,
      20,
    );

    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    }));
  }
}
