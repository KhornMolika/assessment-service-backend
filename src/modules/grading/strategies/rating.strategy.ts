import { GradeResult, GradingStrategy } from './grading-strategy.interface';

export class RatingStrategy implements GradingStrategy {
  /**
   * Participant: { value: 4 }
   * Options:     { min: 1, max: 5 }
   *
   * Normalized score = (value - min) / (max - min) * maxScore
   * Used for survey aggregation, not pass/fail.
   */
  grade(
    response: Record<string, unknown>,
    correctAnswer: Record<string, unknown>,
    maxScore: number,
  ): GradeResult {
    // For RATING, correctAnswer holds the options config (min/max)
    const min = (correctAnswer['min'] as number) ?? 1;
    const max = (correctAnswer['max'] as number) ?? 5;
    const value = (response['value'] as number) ?? min;

    const normalized = (value - min) / (max - min);
    const scoreAwarded = parseFloat((normalized * maxScore).toFixed(2));

    return {
      scoreAwarded,
      maxScore,
      isCorrect: true, // Rating has no wrong answer
    };
  }
}
