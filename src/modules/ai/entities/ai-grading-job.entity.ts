import { Entity, Column } from 'typeorm';
import { SystemBaseEntity } from '../../../common/base/system-base.entity';

export enum Status {
    QUEUED = 'QUEUED',
    RUNNING = 'RUNNING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
}

@Entity()
export class AIGradingJob extends SystemBaseEntity {
  @Column({ type: 'varchar' })
  entryId!: string;

  @Column({ type: 'varchar' })
  configId!: string;

  @Column({ type: 'enum', enum: Status, default: Status.QUEUED })
  status!: Status;

  @Column({ nullable: true })
  modelUsed!: string;

  @Column({ type: 'float', nullable: true })
  score!: number;

  @Column({ type: 'int', nullable: true })
  confidence!: number;

  @Column({ type: 'text', nullable: true })
  feedback!: string;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string;

  @Column({ type: 'int', default: 0 })
  attemptCount!: number;
}