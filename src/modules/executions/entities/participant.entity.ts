import { Entity, Column } from 'typeorm';
import { ClientScopedEntity } from '../../../common/base/client-scoped.entity';

@Entity()
export class Participant extends ClientScopedEntity {
  @Column({ type: 'varchar'})
  assessmentId!: string;

  @Column({ type: 'varchar', nullable: true })
  email?: string;

  @Column({ type: 'varchar', nullable: true })
  phone?: string;

  @Column({ type: 'varchar', nullable: true })
  name?: string;
}