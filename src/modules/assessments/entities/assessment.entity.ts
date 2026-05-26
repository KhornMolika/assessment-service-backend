// -----------------------------------------------------------------------------
// Represents an assessment owned by a topic. Tracks lifecycle status.
// -----------------------------------------------------------------------------

import { Entity, Column, ManyToOne, OneToOne, OneToMany } from 'typeorm';
import { ClientScopedEntity } from '@common/base/client-scoped.entity';
import { Topic } from '@modules/topics/entities/topic.entity';
import { AssessmentSetting } from './assessment-settings.entity';
import { AssessmentQuestion } from './assessment-question.entity';
import { AssessmentParticipant } from './assessment-participant.entity';

export enum AssessmentType {
  QUIZ = 'QUIZ',
  EXAM = 'EXAM',
  SURVEY = 'SURVEY',
  PRACTICE = 'PRACTICE',
}

export enum AssessmentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

@Entity()
export class Assessment extends ClientScopedEntity {
  @ManyToOne(() => Topic, (topic) => topic.assessments, {
    onDelete: 'CASCADE',
  })
  topic!: Topic;

  @Column({ type: 'uuid' })
  topicId!: string;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: AssessmentType, default: AssessmentType.QUIZ })
  type!: AssessmentStatus;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({
    type: 'enum',
    enum: AssessmentStatus,
    default: AssessmentStatus.DRAFT,
  })
  status!: AssessmentStatus;

  @OneToOne(() => AssessmentSetting, (s) => s.assessment, { cascade: true })
  settings!: AssessmentSetting;

  @OneToMany(() => AssessmentQuestion, (q) => q.assessment)
  questions!: AssessmentQuestion[];

  @OneToMany(() => AssessmentParticipant, (p) => p.assessment)
  participants!: AssessmentParticipant[];
}
