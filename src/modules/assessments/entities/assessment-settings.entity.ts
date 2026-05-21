// -----------------------------------------------------------------------------
// assessment-setting.entity.ts
// Configuration for how an assessment runs — mode, timing, grading rules.
// -----------------------------------------------------------------------------

import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { Assessment } from './assessment.entity';
import { ClientScopedEntity } from '../../../common/base/client-scoped.entity';

export enum Mode {
  SELF_PACED = 'SELF_PACED',
  REAL_TIME = 'REAL_TIME',
}

export enum QuestionSelection {
  MANUAL = 'MANUAL',
  DYNAMIC = 'DYNAMIC',
}

export enum ParticipantIdentity {
  ANONYMOUS = 'ANONYMOUS',
  AUTHENTICATED = 'AUTHENTICATED',
  EXTERNAL = 'EXTERNAL'
}

export enum ShowResults {
  IMMEDIATELY = 'IMMEDIATELY',
  MANUAL = 'MANUAL',
  NEVER = 'NEVER',
}

@Entity()
export class AssessmentSetting extends ClientScopedEntity {

  @OneToOne(() => Assessment, (a) => a.settings, { onDelete: "CASCADE" })
  @JoinColumn()
  assessment!: Assessment;

  @Column({ type: 'uuid' })
  assessmentId!: string;

  @Column({ type: "enum", enum: Mode })
  mode!: Mode;

  @Column({
    type: "enum",
    enum: QuestionSelection,
  })
  questionSelection!: QuestionSelection;

  @Column({
    type: "enum",
    enum: ParticipantIdentity,
  })
  participantIdentity!: ParticipantIdentity;

  @Column({ type: "int" })
  numQuestions!: number;

  // DYNAMIC mode only — { source, bankId?, total, distribution: { easy, medium, hard } }
  @Column({ type: 'jsonb', nullable: true })
  selectionRules?: Record<string, any>;

  // Minutes a participant has to complete once they start
  @Column({ type: "int", nullable: true })
  timeLimit?: number;

  // Assessment becomes assesible at this timestamp
  @Column({ type: "timestamp", nullable: true })
  startsAt?: Date;

  // Hard deadline - No new sessions accespted after this
  @Column({ type: "timestamp", nullable: true })
  endsAt?: Date;

  // Minimun score to pass - null mean no pass/fail tracking
  @Column({ type: "int", nullable: true })
  passMark!: number;

  @Column({ type: "boolean", default: false })
  isShuffle!: boolean;

  @Column({ type: "enum", enum: ShowResults, nullable: true })
  showResults!: ShowResults;

  // [{ name: 'A', min: 90 }, { name: 'B', min: 75 }]
  @Column({ type: 'jsonb', nullable: true })
  gradeLabels?: Record<string, any>[];

  @Column({ default: false })
  isAllowShare!: boolean;

  @Column({ default: false })
  allowReview!: boolean;
}
