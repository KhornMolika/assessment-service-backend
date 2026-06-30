import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import {
  WebhookService,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  WebhookPayload,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  WebhookJobData,
} from './webhook.service';

describe('WebhookService', () => {
  let service: WebhookService;
  let mockQueue: any;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: getQueueToken('webhooks'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should add a job to the queue if clientId is provided', async () => {
    const clientId = 'client-123';
    const event = 'test.event';
    const data = { foo: 'bar' };

    await service.dispatch(clientId, event, data);

    expect(mockQueue.add).toHaveBeenCalledWith(
      'send-webhook',
      expect.objectContaining({
        clientId,
        payload: expect.objectContaining({
          event,
          data,
          timestamp: expect.any(String),
        }),
      }),
      expect.objectContaining({
        attempts: 3,
      }),
    );
  });

  it('should not add a job if clientId is not provided', async () => {
    await service.dispatch(null, 'test.event', {});
    expect(mockQueue.add).not.toHaveBeenCalled();
  });
});
