// -----------------------------------------------------------------------------
// Assignment record — who is allowed to take this assessment.
// answerSheet is null until participant actually starts.
// Unique constraint prevents same participant being assigned twice.
// -----------------------------------------------------------------------------
import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  CreateDateColumn,
  OneToOne,
} from 'typeorm';
import { ClientScopedEntity } from '@common/base/client-scoped.entity';
import { Assessment } from '@modules/assessments/entities/assessment.entity';
import { AnswerSheet } from './answer-sheet.entity';
import { Participant } from '@modules/participants/entities/participant.entity';

export enum AssessmentParticipantStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABSENT = 'ABSENT',
}

@Entity()
@Index(['assessmentId', 'participantId'], { unique: true })
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
