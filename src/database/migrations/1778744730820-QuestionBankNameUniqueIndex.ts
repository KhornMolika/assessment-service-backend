import { MigrationInterface, QueryRunner } from "typeorm";

export class QuestionBankNameUniqueIndex1778744730820 implements MigrationInterface {

    name = 'QuestionBankNameUniqueIndex1778744730820';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX qb_client_name_active
      ON question_bank ("clientId", "name")
      WHERE "deletedAt" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS qb_client_name_active;
    `);
  }

}
