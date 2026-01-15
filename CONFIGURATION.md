# Configuration Guide

## Overview

The IKASOW backend uses environment variables for configuration. This approach provides flexibility across different environments (development, staging, production) and keeps sensitive data secure.

## Quick Start

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your local settings:
   ```bash
   # Edit the file with your preferred editor
   nano .env
   ```

3. Start the application:
   ```bash
   npm run start:dev
   ```

## Configuration Files

### Environment Files

- **`.env.example`** - Template with all available configuration options (committed to git)
- **`.env`** - Your local configuration (NOT committed to git)
- **`.env.local`** - Optional local overrides (NOT committed to git)

### Configuration Modules

Located in `src/config/`:

- **`app.config.ts`** - General application settings
- **`database.config.ts`** - PostgreSQL database configuration
- **`jwt.config.ts`** - JWT authentication settings
- **`cache.config.ts`** - Redis cache configuration
- **`logger.config.ts`** - Winston logging configuration
- **`multer.config.ts`** - File upload configuration
- **`env.validation.ts`** - Environment variable validation schema

## Environment Variables

### Required Variables

These variables MUST be set for the application to start:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_HOST` | PostgreSQL server hostname | `localhost` |
| `DATABASE_USERNAME` | Database username | `postgres` |
| `DATABASE_PASSWORD` | Database password | `your-password` |
| `DATABASE_NAME` | Database name | `immomali` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |
| `REFRESH_TOKEN_SECRET` | Refresh token secret | `your-refresh-secret` |

### Optional Variables (with defaults)

These variables have sensible defaults and can be omitted:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | HTTP server port | `3000` |
| `DATABASE_PORT` | PostgreSQL port | `5432` |
| `JWT_EXPIRATION` | Access token lifetime | `1h` |
| `REFRESH_TOKEN_EXPIRATION` | Refresh token lifetime | `7d` |
| `UPLOAD_DIR` | File upload directory | `./uploads` |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `5242880` (5MB) |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `LOG_LEVEL` | Logging verbosity | `info` |
| `REDIS_HOST` | Redis server hostname | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `REDIS_PASSWORD` | Redis password | _(none)_ |
| `REDIS_DB` | Redis database number | `0` |
| `CACHE_TTL_PROPERTIES` | Property cache TTL (seconds) | `300` |
| `CACHE_TTL_AGENCY` | Agency cache TTL (seconds) | `3600` |

## Configuration Validation

The application validates all configuration at startup. If validation fails, you'll see a detailed error message:

```
Configuration validation failed:
JWT_SECRET: should not be empty
DATABASE_PASSWORD: should not be empty

Please check your .env file and ensure all required variables are set correctly.
```

### Validation Rules

- **Type checking**: Ensures variables have correct types (string, number, etc.)
- **Range validation**: Ensures numeric values are within acceptable ranges
- **Enum validation**: Ensures values match allowed options (e.g., NODE_ENV)
- **Required fields**: Ensures critical variables are present

## Environment-Specific Configuration

### Development

```bash
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
DATABASE_HOST=localhost
# ... other settings
```

Features:
- Detailed logging
- Database synchronization enabled
- CORS allows localhost origins
- Weak secrets acceptable

### Production

```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
DATABASE_HOST=your-production-db.example.com
# ... other settings
```

Requirements:
- Strong, random secrets (use `openssl rand -base64 32`)
- Disable database synchronization
- Restrict CORS origins
- Use environment variables (not .env files)
- Enable HTTPS
- Use secret management service

### Testing

```bash
NODE_ENV=test
DATABASE_NAME=immomali_test
LOG_LEVEL=error
# ... other settings
```

Features:
- Minimal logging
- Separate test database
- Fast execution

## Accessing Configuration

### In Services/Controllers

```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MyService {
  constructor(private configService: ConfigService) {}

  someMethod() {
    // Get a specific config value
    const port = this.configService.get<number>('app.port');
    
    // Get with default fallback
    const logLevel = this.configService.get<string>('app.logLevel', 'info');
    
    // Get entire config namespace
    const dbConfig = this.configService.get('database');
  }
}
```

### Type-Safe Access

```typescript
// Access validated configuration
const port = this.configService.get<number>('PORT');
const jwtSecret = this.configService.get<string>('JWT_SECRET');
```

## Common Issues

### Issue: "Configuration validation failed"

**Cause**: Required environment variables are missing or invalid.

**Solution**: 
1. Check the error message for specific variables
2. Ensure `.env` file exists
3. Verify all required variables are set
4. Check for typos in variable names

### Issue: "Database connection failed"

**Cause**: Database configuration is incorrect.

**Solution**:
1. Verify `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_NAME`
2. Ensure PostgreSQL is running
3. Check network connectivity
4. Verify database exists

### Issue: "JWT secret is too weak"

**Cause**: Using default/weak secrets in production.

**Solution**:
1. Generate strong secrets: `openssl rand -base64 32`
2. Update `JWT_SECRET` and `REFRESH_TOKEN_SECRET`
3. Restart the application

## Security

⚠️ **IMPORTANT**: Never commit `.env` files to version control!

See [CONFIGURATION_SECURITY.md](./CONFIGURATION_SECURITY.md) for detailed security guidelines.

### Quick Security Checklist

- [ ] `.env` is in `.gitignore`
- [ ] Strong secrets in production
- [ ] Different secrets per environment
- [ ] No hardcoded secrets in code
- [ ] Secrets not logged

## Troubleshooting

### Enable Debug Logging

```bash
LOG_LEVEL=debug npm run start:dev
```

### Verify Configuration

Add this to your service to log configuration:

```typescript
constructor(private configService: ConfigService) {
  console.log('Port:', this.configService.get('app.port'));
  console.log('Database:', this.configService.get('database.host'));
}
```

### Check Environment Variables

```bash
# Linux/Mac
printenv | grep DATABASE

# Windows
set | findstr DATABASE
```

## Additional Resources

- [NestJS Configuration Documentation](https://docs.nestjs.com/techniques/configuration)
- [class-validator Documentation](https://github.com/typestack/class-validator)
- [12-Factor App: Config](https://12factor.net/config)
- [OWASP Configuration Management](https://cheatsheetseries.owasp.org/cheatsheets/Configuration_Management_Cheat_Sheet.html)

## Support

For configuration issues or questions, please:
1. Check this documentation
2. Review error messages carefully
3. Verify `.env` file against `.env.example`
4. Contact the development team
