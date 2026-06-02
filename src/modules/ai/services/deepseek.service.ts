import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { IAiProvider } from '../interfaces/ai-provider.interface';
import {
  AIEvaluationResult,
  AIEvaluationConfidence,
} from '../interfaces/ai-evaluation-result.interface';

@Injectable()
export class DeepSeekService implements IAiProvider {
  private readonly client: OpenAI;
  private readonly logger = new Logger(DeepSeekService.name);

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('app.ai.deepseek.apiKey');
    if (!apiKey) {
      throw new BadRequestException('DEEPSEEK_API_KEY is not configured');
    }

    this.client = new OpenAI({
      baseURL: 'https://api.deepseek.com/v1',
      apiKey,
    });
  }

  async evaluate(
    prompt: string,
    maxScore: number,
  ): Promise<AIEvaluationResult> {
    try {
      const completion = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a strict examiner grading a student's answer against a rubric.
Always respond with valid JSON only. No markdown formatting.
Your response MUST exactly match the following JSON schema:
{
  "suggestedScore": <number between 0 and ${maxScore}>,
  "maxScore": ${maxScore},
  "keyPointsAddressed": ["<string>", ...],
  "keyPointsMissed": ["<string>", ...],
  "reasoning": "<string paragraph>",
  "confidence": "<HIGH | MEDIUM | LOW>"
}`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const text = completion.choices[0]?.message?.content;
      if (!text) {
        throw new InternalServerErrorException('DeepSeek returned no text');
      }

      return this.normalizeResult(this.parseJson(text), maxScore);
    } catch (error) {
      this.logger.error(
        `DeepSeek evaluation failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('DeepSeek evaluation failed');
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
        'DeepSeek returned invalid JSON evaluation',
      );
    }
  }

  private normalizeResult(raw: any, maxScore: number): AIEvaluationResult {
    const suggestedScore = this.clamp(Number(raw?.suggestedScore), maxScore);
    const confidence = ['HIGH', 'MEDIUM', 'LOW'].includes(raw?.confidence)
      ? (raw.confidence as AIEvaluationConfidence)
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
