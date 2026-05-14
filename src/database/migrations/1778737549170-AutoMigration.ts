import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1778737549170 implements MigrationInterface {
    name = 'AutoMigration1778737549170'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."question_bank_visibility_enum" AS ENUM('PRIVATE', 'PUBLIC')`);
        await queryRunner.query(`CREATE TABLE "question_bank" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "clientId" uuid NOT NULL, "name" character varying(256) NOT NULL, "description" text, "tags" text array, "visibility" "public"."question_bank_visibility_enum" NOT NULL DEFAULT 'PRIVATE', CONSTRAINT "PK_ddf9cd18bcda25d31e7ef21b519" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_df5ece6f12d072f11a1e24048b" ON "question_bank" ("clientId") `);
        await queryRunner.query(`CREATE TABLE "participant" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "clientId" uuid NOT NULL, "assessmentId" character varying NOT NULL, "email" character varying, "phone" character varying, "name" character varying, CONSTRAINT "PK_64da4237f502041781ca15d4c41" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_dae9fc44421d72a99bdb3e064b" ON "participant" ("clientId") `);
        await queryRunner.query(`CREATE TABLE "answer_sheet" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "clientId" uuid NOT NULL, "participantId" character varying NOT NULL, "assessmentId" character varying NOT NULL, "totalScore" double precision, "maxScore" double precision, "grade" character varying, "isPassed" boolean NOT NULL DEFAULT false, "startedAt" TIMESTAMP, "submittedAt" TIMESTAMP, "shareToken" character varying, CONSTRAINT "PK_ef5379f5ea02fbf44ca7049fbd2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_129f6628585f83169f832a7e32" ON "answer_sheet" ("clientId") `);
        await queryRunner.query(`CREATE INDEX "IDX_991d3852d17ad56159e23d77b8" ON "answer_sheet" ("participantId") `);
        await queryRunner.query(`CREATE INDEX "IDX_87ade9b5414347879f983acd98" ON "answer_sheet" ("assessmentId") `);
        await queryRunner.query(`CREATE TYPE "public"."answer_entry_gradingstatus_enum" AS ENUM('AUTOMATIC', 'PENDING', 'AI_EVALUATED', 'MANUAL_REVISED')`);
        await queryRunner.query(`CREATE TABLE "answer_entry" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "sheetId" character varying NOT NULL, "assessmentId" character varying NOT NULL, "participantId" character varying NOT NULL, "questionId" character varying NOT NULL, "questionSnapshot" jsonb NOT NULL, "response" jsonb NOT NULL, "isCorrect" boolean NOT NULL DEFAULT false, "scoreAwarded" double precision, "gradingStatus" "public"."answer_entry_gradingstatus_enum" NOT NULL DEFAULT 'PENDING', CONSTRAINT "PK_cd45b5af889a089ef8ecb12a5b9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_400ca13073871e012dbe863f87" ON "answer_entry" ("sheetId") `);
        await queryRunner.query(`CREATE TABLE "refresh_token" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "clientId" uuid NOT NULL, "tokenHash" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "isRevoked" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_b575dd3c21fb0831013c909e7fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f6f07caa0ec6df39d56b0aa9f6" ON "refresh_token" ("clientId") `);
        await queryRunner.query(`CREATE TABLE "client" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "name" character varying NOT NULL, "slug" character varying NOT NULL, "clientId" character varying NOT NULL, "clientSecretHash" character varying NOT NULL, "allowedOrigins" text array, "scopes" text array, "webhookUrl" character varying, "webhookSecret" character varying, CONSTRAINT "UQ_3ce23f3709983d19bc42758b01e" UNIQUE ("slug"), CONSTRAINT "UQ_6ed9067942d7537ce359e172ff6" UNIQUE ("clientId"), CONSTRAINT "PK_96da49381769303a6515a8785c7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."assessment_status_enum" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED')`);
        await queryRunner.query(`CREATE TABLE "assessment" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "clientId" uuid NOT NULL, "name" character varying NOT NULL, "description" text, "status" "public"."assessment_status_enum" NOT NULL DEFAULT 'DRAFT', CONSTRAINT "PK_c511a7dc128256876b6b1719401" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_324b65b0282ce85363a485d85d" ON "assessment" ("clientId") `);
        await queryRunner.query(`CREATE TYPE "public"."assessment_settings_mode_enum" AS ENUM('SELF_PACED', 'REAL_TIME')`);
        await queryRunner.query(`CREATE TYPE "public"."assessment_settings_questionselection_enum" AS ENUM('MANUAL', 'DYNAMIC_FROM_BANK')`);
        await queryRunner.query(`CREATE TYPE "public"."assessment_settings_showresults_enum" AS ENUM('IMMEDIATE', 'MANUAL', 'HIDDEN')`);
        await queryRunner.query(`CREATE TYPE "public"."assessment_settings_participantidentity_enum" AS ENUM('INTERNAL', 'EXTERNAL', 'ANONYMOUS')`);
        await queryRunner.query(`CREATE TABLE "assessment_settings" ("assessmentId" uuid NOT NULL, "mode" "public"."assessment_settings_mode_enum" NOT NULL, "questionSelection" "public"."assessment_settings_questionselection_enum" NOT NULL, "numQuestions" integer NOT NULL, "selectionRules" jsonb, "timeLimit" integer, "startsAt" TIMESTAMP, "endsAt" TIMESTAMP, "passMark" integer, "isShuffle" boolean NOT NULL DEFAULT false, "showResults" "public"."assessment_settings_showresults_enum", "gradeLabels" jsonb, "isAllowShare" boolean NOT NULL DEFAULT false, "participantIdentity" "public"."assessment_settings_participantidentity_enum" NOT NULL, CONSTRAINT "PK_5a4c69e383a874a86e06a22d644" PRIMARY KEY ("assessmentId"))`);
        await queryRunner.query(`CREATE TYPE "public"."ai_grading_job_status_enum" AS ENUM('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "ai_grading_job" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "entryId" character varying NOT NULL, "configId" character varying NOT NULL, "status" "public"."ai_grading_job_status_enum" NOT NULL DEFAULT 'QUEUED', "modelUsed" character varying, "score" double precision, "confidence" integer, "feedback" text, "errorMessage" text, "attemptCount" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_0ab9a8b84e749d0194c0176df4e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "assessments_questions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "assessmentId" character varying NOT NULL, "questionId" character varying NOT NULL, "order" integer NOT NULL, "pointsOverride" double precision, "snapshot" jsonb, CONSTRAINT "PK_e0ad116d6e77090468e8d4e01db" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9bcbb2969351865e871683a3ea" ON "assessments_questions" ("assessmentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_84ec98ae3acee25a4f52015dd8" ON "assessments_questions" ("questionId") `);
        await queryRunner.query(`CREATE TABLE "ai_grading_config" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "questionId" character varying NOT NULL, "rubric" jsonb NOT NULL, "instruction" text NOT NULL, "maxScore" double precision NOT NULL, CONSTRAINT "PK_965339fd6c2bf29b05578124a12" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "topic" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "clientId" uuid NOT NULL, "name" character varying(256) NOT NULL, "slug" character varying(320) NOT NULL, "description" text, CONSTRAINT "PK_33aa4ecb4e4f20aa0157ea7ef61" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2004c8b383b5feb891073e40d1" ON "topic" ("clientId") `);
        await queryRunner.query(`CREATE TABLE "question_topic" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "clientId" character varying NOT NULL, "questionId" character varying NOT NULL, "topicId" character varying NOT NULL, CONSTRAINT "PK_39d305cac1df890f9724157e2e4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9c919dc6b987984a41daaeb5bc" ON "question_topic" ("clientId", "topicId") `);
        await queryRunner.query(`CREATE INDEX "IDX_c73f89d531a4454b441e95df27" ON "question_topic" ("clientId", "questionId") `);
        await queryRunner.query(`CREATE TABLE "bank_topic" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "clientId" character varying NOT NULL, "questionBankId" character varying NOT NULL, "topicId" character varying NOT NULL, CONSTRAINT "PK_36bd39126880697e80eb007055c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "assessment_topic" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "clientId" character varying NOT NULL, "assessmentId" character varying NOT NULL, "topicId" character varying NOT NULL, CONSTRAINT "PK_b869f1f61818237c05191cb449d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."question_type_gradingstrategy_enum" AS ENUM('BINARY', 'DEDUCTIVE', 'SCALED', 'AI')`);
        await queryRunner.query(`CREATE TABLE "question_type" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "name" character varying(50) NOT NULL, "gradingStrategy" "public"."question_type_gradingstrategy_enum" NOT NULL, "hasOptions" boolean NOT NULL DEFAULT false, "supportsAi" boolean NOT NULL DEFAULT false, "isManualOnly" boolean NOT NULL DEFAULT false, "defaultMaxScore" integer NOT NULL DEFAULT '5', "description" text, CONSTRAINT "PK_8ee0ca6ea5ac1770d54b7ff5ca4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."question_difficulty_enum" AS ENUM('EASY', 'MEDIUM', 'HARD')`);
        await queryRunner.query(`CREATE TABLE "question" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "clientId" uuid NOT NULL, "bankId" uuid NOT NULL, "typeId" uuid NOT NULL, "questionText" text NOT NULL, "difficulty" "public"."question_difficulty_enum" NOT NULL, "points" integer NOT NULL, "tags" text array, "settings" jsonb NOT NULL, "correctAnswer" jsonb NOT NULL, CONSTRAINT "PK_21e5786aa0ea704ae185a79b2d5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_87df6afba485965b2d3cab7c6f" ON "question" ("clientId") `);
        await queryRunner.query(`CREATE INDEX "IDX_c9b4b589cca37fb5cec55ebfa1" ON "question" ("bankId") `);
        await queryRunner.query(`CREATE INDEX "IDX_546db112b1fe3b00cb5f863ba1" ON "question" ("typeId") `);
        await queryRunner.query(`ALTER TABLE "refresh_token" ADD CONSTRAINT "FK_f6f07caa0ec6df39d56b0aa9f62" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "question" ADD CONSTRAINT "FK_546db112b1fe3b00cb5f863ba19" FOREIGN KEY ("typeId") REFERENCES "question_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "question" ADD CONSTRAINT "FK_c9b4b589cca37fb5cec55ebfa11" FOREIGN KEY ("bankId") REFERENCES "question_bank"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "question" DROP CONSTRAINT "FK_c9b4b589cca37fb5cec55ebfa11"`);
        await queryRunner.query(`ALTER TABLE "question" DROP CONSTRAINT "FK_546db112b1fe3b00cb5f863ba19"`);
        await queryRunner.query(`ALTER TABLE "refresh_token" DROP CONSTRAINT "FK_f6f07caa0ec6df39d56b0aa9f62"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_546db112b1fe3b00cb5f863ba1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c9b4b589cca37fb5cec55ebfa1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_87df6afba485965b2d3cab7c6f"`);
        await queryRunner.query(`DROP TABLE "question"`);
        await queryRunner.query(`DROP TYPE "public"."question_difficulty_enum"`);
        await queryRunner.query(`DROP TABLE "question_type"`);
        await queryRunner.query(`DROP TYPE "public"."question_type_gradingstrategy_enum"`);
        await queryRunner.query(`DROP TABLE "assessment_topic"`);
        await queryRunner.query(`DROP TABLE "bank_topic"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c73f89d531a4454b441e95df27"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9c919dc6b987984a41daaeb5bc"`);
        await queryRunner.query(`DROP TABLE "question_topic"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2004c8b383b5feb891073e40d1"`);
        await queryRunner.query(`DROP TABLE "topic"`);
        await queryRunner.query(`DROP TABLE "ai_grading_config"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_84ec98ae3acee25a4f52015dd8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9bcbb2969351865e871683a3ea"`);
        await queryRunner.query(`DROP TABLE "assessments_questions"`);
        await queryRunner.query(`DROP TABLE "ai_grading_job"`);
        await queryRunner.query(`DROP TYPE "public"."ai_grading_job_status_enum"`);
        await queryRunner.query(`DROP TABLE "assessment_settings"`);
        await queryRunner.query(`DROP TYPE "public"."assessment_settings_participantidentity_enum"`);
        await queryRunner.query(`DROP TYPE "public"."assessment_settings_showresults_enum"`);
        await queryRunner.query(`DROP TYPE "public"."assessment_settings_questionselection_enum"`);
        await queryRunner.query(`DROP TYPE "public"."assessment_settings_mode_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_324b65b0282ce85363a485d85d"`);
        await queryRunner.query(`DROP TABLE "assessment"`);
        await queryRunner.query(`DROP TYPE "public"."assessment_status_enum"`);
        await queryRunner.query(`DROP TABLE "client"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f6f07caa0ec6df39d56b0aa9f6"`);
        await queryRunner.query(`DROP TABLE "refresh_token"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_400ca13073871e012dbe863f87"`);
        await queryRunner.query(`DROP TABLE "answer_entry"`);
        await queryRunner.query(`DROP TYPE "public"."answer_entry_gradingstatus_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_87ade9b5414347879f983acd98"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_991d3852d17ad56159e23d77b8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_129f6628585f83169f832a7e32"`);
        await queryRunner.query(`DROP TABLE "answer_sheet"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dae9fc44421d72a99bdb3e064b"`);
        await queryRunner.query(`DROP TABLE "participant"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_df5ece6f12d072f11a1e24048b"`);
        await queryRunner.query(`DROP TABLE "question_bank"`);
        await queryRunner.query(`DROP TYPE "public"."question_bank_visibility_enum"`);
    }

}
