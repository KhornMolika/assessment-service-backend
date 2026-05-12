import { Entity, Column, Index } from 'typeorm';
import { SystemBaseEntity } from '../../../common/base/system-base.entity';

@Entity('assessments_questions')
export class AssessmentQuestion extends SystemBaseEntity {
  @Index()
  @Column({ type: 'varchar'})
  assessmentId!: string;

  @Index()
  @Column({ type: 'varchar'})
  questionId!: string;

  @Column({ type: 'int'})
  order!: number;

  @Column({ type: 'float', nullable: true })
  pointsOverride!: number;

  @Column({ type: 'jsonb', nullable: true })
  snapshot: any;
}