import { Entity, Column } from 'typeorm';
import { TenantBaseEntity } from '../../common/base/tenant-base.entity';

export enum BankVisibility {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
}

@Entity()
export class QuestionBank extends TenantBaseEntity {
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
}