import { Entity, Column } from 'typeorm';
import { SystemBaseEntity } from '../../../common/base/system-base.entity';

export enum GradingStrategy {
  BINARY = 'BINARY',
  DEDUCTIVE = 'DEDUCTIVE',
  SCALED = 'SCALED',
  AI = 'AI',
}

@Entity()
export class QuestionType extends SystemBaseEntity {
  @Column({ type: 'varchar', length: 50})
  name!: string;

  @Column({ type: 'enum', enum: GradingStrategy })
  gradingStrategy!: GradingStrategy;

  @Column({ default: false })
  hasOptions!: boolean;

  @Column({ default: false })
  supportsAi!: boolean;

  @Column({ default: false })
  isManualOnly!: boolean;

  @Column({ default: 5 })
  defaultMaxScore!: number;

  @Column({ type: 'text', nullable: true })
  description?: string;
}