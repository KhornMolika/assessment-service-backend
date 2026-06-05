// -----------------------------------------------------------------------------
// Join table between Assessment and Question.
// Stores display order, point override, and a frozen snapshot of the question
// content at publish time. Runtime reads from snapshot, not the live question.
// -----------------------------------------------------------------------------

import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { ClientScopedEntity } from '@common/base/client-scoped.entity';
import { Assessment } from './assessment.entity';
import { Question } from '@modules/questions/entities/question.entity';
import { QuestionType } from '@modules/questions/enums/question-type.enum';

@Entity()
@Index(['assessment', 'question'], { unique: true })
@Index(['assessmentId', 'questionType'])
export class AssessmentQuestion extends ClientScopedEntity {
  @ManyToOne(() => Assessment, (a) => a.questions, { onDelete: 'CASCADE' })
  assessment!: Assessment;

  @Column({ type: 'uuid' })
  assessmentId!: string;

  @ManyToOne(() => Question, (q) => q.assessmentQuestions, {
    onDelete: 'CASCADE',
  })
  question!: Question;

  @Column({ type: 'uuid' })
  questionId!: string;

  @Column({ default: 1 })
  order!: number;

  // Overrides question.defaultPoints for this assessment only
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  points!: number;

  @Column({ type: 'enum', enum: QuestionType, nullable: true })
  questionType?: QuestionType;

  // Frozen at publish — prevents live edits from affecting active sessions
  @Column({ type: 'jsonb' })
  questionSnapshot!: Partial<Question>;
}
