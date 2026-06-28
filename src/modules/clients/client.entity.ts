// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Entity, Column, OneToMany } from 'typeorm';
import { SystemBaseEntity } from '@common/base/system-base.entity';

@Entity()
export class Client extends SystemBaseEntity {
  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', unique: true })
  slug!: string;

  @Column({ type: 'uuid', unique: true })
  clientId!: string;

  @Column({ type: 'varchar' })
  clientSecretHash!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column('text', { array: true, nullable: true })
  allowedOrigins!: string[];

  @Column('text', { array: true, nullable: true })
  scopes!: string[];

  @Column({ type: 'varchar', nullable: true })
  webhookUrl!: string;

  @Column({ type: 'varchar', nullable: true })
  webhookSecret!: string;
}
