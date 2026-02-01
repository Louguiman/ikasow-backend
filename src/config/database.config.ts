import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Database configuration
 * Configures PostgreSQL connection with TypeORM
 */
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
    // migrations: [__dirname + '/../migrations/*{.ts,.js}'],

    // Auto-sync schema in development only (DANGEROUS in production)
    // synchronize: process.env.NODE_ENV === 'development',
    synchronize: true,
    dropSchema: true,

    // Enable query logging in development
    logging: process.env.NODE_ENV === 'development',

    // Don't auto-run migrations (use CLI instead)
    migrationsRun: false,
  }),
);
