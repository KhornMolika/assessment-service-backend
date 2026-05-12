import { Entity, Column, Index } from 'typeorm';
import { SystemBaseEntity } from '../../../common/base/system-base.entity';

export enum GradingStatus {
  AUTOMATIC = 'AUTOMATIC',
  PENDING = 'PENDING',
  AI_EVALUATED = 'AI_EVALUATED',
  MANUAL_REVISED = 'MANUAL_REVISED',
}

@Entity()
export class AnswerEntry extends SystemBaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  sheetId!: string;

  @Column({ type: 'varchar' })
  assessmentId!: string;

  @Column({ type: 'varchar' })
  participantId!: string;

  @Column({ type: 'varchar' })
  questionId!: string;

  @Column({ type: 'jsonb' })
  questionSnapshot: any;

  @Column({ type: 'jsonb' })
  response: any;

  @Column({ type: 'boolean', default: false })
  isCorrect!: boolean;

  @Column({ type: 'float', nullable: true })
  scoreAwarded!: number;

  @Column({
    type: 'enum',
    enum: GradingStatus,
    default: GradingStatus.PENDING,
  })
  gradingStatus!: GradingStatus;
}