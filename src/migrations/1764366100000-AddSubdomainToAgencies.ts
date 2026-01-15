import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSubdomainToAgencies1764366100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add subdomain column to agencies table
    await queryRunner.addColumn(
      'agencies',
      new TableColumn({
        name: 'subdomain',
        type: 'varchar',
        isNullable: true,
        isUnique: true,
      }),
    );

    // Create index on subdomain for faster lookups
    await queryRunner.query(
      `CREATE INDEX "IDX_agencies_subdomain" ON "agencies" ("subdomain")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX "IDX_agencies_subdomain"`);

    // Drop subdomain column
    await queryRunner.dropColumn('agencies', 'subdomain');
  }
}
