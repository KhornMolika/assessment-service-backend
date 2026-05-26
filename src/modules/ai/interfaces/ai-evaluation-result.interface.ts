export type AIEvaluationConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface AIEvaluationResult {
  suggestedScore: number;
  maxScore: number;
  keyPointsAddressed: string[];
  keyPointsMissed: string[];
  reasoning: string;
  confidence: AIEvaluationConfidence;
}
