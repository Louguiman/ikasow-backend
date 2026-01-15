# Property-Based Test for Cross-Agency Isolation

## Overview

A comprehensive property-based test has been created to verify cross-agency data isolation in the IKASOW backend. The test is located at:

```
ikasow-backend/src/auth/agency-isolation.spec.ts
```

## What Was Implemented

The test suite includes three property-based tests using **fast-check** library:

1. **Property 1a: Users cannot access properties from other agencies**
   - Generates random agency names and property data
   - Creates two agencies with users
   - Creates a property for agency1
   - Verifies that user from agency2 cannot access agency1's property
   - Expects HTTP 403 or 404 response

2. **Property 1b: Users cannot access tenants from other agencies**
   - Generates random agency names and tenant data
   - Creates two agencies with users and a property
   - Creates a tenant for agency1
   - Verifies that user from agency2 cannot access agency1's tenant
   - Expects HTTP 403 or 404 response

3. **Property 1c: Users cannot access clients from other agencies**
   - Generates random agency names and client data
   - Creates two agencies with users
   - Creates a client for agency1
   - Verifies that user from agency2 cannot access agency1's client
   - Expects HTTP 403 or 404 response

Each test runs 10 iterations with randomly generated data to ensure the property holds across various scenarios.

## Dependencies Installed

- **fast-check**: Property-based testing library for JavaScript/TypeScript

## Database Requirement

The tests require a PostgreSQL database to run. The test suite uses the following configuration:

- **Host**: localhost (or DB_HOST environment variable)
- **Port**: 5432 (or DB_PORT environment variable)
- **Username**: postgres (or DB_USERNAME environment variable)
- **Password**: postgres (or DB_PASSWORD environment variable)
- **Database**: ikasow_test (or DB_NAME environment variable)

## How to Run the Tests

### Option 1: Using Docker Compose (Recommended)

1. Start Docker Desktop
2. Run the PostgreSQL container:
   ```bash
   cd ikasow-backend
   docker-compose up -d postgres
   ```
3. Wait for the database to be ready (about 10-15 seconds)
4. Run the tests:
   ```bash
   npm test -- agency-isolation.spec.ts --runInBand
   ```

### Option 2: Using Local PostgreSQL

1. Install PostgreSQL on your machine
2. Create a test database:
   ```sql
   CREATE DATABASE ikasow_test;
   ```
3. Update your `.env` file or set environment variables:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=your_password
   DB_NAME=ikasow_test
   ```
4. Run the tests:
   ```bash
   npm test -- agency-isolation.spec.ts --runInBand
   ```

## Test Configuration

The tests are configured with:
- **Timeout**: 120 seconds per test (property-based tests can take longer)
- **Runs**: 10 iterations per property (can be increased to 100 for more thorough testing)
- **Database**: Automatically drops and recreates schema before tests
- **Cleanup**: Truncates all tables before each test to ensure isolation

## Expected Behavior

When the tests run successfully, you should see:
```
PASS  src/auth/agency-isolation.spec.ts
  Agency Isolation Property Tests
    ✓ Property 1: Users cannot access properties from other agencies (XXXXms)
    ✓ Property 1: Users cannot access tenants from other agencies (XXXXms)
    ✓ Property 1: Users cannot access clients from other agencies (XXXXms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

## Troubleshooting

### Database Connection Errors

If you see errors like:
```
Unable to connect to the database. Retrying...
```

**Solutions:**
1. Ensure PostgreSQL is running
2. Check database credentials in `.env` file
3. Verify the database exists
4. Check firewall settings allow connections to port 5432

### Timeout Errors

If tests timeout:
1. Increase the timeout in the test file (currently 120000ms)
2. Reduce the number of runs (currently 10)
3. Check database performance

### Module Resolution Errors

If you see errors about missing modules:
```bash
npm install
```

## Next Steps

1. **Start the database** using Docker Compose or local PostgreSQL
2. **Run the tests** to verify cross-agency isolation works correctly
3. **Review results** and fix any failing tests
4. **Increase test runs** from 10 to 100 for more comprehensive testing once tests pass

## Validation

This test validates **Requirement 2.4** from the design document:
> "WHEN reviewing cross-agency access, THEN the system SHALL ensure users cannot access data from other agencies"

The property-based approach ensures this requirement holds across a wide range of randomly generated test scenarios, providing stronger confidence than traditional example-based tests.
