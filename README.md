# IMMOMALI Backend API

RESTful API service for the IMMOMALI real estate agency management platform built with NestJS and TypeScript.

## Features

- 🏢 Property management with image uploads
- 👥 Tenant and client relationship management
- 💰 Billing and invoice generation
- 🔧 Service request tracking
- 📊 Financial reporting
- 🔐 JWT authentication with role-based access control
- 📝 Comprehensive API documentation with Swagger
- 🗄️ PostgreSQL database with TypeORM
- 📋 Structured logging with Winston
- 🛡️ Security middleware (Helmet, CORS)

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+

## Installation

```bash
npm install
```

## Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Update the `.env` file with your configuration:
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=immomali
JWT_SECRET=your-secret-key
```

## Database Setup

1. Create the PostgreSQL database:
```bash
createdb immomali
```

2. Run migrations:
```bash
npm run migration:run
```

## Running the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000/api`

## API Documentation

Once the application is running, access the Swagger documentation at:
```
http://localhost:3000/api/docs
```

## Database Migrations

```bash
# Generate a new migration based on entity changes
npm run migration:generate -- src/migrations/MigrationName

# Create an empty migration file
npm run migration:create -- src/migrations/MigrationName

# Run pending migrations
npm run migration:run

# Revert the last migration
npm run migration:revert
```

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Project Structure

```
src/
├── config/              # Configuration files
├── common/              # Shared utilities, filters, guards
├── auth/                # Authentication module
├── users/               # User management
├── properties/          # Property management
├── tenants/             # Tenant management
├── clients/             # Client management
├── invoices/            # Invoice management
├── service-requests/    # Service request management
├── mandates/            # Mandate management
├── payments/            # Payment management
├── activities/          # Activity tracking
├── notifications/       # Notification management
├── reports/             # Financial reports
├── uploads/             # File upload handling
└── migrations/          # Database migrations
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment (development/production) | development |
| PORT | Server port | 3000 |
| DATABASE_HOST | PostgreSQL host | localhost |
| DATABASE_PORT | PostgreSQL port | 5432 |
| DATABASE_USERNAME | Database username | postgres |
| DATABASE_PASSWORD | Database password | postgres |
| DATABASE_NAME | Database name | immomali |
| JWT_SECRET | JWT secret key | - |
| JWT_EXPIRATION | JWT token expiration | 1h |
| CORS_ORIGIN | Allowed CORS origin | http://localhost:5173 |
| UPLOAD_DIR | File upload directory | ./uploads |
| MAX_FILE_SIZE | Max file size in bytes | 5242880 (5MB) |

## License

UNLICENSED
