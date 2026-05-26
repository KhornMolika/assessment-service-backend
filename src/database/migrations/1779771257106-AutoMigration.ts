import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1779771257106 implements MigrationInterface {
    name = 'AutoMigration1779771257106'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_1988073311cf9475dc74b21fe3"`);
        await queryRunner.query(`ALTER TABLE "assessment_setting" ADD "manualGradingAIQues" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "answer_entry" DROP CONSTRAINT "FK_60ab0e2e552d666de51d09db136"`);
        await queryRunner.query(`ALTER TABLE "answer_entry" DROP CONSTRAINT "FK_4fbdc5941db95ff8e1d578fbf7d"`);
        await queryRunner.query(`ALTER TABLE "answer_entry" ALTER COLUMN "answerSheetId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "answer_entry" ALTER COLUMN "assessmentQuestionId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "participant" ALTER COLUMN "name" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "assessment" DROP CONSTRAINT "FK_0fa2b999352312c75eefbeb9cd5"`);
        await queryRunner.query(`ALTER TABLE "assessment" ALTER COLUMN "topicId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "answer_entry" ADD CONSTRAINT "FK_60ab0e2e552d666de51d09db136" FOREIGN KEY ("answerSheetId") REFERENCES "answer_sheet"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "answer_entry" ADD CONSTRAINT "FK_4fbdc5941db95ff8e1d578fbf7d" FOREIGN KEY ("assessmentQuestionId") REFERENCES "assessment_question"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assessment" ADD CONSTRAINT "FK_0fa2b999352312c75eefbeb9cd5" FOREIGN KEY ("topicId") REFERENCES "topic"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "assessment" DROP CONSTRAINT "FK_0fa2b999352312c75eefbeb9cd5"`);
        await queryRunner.query(`ALTER TABLE "answer_entry" DROP CONSTRAINT "FK_4fbdc5941db95ff8e1d578fbf7d"`);
        await queryRunner.query(`ALTER TABLE "answer_entry" DROP CONSTRAINT "FK_60ab0e2e552d666de51d09db136"`);
        await queryRunner.query(`ALTER TABLE "assessment" ALTER COLUMN "topicId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "assessment" ADD CONSTRAINT "FK_0fa2b999352312c75eefbeb9cd5" FOREIGN KEY ("topicId") REFERENCES "topic"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "participant" ALTER COLUMN "name" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "answer_entry" ALTER COLUMN "assessmentQuestionId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "answer_entry" ALTER COLUMN "answerSheetId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "answer_entry" ADD CONSTRAINT "FK_4fbdc5941db95ff8e1d578fbf7d" FOREIGN KEY ("assessmentQuestionId") REFERENCES "assessment_question"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "answer_entry" ADD CONSTRAINT "FK_60ab0e2e552d666de51d09db136" FOREIGN KEY ("answerSheetId") REFERENCES "answer_sheet"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assessment_setting" DROP COLUMN "manualGradingAIQues"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_1988073311cf9475dc74b21fe3" ON "answer_sheet" ("assessmentParticipantId") `);
    }

}
