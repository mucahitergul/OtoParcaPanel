import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupplierTagsToProduct1693564800000 implements MigrationInterface {
  name = 'AddSupplierTagsToProduct1693564800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product" ADD "supplier_tags" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product" DROP COLUMN "supplier_tags"`,
    );
  }
}