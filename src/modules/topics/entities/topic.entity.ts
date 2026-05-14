import { Column, Entity, Index, ManyToMany } from "typeorm";
import { ClientScopedEntity } from "../../../common/base/client-scoped.entity";
import { QuestionBank } from "../../question-banks/question-bank.entity";
import { Assessment } from "../../assessments/entities/assessment.entity";
import { Question } from "../../questions/entities/question.entity";

@Entity()
export class Topic extends ClientScopedEntity  {
  @Column({
    type: 'varchar',
    length: 256
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

  @ManyToMany(() => QuestionBank, (qb) => qb.topics)
  questionBanks!: QuestionBank[];

  @ManyToMany(() => Question, (q) => q.topics)
  questions!: Question[];

  @ManyToMany(() => Assessment, (a) => a.topics)
  assessments!: Assessment[];
}
