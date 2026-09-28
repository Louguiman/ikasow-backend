import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * How TypeORM is allowed to change the schema.
 *
 * This used to be hardcoded to `dropSchema: true, synchronize: true`, duplicated in
 * both `database.config.ts` and `app.module.ts`. That combination drops and recreates
 * every table from the entities on *every* boot, so restarting the app silently
 * deletes all data — and any row that violates a column constraint takes the process
 * down with it, because the failure happens during bootstrap.
 *
 * Schema changes are now opt-in and explicit:
 *
 *   DB_RESET=true npm run start:dev     # local wipe: drop, then rebuild from entities
 *   npm run migration:run               # the supported way to evolve a real database
 *
 * `migrationsRun` stays false in the app: `src/migrations/*` is applied by the CLI
 * (or `docker-entrypoint.sh` in a container), never implicitly at boot.
 */
export const schemaManagement = (): Pick<
  TypeOrmModuleOptions,
  'dropSchema' | 'synchronize' | 'migrationsRun'
> => {
  const reset = /^(true|1|yes)$/i.test(process.env.DB_RESET ?? '');

  return {
    dropSchema: reset,
    synchronize: reset,
    migrationsRun: false,
  };
};

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',

    // Database connection settings
    // Defaults: localhost:5432
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),

    // Authentication credentials
    // Defaults: postgres/postgres (CHANGE IN PRODUCTION)
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',

    // Database name
    // Default: 'immomali'
    database: process.env.DATABASE_NAME || 'immomali',

    // Entity and migration paths
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],

    ...schemaManagement(),

    // Enable query logging in development
    logging: process.env.NODE_ENV === 'development',
  }),
);
