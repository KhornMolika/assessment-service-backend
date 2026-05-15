import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveQuestionTypeTable1778834599382 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop foreign key constraints on the question table referencing question_type
    await queryRunner.query(`ALTER TABLE "question" DROP CONSTRAINT IF EXISTS "FK_question_type";`);
    
    // 2. Drop the unneeded question_type table and its enum type if created independently
    await queryRunner.query(`DROP TABLE IF EXISTS "question_type" CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS "question_type_gradingstrategy_enum" CASCADE;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reversal is omitted as we are permanently refactoring to a high-performance static config file
  }

}
