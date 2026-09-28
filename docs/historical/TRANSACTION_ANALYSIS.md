# Database Transaction Analysis

## Multi-Step Operations Requiring Transactions

This document identifies operations that modify multiple entities and should be wrapped in database transactions to ensure data consistency.

### 1. PropertiesService

#### 1.1 `remove(id, agencyId)` - NEEDS TRANSACTION
**Current Implementation:** Multi-step operation without transaction
**Steps:**
1. Find property with images relation
2. Delete multiple image files from filesystem (loop)
3. Remove property entity (cascade removes image records)

**Risk:** If filesystem deletion fails partway through or property removal fails, we could have:
- Orphaned image records in database
- Inconsistent state between filesystem and database

**Recommendation:** Wrap in transaction to ensure atomicity

#### 1.2 `publishProperty(id, agencyId)` - NEEDS TRANSACTION
**Current Implementation:** Multi-step operation without transaction
**Steps:**
1. Find property
2. Validate property for publishing (queries images)
3. Generate unique slug (may query database)
4. Update property with new status, slug, and publishedAt
5. Invalidate cache

**Risk:** If slug generation or final save fails, property could be in inconsistent state

**Recommendation:** Wrap in transaction

#### 1.3 `deleteImage(propertyId, imageId, agencyId)` - NEEDS TRANSACTION
**Current Implementation:** Multi-step operation without transaction
**Steps:**
1. Verify property exists
2. Find image record
3. Delete file from filesystem
4. Delete image record from database

**Risk:** File could be deleted but database record remains, or vice versa

**Recommendation:** Wrap in transaction

### 2. InvoicesService

#### 2.1 `create(createInvoiceDto)` - NEEDS TRANSACTION
**Current Implementation:** Multi-step operation without transaction
**Steps:**
1. Generate unique invoice number (queries database)
2. Calculate totals from items
3. Create invoice entity
4. Create multiple invoice item entities (embedded in invoice)
5. Save invoice with items

**Risk:** If save fails after invoice number generation, the number sequence could have gaps or duplicates in concurrent scenarios

**Recommendation:** Wrap in transaction

#### 2.2 `update(id, agencyId, updateInvoiceDto)` - NEEDS TRANSACTION
**Current Implementation:** Multi-step operation without transaction
**Steps:**
1. Find invoice
2. If items are updated:
   - Delete all old invoice items
   - Create new invoice items
   - Update invoice with new totals
3. Save invoice

**Risk:** If deletion succeeds but creation fails, invoice would have no items

**Recommendation:** Wrap in transaction (especially the items update path)

### 3. ServiceRequestsService

#### 3.1 `create(createServiceRequestDto, agencyId)` - NEEDS TRANSACTION
**Current Implementation:** Multi-step operation without transaction
**Steps:**
1. Create service request entity
2. Save service request
3. Load service request with relations
4. Find all agency staff users
5. Create multiple notification entities (bulk insert)

**Risk:** If notification creation fails, service request exists but staff is not notified

**Recommendation:** Wrap in transaction to ensure notifications are created atomically with service request

### 4. AuthService

#### 4.1 `register(registerDto)` - ALREADY ATOMIC
**Current Implementation:** Single entity creation
**Steps:**
1. Check if user exists (read-only)
2. Hash password (in-memory)
3. Create and save user entity

**Risk:** Low - only one entity is created
**Recommendation:** No transaction needed (single save operation)

### 5. UsersService

#### 5.1 `create(createUserDto)` - ALREADY ATOMIC
**Current Implementation:** Single entity creation
**Steps:**
1. Check email uniqueness (read-only)
2. Hash password (in-memory)
3. Create and save user entity

**Risk:** Low - only one entity is created
**Recommendation:** No transaction needed (single save operation)

### 6. AgenciesService

#### 6.1 `create(createAgencyDto)` - ALREADY ATOMIC
**Current Implementation:** Single entity creation
**Steps:**
1. Check email uniqueness (read-only)
2. Create and save agency entity

**Risk:** Low - only one entity is created
**Recommendation:** No transaction needed (single save operation)

### 7. TenantsService

#### 7.1 All operations - ALREADY ATOMIC
**Current Implementation:** Single entity operations
**Recommendation:** No transactions needed

### 8. ClientsService

#### 8.1 All operations - ALREADY ATOMIC
**Current Implementation:** Single entity operations
**Recommendation:** No transactions needed

## Summary

### Operations Requiring Transactions (Priority Order):

1. **HIGH PRIORITY:**
   - `InvoicesService.create()` - Invoice number generation + items creation
   - `InvoicesService.update()` - Delete old items + create new items
   - `ServiceRequestsService.create()` - Service request + notifications

2. **MEDIUM PRIORITY:**
   - `PropertiesService.remove()` - Property + images + file cleanup
   - `PropertiesService.publishProperty()` - Validation + slug generation + update
   - `PropertiesService.deleteImage()` - File deletion + database record

### Operations NOT Requiring Transactions:
- Single entity CRUD operations (create, update, delete)
- Read-only operations
- Operations with only in-memory transformations

## Implementation Notes

TypeORM provides several ways to use transactions:
1. `@Transaction()` decorator with `@TransactionManager()` or `@TransactionRepository()`
2. `DataSource.transaction()` method
3. `EntityManager.transaction()` method

For this codebase, we'll use the `DataSource.transaction()` method as it's the most explicit and flexible approach.
