import { GradeResult, GradingStrategy } from './grading-strategy.interface';

function normalizeAcceptedAnswers(value: unknown): string[][] {
  if (!Array.isArray(value)) return [];

  return value.map((entry) => {
    if (Array.isArray(entry)) {
      return entry.map((answer) => String(answer));
    }

    return [String(entry)];
  });
}

export class FillInTheBlankStrategy implements GradingStrategy {
  /**
   * Participant: { answers: ["dependency injection", "controllers"] }
   * Answer:      { answers: [["dependency injection", "DI"], ["controllers", "controller"]] }
   *
   * Each blank has an array of accepted answers (case-insensitive).
   * Points per blank = maxScore / totalBlanks.
   */
  grade(
    response: Record<string, unknown>,
    correctAnswer: Record<string, unknown>,
    maxScore: number,
  ): GradeResult {
    const participantAnswers = Array.isArray(response['answers'])
      ? response['answers'].map((answer) => String(answer))
      : [];
    const acceptedAnswers = normalizeAcceptedAnswers(correctAnswer['answers']);

    const totalBlanks = acceptedAnswers.length;
    if (totalBlanks === 0) {
      return { scoreAwarded: 0, maxScore, isCorrect: false };
    }

    let correctCount = 0;
    let emptyCount = 0;

    acceptedAnswers.forEach((accepted, index) => {
      const given = (participantAnswers[index] ?? '').trim().toLowerCase();
      if (!given) {
        emptyCount++;
      } else {
        const isMatch = accepted.some((a) => a.trim().toLowerCase() === given);
        if (isMatch) correctCount++;
      }
    });

    const pointsPerBlank = maxScore / totalBlanks;
    const correctScore = correctCount * pointsPerBlank;
    const penaltyScore = emptyCount * (pointsPerBlank * 0.5);
    const finalScore = Math.max(0, correctScore - penaltyScore);
    const scoreAwarded = parseFloat(finalScore.toFixed(2));

    return {
      scoreAwarded,
      maxScore,
      isCorrect: scoreAwarded === maxScore,
    };
  }
}
