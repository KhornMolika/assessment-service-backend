import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export abstract class SystemBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({  type: 'timestamp' })
  updatedAt!: Date;
}