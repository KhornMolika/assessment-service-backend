import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';
import { ClientScopedEntity } from '../../common/base/client-scoped.entity';
import { Topic } from '../topics/entities/topic.entity';

export enum BankVisibility {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
}

@Entity()
export class QuestionBank extends ClientScopedEntity {
  @Column({ type: 'varchar', length: 256})
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column('text', { array: true, nullable: true })
  tags?: string[];

  @Column({
    type: 'enum',
    enum: BankVisibility,
    default: BankVisibility.PRIVATE,
  })
  visibility!: BankVisibility;

  @ManyToMany(() => Topic, (topic) => topic.questionBanks, { cascade: true })
  @JoinTable({
    name: 'question_bank_topics', // Custom clean table name
    joinColumn: { name: 'questionBankId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'topicId', referencedColumnName: 'id' }
  })
  topics!: Topic[];
}