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



    let correctCount = 0;
    let emptyCount = 0;

    const participantPairsMap = new Map(
      participantPairs.map((p) => [p.leftId, p.rightId]),
    );

    correctPairs.forEach((p) => {
      const rightId = participantPairsMap.get(p.leftId);
      if (!rightId || String(rightId).trim() === '') {
        emptyCount++;
      } else if (rightId === p.rightId) {
        correctCount++;
      }
    });

    const pointsPerPair = maxScore / totalPairs;
    const correctScore = correctCount * pointsPerPair;
    const penaltyScore = emptyCount * (pointsPerPair * 0.5);
    const finalScore = Math.max(0, correctScore - penaltyScore);
    const scoreAwarded = parseFloat(finalScore.toFixed(2));

    return {
      scoreAwarded,
      maxScore,
      isCorrect: scoreAwarded === maxScore,
    };
  }
}
