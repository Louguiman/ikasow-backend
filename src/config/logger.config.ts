import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import * as path from 'path';

const logDir = 'logs';

// Get log level from environment or default to 'info'
const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';

// Custom format to mask sensitive data
const maskSensitiveData = winston.format((info) => {
  const sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken', 'secret', 'apiKey'];
  
  // Recursively mask sensitive fields in the log object
  const maskObject = (obj: any): any => {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const masked = { ...obj };
    for (const key in masked) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        masked[key] = '***REDACTED***';
      } else if (typeof masked[key] === 'object') {
        masked[key] = maskObject(masked[key]);
      }
    }
    return masked;
  };

  return maskObject(info);
});

// Console format for development (human-readable)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, context, userId, agencyId, operation, trace, ...meta }) => {
    let logMessage = `${timestamp} [${context || 'Application'}] ${level}: ${message}`;
    
    // Add structured context if available
    if (userId || agencyId || operation) {
      const contextInfo = [];
      if (userId) contextInfo.push(`userId=${userId}`);
      if (agencyId) contextInfo.push(`agencyId=${agencyId}`);
      if (operation) contextInfo.push(`operation=${operation}`);
      logMessage += ` | ${contextInfo.join(', ')}`;
    }
    
    // Add additional metadata if present
    if (Object.keys(meta).length > 0) {
      logMessage += ` | ${JSON.stringify(meta)}`;
    }
    
    // Add stack trace if available
    if (trace) {
      logMessage += `\n${trace}`;
    }
    
    return logMessage;
  }),
);

// JSON format for production (machine-readable)
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  maskSensitiveData(),
  winston.format.json(),
);

// File format (always JSON for easier parsing)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  maskSensitiveData(),
  winston.format.json(),
);

export const winstonConfig: WinstonModuleOptions = {
  level: logLevel,
  transports: [
    // Console transport - format depends on environment
    new winston.transports.Console({
      format: nodeEnv === 'production' ? jsonFormat : consoleFormat,
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 14,
    }),
  ],
};
