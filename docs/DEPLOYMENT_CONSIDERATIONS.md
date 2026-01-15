# Deployment Considerations for RBAC Integration

## Overview
This document outlines important considerations, requirements, and best practices for deploying the RBAC (Role-Based Access Control) integration to production environments.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Database Considerations](#database-considerations)
4. [Security Configuration](#security-configuration)
5. [Deployment Strategy](#deployment-strategy)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Performance Optimization](#performance-optimization)
8. [Rollback Plan](#rollback-plan)
9. [Post-Deployment Verification](#post-deployment-verification)
10. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Code Review
- [ ] All RBAC tests passing (unit, integration, E2E)
- [ ] Code reviewed and approved
- [ ] No security vulnerabilities detected
- [ ] Documentation updated
- [ ] API endpoints documented
- [ ] Frontend components tested

### Database
- [ ] Database migrations tested in staging
- [ ] Backup strategy in place
- [ ] Rollback scripts prepared
- [ ] Index optimization completed
- [ ] Data integrity verified

### Configuration
- [ ] Environment variables configured
- [ ] JWT secrets generated and secured
- [ ] CORS settings configured
- [ ] Rate limiting configured
- [ ] Logging configured

### Testing
- [ ] All automated tests passing
- [ ] Manual testing completed for all roles
- [ ] Agency isolation verified
- [ ] Error handling tested
- [ ] Performance testing completed
- [ ] Security testing completed

### Documentation
- [ ] API documentation updated
- [ ] User guides created
- [ ] Deployment runbook prepared
- [ ] Rollback procedures documented
- [ ] Support team trained

---

## Environment Configuration

### Required Environment Variables

#### Backend (.env)

```bash
# Application
NODE_ENV=production
PORT=3000
API_BASE_URL=https://api.yourdomain.com

# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_USERNAME=your-db-user
DB_PASSWORD=your-secure-password
DB_DATABASE=immomali_production
DB_SSL=true

# JWT Configuration
JWT_SECRET=your-very-secure-random-secret-key-min-32-chars
JWT_EXPIRATION=1h
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_REFRESH_EXPIRATION=7d

# CORS
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
RATE_LIMIT_AUTH_MAX=5

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/immomali/app.log
LOG_ERROR_FILE_PATH=/var/log/immomali/error.log

# Redis (for caching and sessions)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_TTL=3600

# Email (for notifications)
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=noreply@yourdomain.com

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/uploads/immomali
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp,application/pdf

# Monitoring
SENTRY_DSN=your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-newrelic-key
```

#### Frontend (.env)

```bash
# API Configuration
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_API_TIMEOUT=30000

# Application
VITE_APP_NAME=Immomali Property Portal
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=production

# Features
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_TRACKING=true

# Analytics
VITE_GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X
VITE_MIXPANEL_TOKEN=your-mixpanel-token

# Error Tracking
VITE_SENTRY_DSN=your-sentry-dsn

# Maps (if using)
VITE_GOOGLE_MAPS_API_KEY=your-maps-api-key
```

### Environment-Specific Settings

#### Development
- Verbose logging
- Detailed error messages
- No rate limiting
- CORS: Allow all origins
- JWT expiration: 24h

#### Staging
- Moderate logging
- Sanitized error messages
- Relaxed rate limiting
- CORS: Staging domains only
- JWT expiration: 1h
- Mirror production configuration

#### Production
- Minimal logging (info and above)
- Generic error messages
- Strict rate limiting
- CORS: Production domains only
- JWT expiration: 1h
- All security features enabled

---

## Database Considerations

### Schema Changes

No schema changes are required for the RBAC integration. The existing schema already supports:
- User roles (UserRole enum)
- Agency relationships (agencyId foreign keys)
- Proper indexes on agencyId columns

### Existing Indexes

Verify these indexes exist:
```sql
-- Users table
CREATE INDEX idx_users_agency_id ON users(agency_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- Properties table
CREATE INDEX idx_properties_agency_id ON properties(agency_id);
CREATE INDEX idx_properties_status ON properties(status);

-- Clients table
CREATE INDEX idx_clients_agency_id ON clients(agency_id);

-- Invoices table
CREATE INDEX idx_invoices_agency_id ON invoices(agency_id);
CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);

-- Tenants table
CREATE INDEX idx_tenants_agency_id ON tenants(agency_id);
CREATE INDEX idx_tenants_property_id ON tenants(property_id);
```

### Database Backup

**Before Deployment:**
```bash
# Create full database backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_DATABASE -F c -f backup_pre_rbac_$(date +%Y%m%d_%H%M%S).dump

# Verify backup
pg_restore --list backup_pre_rbac_*.dump
```

**Backup Strategy:**
- Full backup before deployment
- Incremental backups every hour
- Transaction logs backed up continuously
- Backups stored in multiple locations
- Retention: 30 days

### Database Performance

**Query Optimization:**
- All agency-scoped queries use indexes
- Pagination implemented on all list endpoints
- Eager loading for related entities
- Query result caching where appropriate

**Connection Pooling:**
```typescript
// TypeORM configuration
{
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: process.env.DB_SSL === 'true',
  extra: {
    max: 20, // Maximum pool size
    min: 5,  // Minimum pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
}
```

---

## Security Configuration

### JWT Token Security

**Token Generation:**
```typescript
// Use strong, random secrets (minimum 32 characters)
JWT_SECRET=<generate with: openssl rand -base64 32>
JWT_REFRESH_SECRET=<generate with: openssl rand -base64 32>

// Short expiration for access tokens
JWT_EXPIRATION=1h

// Longer expiration for refresh tokens
JWT_REFRESH_EXPIRATION=7d
```

**Token Storage:**
- Backend: Never log tokens
- Frontend: Store in localStorage (current) or httpOnly cookies (recommended)
- Transmission: Always use HTTPS

**Token Validation:**
- Verify signature on every request
- Check expiration
- Validate user still exists and is active
- Verify role hasn't changed

### CORS Configuration

```typescript
// Strict CORS in production
app.enableCors({
  origin: process.env.CORS_ORIGIN.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit'],
  maxAge: 3600,
});
```

### Rate Limiting

```typescript
// Global rate limiting
@UseGuards(ThrottlerGuard)
@Throttle(100, 60) // 100 requests per minute

// Auth endpoints (stricter)
@Throttle(5, 60) // 5 requests per minute

// Public endpoints
@Throttle(20, 60) // 20 requests per minute
```

### HTTPS/SSL

**Requirements:**
- All production traffic must use HTTPS
- Redirect HTTP to HTTPS
- Use TLS 1.2 or higher
- Valid SSL certificate (not self-signed)

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Security Headers

```typescript
// Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

### Input Validation

- All inputs validated using class-validator
- SQL injection prevention via TypeORM parameterized queries
- XSS prevention via sanitization
- File upload validation (type, size)

---

## Deployment Strategy

### Recommended Approach: Blue-Green Deployment

**Advantages:**
- Zero downtime
- Easy rollback
- Test in production environment
- Gradual traffic shift

**Steps:**

1. **Prepare Green Environment**
   ```bash
   # Deploy new version to green environment
   git clone <repo> /var/www/immomali-green
   cd /var/www/immomali-green
   npm install
   npm run build
   ```

2. **Run Tests in Green**
   ```bash
   # Run smoke tests
   npm run test:e2e
   
   # Verify health endpoint
   curl https://green.api.yourdomain.com/health
   ```

3. **Switch Traffic**
   ```bash
   # Update load balancer to point to green
   # Or update nginx configuration
   sudo systemctl reload nginx
   ```

4. **Monitor**
   - Watch error rates
   - Monitor response times
   - Check logs for issues
   - Verify all roles working

5. **Rollback if Needed**
   ```bash
   # Switch back to blue
   sudo systemctl reload nginx
   ```

### Alternative: Rolling Deployment

**For Kubernetes/Container Environments:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: immomali-backend
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: backend
        image: immomali/backend:v1.1.0
        # ... container config
```

### Deployment Checklist

**Pre-Deployment:**
- [ ] Backup database
- [ ] Tag release in git
- [ ] Build and test artifacts
- [ ] Prepare rollback plan
- [ ] Notify team of deployment

**During Deployment:**
- [ ] Deploy backend first
- [ ] Verify backend health
- [ ] Deploy frontend
- [ ] Verify frontend health
- [ ] Run smoke tests

**Post-Deployment:**
- [ ] Monitor error rates
- [ ] Check logs
- [ ] Verify all roles
- [ ] Test critical paths
- [ ] Update documentation

---

## Monitoring and Logging

### Application Monitoring

**Metrics to Monitor:**
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- CPU usage
- Memory usage
- Database connections
- Cache hit rate

**Tools:**
- New Relic / DataDog for APM
- Prometheus + Grafana for metrics
- Sentry for error tracking
- CloudWatch / Stackdriver for infrastructure

### Logging Strategy

**Log Levels:**
- ERROR: Application errors, exceptions
- WARN: Authorization failures, rate limit hits
- INFO: Request logs, important events
- DEBUG: Detailed debugging (dev only)

**What to Log:**

```typescript
// Authorization failures
logger.warn('Authorization failure', {
  userId: user.id,
  role: user.role,
  endpoint: request.url,
  method: request.method,
  statusCode: 403,
  timestamp: new Date().toISOString(),
});

// Cross-agency operations (platform admin)
logger.info('Cross-agency operation', {
  userId: user.id,
  role: 'platform-admin',
  action: 'UPDATE_PROPERTY',
  resourceId: property.id,
  resourceAgency: property.agencyId,
  userAgency: user.agencyId,
  timestamp: new Date().toISOString(),
});

// Authentication events
logger.info('User login', {
  userId: user.id,
  role: user.role,
  agencyId: user.agencyId,
  ip: request.ip,
  timestamp: new Date().toISOString(),
});
```

**Log Aggregation:**
- Use ELK Stack (Elasticsearch, Logstash, Kibana)
- Or Splunk, Datadog, CloudWatch Logs
- Centralize logs from all servers
- Set up alerts for critical errors

### Alerts

**Critical Alerts:**
- Error rate > 5%
- Response time > 2 seconds (p95)
- Database connection failures
- Authentication service down
- Disk space > 80%

**Warning Alerts:**
- Error rate > 1%
- Response time > 1 second (p95)
- High memory usage (> 80%)
- High CPU usage (> 80%)
- Unusual authorization failure rate

**Alert Channels:**
- PagerDuty for critical alerts
- Slack for warnings
- Email for daily summaries

---

## Performance Optimization

### Backend Optimization

**Caching Strategy:**
```typescript
// Cache user permissions
@Cacheable('user-permissions', 3600) // 1 hour
async getUserPermissions(userId: string) {
  // ...
}

// Cache agency data
@Cacheable('agency-data', 7200) // 2 hours
async getAgencyById(agencyId: string) {
  // ...
}

// Cache public properties
@Cacheable('public-properties', 300) // 5 minutes
async getPublicProperties() {
  // ...
}
```

**Database Query Optimization:**
- Use indexes on agencyId columns
- Implement pagination (limit/offset)
- Use eager loading for relations
- Avoid N+1 queries
- Use database query caching

**API Response Optimization:**
- Compress responses (gzip)
- Use ETags for caching
- Implement conditional requests
- Paginate large result sets
- Use field selection (sparse fieldsets)

### Frontend Optimization

**Code Splitting:**
```typescript
// Lazy load routes
const Properties = lazy(() => import('./pages/Properties'));
const Clients = lazy(() => import('./pages/Clients'));
const Invoices = lazy(() => import('./pages/Invoices'));
```

**API Caching:**
```typescript
// RTK Query caching
export const propertiesApi = createApi({
  reducerPath: 'propertiesApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Property'],
  endpoints: (builder) => ({
    getProperties: builder.query({
      query: () => '/properties',
      providesTags: ['Property'],
      keepUnusedDataFor: 300, // 5 minutes
    }),
  }),
});
```

**Asset Optimization:**
- Minify JavaScript and CSS
- Optimize images (WebP format)
- Use CDN for static assets
- Implement lazy loading for images
- Use service workers for offline support

### Load Testing

**Before Production:**
```bash
# Use Apache Bench
ab -n 1000 -c 10 https://api.yourdomain.com/properties

# Use k6
k6 run load-test.js

# Use Artillery
artillery run load-test.yml
```

**Target Metrics:**
- Handle 100 requests/second
- Response time < 500ms (p95)
- Error rate < 0.1%
- Support 1000 concurrent users

---

## Rollback Plan

### When to Rollback

- Critical bugs affecting core functionality
- Security vulnerabilities discovered
- Performance degradation > 50%
- Error rate > 5%
- Data integrity issues

### Rollback Procedure

**1. Immediate Rollback (< 5 minutes)**
```bash
# Switch load balancer back to previous version
# Or update nginx to point to blue environment
sudo systemctl reload nginx

# Verify old version is serving traffic
curl https://api.yourdomain.com/health
```

**2. Database Rollback (if needed)**
```bash
# Only if database changes were made
# Restore from backup
pg_restore -h $DB_HOST -U $DB_USER -d $DB_DATABASE backup_pre_rbac_*.dump

# Verify data integrity
psql -h $DB_HOST -U $DB_USER -d $DB_DATABASE -c "SELECT COUNT(*) FROM users;"
```

**3. Verify Rollback**
- Check health endpoints
- Test critical user flows
- Verify all roles working
- Monitor error rates
- Check logs for issues

**4. Post-Rollback**
- Notify team of rollback
- Document issues encountered
- Create tickets for fixes
- Plan next deployment

### Rollback Testing

**Test rollback procedure in staging:**
```bash
# Deploy new version
./deploy.sh staging

# Verify deployment
./verify.sh staging

# Perform rollback
./rollback.sh staging

# Verify rollback
./verify.sh staging
```

---

## Post-Deployment Verification

### Smoke Tests

**Backend Health Check:**
```bash
# Health endpoint
curl https://api.yourdomain.com/health
# Expected: { "status": "ok", "version": "1.1.0" }

# Auth endpoint
curl -X POST https://api.yourdomain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
# Expected: { "access_token": "...", "user": {...} }

# Protected endpoint
curl https://api.yourdomain.com/properties \
  -H "Authorization: Bearer <token>"
# Expected: { "data": [...], "total": 10 }
```

**Frontend Health Check:**
```bash
# Homepage loads
curl https://yourdomain.com
# Expected: 200 OK

# Login page loads
curl https://yourdomain.com/auth
# Expected: 200 OK

# API calls work
# Open browser console and check for errors
```

### Role-Based Testing

**Test Each Role:**

1. **Platform Admin**
   - [ ] Can log in
   - [ ] Can view all agencies
   - [ ] Can switch between agencies
   - [ ] Can create agency
   - [ ] Can access all features

2. **Admin**
   - [ ] Can log in
   - [ ] Can view agency data
   - [ ] Cannot see other agencies
   - [ ] Can create users
   - [ ] Can access all agency features

3. **Agent**
   - [ ] Can log in
   - [ ] Can view properties
   - [ ] Can create properties
   - [ ] Cannot access billing
   - [ ] Cannot access users

4. **Accountant**
   - [ ] Can log in
   - [ ] Can view invoices
   - [ ] Can create invoices
   - [ ] Cannot edit properties
   - [ ] Cannot access clients

5. **Tenant**
   - [ ] Can log in
   - [ ] Can view own invoices
   - [ ] Can submit service requests
   - [ ] Cannot access management features

6. **Client**
   - [ ] Can log in
   - [ ] Can browse properties
   - [ ] Can save favorites
   - [ ] Cannot access management features

### Performance Verification

```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.yourdomain.com/properties

# Monitor error rates
# Check monitoring dashboard (New Relic, DataDog, etc.)

# Check database performance
# Run EXPLAIN ANALYZE on key queries
```

### Security Verification

```bash
# Verify HTTPS
curl -I https://api.yourdomain.com
# Expected: Strict-Transport-Security header present

# Verify CORS
curl -H "Origin: https://malicious.com" https://api.yourdomain.com/properties
# Expected: CORS error

# Verify rate limiting
for i in {1..10}; do curl https://api.yourdomain.com/auth/login; done
# Expected: 429 Too Many Requests after 5 attempts

# Verify JWT validation
curl https://api.yourdomain.com/properties \
  -H "Authorization: Bearer invalid-token"
# Expected: 401 Unauthorized
```

---

## Troubleshooting

### Common Issues

#### Issue: Users getting 403 errors unexpectedly

**Symptoms:**
- Users report "You don't have permission" errors
- Errors occur on pages they should have access to

**Diagnosis:**
```bash
# Check user role in database
psql -c "SELECT id, email, role, agency_id FROM users WHERE email='user@example.com';"

# Check logs for authorization failures
grep "Authorization failure" /var/log/immomali/app.log | tail -20

# Verify guards are applied correctly
# Check controller decorators
```

**Solutions:**
- Verify user has correct role
- Check if @Roles decorator is correct
- Verify guards are applied in correct order
- Clear user's session and have them log in again

#### Issue: Agency isolation not working

**Symptoms:**
- Users seeing data from other agencies
- Cross-agency access not being blocked

**Diagnosis:**
```bash
# Check if AgencyScopeGuard is applied
# Review controller decorators

# Check database queries
# Enable query logging in TypeORM
# Verify WHERE agencyId = :agencyId is present

# Check user's agencyId in JWT
# Decode JWT token and verify agencyId claim
```

**Solutions:**
- Ensure AgencyScopeGuard is applied at controller level
- Verify all service methods filter by agencyId
- Check JWT token contains correct agencyId
- Clear cache if using caching

#### Issue: JWT tokens expiring too quickly

**Symptoms:**
- Users getting logged out frequently
- "Session expired" messages appearing often

**Diagnosis:**
```bash
# Check JWT_EXPIRATION setting
echo $JWT_EXPIRATION

# Check token expiration in logs
# Decode JWT and check exp claim
```

**Solutions:**
- Increase JWT_EXPIRATION (e.g., from 15m to 1h)
- Implement refresh token mechanism
- Add "Remember Me" functionality
- Warn users before token expires

#### Issue: Performance degradation

**Symptoms:**
- Slow response times
- Timeouts
- High CPU/memory usage

**Diagnosis:**
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.yourdomain.com/properties

# Check database queries
# Enable slow query log
# Look for N+1 queries

# Check server resources
top
htop
free -m
df -h
```

**Solutions:**
- Add database indexes on agencyId columns
- Implement caching for frequently accessed data
- Optimize database queries (use eager loading)
- Scale horizontally (add more servers)
- Increase server resources

#### Issue: CORS errors in frontend

**Symptoms:**
- API calls failing with CORS errors
- Console shows "Access-Control-Allow-Origin" errors

**Diagnosis:**
```bash
# Check CORS configuration
echo $CORS_ORIGIN

# Test CORS headers
curl -H "Origin: https://yourdomain.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  https://api.yourdomain.com/properties
```

**Solutions:**
- Add frontend domain to CORS_ORIGIN
- Verify CORS credentials setting
- Check if preflight requests are handled
- Ensure HTTPS is used (not HTTP)

---

## Support and Escalation

### Support Tiers

**Tier 1: User Support**
- Handle user questions
- Reset passwords
- Explain features
- Escalate technical issues

**Tier 2: Technical Support**
- Investigate technical issues
- Check logs and monitoring
- Perform basic troubleshooting
- Escalate complex issues

**Tier 3: Engineering**
- Debug code issues
- Fix bugs
- Deploy hotfixes
- Perform database operations

### Escalation Criteria

**Escalate to Tier 2:**
- User reports permission errors
- User cannot log in
- Features not working as expected

**Escalate to Tier 3:**
- System-wide outage
- Data integrity issues
- Security vulnerabilities
- Performance degradation > 50%

### Contact Information

**Support Email:** support@immomali.com  
**Engineering On-Call:** oncall@immomali.com  
**Emergency Hotline:** +1 (555) 123-4567

---

## Conclusion

Successful deployment of the RBAC integration requires careful planning, thorough testing, and continuous monitoring. Follow this guide to ensure a smooth deployment and quick resolution of any issues that arise.

### Key Takeaways

1. **Test thoroughly** before deploying to production
2. **Backup everything** before making changes
3. **Deploy incrementally** using blue-green or rolling deployment
4. **Monitor closely** after deployment
5. **Have a rollback plan** ready
6. **Document everything** for future reference

### Next Steps

After successful deployment:
1. Monitor system for 24-48 hours
2. Gather user feedback
3. Address any issues promptly
4. Update documentation based on learnings
5. Plan next iteration of improvements

---

**Document Version:** 1.0  
**Last Updated:** November 28, 2025  
**Maintained By:** Engineering Team
