import { Entity, Column, OneToMany } from 'typeorm';
import { ClientScopedEntity } from '../../../common/base/client-scoped.entity';
import { AssessmentParticipant } from './assessment-participant.entity';

@Entity()
export class Participant extends ClientScopedEntity {
  @Column()
  name!: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @OneToMany(() => AssessmentParticipant, (a) => a.participant)
  assessments!: AssessmentParticipant[];
}