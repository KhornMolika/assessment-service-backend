import { Column, Index } from 'typeorm';
import { SystemBaseEntity } from './system-base.entity';

export abstract class ClientScopedEntity extends SystemBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  clientId!: string;
}
