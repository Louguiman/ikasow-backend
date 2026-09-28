/**
 * Runs before the e2e spec itself is loaded, so `AppModule`'s import-time
 * ConfigModule validation and `schemaManagement()` see these values rather than
 * whatever `.env` holds. Maps the `DB_*` convention of the DB-backed unit specs
 * onto the `DATABASE_*` names the app validates at boot, and forces the schema
 * onto the throwaway test database.
 */
process.env.DATABASE_HOST = process.env.DB_HOST || 'localhost';
process.env.DATABASE_PORT = process.env.DB_PORT || '5432';
process.env.DATABASE_USERNAME = process.env.DB_USERNAME || 'postgres';
process.env.DATABASE_PASSWORD = process.env.DB_PASSWORD || 'postgres';
process.env.DATABASE_NAME = process.env.DB_NAME || 'ikasow_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-test-jwt-secret';
process.env.REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || 'smoke-test-refresh-secret';
process.env.DB_RESET = process.env.DB_RESET || 'true';

// The e2e boots the whole app, which also wires Redis. Point it at the same
// compose stack as the DB specs (56379) instead of the host default 6379,
// which belongs to somebody else's server on a shared host.
process.env.REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT || '56379';
process.env.REDIS_DB = process.env.REDIS_DB || '9';