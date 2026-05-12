import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../common/base/tenant-base.entity';
import { QuestionType } from './question-type.entity';
import { QuestionBank } from '../../question-banks/question-bank.entity';

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

@Entity()
export class Question extends TenantBaseEntity {
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
}