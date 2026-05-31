import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1780227274214 implements MigrationInterface {
    name = 'AutoMigration1780227274214'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "client" ADD "isActive" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "client" DROP COLUMN "isActive"`);
    }

}
