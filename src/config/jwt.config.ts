import { registerAs } from '@nestjs/config';

/**
 * JWT authentication configuration
 * Configures access and refresh token settings
 */
export default registerAs('jwt', () => ({
  // Access token secret key
  // Default: 'dev-secret-key' (MUST CHANGE IN PRODUCTION)
  secret: process.env.JWT_SECRET || 'dev-secret-key',

  // Access token expiration time
  // Default: '1h' (1 hour)
  expiresIn: process.env.JWT_EXPIRATION || '1h',

  // Refresh token secret key
  // Default: 'dev-refresh-secret' (MUST CHANGE IN PRODUCTION)
  refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret',

  // Refresh token expiration time
  // Default: '7d' (7 days)
  refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRATION || '7d',
}));
