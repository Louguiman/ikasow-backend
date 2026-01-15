# RBAC API Endpoints Documentation

## Overview
This document provides a comprehensive reference for all API endpoints in the system, including required roles, authentication requirements, and agency scope enforcement.

## Authentication
All endpoints (except those marked as Public) require a valid JWT token in the Authorization header:
```
Authorization: Bearer <jwt-token>
```

## Role Hierarchy
- **platform-admin**: Full system access, can access all agencies
- **admin**: Full access within their agency
- **agent**: Property, client, and lead management within their agency
- **accountant**: Financial management within their agency
- **tenant**: Limited access to own data
- **client**: Limited access to own data and public properties

---

## Properties Endpoints

### List Properties
```
GET /properties
```
**Required Roles:** `admin`, `agent`, `accountant`  
**Agency Scope:** Yes (filtered by user's agency)  
**Platform Admin:** Can view all agencies' properties

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `status` (string): Filter by status
- `type` (string): Filter by property type
- `city` (string): Filter by city

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "string",
      "type": "apartment|house|commercial",
      "status": "available|rented|sold",
      "price": "number",
      "city": "string",
      "agencyId": "uuid",
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
  ],
  "total": "number",
  "page": "number",
  "limit": "number"
}
```

### Get Property by ID
```
GET /properties/:id
```
**Required Roles:** `admin`, `agent`, `accountant`  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can view any property

**Response:**
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "type": "apartment|house|commercial",
  "status": "available|rented|sold",
  "price": "number",
  "city": "string",
  "address": "string",
  "agencyId": "uuid",
  "images": [
    {
      "id": "uuid",
      "url": "string",
      "isPrimary": "boolean"
    }
  ],
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### Create Property
```
POST /properties
```
**Required Roles:** `admin`, `agent`  
**Agency Scope:** Yes (automatically set to user's agency)  
**Platform Admin:** Can create in any agency

**Request Body:**
```json
{
  "title": "string (required)",
  "description": "string",
  "type": "apartment|house|commercial (required)",
  "status": "available|rented|sold",
  "price": "number (required)",
  "city": "string (required)",
  "address": "string",
  "bedrooms": "number",
  "bathrooms": "number",
  "area": "number"
}
```

**Note:** `agencyId` is automatically set from JWT token and cannot be specified.

### Update Property
```
PUT /properties/:id
```
**Required Roles:** `admin`, `agent`  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can update any property

**Request Body:** Same as Create Property (all fields optional)

### Delete Property
```
DELETE /properties/:id
```
**Required Roles:** `admin`, `agent`  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can delete any property

### Publish/Unpublish Property
```
PATCH /properties/:id/publish
PATCH /properties/:id/unpublish
```
**Required Roles:** `admin`, `agent`  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can publish/unpublish any property

---

## Clients Endpoints

### List Clients
```
GET /clients
```
**Required Roles:** `admin`, `agent`  
**Agency Scope:** Yes (filtered by user's agency)  
**Platform Admin:** Can view all agencies' clients

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `status` (string): Filter by status

### Get Client by ID
```
GET /clients/:id
```
**Required Roles:** `admin`, `agent`, `client` (own record only)  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can view any client

### Create Client
```
POST /clients
```
**Required Roles:** `admin`, `agent`  
**Agency Scope:** Yes (automatically set to user's agency)  
**Platform Admin:** Can create in any agency

**Request Body:**
```json
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "email": "string (required)",
  "phone": "string",
  "preferredPropertyType": ["apartment", "house"],
  "preferredLocation": ["string"],
  "budgetMin": "number",
  "budgetMax": "number"
}
```

### Update Client
```
PUT /clients/:id
```
**Required Roles:** `admin`, `agent`  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can update any client

### Delete Client
```
DELETE /clients/:id
```
**Required Roles:** `admin`, `agent`  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can delete any client

### Match Properties to Client
```
POST /clients/:id/match-properties
```
**Required Roles:** `admin`, `agent`  
**Agency Scope:** Yes (matches properties within user's agency)  
**Platform Admin:** Can match across agencies

**Request Body:**
```json
{
  "type": "apartment|house|commercial",
  "city": "string",
  "price": "number"
}
```

---

## Invoices Endpoints

### List Invoices
```
GET /invoices
```
**Required Roles:** `admin`, `accountant`, `tenant` (own invoices only), `client` (own invoices only)  
**Agency Scope:** Yes (filtered by user's agency)  
**Platform Admin:** Can view all agencies' invoices

### Get Invoice by ID
```
GET /invoices/:id
```
**Required Roles:** `admin`, `accountant`, `tenant` (own only), `client` (own only)  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can view any invoice

### Create Invoice
```
POST /invoices
```
**Required Roles:** `admin`, `accountant`  
**Agency Scope:** Yes (automatically set to user's agency)  
**Platform Admin:** Can create in any agency

**Request Body:**
```json
{
  "tenantId": "uuid (required)",
  "propertyId": "uuid (required)",
  "amount": "number (required)",
  "dueDate": "date (required)",
  "description": "string",
  "items": [
    {
      "description": "string",
      "amount": "number"
    }
  ]
}
```

### Update Invoice
```
PUT /invoices/:id
```
**Required Roles:** `admin`, `accountant`  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can update any invoice

### Delete Invoice
```
DELETE /invoices/:id
```
**Required Roles:** `admin`, `accountant`  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can delete any invoice

---

## Users Endpoints

### List Users
```
GET /users
```
**Required Roles:** `admin`, `platform-admin`  
**Agency Scope:** Yes (filtered by user's agency)  
**Platform Admin:** Can view all agencies' users

### Get User by ID
```
GET /users/:id
```
**Required Roles:** `admin`, `platform-admin`  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can view any user

### Get Own Profile
```
GET /users/profile
```
**Required Roles:** All authenticated users  
**Agency Scope:** No (returns own profile)

### Create User
```
POST /users
```
**Required Roles:** `admin`, `platform-admin`  
**Agency Scope:** Yes (automatically set to admin's agency)  
**Platform Admin:** Can create in any agency

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)",
  "firstName": "string (required)",
  "lastName": "string (required)",
  "role": "admin|agent|accountant|tenant|client (required)",
  "phone": "string",
  "agencyId": "uuid (platform-admin only)"
}
```

### Update User
```
PUT /users/:id
```
**Required Roles:** `admin`, `platform-admin`  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can update any user

### Update Own Profile
```
PUT /users/profile
```
**Required Roles:** All authenticated users  
**Agency Scope:** No (updates own profile)

### Delete User
```
DELETE /users/:id
```
**Required Roles:** `admin`, `platform-admin`  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can delete any user

---

## Agencies Endpoints

### List Agencies
```
GET /agencies
```
**Required Roles:** `platform-admin`  
**Agency Scope:** No (returns all agencies)

### Get Agency by ID
```
GET /agencies/:id
```
**Required Roles:** `platform-admin`  
**Agency Scope:** No

### Create Agency
```
POST /agencies
```
**Required Roles:** `platform-admin`  
**Agency Scope:** No

**Request Body:**
```json
{
  "name": "string (required)",
  "email": "string (required)",
  "phone": "string",
  "address": "string",
  "city": "string",
  "country": "string"
}
```

### Update Agency
```
PUT /agencies/:id
```
**Required Roles:** `platform-admin`  
**Agency Scope:** No

### Delete Agency
```
DELETE /agencies/:id
```
**Required Roles:** `platform-admin`  
**Agency Scope:** No

---

## Tenants Endpoints

### List Tenants
```
GET /tenants
```
**Required Roles:** `admin`, `agent`, `accountant`  
**Agency Scope:** Yes (filtered by user's agency)  
**Platform Admin:** Can view all agencies' tenants

### Get Tenant by ID
```
GET /tenants/:id
```
**Required Roles:** `admin`, `agent`, `accountant`, `tenant` (own record only)  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can view any tenant

### Create Tenant
```
POST /tenants
```
**Required Roles:** `admin`, `agent`  
**Agency Scope:** Yes (automatically set to user's agency)  
**Platform Admin:** Can create in any agency

**Request Body:**
```json
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "email": "string (required)",
  "phone": "string",
  "propertyId": "uuid (required)",
  "leaseStartDate": "date (required)",
  "leaseEndDate": "date (required)",
  "rentAmount": "number (required)"
}
```

### Update Tenant
```
PUT /tenants/:id
```
**Required Roles:** `admin`, `agent`  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can update any tenant

### Delete Tenant
```
DELETE /tenants/:id
```
**Required Roles:** `admin`, `agent`  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can delete any tenant

### Get Tenant Payment History
```
GET /tenants/:id/payments
```
**Required Roles:** `admin`, `accountant`, `tenant` (own only)  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can view any tenant's payments

---

## Leads Endpoints

### List Leads
```
GET /leads
```
**Required Roles:** `admin`, `agent`  
**Agency Scope:** Yes (filtered by user's agency)  
**Platform Admin:** Can view all agencies' leads

### Get Lead by ID
```
GET /leads/:id
```
**Required Roles:** `admin`, `agent`  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can view any lead

### Create Lead
```
POST /leads
```
**Required Roles:** `admin`, `agent`  
**Agency Scope:** Yes (automatically set to user's agency)  
**Platform Admin:** Can create in any agency

### Update Lead
```
PUT /leads/:id
```
**Required Roles:** `admin`, `agent`  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can update any lead

### Convert Lead to Client
```
POST /leads/:id/convert
```
**Required Roles:** `admin`, `agent`  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can convert any lead

---

## Service Requests Endpoints

### List Service Requests
```
GET /service-requests
```
**Required Roles:** `admin`, `agent`, `tenant` (own requests only)  
**Agency Scope:** Yes (filtered by user's agency)  
**Platform Admin:** Can view all agencies' requests

### Get Service Request by ID
```
GET /service-requests/:id
```
**Required Roles:** `admin`, `agent`, `tenant` (own only)  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can view any request

### Create Service Request
```
POST /service-requests
```
**Required Roles:** `admin`, `agent`, `tenant`  
**Agency Scope:** Yes (automatically set to user's agency)  
**Platform Admin:** Can create in any agency

**Request Body:**
```json
{
  "propertyId": "uuid (required)",
  "tenantId": "uuid (required)",
  "title": "string (required)",
  "description": "string (required)",
  "priority": "low|medium|high|urgent",
  "category": "maintenance|repair|complaint|other"
}
```

### Update Service Request
```
PUT /service-requests/:id
```
**Required Roles:** `admin`, `agent`  
**Agency Scope:** Yes (must belong to user's agency)  
**Platform Admin:** Can update any request

---

## Public Endpoints

### List Public Properties
```
GET /public/properties
```
**Required Roles:** None (Public)  
**Agency Scope:** No (returns all published properties)

**Query Parameters:**
- `page`, `limit`, `city`, `type`, `minPrice`, `maxPrice`

### Get Public Property Details
```
GET /public/properties/:slug
```
**Required Roles:** None (Public)  
**Agency Scope:** No

### Submit Lead
```
POST /public/leads
```
**Required Roles:** None (Public)  
**Agency Scope:** No (lead assigned to property's agency)

**Request Body:**
```json
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "email": "string (required)",
  "phone": "string",
  "message": "string",
  "propertyId": "uuid"
}
```

### Get Public Agency Info
```
GET /public/agencies/:id
```
**Required Roles:** None (Public)  
**Agency Scope:** No

---

## Authentication Endpoints

### Login
```
POST /auth/login
```
**Required Roles:** None (Public)

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response:**
```json
{
  "access_token": "string",
  "user": {
    "id": "uuid",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "string",
    "agencyId": "uuid"
  }
}
```

### Register
```
POST /auth/register
```
**Required Roles:** None (Public)

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)",
  "firstName": "string (required)",
  "lastName": "string (required)",
  "agencyId": "uuid (required)"
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**Causes:**
- Missing JWT token
- Invalid JWT token
- Expired JWT token

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

**Causes:**
- User lacks required role
- User attempting to access another agency's data
- User attempting cross-agency operation

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

**Causes:**
- Resource doesn't exist
- Resource exists but belongs to different agency

---

## Rate Limiting

All endpoints are subject to rate limiting:
- **Authentication endpoints:** 5 requests per minute
- **Read endpoints:** 100 requests per minute
- **Write endpoints:** 30 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1638360000
```

---

## Pagination

List endpoints support pagination:
- Default page size: 20
- Maximum page size: 100
- Page numbers start at 1

Response format:
```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

---

## Filtering and Sorting

Most list endpoints support filtering and sorting:

**Filtering:**
```
GET /properties?city=New York&type=apartment&status=available
```

**Sorting:**
```
GET /properties?sortBy=price&sortOrder=asc
```

---

## Best Practices

1. **Always include JWT token** in Authorization header for protected endpoints
2. **Handle 401 errors** by redirecting to login
3. **Handle 403 errors** by showing appropriate error message
4. **Respect rate limits** to avoid being throttled
5. **Use pagination** for large datasets
6. **Cache responses** where appropriate
7. **Validate input** before sending requests
8. **Handle network errors** gracefully

---

## Support

For API support, contact: api-support@immomali.com
