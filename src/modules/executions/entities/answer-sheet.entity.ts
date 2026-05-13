import { Entity, Column, Index } from 'typeorm';
import { ClientScopedEntity } from '../../../common/base/client-scoped.entity';

@Entity()
export class AnswerSheet extends ClientScopedEntity {
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