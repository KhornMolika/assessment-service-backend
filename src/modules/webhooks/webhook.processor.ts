import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import * as crypto from 'crypto';
import { ClientRepository } from '../clients/client.repository';
import { WebhookJobData } from './webhook.service';

@Processor('webhooks')
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private readonly clientRepo: ClientRepository) {}

  @Process('send-webhook')
  async handleWebhookDispatch(job: Job<WebhookJobData>) {
    const { clientId, payload } = job.data;
    
    // 1. Fetch client from DB to get webhookUrl and webhookSecret
    const client = await this.clientRepo.findByClientId(clientId);
    if (!client) {
      this.logger.warn(`Cannot send webhook: Client ${clientId} not found`);
      return;
    }

    if (!client.webhookUrl) {
      // It's normal for clients not to configure webhooks
      return;
    }

    // 2. Prepare payload string and signature
    const payloadString = JSON.stringify(payload);
    let signature = '';
    
    if (client.webhookSecret) {
      signature = crypto
        .createHmac('sha256', client.webhookSecret)
        .update(payloadString)
        .digest('hex');
    }

    // 3. Dispatch the HTTP POST request using native fetch
    try {
      this.logger.debug(`Dispatching webhook event '${payload.event}' to ${client.webhookUrl}`);
      
      const response = await fetch(client.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-event': payload.event,
          ...(signature ? { 'x-webhook-signature': signature } : {}),
        },
        body: payloadString,
      });

      if (!response.ok) {
        throw new Error(`Endpoint responded with status ${response.status} ${response.statusText}`);
      }

      this.logger.log(`Successfully dispatched webhook '${payload.event}' to ${client.webhookUrl}`);
    } catch (error) {
      this.logger.error(`Failed to dispatch webhook to ${client.webhookUrl}: ${(error as Error).message}`);
      throw error; // Let Bull catch this and retry
    }
  }
}
