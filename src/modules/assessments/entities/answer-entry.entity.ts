// -----------------------------------------------------------------------------
// One answer per question per session.
// response stores the raw participant answer in type-specific shape.
// scoreAwarded / maxScore replaces isCorrect — supports partial credit.
// gradingStatus tracks the grading pipeline per entry.
// -----------------------------------------------------------------------------

import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { ClientScopedEntity } from '@common/base/client-scoped.entity';
import { AnswerSheet } from './answer-sheet.entity';
import { AssessmentQuestion } from '@modules/assessments/entities/assessment-question.entity';
import { AIGradingJob } from '@modules/ai/entities/ai-grading-job.entity';

export enum GradingStatus {
  PENDING = 'PENDING',
  AUTOMATIC = 'AUTOMATIC',
  AI_EVALUATED = 'AI_EVALUATED',
  MANUAL_REVISED = 'MANUAL_REVISED',
}

@Entity()
export class AnswerEntry extends ClientScopedEntity {
  @ManyToOne(() => AnswerSheet, (s) => s.entries, { onDelete: 'CASCADE' })
  answerSheet!: AnswerSheet;

  @Column({ type: 'uuid' })
  answerSheetId!: string;

  @ManyToOne(() => AssessmentQuestion, { onDelete: 'CASCADE' })
  assessmentQuestion!: AssessmentQuestion;

  @Column({ type: 'uuid' })
  assessmentQuestionId!: string;

  // Type-specific participant answer shape:
  // SINGLE_CHOICE:    { optionId: "opt_1" }
  // MULTIPLE_CHOICE:  { optionIds: ["opt_1", "opt_2"] }
  // TRUE_FALSE:       { value: true }
  // ORDERING:         { sequence: ["opt_1", "opt_2"] }
  // FILL_IN_THE_BLANK:{ answers: ["answer1", "answer2"] }
  // MATCHING:         { pairs: [{ leftId, rightId }] }
  // RATING:           { value: 4 }
  // SHORT_ANSWER:     { text: "participant answer" }
  // ESSAY:            { text: "participant essay" }
  @Column({ type: 'jsonb', nullable: true })
  response?: Record<string, any>;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  scoreAwarded?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  maxScore?: number; // store the max at time of grading (from AssessmentQuestion.points)

  @Column({ type: 'enum', enum: GradingStatus, default: GradingStatus.PENDING })
  gradingStatus!: GradingStatus;

  @OneToMany(() => AIGradingJob, (j) => j.answerEntry)
  aiJobs!: AIGradingJob[];
}
