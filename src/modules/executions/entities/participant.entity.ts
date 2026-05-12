import { Entity, Column } from 'typeorm';
import { TenantBaseEntity } from '../../../common/base/tenant-base.entity';

@Entity()
export class Participant extends TenantBaseEntity {
  @Column({ type: 'varchar'})
  assessmentId!: string;

  @Column({ type: 'varchar', nullable: true })
  email?: string;

  @Column({ type: 'varchar', nullable: true })
  phone?: string;

  @Column({ type: 'varchar', nullable: true })
  name?: string;
}