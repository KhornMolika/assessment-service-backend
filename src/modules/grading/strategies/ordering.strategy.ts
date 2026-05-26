import { GradeResult, GradingStrategy } from './grading-strategy.interface';

export class OrderingStrategy implements GradingStrategy {
  /**
   * Participant: { sequence: ["opt_1", "opt_3", "opt_2"] }
   * Answer:      { sequence: ["opt_1", "opt_2", "opt_3"] }
   *
   * One point per correctly placed item.
   * Points per item = maxScore / totalItems.
   */
  grade(
    response: Record<string, unknown>,
    correctAnswer: Record<string, unknown>,
    maxScore: number,
  ): GradeResult {
    const participantSeq = (response['sequence'] as string[]) ?? [];
    const correctSeq = (correctAnswer['sequence'] as string[]) ?? [];

    const totalItems = correctSeq.length;
    if (totalItems === 0) {
      return { scoreAwarded: 0, maxScore, isCorrect: false };
    }

    const pointsPerItem = maxScore / totalItems;
    let correctCount = 0;

    correctSeq.forEach((id, index) => {
      if (participantSeq[index] === id) correctCount++;
    });

    const scoreAwarded = parseFloat((correctCount * pointsPerItem).toFixed(2));

    return {
      scoreAwarded,
      maxScore,
      isCorrect: correctCount === totalItems,
    };
  }
}
