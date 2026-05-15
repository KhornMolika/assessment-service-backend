
export enum GradingStrategy {
  BINARY = 'BINARY',
  DEDUCTIVE = 'DEDUCTIVE',
  SCALED = 'SCALED',
  AI = 'AI',
}

export enum QuestionTypeName {
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  ORDERING = 'ORDERING',
  FILL_IN_THE_BLANK = 'FILL_IN_THE_BLANK',
  MATCHING = 'MATCHING',
  RATING = 'RATING',
  SHORT_ANSWER = 'SHORT_ANSWER',
  ESSAY = 'ESSAY',
}

export interface QuestionTypeConfig {
  gradingStrategy: GradingStrategy;
  hasOptions: boolean;
  supportsAi: boolean;
  isManualOnly: boolean;
  defaultMaxScore: number;
}

export const QUESTION_TYPES_CONFIG: Record<QuestionTypeName, QuestionTypeConfig> = {
  [QuestionTypeName.SINGLE_CHOICE]: { gradingStrategy: GradingStrategy.BINARY, hasOptions: true, supportsAi: false, isManualOnly: false, defaultMaxScore: 1 },
  [QuestionTypeName.MULTIPLE_CHOICE]: { gradingStrategy: GradingStrategy.DEDUCTIVE, hasOptions: true, supportsAi: false, isManualOnly: false, defaultMaxScore: 4 },
  [QuestionTypeName.TRUE_FALSE]: { gradingStrategy: GradingStrategy.BINARY, hasOptions: true, supportsAi: false, isManualOnly: false, defaultMaxScore: 1 },
  [QuestionTypeName.ORDERING]: { gradingStrategy: GradingStrategy.BINARY, hasOptions: true, supportsAi: false, isManualOnly: false, defaultMaxScore: 5 },
  [QuestionTypeName.FILL_IN_THE_BLANK]: { gradingStrategy: GradingStrategy.DEDUCTIVE, hasOptions: false, supportsAi: false, isManualOnly: false, defaultMaxScore: 5 },
  [QuestionTypeName.MATCHING]: { gradingStrategy: GradingStrategy.DEDUCTIVE, hasOptions: false, supportsAi: false, isManualOnly: false, defaultMaxScore: 5 },
  [QuestionTypeName.RATING]: { gradingStrategy: GradingStrategy.SCALED, hasOptions: false, supportsAi: false, isManualOnly: false, defaultMaxScore: 5 },
  [QuestionTypeName.SHORT_ANSWER]: { gradingStrategy: GradingStrategy.AI, hasOptions: false, supportsAi: true, isManualOnly: false, defaultMaxScore: 10 },
  [QuestionTypeName.ESSAY]: { gradingStrategy: GradingStrategy.AI, hasOptions: false, supportsAi: true, isManualOnly: false, defaultMaxScore: 20 },
};