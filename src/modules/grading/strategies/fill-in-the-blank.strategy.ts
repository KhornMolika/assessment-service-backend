import { GradeResult, GradingStrategy } from './grading-strategy.interface';

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
    const participantAnswers = (response['answers'] as string[]) ?? [];
    const acceptedAnswers = (correctAnswer['answers'] as string[][]) ?? [];

    const totalBlanks = acceptedAnswers.length;
    if (totalBlanks === 0) {
      return { scoreAwarded: 0, maxScore, isCorrect: false };
    }

    const pointsPerBlank = maxScore / totalBlanks;
    let correctCount = 0;

    acceptedAnswers.forEach((accepted, index) => {
      const given = (participantAnswers[index] ?? '').trim().toLowerCase();
      const isMatch = accepted.some((a) => a.trim().toLowerCase() === given);
      if (isMatch) correctCount++;
    });

    const scoreAwarded = parseFloat((correctCount * pointsPerBlank).toFixed(2));

    return {
      scoreAwarded,
      maxScore,
      isCorrect: correctCount === totalBlanks,
    };
  }
}
