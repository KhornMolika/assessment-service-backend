import { Entity, Column, ManyToOne, OneToMany, Index } from 'typeorm';
import { ClientScopedEntity } from '../../../common/base/client-scoped.entity';
import { Assessment } from '../../assessments/entities/assessment.entity';
import { Participant } from './participant.entity';
import { AnswerSheet } from './answer-sheet.entity';

@Entity()
@Index(["assessment", "participant"], { unique: true })
export class AssessmentParticipant extends ClientScopedEntity {
  @ManyToOne(() => Assessment, (a) => a.participants, { onDelete: "CASCADE" })
  assessment!: Assessment;

  @ManyToOne(() => Participant, (p) => p.assessments, { onDelete: "CASCADE" })
  participant!: Participant;

  @Column({ length: 20 })
  status!: string;

  @Column({ nullable: true })
  totalScore?: number;

  @OneToMany(() => AnswerSheet, (s) => s.assessmentParticipant)
  answerSheets!: AnswerSheet[];
}
