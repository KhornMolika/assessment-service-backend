import { Entity, Column } from 'typeorm';
import { TenantBaseEntity } from '../../../common/base/tenant-base.entity';

export enum AssessmentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

@Entity()
export class Assessment extends TenantBaseEntity {
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