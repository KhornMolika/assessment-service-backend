import { Entity, Column } from 'typeorm';
import { ClientScopedEntity } from '../../common/base/client-scoped.entity';

export enum BankVisibility {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
}

@Entity()
export class QuestionBank extends ClientScopedEntity {
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