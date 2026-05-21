// -----------------------------------------------------------------------------
// Assignment record linking a Participant to an Assessment.
// Created when a participant is assigned. AnswerSheet is created separately
// when the participant actually starts.
// ---------------------------------------------------------------------------

import { Entity, Column, ManyToOne, OneToMany, Index, CreateDateColumn, OneToOne } from 'typeorm';
import { ClientScopedEntity } from '../../../common/base/client-scoped.entity';
import { Assessment } from '../../assessments/entities/assessment.entity';
import { Participant } from './participant.entity';
import { AnswerSheet } from './answer-sheet.entity';

export enum AssessmentParticipantStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABSENT = 'ABSENT',
}

@Entity()
@Index(['assessment', 'participant'], { unique: true })
export class AssessmentParticipant extends ClientScopedEntity {
  @ManyToOne(() => Assessment, (a) => a.participants, { onDelete: 'CASCADE' })
  assessment!: Assessment;

  @Column({ type: 'uuid' })
  assessmentId!: string;

  @ManyToOne(() => Participant, (p) => p.assessments, { onDelete: 'CASCADE' })
  participant!: Participant;

  @Column({ type: 'uuid' })
  participantId!: string;

  @Column({
    type: 'enum',
    enum: AssessmentParticipantStatus,
    default: AssessmentParticipantStatus.PENDING,
  })
  status!: AssessmentParticipantStatus;

  @CreateDateColumn({ type: 'timestamp' })
  assignedAt!: Date;

  @OneToOne(() => AnswerSheet, (s) => s.assessmentParticipant)
  answerSheet?: AnswerSheet;
}
