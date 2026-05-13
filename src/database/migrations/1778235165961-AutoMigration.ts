import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1778235165961 implements MigrationInterface {
    name = 'AutoMigration1778235165961'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_aafbb383c2622221f279daa230"`);
        await queryRunner.query(`ALTER TABLE "topics" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "topics" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "topics" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "topics" DROP COLUMN "clientId"`);
        await queryRunner.query(`ALTER TABLE "topics" ADD "is_active" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "topics" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "topics" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "topics" ADD "client_id" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "topics" DROP CONSTRAINT "UQ_97c66ab0029f49fde30517f8199"`);
        await queryRunner.query(`CREATE INDEX "IDX_a732c0bd94d23273cc8f60b870" ON "topics" ("client_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_48e284359f92e964453769efd1" ON "topics" ("slug", "client_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_48e284359f92e964453769efd1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a732c0bd94d23273cc8f60b870"`);
        await queryRunner.query(`ALTER TABLE "topics" ADD CONSTRAINT "UQ_97c66ab0029f49fde30517f8199" UNIQUE ("slug")`);
        await queryRunner.query(`ALTER TABLE "topics" DROP COLUMN "client_id"`);
        await queryRunner.query(`ALTER TABLE "topics" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "topics" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "topics" DROP COLUMN "is_active"`);
        await queryRunner.query(`ALTER TABLE "topics" ADD "clientId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "topics" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "topics" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "topics" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_aafbb383c2622221f279daa230" ON "topics" ("slug", "clientId") `);
    }

}
