import { Entity, Column, ManyToOne } from 'typeorm';
import { ClientScopedEntity } from '@common/base/client-scoped.entity';
import { AnswerEntry } from '@modules/assessments/entities/answer-entry.entity';

export enum AIGradingJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity()
export class AIGradingJob extends ClientScopedEntity {
  @ManyToOne(() => AnswerEntry, (e) => e.aiJobs, { onDelete: 'CASCADE' })
  answerEntry!: AnswerEntry;

  @Column({ type: 'uuid' })
  answerEntryId!: string;

  @Column({
    type: 'enum',
    enum: AIGradingJobStatus,
    default: AIGradingJobStatus.PENDING,
  })
  status!: AIGradingJobStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  suggestedScore?: number;

  @Column({ type: 'text', nullable: true })
  reasoning?: string; // AI explanation of the score

  @Column({ type: 'text', nullable: true })
  failureReason?: string; // if FAILED

  @Column({ type: 'int', default: 0 })
  attemptCount!: number; // for POST /internal/ai-grading-jobs/:jobId/retry

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;
}
