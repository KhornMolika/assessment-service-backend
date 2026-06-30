import { GradeResult, GradingStrategy } from './grading-strategy.interface';
import { Logger } from '@nestjs/common';

type MatchingPair = {
  leftId?: string;
  left?: string;
  rightId?: string;
  right?: string;
};

function isMatchingPair(value: unknown): value is MatchingPair {
  return typeof value === 'object' && value !== null;
}

function pairKey(pair: MatchingPair): [string | undefined, string | undefined] {
  return [pair.leftId ?? pair.left, pair.rightId ?? pair.right];
}

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
    let participantPairs = Array.isArray(response['pairs'])
      ? response['pairs'].filter(isMatchingPair)
      : [];

    if (
      participantPairs.length === 0 &&
      response &&
      typeof response === 'object'
    ) {
      participantPairs = Object.entries(response)
        .filter(([key]) => key !== 'pairs')
        .map(([leftId, rightId]) => ({ leftId, rightId: String(rightId) }));
    }
    const correctPairs = Array.isArray(correctAnswer['pairs'])
      ? correctAnswer['pairs'].filter(isMatchingPair)
      : [];

    const totalPairs = correctPairs.length;
    if (totalPairs === 0) {
      return { scoreAwarded: 0, maxScore, isCorrect: false };
    }

    this.logger.debug(`participantPairs: ${JSON.stringify(participantPairs)}`);
    this.logger.debug(`correctPairs: ${JSON.stringify(correctPairs)}`);

    let correctCount = 0;
    let emptyCount = 0;

    const participantPairsMap = new Map(
      participantPairs.map((pair) => pairKey(pair)),
    );

    correctPairs.forEach((p) => {
      const [cLeftId, cRightId] = pairKey(p);
      const rightId = participantPairsMap.get(cLeftId);
      if (!rightId || String(rightId).trim() === '') {
        emptyCount++;
      } else if (rightId === cRightId) {
        correctCount++;
      }
    });

    this.logger.debug(
      `correctCount: ${correctCount}, emptyCount: ${emptyCount}, totalPairs: ${totalPairs}`,
    );

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
