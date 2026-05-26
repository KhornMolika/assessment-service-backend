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
    const isCorrect = response['value'] === correctAnswer['value'];
    return {
      scoreAwarded: isCorrect ? maxScore : 0,
      maxScore,
      isCorrect,
    };
  }
}
