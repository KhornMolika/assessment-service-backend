import { Entity, Column } from 'typeorm';
import { ClientScopedEntity } from '../../../common/base/client-scoped.entity';

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
}