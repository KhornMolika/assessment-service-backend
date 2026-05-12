import { Entity, Column, Index } from 'typeorm';
import { SystemBaseEntity } from '../../../common/base/system-base.entity';

@Entity()
@Index(['clientId', 'questionId'])
@Index(['clientId', 'topicId'])
export class QuestionTopic extends SystemBaseEntity {
  @Column({ type: 'varchar' })
  clientId!: string;

  @Column({ type: 'varchar' })
  questionId!: string;

  @Column({ type: 'varchar' })
  topicId!: string;
}