import { Entity, Column, ManyToOne, Index, ManyToMany, JoinTable } from 'typeorm';
import { QuestionBank } from '../../question-banks/question-bank.entity';
import { ClientScopedEntity } from '../../../common/base/client-scoped.entity';
import { Topic } from '../../topics/entities/topic.entity';
import { QuestionTypeName } from '../constants/question-types.config';

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

@Entity()
export class Question extends ClientScopedEntity {
  @Index()
  @Column({ type: 'uuid' })
  bankId!: string;

  @Column({ type: 'text' })
  questionText!: string;
  
  @Column({ type: 'enum', enum: QuestionTypeName }) // Stored directly as an Enum type string
  type!: QuestionTypeName;

  @Column({ type: 'enum', enum: Difficulty })
  difficulty!: Difficulty;

  @Column({ type: 'int' })
  points!: number;

  @Column('text', { array: true, nullable: true })
  tags?: string[];

  @Column({ type: 'jsonb' })
  settings!: Record<string, any>;

  @Column({ type: 'jsonb' })
  correctAnswer!: Record<string, any>;

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