import { Entity, Column, Index } from 'typeorm';
import { SystemBaseEntity } from '../../../common/base/system-base.entity';

@Entity()
export class AssessmentTopic extends SystemBaseEntity {
  @Column({ type: 'varchar' })
  clientId!: string;

  @Column({ type: 'varchar' })
  assessmentId!: string;

  @Column({ type: 'varchar' })
  topicId!: string;
}