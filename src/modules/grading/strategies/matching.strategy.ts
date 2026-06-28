import { GradeResult, GradingStrategy } from './grading-strategy.interface';
import { Logger } from '@nestjs/common';

export class MatchingStrategy implements GradingStrategy {
  private readonly logger = new Logger(MatchingStrategy.name);
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
    let participantPairs =
      (response['pairs'] as any[]) ?? [];
      
    if (participantPairs.length === 0 && response && typeof response === 'object') {
      participantPairs = Object.entries(response)
        .filter(([key]) => key !== 'pairs')
        .map(([leftId, rightId]) => ({ leftId, rightId: String(rightId) }));
    }
    const correctPairs =
      (correctAnswer['pairs'] as any[]) ?? [];

    const totalPairs = correctPairs.length;
    if (totalPairs === 0) {
      return { scoreAwarded: 0, maxScore, isCorrect: false };
    }

    this.logger.debug(`participantPairs: ${JSON.stringify(participantPairs)}`);
    this.logger.debug(`correctPairs: ${JSON.stringify(correctPairs)}`);

    let correctCount = 0;
    let emptyCount = 0;

    const participantPairsMap = new Map(
      participantPairs.map((p) => [p.leftId || p.left, p.rightId || p.right]),
    );

    correctPairs.forEach((p) => {
      const cLeftId = p.leftId || p.left;
      const cRightId = p.rightId || p.right;
      
      const rightId = participantPairsMap.get(cLeftId);
      if (!rightId || String(rightId).trim() === '') {
        emptyCount++;
      } else if (rightId === cRightId) {
        correctCount++;
      }
    });

    this.logger.debug(`correctCount: ${correctCount}, emptyCount: ${emptyCount}, totalPairs: ${totalPairs}`);

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
