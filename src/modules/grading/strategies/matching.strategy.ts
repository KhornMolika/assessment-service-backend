import { GradeResult, GradingStrategy } from './grading-strategy.interface';

export class MatchingStrategy implements GradingStrategy {
  /**
   * Participant: { pairs: [{ leftId: "l1", rightId: "r1" }] }
   * Answer:      { pairs: [{ leftId: "l1", rightId: "r1" }] }
   *
   * Points per pair = maxScore / totalPairs.
   */
  grade(
    response: Record<string, unknown>,
    correctAnswer: Record<string, unknown>,
    maxScore: number,
  ): GradeResult {
    const participantPairs =
      (response['pairs'] as { leftId: string; rightId: string }[]) ?? [];
    const correctPairs =
      (correctAnswer['pairs'] as { leftId: string; rightId: string }[]) ?? [];

    const totalPairs = correctPairs.length;
    if (totalPairs === 0) {
      return { scoreAwarded: 0, maxScore, isCorrect: false };
    }

    const pointsPerPair = maxScore / totalPairs;

    // Build a lookup map from correctPairs
    const correctMap = new Map(correctPairs.map((p) => [p.leftId, p.rightId]));

    let correctCount = 0;
    participantPairs.forEach((p) => {
      if (correctMap.get(p.leftId) === p.rightId) correctCount++;
    });

    const scoreAwarded = parseFloat((correctCount * pointsPerPair).toFixed(2));

    return {
      scoreAwarded,
      maxScore,
      isCorrect: correctCount === totalPairs,
    };
  }
}
