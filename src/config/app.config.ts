import { registerAs } from '@nestjs/config';

/**
 * Application configuration
 * Provides general application settings with sensible defaults
 */
export default registerAs('app', () => ({
  // Application environment (development, production, test)
  // Default: 'development'
  nodeEnv: process.env.NODE_ENV || 'development',

  // HTTP server port
  // Default: 3000
  port: parseInt(process.env.PORT || '3000', 10),

  // CORS allowed origin(s)
  // Can be a single origin or comma-separated list
  // Default: 'http://localhost:5173'
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : ['http://localhost:5173'],

  // CORS allowed methods
  // Default: 'GET,HEAD,PUT,PATCH,POST,DELETE'
  corsMethods: process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE',

  // CORS allowed headers
  // Default: 'Content-Type,Accept,Authorization'
  corsHeaders:
    process.env.CORS_HEADERS || 'Content-Type,Accept,Authorization',

  // Directory for uploaded files
  // Default: './uploads'
  uploadDir: process.env.UPLOAD_DIR || './uploads',

  // Maximum file size in bytes
  // Default: 5242880 (5MB)
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),

  // Logging level
  // Default: 'info'
  logLevel: process.env.LOG_LEVEL || 'info',
}));
