# Circular Dependencies Analysis

## Analysis Date
November 28, 2025

## Tool Used
madge v7.0.0

## Command
```bash
npx madge --circular --extensions ts src/
```

## Results

### Found Circular Dependencies: 2

#### 1. Property ↔ PropertyImage
**Files:**
- `properties/entities/property.entity.ts`
- `properties/entities/property-image.entity.ts`

**Type:** Bidirectional TypeORM Relationship

**Analysis:**
This is a **legitimate and necessary** circular dependency for TypeORM bidirectional relationships:
- Property has `@OneToMany(() => PropertyImage, ...)`
- PropertyImage has `@ManyToOne(() => Property, ...)`

**Resolution Applied:**
- Used TypeScript `type` imports to reduce runtime circular dependency impact
- Changed to string-based relation references in decorators
- This pattern is recommended by TypeORM for bidirectional relationships

**Status:** ✅ ACCEPTABLE - Required for ORM functionality

**Code Pattern:**
```typescript
// property-image.entity.ts
import type { Property } from './property.entity';

@ManyToOne('Property', 'images', { onDelete: 'CASCADE' })
property: Property;
```

#### 2. Invoice ↔ InvoiceItem
**Files:**
- `invoices/entities/invoice.entity.ts`
- `invoices/entities/invoice-item.entity.ts`

**Type:** Bidirectional TypeORM Relationship

**Analysis:**
This is a **legitimate and necessary** circular dependency for TypeORM bidirectional relationships:
- Invoice has `@OneToMany(() => InvoiceItem, ...)`
- InvoiceItem has `@ManyToOne(() => Invoice, ...)`

**Resolution Applied:**
- Used TypeScript `type` imports to reduce runtime circular dependency impact
- Changed to string-based relation references in decorators
- This pattern is recommended by TypeORM for bidirectional relationships

**Status:** ✅ ACCEPTABLE - Required for ORM functionality

**Code Pattern:**
```typescript
// invoice-item.entity.ts
import type { Invoice } from './invoice.entity';

@ManyToOne('Invoice', 'items', { onDelete: 'CASCADE' })
invoice: Invoice;
```

## Module-Level Circular Dependencies

### Analysis
Checked all NestJS modules for circular dependencies at the module level.

**Result:** ✅ NO MODULE-LEVEL CIRCULAR DEPENDENCIES FOUND

### Module Dependency Graph
```
AppModule
├── AuthModule
├── AgenciesModule
│   └── CacheModule
├── UsersModule
├── PropertiesModule
├── TenantsModule
├── ClientsModule
├── InvoicesModule
├── ServiceRequestsModule
│   ├── NotificationsModule
│   └── UsersModule
├── LeadsModule
│   ├── PropertiesModule
│   ├── NotificationsModule
│   ├── UsersModule
│   └── ClientsModule
├── NotificationsModule
└── CommonModule
```

**Observations:**
- All dependencies flow in one direction (acyclic)
- No module imports another module that imports it back
- Dependency graph is clean and well-structured

## Entity-Level Circular Dependencies

### Checked Relationships
All entity relationships were analyzed:

1. ✅ Property ↔ PropertyImage (Acceptable - TypeORM bidirectional)
2. ✅ Invoice ↔ InvoiceItem (Acceptable - TypeORM bidirectional)
3. ✅ Property → Agency (One-way)
4. ✅ Tenant → Property (One-way)
5. ✅ Tenant → User (One-way)
6. ✅ Client → User (One-way)
7. ✅ ServiceRequest → Property (One-way)
8. ✅ ServiceRequest → Tenant (One-way)
9. ✅ Lead → Property (One-way)
10. ✅ Lead → Agency (One-way)
11. ✅ User → Agency (One-way)

**Result:** All entity relationships are properly structured

## Best Practices Applied

### 1. Type-Only Imports
Used TypeScript's `import type` for entity references to minimize runtime circular dependencies:
```typescript
import type { Property } from './property.entity';
```

### 2. String-Based Relation References
Used string references in TypeORM decorators instead of arrow functions:
```typescript
// Before
@ManyToOne(() => Property, (property) => property.images)

// After
@ManyToOne('Property', 'images')
```

### 3. Module Organization
- Kept modules focused and single-purpose
- Avoided cross-module circular dependencies
- Used proper dependency injection

## Recommendations

### ✅ Current State
The codebase has **excellent module organization** with:
- No problematic circular dependencies
- Only acceptable TypeORM bidirectional relationships
- Clean module dependency graph
- Proper separation of concerns

### Future Monitoring
1. **When adding new entities with relationships:**
   - Use `import type` for entity references
   - Use string-based relation references in decorators
   - Avoid creating new bidirectional relationships unless necessary

2. **When adding new modules:**
   - Check dependency graph before importing other feature modules
   - Avoid creating circular module dependencies
   - Consider using events/message patterns for complex inter-module communication

3. **Regular Checks:**
   - Run `npx madge --circular --extensions ts src/` periodically
   - Review module imports during code reviews
   - Monitor for new circular dependencies

## Conclusion

**Status:** ✅ PASSED

The application has:
- **0 problematic circular dependencies**
- **2 acceptable TypeORM bidirectional relationships** (properly handled)
- **Clean module architecture**
- **Well-structured dependency graph**

The circular dependencies found are **expected and necessary** for TypeORM's bidirectional relationship functionality and have been optimized using TypeScript type imports and string-based relation references.

## References

- [TypeORM Relations Documentation](https://typeorm.io/relations)
- [TypeScript Type-Only Imports](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export)
- [Madge Documentation](https://github.com/pahen/madge)
