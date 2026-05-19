import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { ClientScopedEntity } from '../../../common/base/client-scoped.entity';
import { Topic } from '../../topics/entities/topic.entity';
import { QuestionBankQuestion } from './question-bank-question.entity';

export enum BankVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  SHARED = 'SHARED',
}

@Entity()
export class QuestionBank extends ClientScopedEntity {
  @ManyToOne(() => Topic, (topic) => topic.questionBanks, {
    onDelete: "CASCADE",
  })
  topic: Topic;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: BankVisibility,
    default: BankVisibility.PRIVATE
  })
  visibility!: BankVisibility;

  @Column({ nullable: true, type: "text" })
  description?: string;

  @Column("text", { array: true, default: [] })
  tags: string[];

  @OneToMany(() => QuestionBankQuestion, (bq) => bq.questionBank)
  questions: QuestionBankQuestion[];
}
