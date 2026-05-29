import { Entity, Column, ManyToOne, Index, OneToMany } from 'typeorm';
import { ClientScopedEntity } from '@common/base/client-scoped.entity';
import { Topic } from '@modules/topics/entities/topic.entity';
import { QuestionBankQuestion } from '@modules/question-banks/entities/question-bank-question.entity';
import { AssessmentQuestion } from '@modules/assessments/entities/assessment-question.entity';
import { QuestionType } from '../enums/question-type.enum';

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

@Entity()
@Index(['clientId', 'topic'], { unique: false })
export class Question extends ClientScopedEntity {
  @ManyToOne(() => Topic, (topic) => topic.questions, {
    onDelete: 'CASCADE',
  })
  topic!: Topic;

  @Column({ type: 'enum', enum: QuestionType })
  type!: QuestionType;

  @Column({ type: 'text' })
  questionText!: string;

  @Column({ type: 'enum', enum: Difficulty })
  difficulty!: Difficulty;

  @Column({ default: 1 })
  points!: number;

  @Column({ type: 'jsonb', nullable: true })
  options!: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  correctAnswer!: Record<string, any> | null;

  @OneToMany(() => QuestionBankQuestion, (bq) => bq.question)
  bankQuestions!: QuestionBankQuestion[];

  @OneToMany(() => AssessmentQuestion, (aq) => aq.question)
  assessmentQuestions!: AssessmentQuestion[];
}
