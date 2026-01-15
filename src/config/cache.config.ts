import { registerAs } from '@nestjs/config';

/**
 * Cache configuration
 * Configures Redis connection and TTL settings
 */
export default registerAs('cache', () => ({
  redis: {
    // Redis server connection
    // Defaults: localhost:6379
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),

    // Redis authentication password (optional)
    // Default: undefined (no password)
    password: process.env.REDIS_PASSWORD,

    // Redis database number (0-15)
    // Default: 0
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  ttl: {
    // Cache TTL for property listings (in seconds)
    // Default: 300 (5 minutes)
    properties: parseInt(process.env.CACHE_TTL_PROPERTIES || '300', 10),

    // Cache TTL for agency data (in seconds)
    // Default: 3600 (1 hour)
    agency: parseInt(process.env.CACHE_TTL_AGENCY || '3600', 10),
  },
}));
