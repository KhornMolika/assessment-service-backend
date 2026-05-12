import { Entity, Column, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../common/base/tenant-base.entity';

@Entity()
export class AnswerSheet extends TenantBaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  participantId!: string;

  @Index()
  @Column({ type: 'varchar' })
  assessmentId!: string;

  @Column({ type: 'float', nullable: true })
  totalScore!: number;

  @Column({ type: 'float', nullable: true })
  maxScore!: number;

  @Column({ type: 'varchar', nullable: true })
  grade!: string;

  @Column({ type: 'boolean', default: false })
  isPassed!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  startedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt!: Date;

  @Column({ type: 'varchar', nullable: true })
  shareToken!: string;
}