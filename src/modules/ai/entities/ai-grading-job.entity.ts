import { Entity, Column, ManyToOne } from 'typeorm';
import { ClientScopedEntity } from '../../../common/base/client-scoped.entity';
import { AnswerEntry } from '../../executions/entities/answer-entry.entity';

@Entity()
export class AIGradingJob extends ClientScopedEntity {
  @ManyToOne(() => AnswerEntry, (e) => e.aiJobs, { onDelete: "CASCADE" })
  answerEntry!: AnswerEntry;

  @Column()
  status!: string;

  @Column({ nullable: true, type: "float" })
  score?: number;

  @Column({ nullable: true, type: "float" })
  confidence?: number;

  @Column({ nullable: true, type: "text" })
  feedback?: string;

  @Column({ nullable: true, type: "text" })
  errorMessage?: string;
}