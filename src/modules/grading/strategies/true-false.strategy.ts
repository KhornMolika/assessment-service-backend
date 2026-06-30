import { GradeResult, GradingStrategy } from './grading-strategy.interface';

export class TrueFalseStrategy implements GradingStrategy {
  /**
   * Participant: { value: true }
   * Answer:      { value: true }
   */
  grade(
    response: Record<string, unknown>,
    correctAnswer: Record<string, unknown>,
    maxScore: number,
  ): GradeResult {
    const responseValue = this.toBoolean(response['value']);
    const correctValue = this.toBoolean(correctAnswer['value']);
    const isCorrect =
      responseValue !== null &&
      correctValue !== null &&
      responseValue === correctValue;
    return {
      scoreAwarded: isCorrect ? maxScore : 0,
      maxScore,
      isCorrect,
    };
  }

  private toBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
    return null;
  }
}
