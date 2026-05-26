import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GeminiService } from './gemini.service';

describe('GeminiService', () => {
  let service: GeminiService;
  let configService: jest.Mocked<ConfigService>;
  let originalFetch: typeof global.fetch;

  beforeEach(async () => {
    const mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'app.gemini.apiKey') return 'test-api-key';
        if (key === 'app.gemini.model') return 'gemini-1.5-flash';
        if (key === 'app.gemini.timeoutMs') return 5000;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<GeminiService>(GeminiService);
    configService = module.get(ConfigService);
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('evaluate', () => {
    it('should throw BadRequestException if API key is not configured', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'app.gemini.apiKey') return undefined;
        return 'test';
      });

      await expect(service.evaluate('prompt', 10)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw InternalServerErrorException if fetch fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal error in Gemini'),
      });

      await expect(service.evaluate('prompt', 10)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should successfully parse and clamp valid JSON evaluation from Gemini', async () => {
      const mockResult = {
        suggestedScore: 8.5,
        maxScore: 10,
        keyPointsAddressed: ['key point 1'],
        keyPointsMissed: ['key point 2'],
        reasoning: 'Good work',
        confidence: 'HIGH',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify(mockResult),
                  },
                ],
              },
            },
          ],
        }),
      });

      const res = await service.evaluate('prompt', 10);
      expect(res).toEqual({
        suggestedScore: 8.5,
        maxScore: 10,
        keyPointsAddressed: ['key point 1'],
        keyPointsMissed: ['key point 2'],
        reasoning: 'Good work',
        confidence: 'HIGH',
      });
    });

    it('should handle markdown fenced JSON block from Gemini response', async () => {
      const mockResult = {
        suggestedScore: 12.0, // should be clamped to maxScore (10)
        maxScore: 10,
        keyPointsAddressed: ['point A'],
        keyPointsMissed: [],
        reasoning: 'Perfect response',
        confidence: 'HIGH',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: `\`\`\`json\n${JSON.stringify(mockResult)}\n\`\`\``,
                  },
                ],
              },
            },
          ],
        }),
      });

      const res = await service.evaluate('prompt', 10);
      expect(res.suggestedScore).toBe(10); // clamped
      expect(res.confidence).toBe('HIGH');
    });

    it('should throw InternalServerErrorException if JSON is invalid', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: '{invalid-json',
                  },
                ],
              },
            },
          ],
        }),
      });

      await expect(service.evaluate('prompt', 10)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException if request times out', async () => {
      const abortError = new Error('The user aborted a request.');
      abortError.name = 'AbortError';

      global.fetch = jest.fn().mockRejectedValue(abortError);

      await expect(service.evaluate('prompt', 10)).rejects.toThrow(
        new InternalServerErrorException('Gemini request timed out'),
      );
    });
  });
});
