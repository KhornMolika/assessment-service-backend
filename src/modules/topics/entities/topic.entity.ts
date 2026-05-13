import { Column, Entity, Index } from "typeorm";
import { ClientScopedEntity } from "../../../common/base/client-scoped.entity";

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
}
