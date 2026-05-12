import { Column, Index } from 'typeorm';
import { SystemBaseEntity } from './system-base.entity';

export abstract class TenantBaseEntity extends SystemBaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  clientId!: string;
}
