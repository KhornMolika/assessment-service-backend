import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { SystemBaseEntity } from '../../common/base/system-base.entity';
import { Client } from '../clients/client.entity';


@Entity()
export class RefreshToken extends SystemBaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  clientId!: string;

  @Column({ type: 'varchar' })
  tokenHash!: string;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'boolean', default: false })
  isRevoked!: boolean;

  @ManyToOne(() => Client, (c) => c.refreshTokens, {
    onDelete: 'CASCADE',
  })
  client!: Client;
}