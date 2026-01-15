# Database Migrations

This directory contains TypeORM migrations for the IMMOMALI backend database schema.

## Prerequisites

- PostgreSQL 15+ running locally or via Docker
- Database connection configured in `.env` file

## Running Migrations

### Start PostgreSQL (if using Docker)

```bash
docker compose up -d postgres
```

### Run Migrations

To apply all pending migrations:

```bash
npm run migration:run
```

### Revert Migrations

To revert the last migration:

```bash
npm run migration:revert
```

### Generate New Migration

After modifying entities, generate a new migration:

```bash
npm run migration:generate -- src/migrations/MigrationName
```

## Initial Schema Migration

The `InitialSchema` migration creates all the core tables:

- **users** - User accounts with roles (admin, agent, accountant, tenant, client)
- **properties** - Property listings with details and SEO metadata
- **property_images** - Images associated with properties
- **tenants** - Tenant profiles with lease information
- **clients** - Client profiles with property preferences
- **invoices** - Billing invoices for tenants and clients
- **invoice_items** - Line items for invoices
- **service_requests** - Maintenance requests from tenants
- **mandates** - Property sale/rental mandates
- **payments** - Rent and service payments
- **activities** - Client interaction tracking
- **notifications** - System notifications for users

## Database Schema

All tables include:
- UUID primary keys
- Timestamps (created_at, updated_at where applicable)
- Appropriate indexes for performance
- Foreign key constraints with cascade rules

## Verification

After running migrations, verify the schema:

```bash
# Connect to PostgreSQL
psql -U postgres -d immomali

# List all tables
\dt

# Describe a specific table
\d users
```
