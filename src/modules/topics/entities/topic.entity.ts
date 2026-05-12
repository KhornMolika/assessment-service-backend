import { Column, Entity, Index } from "typeorm";
import { TenantBaseEntity } from "../../../common/base/tenant-base.entity";

@Entity()
@Index(['clientId', 'slug'], { unique: true })
export class Topic extends TenantBaseEntity {
  @Column({
    type: 'varchar',
    length: 256
  })
  name!: string;

  @Column({
    type: 'varchar',
    length: 256,
  })
  slug!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;
}
