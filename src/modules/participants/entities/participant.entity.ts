import { Entity, Column, OneToMany } from 'typeorm';
import { ClientScopedEntity } from '@common/base/client-scoped.entity';
import { AssessmentParticipant } from '@modules/assessments/entities/assessment-participant.entity';

@Entity()
export class Participant extends ClientScopedEntity {
  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @OneToMany(() => AssessmentParticipant, (ap) => ap.participant)
  assessments!: AssessmentParticipant[];
}
