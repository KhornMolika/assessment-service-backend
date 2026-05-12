import { Entity, Column, PrimaryColumn } from 'typeorm';

export enum Mode {
  SELF_PACED = 'SELF_PACED',
  REAL_TIME = 'REAL_TIME',
}

export enum ParticipantIdentity {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
  ANONYMOUS = 'ANONYMOUS',
}

export enum QuestionSelection {
  MANUAL = 'MANUAL',
  DYNAMIC_FROM_BANK = 'DYNAMIC_FROM_BANK',
}

export enum ShowResults {
  IMMEDIATE = 'IMMEDIATE',
  MANUAL = 'MANUAL',
  HIDDEN = 'HIDDEN',
}

@Entity()
export class AssessmentSettings {
  @PrimaryColumn('uuid')
  assessmentId!: string;

  @Column({ type: 'enum', enum: Mode })
  mode!: Mode;

  @Column({
    type: 'enum',
    enum: QuestionSelection,
    nullable: false,
  })
  questionSelection!: QuestionSelection;

  @Column({ type: 'int'})
  numQuestions!: number;

  @Column({ type: 'jsonb', nullable: true })
  selectionRules?: any; // { easy: 3, medium: 4, hard: 3 }

  @Column({ type: 'int', nullable: true })
  timeLimit?: number;

  @Column({ type: 'timestamp', nullable: true })
  startsAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  endsAt?: Date;

  @Column({ type: 'int', nullable: true })
  passMark!: number;

  @Column({ type: 'boolean', default: false })
  isShuffle!: boolean;

  @Column({ type: 'enum', enum: ShowResults, nullable: true })
  showResults!: ShowResults;

  @Column({ type: 'jsonb', nullable: true })
  gradeLabels: any; // [{ name: 'A', min: 90 }]

  @Column({ default: false })
  isAllowShare!: boolean;

  @Column({
    type: 'enum',
    enum: ParticipantIdentity,
  })
  participantIdentity!: ParticipantIdentity;
}
