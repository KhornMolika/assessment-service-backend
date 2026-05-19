import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { ClientScopedEntity } from '../../../common/base/client-scoped.entity';
import { QuestionBank } from './question-bank.entity';
import { Question } from '../../questions/entities/question.entity';

@Entity()
@Index(["questionBank", "question"], { unique: true })
export class QuestionBankQuestion extends ClientScopedEntity {
  @ManyToOne(() => QuestionBank, (bank) => bank.questions, {
    onDelete: "CASCADE",
  })
  questionBank: QuestionBank;

  @ManyToOne(() => Question, (question) => question.bankQuestions, {
    onDelete: "CASCADE",
  })
  question: Question;

  @Column({ nullable: true })
  order?: number;
}
