import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { Assessment } from './assessment.entity';

export enum Mode {
  EXAM = 'EXAM',
  PRACTICE = 'PRACTICE',
}

export enum QuestionSelection {
  FIXED = 'FIXED',
  RANDOM = 'RANDOM',
}

export enum ParticipantIdentity {
  ANONYMOUS = 'ANONYMOUS',
  AUTHENTICATED = 'AUTHENTICATED',
}

export enum ShowResults {
  IMMEDIATELY = 'IMMEDIATELY',
  AFTER_DEADLINE = 'AFTER_DEADLINE',
  NEVER = 'NEVER',
}

@Entity()
export class AssessmentSetting {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToOne(() => Assessment, (a) => a.settings, { onDelete: "CASCADE" })
  @JoinColumn()
  assessment: Assessment;

  @Column({ type: "enum", enum: Mode })
  mode!: Mode;

  @Column({
    type: "enum",
    enum: QuestionSelection,
    nullable: false,
  })
  questionSelection!: QuestionSelection;

  @Column({
    type: "enum",
    enum: ParticipantIdentity,
  })
  participantIdentity!: ParticipantIdentity;

  @Column({ type: "int" })
  numQuestions!: number;

  @Column({ type: "jsonb", nullable: true })
  selectionRules?: any; // { easy: 3, medium: 4, hard: 3 }

  @Column({ type: "int", nullable: true })
  timeLimit?: number;

  @Column({ type: "timestamp", nullable: true })
  startsAt?: Date;

  @Column({ type: "timestamp", nullable: true })
  endsAt?: Date;

  @Column({ type: "int", nullable: true })
  passMark!: number;

  @Column({ type: "boolean", default: false })
  isShuffle!: boolean;

  @Column({ type: "enum", enum: ShowResults, nullable: true })
  showResults!: ShowResults;

  @Column({ type: "jsonb", nullable: true })
  gradeLabels: any; // [{ name: 'A', min: 90 }]

  @Column({ default: false })
  isAllowShare!: boolean;

  @Column({ default: false })
  allowReview: boolean;
}
