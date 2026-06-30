import { GradeResult, GradingStrategy } from './grading-strategy.interface';

export class OrderingStrategy implements GradingStrategy {
  /**
   * Participant: { sequence: ["opt_1", "opt_3", "opt_2"] }
   * Answer:      { sequence: ["opt_1", "opt_2", "opt_3"] }
   *
   * All-or-nothing scoring. The entire sequence must be perfectly ordered.
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

    let isCorrect = participantSeq.length === totalItems;
    if (isCorrect) {
      for (let i = 0; i < totalItems; i++) {
        if (participantSeq[i] !== correctSeq[i]) {
          isCorrect = false;
          break;
        }
      }
    }

    return {
      scoreAwarded: isCorrect ? maxScore : 0,
      maxScore,
      isCorrect,
    };
  }
}
