// -----------------------------------------------------------------------------
// Represents one participant's attempt at an assessment.
// Created when participant starts. Exactly one per AssessmentParticipant.
// selectedQuestionIds is only populated for DYNAMIC assessments.
// ---------------------------------------------------------------------------

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { ClientScopedEntity } from '../../../common/base/client-scoped.entity';
import { AssessmentParticipant } from './assessment-participant.entity';
import { AnswerEntry } from './answer-entry.entity';
import { Assessment } from '../../assessments/entities/assessment.entity';

export enum AnswerSheetStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  GRADED = 'GRADED', // all auto questions scored
  REQUIRES_REVIEW = 'REQUIRES_REVIEW', // has AI/manual grading pending
}

@Entity()
@Index(['assessmentParticipant'], { unique: true })
export class AnswerSheet extends ClientScopedEntity {
  @OneToOne(() => AssessmentParticipant, (ap) => ap.answerSheet, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  assessmentParticipant!: AssessmentParticipant;

  @Column({ type: 'uuid' })
  assessmentParticipantId!: string;

  @ManyToOne(() => Assessment, { onDelete: 'CASCADE' })
  assessment!: Assessment;

  @Column({ type: 'uuid' })
  assessmentId!: string;

  @Column({
    type: 'enum',
    enum: AnswerSheetStatus,
    default: AnswerSheetStatus.IN_PROGRESS,
  })
  status!: AnswerSheetStatus;

  @Column({ nullable: true })
  totalScore?: number;

  // Computed label from AssessmentSetting.gradeLabels after scoring
  @Column({ type: 'varchar', length: 10, nullable: true })
  grade?: string;

  @Column({ default: false })
  isPassed!: boolean;

  @Column({ nullable: true })
  startedAt?: Date;

  @Column({ nullable: true })
  submittedAt?: Date;

  // DYNAMIC only — which questions this participant was given
  @Column({ type: 'jsonb', nullable: true })
  selectedQuestionIds?: string[];

  @OneToMany(() => AnswerEntry, (e) => e.answerSheet)
  entries!: AnswerEntry[];
}
