import { Entity, Column, ManyToOne, Index, ManyToMany, JoinTable } from 'typeorm';
import { QuestionType } from './question-type.entity';
import { QuestionBank } from '../../question-banks/question-bank.entity';
import { ClientScopedEntity } from '../../../common/base/client-scoped.entity';
import { Topic } from '../../topics/entities/topic.entity';

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

@Entity()
export class Question extends ClientScopedEntity {
  @Index()
  @Column({ type: 'varchar' })
  bankId!: string;

  @Index()
  @Column({ type: 'varchar' })
  typeId!: string;

  @Column({ type: 'text' })
  questionText!: string;

  @Column({ type: 'enum', enum: Difficulty })
  difficulty!: Difficulty;

  @Column({ type: 'int' })
  points!: number;

  @Column('text', { array: true, nullable: true })
  tags?: string[];

  @Column({ type: 'jsonb' })
  settings: any;

  @Column({ type: 'jsonb' })
  correctAnswer: any;

  @ManyToOne(() => QuestionType)
  type!: QuestionType;

  @ManyToOne(() => QuestionBank, { nullable: true })
  bank!: QuestionBank;

  @ManyToMany(() => Topic, (topic) => topic.questions)
  @JoinTable({
    name: 'question_topics', // Custom junction table name
    joinColumn: { name: 'questionId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'topicId', referencedColumnName: 'id' },
  })
  topics!: Topic[];
}