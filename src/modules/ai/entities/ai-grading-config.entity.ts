import { Entity, Column } from 'typeorm';
import { SystemBaseEntity } from '../../../common/base/system-base.entity';

@Entity()
export class AIGradingConfig extends SystemBaseEntity {
  @Column({ type: 'varchar'})
  questionId!: string;

  @Column({ type: 'jsonb' })
  rubric: any;

  @Column({ type: 'text' })
  instruction!: string;

  @Column({ type: 'float' })
  maxScore!: number;
}