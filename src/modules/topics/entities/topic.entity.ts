// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';
import { ClientScopedEntity } from '@common/base/client-scoped.entity';
import { QuestionBank } from '@modules/question-banks/entities/question-bank.entity';
import { Assessment } from '@modules/assessments/entities/assessment.entity';
import { Question } from '@modules/questions/entities/question.entity';

export enum TopicVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

@Entity()
@Index(['clientId', 'name'], { unique: true, where: '"deletedAt" IS NULL' })
export class Topic extends ClientScopedEntity {
  @Column({
    type: 'varchar',
    length: 256,
  })
  name!: string;

  @Column({
    type: 'varchar',
    length: 320,
  })
  slug!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @OneToMany(() => Question, (question) => question.topic)
  questions!: Question[];

  @OneToMany(() => QuestionBank, (bank) => bank.topic)
  questionBanks!: QuestionBank[];

  @OneToMany(() => Assessment, (assessment) => assessment.topic)
  assessments!: Assessment[];
}
