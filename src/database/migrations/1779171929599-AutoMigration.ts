import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1779171929599 implements MigrationInterface {
    name = 'AutoMigration1779171929599'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "question" DROP COLUMN "settings"`);
        await queryRunner.query(`ALTER TABLE "question" DROP COLUMN "tags"`);
        await queryRunner.query(`ALTER TABLE "topic" DROP COLUMN "visibility"`);
        await queryRunner.query(`DROP TYPE "public"."topic_visibility_enum"`);
        await queryRunner.query(`ALTER TABLE "question" ADD "options" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "question" DROP COLUMN "options"`);
        await queryRunner.query(`CREATE TYPE "public"."topic_visibility_enum" AS ENUM('PUBLIC', 'PRIVATE')`);
        await queryRunner.query(`ALTER TABLE "topic" ADD "visibility" "public"."topic_visibility_enum" NOT NULL DEFAULT 'PRIVATE'`);
        await queryRunner.query(`ALTER TABLE "question" ADD "tags" text array NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "question" ADD "settings" jsonb`);
    }

}
