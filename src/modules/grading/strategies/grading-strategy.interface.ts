export interface GradeResult {
  scoreAwarded: number; // points earned
  maxScore: number; // maximum possible points
  isCorrect: boolean; // fully correct (scoreAwarded === maxScore)
}

export interface GradingStrategy {
  grade(
    response: Record<string, unknown>,
    correctAnswer: Record<string, unknown>,
    maxScore: number,
  ): GradeResult;
}
