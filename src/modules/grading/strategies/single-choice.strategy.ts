import { GradeResult, GradingStrategy } from './grading-strategy.interface';

export class SingleChoiceStrategy implements GradingStrategy {
  /**
   * Participant: { optionId: "opt_1" }
   * Answer:      { optionId: "opt_1" }
   * Binary — full points or zero.
   */
  grade(
    response: Record<string, unknown>,
    correctAnswer: Record<string, unknown>,
    maxScore: number,
  ): GradeResult {
    const isCorrect = response['optionId'] === correctAnswer['optionId'];
    return {
      scoreAwarded: isCorrect ? maxScore : 0,
      maxScore,
      isCorrect,
    };
  }
}
