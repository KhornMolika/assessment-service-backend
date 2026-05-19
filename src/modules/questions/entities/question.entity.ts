import { Entity, Column, ManyToOne, Index, OneToMany } from 'typeorm';
import { ClientScopedEntity } from '../../../common/base/client-scoped.entity';
import { Topic } from '../../topics/entities/topic.entity';
import { QuestionBankQuestion } from '../../question-banks/entities/question-bank-question.entity';
import { AssessmentQuestion } from '../../assessments/entities/assessment-question.entity';

export enum Difficulty {
  EASY = "EASY",
  MEDIUM = "MEDIUM",
  HARD = "HARD",
}

export enum QuestionType {
  SINGLE_CHOICE = "SINGLE_CHOICE",
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  TRUE_FALSE = "TRUE_FALSE",
  ORDERING = "ORDERING",
  FILL_IN_THE_BLANK = "FILL_IN_THE_BLANK",
  MATCHING = "MATCHING",
  RATING = "RATING",
  SHORT_ANSWER = "SHORT_ANSWER",
  ESSAY = "ESSAY",
}

@Entity()
@Index(["clientId", "topic"], { unique: false })
export class Question extends ClientScopedEntity {
  @ManyToOne(() => Topic, (topic) => topic.questions, {
    onDelete: "CASCADE",
  })
  topic: Topic;

  @Column({ type: "enum", enum: QuestionType })
  type: QuestionType;

  @Column({ type: "text" })
  questionText: string;

  @Column({ type: "enum", enum: Difficulty })
  difficulty!: Difficulty;

  @Column({ default: 1 })
  points: number;

  @Column({ name: "options", type: "jsonb", nullable: true })
  options!: string | string[] | Record<string, any>[];

  @Column({ type: "jsonb", nullable: true })
  correctAnswer!: string | string[] | Record<string, any>[];

  @OneToMany(() => QuestionBankQuestion, (bq) => bq.question)
  bankQuestions: QuestionBankQuestion[];

  @OneToMany(() => AssessmentQuestion, (aq) => aq.question)
  assessmentQuestions: AssessmentQuestion[];
}