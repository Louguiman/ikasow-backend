import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

/**
 * Environment variable validation schema
 * Ensures all required configuration is present and valid at startup
 */
export class EnvironmentVariables {
  // Application Configuration
  @IsEnum(['development', 'production', 'test'])
  @IsOptional()
  NODE_ENV: string = 'development';

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  // Database Configuration
  @IsString()
  @IsNotEmpty()
  DATABASE_HOST: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  DATABASE_PORT: number = 5432;

  @IsString()
  @IsNotEmpty()
  DATABASE_USERNAME: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_NAME: string;

  // JWT Configuration
  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRATION: string = '1h';

  @IsString()
  @IsNotEmpty()
  REFRESH_TOKEN_SECRET: string;

  @IsString()
  @IsOptional()
  REFRESH_TOKEN_EXPIRATION: string = '7d';

  // File Upload Configuration
  @IsString()
  @IsOptional()
  UPLOAD_DIR: string = './uploads';

  @IsInt()
  @Min(1)
  @IsOptional()
  MAX_FILE_SIZE: number = 5242880; // 5MB

  // CORS Configuration
  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = 'http://localhost:5173';

  // Logging Configuration
  @IsEnum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
  @IsOptional()
  LOG_LEVEL: string = 'info';

  // Redis Cache Configuration
  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsInt()
  @Min(0)
  @Max(15)
  @IsOptional()
  REDIS_DB: number = 0;

  // Cache TTL Configuration
  @IsInt()
  @Min(0)
  @IsOptional()
  CACHE_TTL_PROPERTIES: number = 300;

  @IsInt()
  @Min(0)
  @IsOptional()
  CACHE_TTL_AGENCY: number = 3600;
}

/**
 * Validates environment variables at application startup
 * Throws an error if validation fails
 */
export function validate(config: Record<string, unknown>) {
  // Convert string values to appropriate types
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => {
        const constraints = error.constraints
          ? Object.values(error.constraints).join(', ')
          : 'Unknown error';
        return `${error.property}: ${constraints}`;
      })
      .join('\n');

    throw new Error(
      `Configuration validation failed:\n${errorMessages}\n\nPlease check your .env file and ensure all required variables are set correctly.`,
    );
  }

  return validatedConfig;
}
