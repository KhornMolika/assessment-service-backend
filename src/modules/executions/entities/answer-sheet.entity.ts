import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { ClientScopedEntity } from '../../../common/base/client-scoped.entity';
import { AssessmentParticipant } from './assessment-participant.entity';
import { AnswerEntry } from './answer-entry.entity';

@Entity()
export class AnswerSheet extends ClientScopedEntity {
  @ManyToOne(() => AssessmentParticipant, (p) => p.answerSheets, {
    onDelete: "CASCADE",
  })
  assessmentParticipant!: AssessmentParticipant;

  @Column({ nullable: true })
  totalScore?: number;

  @Column({ nullable: true })
  grade?: string;

  @Column({ default: false })
  isPassed!: boolean;

  @Column({ nullable: true })
  startedAt?: Date;

  @Column({ nullable: true })
  submittedAt?: Date;

  @OneToMany(() => AnswerEntry, (e) => e.answerSheet)
  entries!: AnswerEntry[];
}