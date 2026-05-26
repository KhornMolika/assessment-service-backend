import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIEvaluationResult } from '../interfaces/ai-evaluation-result.interface';

@Injectable()
export class GeminiService {
  constructor(private readonly config: ConfigService) {}

  async evaluate(
    prompt: string,
    maxScore: number,
  ): Promise<AIEvaluationResult> {
    const apiKey = this.config.get<string>('app.gemini.apiKey');
    if (!apiKey) {
      throw new BadRequestException('GEMINI_API_KEY is not configured');
    }

    const model = this.config.get<string>('app.gemini.model');
    const timeoutMs = this.config.get<number>('app.gemini.timeoutMs') ?? 30000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  suggestedScore: { type: 'NUMBER' },
                  maxScore: { type: 'NUMBER' },
                  keyPointsAddressed: {
                    type: 'ARRAY',
                    items: { type: 'STRING' },
                  },
                  keyPointsMissed: {
                    type: 'ARRAY',
                    items: { type: 'STRING' },
                  },
                  reasoning: { type: 'STRING' },
                  confidence: {
                    type: 'STRING',
                    enum: ['HIGH', 'MEDIUM', 'LOW'],
                  },
                },
                required: [
                  'suggestedScore',
                  'maxScore',
                  'keyPointsAddressed',
                  'keyPointsMissed',
                  'reasoning',
                  'confidence',
                ],
              },
            },
          }),
        },
      );

      if (!response.ok) {
        const details = await response.text();
        throw new InternalServerErrorException(
          `Gemini request failed: ${response.status} ${details}`,
        );
      }

      const body = await response.json();
      const text = body?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part.text)
        .filter(Boolean)
        .join('\n');

      if (!text) {
        throw new InternalServerErrorException('Gemini returned no text');
      }

      return this.normalizeResult(this.parseJson(text), maxScore);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      if ((error as Error).name === 'AbortError') {
        throw new InternalServerErrorException('Gemini request timed out');
      }
      throw new InternalServerErrorException('Gemini evaluation failed');
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseJson(text: string): unknown {
    const cleaned = text
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      throw new InternalServerErrorException(
        'Gemini returned invalid JSON evaluation',
      );
    }
  }

  private normalizeResult(raw: any, maxScore: number): AIEvaluationResult {
    const suggestedScore = this.clamp(Number(raw?.suggestedScore), maxScore);
    const confidence = ['HIGH', 'MEDIUM', 'LOW'].includes(raw?.confidence)
      ? raw.confidence
      : 'LOW';

    return {
      suggestedScore,
      maxScore,
      keyPointsAddressed: Array.isArray(raw?.keyPointsAddressed)
        ? raw.keyPointsAddressed.map(String)
        : [],
      keyPointsMissed: Array.isArray(raw?.keyPointsMissed)
        ? raw.keyPointsMissed.map(String)
        : [],
      reasoning: typeof raw?.reasoning === 'string' ? raw.reasoning : '',
      confidence,
    };
  }

  private clamp(value: number, maxScore: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(Math.max(value, 0), maxScore);
  }
}
