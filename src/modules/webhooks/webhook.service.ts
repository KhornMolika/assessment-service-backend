import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
}

export interface WebhookJobData {
  clientId: string;
  payload: WebhookPayload;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(@InjectQueue('webhooks') private readonly webhooksQueue: Queue) {}

  /**
   * Dispatches a webhook asynchronously by placing it in the Bull queue.
   */
  async dispatch(clientId: string | null | undefined, event: string, data: any): Promise<void> {
    if (!clientId) return; // Ignore if no associated client
    
    try {
      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      await this.webhooksQueue.add(
        'send-webhook',
        { clientId, payload } as WebhookJobData,
        {
          attempts: 3, // Retry up to 3 times
          backoff: {
            type: 'exponential',
            delay: 5000, // 5s, 25s, 125s...
          },
          removeOnComplete: true,
          removeOnFail: false, // Keep failed jobs for inspection
        },
      );
      this.logger.debug(`Queued webhook event '${event}' for client ${clientId}`);
    } catch (error) {
      this.logger.error(`Failed to queue webhook event '${event}' for client ${clientId}`, error);
    }
  }
}
