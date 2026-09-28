# Configuration Security Guidelines

## Overview

This document outlines security best practices for managing configuration and sensitive data in the IKASOW backend application.

## Environment Variables

### Sensitive Variables

The following environment variables contain sensitive information and MUST be kept secure:

1. **JWT_SECRET** - Used to sign access tokens
2. **REFRESH_TOKEN_SECRET** - Used to sign refresh tokens
3. **DATABASE_PASSWORD** - Database authentication password
4. **REDIS_PASSWORD** - Redis authentication password (if used)

### Security Requirements

#### Development Environment

- Use `.env` file for local development
- Never commit `.env` file to version control
- Use weak/simple values for development (e.g., "dev-secret-key")
- Keep `.env.example` updated with all required variables (without actual values)

#### Production Environment

- Use environment variables set at the system/container level
- Never use `.env` files in production
- Generate strong, random secrets:
  ```bash
  # Generate a secure random secret
  openssl rand -base64 32
  ```
- Rotate secrets regularly (at least every 90 days)
- Use different secrets for each environment (dev, staging, production)

### Secret Generation

For production environments, generate secrets using:

```bash
# JWT Secret
openssl rand -base64 32

# Refresh Token Secret (use a different value)
openssl rand -base64 32
```

## File Protection

### .gitignore Configuration

The following files/directories are excluded from version control:

```
.env
.env.local
.env.*.local
```

### Verification

To verify no sensitive files are tracked:

```bash
# Check if .env is ignored
git check-ignore .env

# Search for any .env files in git history
git log --all --full-history -- "*.env"
```

## Configuration Validation

### Startup Validation

The application validates all configuration at startup using `class-validator`. This ensures:

1. All required variables are present
2. Variables have correct types
3. Values are within acceptable ranges
4. Invalid configuration prevents application startup

### Validation Schema

See `src/config/env.validation.ts` for the complete validation schema.

## Best Practices

### DO

✅ Use environment variables for all configuration
✅ Validate configuration at startup
✅ Use strong, random secrets in production
✅ Rotate secrets regularly
✅ Use different secrets per environment
✅ Document all environment variables in `.env.example`
✅ Set appropriate default values for non-sensitive config
✅ Use secret management tools (AWS Secrets Manager, HashiCorp Vault, etc.) in production

### DON'T

❌ Commit `.env` files to version control
❌ Hardcode secrets in source code
❌ Use the same secrets across environments
❌ Share secrets via email or chat
❌ Log sensitive configuration values
❌ Expose secrets in error messages
❌ Use weak or predictable secrets in production
❌ Store secrets in plain text files on servers

## Secret Management in Production

### Recommended Approaches

1. **Container Orchestration** (Kubernetes, Docker Swarm)
   - Use Kubernetes Secrets
   - Mount secrets as environment variables or files
   - Enable encryption at rest

2. **Cloud Providers**
   - AWS: Use AWS Secrets Manager or Parameter Store
   - Azure: Use Azure Key Vault
   - GCP: Use Google Secret Manager

3. **Environment Variables**
   - Set at the system level
   - Use systemd environment files (with restricted permissions)
   - Never store in application code or config files

### Example: AWS Secrets Manager

```typescript
// Example integration (not implemented)
import { SecretsManager } from 'aws-sdk';

async function loadSecrets() {
  const secretsManager = new SecretsManager();
  const secret = await secretsManager.getSecretValue({
    SecretId: 'ikasow/production/secrets'
  }).promise();
  
  return JSON.parse(secret.SecretString);
}
```

## Audit Checklist

Use this checklist to verify configuration security:

- [ ] `.env` is in `.gitignore`
- [ ] No `.env` files committed to git history
- [ ] No hardcoded secrets in source code
- [ ] All sensitive variables documented in `.env.example` (without values)
- [ ] Strong secrets used in production
- [ ] Different secrets per environment
- [ ] Configuration validation enabled
- [ ] Secrets not logged or exposed in errors
- [ ] Production secrets stored in secure secret management system
- [ ] Regular secret rotation schedule established

## Incident Response

If a secret is compromised:

1. **Immediate Actions**
   - Rotate the compromised secret immediately
   - Update all environments with new secret
   - Revoke any active tokens/sessions if JWT secrets compromised

2. **Investigation**
   - Determine how the secret was exposed
   - Check logs for unauthorized access
   - Identify affected systems/users

3. **Prevention**
   - Fix the vulnerability that led to exposure
   - Update security procedures
   - Conduct security training if needed

## Contact

For security concerns or questions, contact the security team.

## References

- [OWASP Configuration Management](https://cheatsheetseries.owasp.org/cheatsheets/Configuration_Management_Cheat_Sheet.html)
- [12-Factor App: Config](https://12factor.net/config)
- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)
