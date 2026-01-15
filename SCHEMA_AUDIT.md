# Database Schema Audit Report

## Task 4.1: Entity Relationships Audit

### Summary
This document audits all entity relationships, foreign key constraints, indexes, cascade options, unique constraints, and nullable settings.

---

## Relationship Analysis

### 1. Property Entity
**Relationships:**
- `OneToMany` → PropertyImage (images)
  - ✅ Has cascade: true
  - ✅ PropertyImage has proper @ManyToOne back reference
  - ✅ PropertyImage has onDelete: 'CASCADE'

**Foreign Keys:**
- `agencyId` (string) - References Agency
  - ✅ Has @Index()
  - ❌ Missing @ManyToOne relationship to Agency entity
  - ❌ Missing foreign key constraint

**Issues:**
1. agencyId should have a @ManyToOne relationship to Agency
2. Missing foreign key constraint for agencyId

---

### 2. PropertyImage Entity
**Relationships:**
- `ManyToOne` → Property
  - ✅ Has @JoinColumn
  - ✅ Has onDelete: 'CASCADE'
  - ✅ Has propertyId column indexed (via foreign key)

**Issues:**
- ❌ Missing @Index() on propertyId column

---

### 3. Tenant Entity
**Relationships:**
- `ManyToOne` → User (nullable: true)
  - ✅ Has @JoinColumn
  - ✅ Has @Index() on userId
  - ❌ Missing onDelete option (should be SET NULL or RESTRICT)
  
- `ManyToOne` → Property
  - ✅ Has @JoinColumn
  - ✅ Has @Index() on propertyId
  - ❌ Missing onDelete option (should be RESTRICT or CASCADE)

**Foreign Keys:**
- `agencyId` (string) - References Agency
  - ✅ Has @Index()
  - ❌ Missing @ManyToOne relationship to Agency entity
  - ❌ Missing foreign key constraint

**Issues:**
1. Missing cascade options on relationships
2. agencyId should have a @ManyToOne relationship to Agency
3. Missing composite index on (agencyId, propertyId) for common queries

---

### 4. Client Entity
**Relationships:**
- `ManyToOne` → User (nullable: true)
  - ✅ Has @JoinColumn
  - ✅ Has @Index() on userId
  - ❌ Missing onDelete option (should be SET NULL or RESTRICT)

**Foreign Keys:**
- `agencyId` (string) - References Agency
  - ✅ Has @Index()
  - ❌ Missing @ManyToOne relationship to Agency entity
  - ❌ Missing foreign key constraint

**Issues:**
1. Missing cascade option on User relationship
2. agencyId should have a @ManyToOne relationship to Agency
3. Missing composite index on (agencyId, email) for uniqueness within agency

---

### 5. User Entity
**Relationships:**
- None defined (but referenced by many entities)

**Foreign Keys:**
- `agencyId` (string, nullable) - References Agency
  - ✅ Has @Index()
  - ❌ Missing @ManyToOne relationship to Agency entity
  - ❌ Missing foreign key constraint

**Issues:**
1. agencyId should have a @ManyToOne relationship to Agency
2. Missing onDelete option (should be RESTRICT to prevent orphaned users)

---

### 6. Agency Entity
**Relationships:**
- None defined (but referenced by many entities)
- ❌ Should have @OneToMany relationships to:
  - Users
  - Properties
  - Tenants
  - Clients

**Issues:**
1. Missing reverse relationships for better query capabilities
2. No cascade delete strategy defined (should be documented)

---

### 7. Invoice Entity
**Relationships:**
- `ManyToOne` → Tenant (nullable: true)
  - ✅ Has @JoinColumn
  - ✅ Has @Index() on tenantId
  - ❌ Missing onDelete option (should be SET NULL or RESTRICT)
  
- `ManyToOne` → Client (nullable: true)
  - ✅ Has @JoinColumn
  - ✅ Has @Index() on clientId
  - ❌ Missing onDelete option (should be SET NULL or RESTRICT)
  
- `OneToMany` → InvoiceItem
  - ✅ Has cascade: true
  - ✅ InvoiceItem has onDelete: 'CASCADE'

**Issues:**
1. Missing cascade options on Tenant and Client relationships
2. Missing agencyId for proper scoping
3. Missing composite index on (status, dueDate) for overdue queries

---

### 8. InvoiceItem Entity
**Relationships:**
- `ManyToOne` → Invoice
  - ✅ Has @JoinColumn
  - ✅ Has onDelete: 'CASCADE'
  - ❌ Missing @Index() on invoiceId

**Issues:**
1. Missing index on invoiceId

---

### 9. ServiceRequest Entity
**Relationships:**
- `ManyToOne` → Tenant
  - ✅ Has @JoinColumn
  - ✅ Has @Index() on tenantId
  - ❌ Missing onDelete option (should be CASCADE or RESTRICT)
  
- `ManyToOne` → Property
  - ✅ Has @JoinColumn
  - ✅ Has @Index() on propertyId
  - ❌ Missing onDelete option (should be RESTRICT)

**Issues:**
1. Missing cascade options on relationships
2. Missing agencyId for proper scoping (should get from property/tenant)
3. Missing composite index on (status, priority) for filtering
4. Missing index on completedAt for reporting

---

### 10. Notification Entity
**Relationships:**
- `ManyToOne` → User
  - ✅ Has @JoinColumn
  - ✅ Has @Index() on userId
  - ❌ Missing onDelete option (should be CASCADE)

**Issues:**
1. Missing cascade option on User relationship
2. Missing composite index on (userId, isRead) for filtering unread notifications
3. Missing index on createdAt for sorting

---

### 11. Lead Entity
**Relationships:**
- `ManyToOne` → Property
  - ✅ Has @JoinColumn
  - ✅ Has @Index() on propertyId
  - ❌ Missing onDelete option (should be SET NULL or RESTRICT)

**Foreign Keys:**
- `agencyId` (string) - References Agency
  - ✅ Has @Index()
  - ❌ Missing @ManyToOne relationship to Agency entity
  - ❌ Missing foreign key constraint
  
- `convertedToClientId` (string, nullable) - References Client
  - ❌ Missing @Index()
  - ❌ Missing @ManyToOne relationship to Client entity
  - ❌ Missing foreign key constraint

**Issues:**
1. Missing cascade option on Property relationship
2. Missing relationships for agencyId and convertedToClientId
3. Missing composite index on (agencyId, createdAt) for agency lead queries
4. Missing composite index on (propertyId, createdAt) for property lead queries

---

### 12. Activity Entity
**Relationships:**
- `ManyToOne` → Client
  - ✅ Has @JoinColumn
  - ✅ Has @Index() on clientId
  - ❌ Missing onDelete option (should be CASCADE)
  
- `ManyToOne` → Property (nullable: true)
  - ✅ Has @JoinColumn
  - ❌ Missing @Index() on propertyId
  - ❌ Missing onDelete option (should be SET NULL)
  
- `ManyToOne` → User
  - ✅ Has @JoinColumn
  - ❌ Missing @Index() on userId
  - ❌ Missing onDelete option (should be RESTRICT)

**Issues:**
1. Missing cascade options on all relationships
2. Missing indexes on propertyId and userId
3. Missing composite index on (clientId, date) for activity timeline
4. Missing agencyId for proper scoping

---

### 13. Mandate Entity
**Relationships:**
- `ManyToOne` → Property
  - ✅ Has @JoinColumn
  - ✅ Has @Index() on propertyId
  - ❌ Missing onDelete option (should be CASCADE or RESTRICT)

**Issues:**
1. Missing cascade option on Property relationship
2. Missing agencyId for proper scoping
3. Missing composite index on (status, endDate) for expiring mandate queries

---

### 14. Payment Entity
**Relationships:**
- `ManyToOne` → Tenant
  - ✅ Has @JoinColumn
  - ✅ Has @Index() on tenantId
  - ❌ Missing onDelete option (should be RESTRICT)

**Issues:**
1. Missing cascade option on Tenant relationship
2. Missing agencyId for proper scoping
3. Missing composite index on (tenantId, paymentDate) for payment history

---

## Summary of Critical Issues

### Missing Foreign Key Relationships (High Priority)
1. Property.agencyId → Agency
2. Tenant.agencyId → Agency
3. Client.agencyId → Agency
4. User.agencyId → Agency
5. Lead.agencyId → Agency
6. Lead.convertedToClientId → Client
7. Invoice - missing agencyId entirely
8. ServiceRequest - missing agencyId entirely
9. Activity - missing agencyId entirely
10. Mandate - missing agencyId entirely
11. Payment - missing agencyId entirely

### Missing Cascade Options (High Priority)
All @ManyToOne relationships are missing onDelete options, which should be defined based on business logic.

### Missing Indexes (Medium Priority)
1. PropertyImage.propertyId
2. InvoiceItem.invoiceId
3. Activity.propertyId
4. Activity.userId
5. Lead.convertedToClientId
6. Notification.createdAt
7. ServiceRequest.completedAt

### Missing Composite Indexes (Medium Priority)
1. Tenant: (agencyId, propertyId)
2. Client: (agencyId, email) - for uniqueness
3. Invoice: (status, dueDate)
4. ServiceRequest: (status, priority)
5. Notification: (userId, isRead)
6. Lead: (agencyId, createdAt)
7. Lead: (propertyId, createdAt)
8. Activity: (clientId, date)
9. Mandate: (status, endDate)
10. Payment: (tenantId, paymentDate)

### Missing Unique Constraints (Low Priority)
1. Client.email should be unique within agency (composite unique)
2. Invoice.invoiceNumber already has unique constraint ✅

### Nullable Settings Review (Low Priority)
Most nullable settings appear correct, but should verify:
1. User.agencyId - nullable: true (correct for platform admins)
2. Tenant.userId - nullable: true (correct for non-portal tenants)
3. Client.userId - nullable: true (correct for non-portal clients)

---

## Recommended Cascade Strategies

### CASCADE (Delete child when parent is deleted)
- PropertyImage → Property
- InvoiceItem → Invoice
- Notification → User
- Activity → Client
- Payment → Tenant (debatable, might want RESTRICT)
- ServiceRequest → Tenant (debatable)

### SET NULL (Set to null when parent is deleted)
- Tenant.userId → User
- Client.userId → User
- Invoice.tenantId → Tenant
- Invoice.clientId → Client
- Lead.propertyId → Property
- Lead.convertedToClientId → Client
- Activity.propertyId → Property

### RESTRICT (Prevent deletion if children exist)
- Tenant.propertyId → Property
- ServiceRequest.propertyId → Property
- User.agencyId → Agency
- Property.agencyId → Agency
- Tenant.agencyId → Agency
- Client.agencyId → Agency
- Activity.userId → User
- Mandate.propertyId → Property

