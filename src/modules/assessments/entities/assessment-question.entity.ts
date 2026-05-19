import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { ClientScopedEntity } from '../../../common/base/client-scoped.entity';
import { Assessment } from './assessment.entity';
import { Question } from '../../questions/entities/question.entity';

@Entity()
@Index(["assessment", "question"], { unique: true })
export class AssessmentQuestion extends ClientScopedEntity {
  @ManyToOne(() => Assessment, (a) => a.questions, { onDelete: "CASCADE" })
  assessment!: Assessment;

  @ManyToOne(() => Question, (q) => q.assessmentQuestions, {
    onDelete: "CASCADE",
  })
  question!: Question;

  @Column({ default: 1 })
  order!: number;

  @Column({ type: "jsonb", nullable: true })
  snapshot?: Record<string, any>;
}