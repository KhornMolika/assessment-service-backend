import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { ClientScopedEntity } from '../../../common/base/client-scoped.entity';
import { AnswerSheet } from './answer-sheet.entity';
import { AssessmentQuestion } from '../../assessments/entities/assessment-question.entity';
import { AIGradingJob } from '../../ai/entities/ai-grading-job.entity';

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

  @ManyToOne(() => AssessmentQuestion, { onDelete: 'CASCADE' })
  assessmentQuestion!: AssessmentQuestion;

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
