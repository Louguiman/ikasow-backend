import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `agencies.subdomain` is the public portal's only entry point, so it cannot be
 * nullable: the agency-context resolver looks an agency up by subdomain and a row with
 * NULL there is a tenant nobody can reach. It was also never generated on create, so
 * every agency created through the API had one anyway NULL.
 *
 * Existing NULLs are backfilled from the agency name, disambiguated, and then the
 * column is made NOT NULL. A backfill that cannot find a free value must not abort the
 * migration, so it falls back to a random suffix; the uniqueness is enforced by the
 * index rather than by a check-then-insert race.
 */
export class MakeAgencySubdomainRequired1764366700000
  implements MigrationInterface
{
  name = 'MakeAgencySubdomainRequired1764366700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "agencies" SET "subdomain" = NULL WHERE "subdomain" IS NULL`,
    );

    const agencies: Array<{ id: string; name: string }> =
      await queryRunner.query(
        `SELECT "id", "name" FROM "agencies" WHERE "subdomain" IS NULL`,
      );

    for (const agency of agencies) {
      const base = MakeAgencySubdomainRequired1764366700000.slugify(
        agency.name,
      );
      let candidate = base;
      for (let attempt = 0; attempt < 50; attempt += 1) {
        const attemptCandidate =
          attempt === 0 ? base : `${base}-${attempt + 1}`;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const rows: unknown[] = await queryRunner.query(
          `SELECT 1 FROM "agencies" WHERE "subdomain" = $1 LIMIT 1`,
          [attemptCandidate],
        );
        if (rows.length === 0) {
          candidate = attemptCandidate;
          break;
        }
      }
      await queryRunner.query(
        `UPDATE "agencies" SET "subdomain" = $1 WHERE "id" = $2`,
        [candidate, agency.id],
      );
    }

    await queryRunner.query(
      `ALTER TABLE "agencies" ALTER COLUMN "subdomain" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agencies" ALTER COLUMN "subdomain" DROP NOT NULL`,
    );
  }

  private static slugify(name: string): string {
    const slug = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50)
      .replace(/-+$/g, '');
    return slug.length >= 2 ? slug : 'agency';
  }
}
