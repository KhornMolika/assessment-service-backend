import { Column, Entity, Index, ManyToOne, OneToMany } from "typeorm";
import { ClientScopedEntity } from "../../../common/base/client-scoped.entity";
import { Client } from "../../clients/client.entity";
import { QuestionBank } from "../../question-banks/entities/question-bank.entity";
import { Assessment } from "../../assessments/entities/assessment.entity";
import { Question } from "../../questions/entities/question.entity";

export enum TopicVisibility {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
}

@Entity()
@Index(["clientId", "name"], { unique: true })
export class Topic extends ClientScopedEntity {
  @ManyToOne(() => Client, (client) => client.topics, {
    onDelete: "CASCADE",
  })
  client: Client;

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

  @Column({
    type: "enum",
    enum: TopicVisibility,
    default: TopicVisibility.PRIVATE,
  })
  visibility!: TopicVisibility;

  @OneToMany(() => Question, (question) => question.topic)
  questions: Question[];

  @OneToMany(() => QuestionBank, (bank) => bank.topic)
  questionBanks: QuestionBank[];

  @OneToMany(() => Assessment, (assessment) => assessment.topic)
  assessments: Assessment[];
}
