import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddImageSizesToPropertyImages1764366041352 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add thumbnail_url column
        await queryRunner.addColumn('property_images', new TableColumn({
            name: 'thumbnail_url',
            type: 'varchar',
            isNullable: true,
        }));

        // Add medium_url column
        await queryRunner.addColumn('property_images', new TableColumn({
            name: 'medium_url',
            type: 'varchar',
            isNullable: true,
        }));

        // Add large_url column
        await queryRunner.addColumn('property_images', new TableColumn({
            name: 'large_url',
            type: 'varchar',
            isNullable: true,
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove columns in reverse order
        await queryRunner.dropColumn('property_images', 'large_url');
        await queryRunner.dropColumn('property_images', 'medium_url');
        await queryRunner.dropColumn('property_images', 'thumbnail_url');
    }

}
