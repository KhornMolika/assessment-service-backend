import { Test, TestingModule } from '@nestjs/testing';
import { WebhookProcessor } from './webhook.processor';
import { ClientRepository } from '../clients/client.repository';
import * as crypto from 'crypto';
import { Job } from 'bull';
import { WebhookJobData } from './webhook.service';

describe('WebhookProcessor', () => {
  let processor: WebhookProcessor;
  let mockClientRepo: any;

  beforeEach(async () => {
    mockClientRepo = {
      findByClientId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookProcessor,
        {
          provide: ClientRepository,
          useValue: mockClientRepo,
        },
      ],
    }).compile();

    processor = module.get<WebhookProcessor>(WebhookProcessor);

    // Mock global fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should skip if client is not found', async () => {
    mockClientRepo.findByClientId.mockResolvedValue(null);
    const job = { data: { clientId: 'missing' } } as Job<WebhookJobData>;

    await processor.handleWebhookDispatch(job);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should skip if client has no webhookUrl', async () => {
    mockClientRepo.findByClientId.mockResolvedValue({
      id: '1',
      webhookUrl: null,
    });
    const job = { data: { clientId: '1' } } as Job<WebhookJobData>;

    await processor.handleWebhookDispatch(job);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should dispatch webhook with HMAC signature', async () => {
    const payload = {
      event: 'test',
      timestamp: '2023-01-01',
      data: { foo: 'bar' },
    };
    const secret = 'my-secret';
    mockClientRepo.findByClientId.mockResolvedValue({
      id: '1',
      webhookUrl: 'https://example.com/webhook',
      webhookSecret: secret,
    });

    const job = { data: { clientId: '1', payload } } as Job<WebhookJobData>;
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    await processor.handleWebhookDispatch(job);

    const payloadString = JSON.stringify(payload);
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/webhook',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-event': 'test',
          'x-webhook-signature': expectedSig,
        },
        body: payloadString,
      }),
    );
  });

  it('should throw an error if fetch fails so Bull retries', async () => {
    jest.spyOn(processor['logger'], 'error').mockImplementation(() => {});
    mockClientRepo.findByClientId.mockResolvedValue({
      id: '1',
      webhookUrl: 'https://example.com/webhook',
      webhookSecret: null,
    });

    const job = {
      data: { clientId: '1', payload: { event: 'test' } },
    } as Job<WebhookJobData>;
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(processor.handleWebhookDispatch(job)).rejects.toThrow(
      'Endpoint responded with status 500 Internal Server Error',
    );
  });
});
