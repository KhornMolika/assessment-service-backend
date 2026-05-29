import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoMigration1780056505978 implements MigrationInterface {
  name = 'AutoMigration1780056505978';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."assessment_question_questiontype_enum" AS ENUM('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'ORDERING', 'FILL_IN_THE_BLANK', 'MATCHING', 'RATING', 'SHORT_ANSWER', 'ESSAY')`,
    );
    await queryRunner.query(
      `ALTER TABLE "assessment_question" ADD "questionType" "public"."assessment_question_questiontype_enum"`,
    );
    await queryRunner.query(
      `UPDATE "assessment_question" SET "questionType" = ("questionSnapshot"->>'type')::"public"."assessment_question_questiontype_enum" WHERE "questionSnapshot" IS NOT NULL AND "questionSnapshot"->>'type' IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_602019f8835ba80a6ba066d55e" ON "assessment_question" ("assessmentId", "questionType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7bdbc9ab34ffc992000026b68c" ON "answer_entry" ("answerSheetId", "assessmentQuestionId") WHERE "deletedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7b84b2d5b0adbc376b5e524fe7" ON "answer_sheet" ("assessmentId", "clientId") WHERE "deletedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7b84b2d5b0adbc376b5e524fe7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7bdbc9ab34ffc992000026b68c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_602019f8835ba80a6ba066d55e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assessment_question" DROP COLUMN "questionType"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."assessment_question_questiontype_enum"`,
    );
  }
}
