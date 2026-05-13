import { MigrationInterface, QueryRunner } from "typeorm";

export class TopicSlugIndex1778661613244 implements MigrationInterface {

    name = 'TopicSlugIndex1778661613244'; 

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX topic_client_slug_active
      ON topic (client_id, slug)
      WHERE deleted_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX topic_client_slug_active;
    `);
  }

}
