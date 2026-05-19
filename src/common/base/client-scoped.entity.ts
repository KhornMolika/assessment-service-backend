import { Column, Index } from 'typeorm';
import { SystemBaseEntity } from './system-base.entity';
import { Exclude } from 'class-transformer';

export abstract class ClientScopedEntity extends SystemBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  @Exclude()
  clientId!: string;
}
