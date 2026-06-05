import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ClientsModule } from '../clients/clients.module';
import { WebhookService } from './webhook.service';
import { WebhookProcessor } from './webhook.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'webhooks',
    }),
    ClientsModule, // To access ClientRepository
  ],
  providers: [WebhookService, WebhookProcessor],
  exports: [WebhookService],
})
export class WebhooksModule {}
