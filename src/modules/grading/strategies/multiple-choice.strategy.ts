import { GradeResult, GradingStrategy } from './grading-strategy.interface';

export class MultipleChoiceStrategy implements GradingStrategy {
  /**
   * Participant: { optionIds: ["opt_1", "opt_2"] }
   * Answer:      { optionIds: ["opt_1", "opt_3"] }
   *
   * Pro-rata formula:
   *   correctSelected = intersection of participant and correct
   *   score = correctSelected / totalCorrect * maxScore
   */
  grade(
    response: Record<string, unknown>,
    correctAnswer: Record<string, unknown>,
    maxScore: number,
  ): GradeResult {
    const participantIds = (response['optionIds'] as string[]) ?? [];
    const correctIds = (correctAnswer['optionIds'] as string[]) ?? [];

    const correctSelected = participantIds.filter((id) =>
      correctIds.includes(id),
    ).length;

    const totalCorrect = correctIds.length;
    if (totalCorrect === 0) {
      return { scoreAwarded: 0, maxScore, isCorrect: false };
    }

    const ratio = Math.max(0, correctSelected / totalCorrect);
    const scoreAwarded = parseFloat((ratio * maxScore).toFixed(2));

    return {
      scoreAwarded,
      maxScore,
      isCorrect: scoreAwarded === maxScore,
    };
  }
}
