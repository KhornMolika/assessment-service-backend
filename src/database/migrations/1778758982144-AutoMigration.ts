import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1778758982144 implements MigrationInterface {
    name = 'AutoMigration1778758982144'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."topic_client_name_active"`);
        await queryRunner.query(`DROP INDEX "public"."qb_client_name_active"`);
        await queryRunner.query(`CREATE TABLE "question_topics" ("questionId" uuid NOT NULL, "topicId" uuid NOT NULL, CONSTRAINT "PK_cd69e5541a9d3bcab41b483551d" PRIMARY KEY ("questionId", "topicId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_587f690ac84335ddb97e8a93ea" ON "question_topics" ("questionId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ba44b75aca318505ca747c5bbb" ON "question_topics" ("topicId") `);
        await queryRunner.query(`CREATE TABLE "assessment_topics" ("assessmentId" uuid NOT NULL, "topicId" uuid NOT NULL, CONSTRAINT "PK_e38a5b885aa93a853551cde9bd5" PRIMARY KEY ("assessmentId", "topicId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_49e72a3b8e38ab571251634ace" ON "assessment_topics" ("assessmentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_eef839b973e45703e9ec41566e" ON "assessment_topics" ("topicId") `);
        await queryRunner.query(`CREATE TABLE "question_bank_topics" ("questionBankId" uuid NOT NULL, "topicId" uuid NOT NULL, CONSTRAINT "PK_0f0e4d1d2969fcc9f6d9d6c6096" PRIMARY KEY ("questionBankId", "topicId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d743d0bdca9f5ca64598dbacc1" ON "question_bank_topics" ("questionBankId") `);
        await queryRunner.query(`CREATE INDEX "IDX_61dd55e0d6944ee8569c719e44" ON "question_bank_topics" ("topicId") `);
        await queryRunner.query(`ALTER TABLE "question_topics" ADD CONSTRAINT "FK_587f690ac84335ddb97e8a93eaf" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "question_topics" ADD CONSTRAINT "FK_ba44b75aca318505ca747c5bbb5" FOREIGN KEY ("topicId") REFERENCES "topic"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assessment_topics" ADD CONSTRAINT "FK_49e72a3b8e38ab571251634ace0" FOREIGN KEY ("assessmentId") REFERENCES "assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "assessment_topics" ADD CONSTRAINT "FK_eef839b973e45703e9ec41566e8" FOREIGN KEY ("topicId") REFERENCES "topic"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "question_bank_topics" ADD CONSTRAINT "FK_d743d0bdca9f5ca64598dbacc16" FOREIGN KEY ("questionBankId") REFERENCES "question_bank"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "question_bank_topics" ADD CONSTRAINT "FK_61dd55e0d6944ee8569c719e44c" FOREIGN KEY ("topicId") REFERENCES "topic"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "question_bank_topics" DROP CONSTRAINT "FK_61dd55e0d6944ee8569c719e44c"`);
        await queryRunner.query(`ALTER TABLE "question_bank_topics" DROP CONSTRAINT "FK_d743d0bdca9f5ca64598dbacc16"`);
        await queryRunner.query(`ALTER TABLE "assessment_topics" DROP CONSTRAINT "FK_eef839b973e45703e9ec41566e8"`);
        await queryRunner.query(`ALTER TABLE "assessment_topics" DROP CONSTRAINT "FK_49e72a3b8e38ab571251634ace0"`);
        await queryRunner.query(`ALTER TABLE "question_topics" DROP CONSTRAINT "FK_ba44b75aca318505ca747c5bbb5"`);
        await queryRunner.query(`ALTER TABLE "question_topics" DROP CONSTRAINT "FK_587f690ac84335ddb97e8a93eaf"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_61dd55e0d6944ee8569c719e44"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d743d0bdca9f5ca64598dbacc1"`);
        await queryRunner.query(`DROP TABLE "question_bank_topics"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eef839b973e45703e9ec41566e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_49e72a3b8e38ab571251634ace"`);
        await queryRunner.query(`DROP TABLE "assessment_topics"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ba44b75aca318505ca747c5bbb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_587f690ac84335ddb97e8a93ea"`);
        await queryRunner.query(`DROP TABLE "question_topics"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "qb_client_name_active" ON "question_bank" ("clientId", "name") WHERE ("deletedAt" IS NULL)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "topic_client_name_active" ON "topic" ("clientId", "name") WHERE ("deletedAt" IS NULL)`);
    }

}
