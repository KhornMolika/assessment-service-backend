import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';
import { ClientScopedEntity } from '../../../common/base/client-scoped.entity';
import { Topic } from '../../topics/entities/topic.entity';

export enum AssessmentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

@Entity()
export class Assessment extends ClientScopedEntity {
  @Column({ type: 'varchar'})
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: AssessmentStatus,
    default: AssessmentStatus.DRAFT
  })
  status!: AssessmentStatus;

  @ManyToMany(() => Topic, (topic) => topic.assessments)
  @JoinTable({
    name: 'assessment_topics', // Custom junction table name
    joinColumn: { name: 'assessmentId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'topicId', referencedColumnName: 'id' },
  })
  topics!: Topic[];
}