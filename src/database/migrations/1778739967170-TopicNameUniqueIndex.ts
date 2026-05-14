import { MigrationInterface, QueryRunner } from "typeorm";

export class TopicNameUniqueIndex1778739967170 implements MigrationInterface {

    name = 'TopicNameUniqueIndex1778739967170';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop the old slug index if it exists to clean up the schema
    await queryRunner.query(`
      DROP INDEX IF EXISTS topic_client_slug_active;
    `);

    // 2. Create the unique index on client_id and NAME instead of slug
    await queryRunner.query(`
      CREATE UNIQUE INDEX topic_client_name_active
      ON topic ("clientId", "name")
      WHERE "deletedAt" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: Drop the name index and reconstruct the slug index if needed
    await queryRunner.query(`
      DROP INDEX topic_client_name_active;
    `);
    
    await queryRunner.query(`
      CREATE UNIQUE INDEX topic_client_slug_active
      ON topic ("clientId", slug)
      WHERE "deletedAt" IS NULL;
    `);
  }

}
