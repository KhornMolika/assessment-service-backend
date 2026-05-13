import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1778576174770 implements MigrationInterface {
    name = 'AutoMigration1778576174770'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_df5ece6f12d072f11a1e24048b"`);
        await queryRunner.query(`ALTER TABLE "question_bank" DROP COLUMN "clientId"`);
        await queryRunner.query(`ALTER TABLE "question_bank" ADD "clientId" uuid NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dae9fc44421d72a99bdb3e064b"`);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "clientId"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD "clientId" uuid NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."IDX_129f6628585f83169f832a7e32"`);
        await queryRunner.query(`ALTER TABLE "answer_sheet" DROP COLUMN "clientId"`);
        await queryRunner.query(`ALTER TABLE "answer_sheet" ADD "clientId" uuid NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."IDX_324b65b0282ce85363a485d85d"`);
        await queryRunner.query(`ALTER TABLE "assessment" DROP COLUMN "clientId"`);
        await queryRunner.query(`ALTER TABLE "assessment" ADD "clientId" uuid NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b3bcc9ba4c3a6461d67dbc6f84"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2004c8b383b5feb891073e40d1"`);
        await queryRunner.query(`ALTER TABLE "topic" DROP COLUMN "clientId"`);
        await queryRunner.query(`ALTER TABLE "topic" ADD "clientId" uuid NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."IDX_87df6afba485965b2d3cab7c6f"`);
        await queryRunner.query(`ALTER TABLE "question" DROP COLUMN "clientId"`);
        await queryRunner.query(`ALTER TABLE "question" ADD "clientId" uuid NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_df5ece6f12d072f11a1e24048b" ON "question_bank" ("clientId") `);
        await queryRunner.query(`CREATE INDEX "IDX_dae9fc44421d72a99bdb3e064b" ON "participant" ("clientId") `);
        await queryRunner.query(`CREATE INDEX "IDX_129f6628585f83169f832a7e32" ON "answer_sheet" ("clientId") `);
        await queryRunner.query(`CREATE INDEX "IDX_324b65b0282ce85363a485d85d" ON "assessment" ("clientId") `);
        await queryRunner.query(`CREATE INDEX "IDX_2004c8b383b5feb891073e40d1" ON "topic" ("clientId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b3bcc9ba4c3a6461d67dbc6f84" ON "topic" ("clientId", "slug") `);
        await queryRunner.query(`CREATE INDEX "IDX_87df6afba485965b2d3cab7c6f" ON "question" ("clientId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_87df6afba485965b2d3cab7c6f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b3bcc9ba4c3a6461d67dbc6f84"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2004c8b383b5feb891073e40d1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_324b65b0282ce85363a485d85d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_129f6628585f83169f832a7e32"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dae9fc44421d72a99bdb3e064b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_df5ece6f12d072f11a1e24048b"`);
        await queryRunner.query(`ALTER TABLE "question" DROP COLUMN "clientId"`);
        await queryRunner.query(`ALTER TABLE "question" ADD "clientId" character varying NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_87df6afba485965b2d3cab7c6f" ON "question" ("clientId") `);
        await queryRunner.query(`ALTER TABLE "topic" DROP COLUMN "clientId"`);
        await queryRunner.query(`ALTER TABLE "topic" ADD "clientId" character varying NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_2004c8b383b5feb891073e40d1" ON "topic" ("clientId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b3bcc9ba4c3a6461d67dbc6f84" ON "topic" ("clientId", "slug") `);
        await queryRunner.query(`ALTER TABLE "assessment" DROP COLUMN "clientId"`);
        await queryRunner.query(`ALTER TABLE "assessment" ADD "clientId" character varying NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_324b65b0282ce85363a485d85d" ON "assessment" ("clientId") `);
        await queryRunner.query(`ALTER TABLE "answer_sheet" DROP COLUMN "clientId"`);
        await queryRunner.query(`ALTER TABLE "answer_sheet" ADD "clientId" character varying NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_129f6628585f83169f832a7e32" ON "answer_sheet" ("clientId") `);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "clientId"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD "clientId" character varying NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_dae9fc44421d72a99bdb3e064b" ON "participant" ("clientId") `);
        await queryRunner.query(`ALTER TABLE "question_bank" DROP COLUMN "clientId"`);
        await queryRunner.query(`ALTER TABLE "question_bank" ADD "clientId" character varying NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_df5ece6f12d072f11a1e24048b" ON "question_bank" ("clientId") `);
    }

}
