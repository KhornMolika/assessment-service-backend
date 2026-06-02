import { AIEvaluationResult } from './ai-evaluation-result.interface';

export const AI_PROVIDER_TOKEN = 'AI_PROVIDER_TOKEN';

export interface IAiProvider {
  evaluate(prompt: string, maxScore: number): Promise<AIEvaluationResult>;
}
