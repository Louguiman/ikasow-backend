# Complex Methods Analysis

This document identifies methods with high cyclomatic complexity (>10) that need refactoring.

## Analysis Date
November 28, 2025

## Methodology
Manual code review analyzing:
- Number of conditional branches (if/else, switch, ternary)
- Number of loops
- Number of logical operators (&&, ||)
- Method length and readability

## Complex Methods Identified

### 1. PropertiesService.findAll()
**File**: `src/properties/properties.service.ts`
**Estimated Complexity**: ~12
**Issues**:
- Multiple conditional branches for filters (city, type, minPrice, maxPrice)
- Query builder construction with multiple conditions
- Agency scoping logic

**Recommendation**: Extract filter application logic into separate methods

---

### 2. PropertiesService.update()
**File**: `src/properties/properties.service.ts`
**Estimated Complexity**: ~11
**Issues**:
- Multiple conditional checks for SEO fields
- Complex logic for generating default SEO values
- Cache invalidation logic
- Agency scoping

**Recommendation**: Extract SEO handling into separate method

---

### 3. PropertiesService.publishProperty()
**File**: `src/properties/properties.service.ts`
**Estimated Complexity**: ~13
**Issues**:
- Multiple validation checks for required fields
- String trimming and validation logic
- Image count validation
- Slug generation
- Status updates
- Cache invalidation

**Recommendation**: Extract validation logic into separate validation method

---

### 4. ClientsService.matchProperties()
**File**: `src/clients/clients.service.ts`
**Estimated Complexity**: ~15
**Issues**:
- Complex nested logic for calculating match scores
- Multiple conditional checks for type, location, and budget
- Array operations and filtering
- Case-insensitive string matching
- Percentage calculation

**Recommendation**: Extract match score calculation into separate method per criterion

---

### 5. InvoicesService.findAll()
**File**: `src/invoices/invoices.service.ts`
**Estimated Complexity**: ~11
**Issues**:
- Query builder with multiple conditional filters
- Complex WHERE clause with tenant/client agency filtering
- Multiple optional parameters

**Recommendation**: Extract query building logic into separate methods

---

### 6. InvoicesService.update()
**File**: `src/invoices/invoices.service.ts`
**Estimated Complexity**: ~14
**Issues**:
- Multiple conditional branches for items vs tax updates
- Complex recalculation logic
- Item deletion and recreation
- Multiple validation checks

**Recommendation**: Extract calculation logic and item management into separate methods

---

### 7. TenantsService.calculateNextPaymentDueDate()
**File**: `src/tenants/tenants.service.ts`
**Estimated Complexity**: ~10
**Issues**:
- Switch statement with multiple cases
- Loop with date manipulation
- Different logic per payment frequency

**Recommendation**: Extract frequency-specific logic into separate methods or use strategy pattern

---

## Code Duplication Identified

### 1. Agency Scoping Pattern
**Locations**:
- PropertiesService.findOne()
- PropertiesService.update()
- PropertiesService.remove()
- ClientsService.findOne()
- ClientsService.update()
- ClientsService.remove()
- TenantsService.findOne()
- TenantsService.update()
- TenantsService.remove()

**Pattern**:
```typescript
const where: any = { id };
if (agencyId) {
  where.agencyId = agencyId;
}
const entity = await this.repository.findOne({ where });
if (!entity) {
  throw new NotFoundException(`Entity not found`);
}
```

**Recommendation**: Create a protected method in BaseService for agency-scoped entity retrieval

---

### 2. Pagination Logic
**Locations**:
- PropertiesService.findAll()
- ClientsService.findAll()
- TenantsService.findAll()
- InvoicesService.findAll()
- ServiceRequestsService.findAll()

**Pattern**:
```typescript
const effectiveLimit = Math.min(limit, 100);
const skip = (page - 1) * effectiveLimit;
```

**Recommendation**: Already handled by PaginatedResponse, but could be extracted to a utility function

---

### 3. Password Hashing
**Locations**:
- AuthService.register()
- UsersService.create()

**Pattern**:
```typescript
const hashedPassword = await bcrypt.hash(password, 10);
```

**Recommendation**: Extract to a utility function or service method

---

### 4. User Without Password Pattern
**Locations**:
- AuthService.register()
- AuthService.login()
- UsersService.create()
- UsersService.findOne()
- UsersService.update()
- UsersService.findAll()

**Pattern**:
```typescript
const { password: _, ...userWithoutPassword } = user;
return userWithoutPassword;
```

**Recommendation**: Create a utility method or use class-transformer @Exclude decorator

---

### 5. Email Uniqueness Check
**Locations**:
- AuthService.register()
- UsersService.create()
- UsersService.update()
- AgenciesService.create()
- AgenciesService.update()

**Pattern**:
```typescript
const existingEntity = await this.repository.findOne({
  where: { email: dto.email },
});
if (existingEntity) {
  throw new ConflictException('Entity with this email already exists');
}
```

**Recommendation**: Extract to a reusable validation method

---

## Summary

**Total Complex Methods**: 7
**Total Duplication Patterns**: 5

**Priority Refactoring**:
1. HIGH: ClientsService.matchProperties() - Most complex
2. HIGH: InvoicesService.update() - Complex with side effects
3. MEDIUM: PropertiesService.publishProperty() - Multiple validations
4. MEDIUM: PropertiesService.update() - SEO logic complexity
5. LOW: Other identified methods

**Estimated Effort**: 2-3 days for complete refactoring
