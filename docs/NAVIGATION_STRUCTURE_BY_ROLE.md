# Navigation Structure by Role

## Overview
This document describes the navigation menu structure for each user role in the property management system. The navigation is dynamically filtered based on the authenticated user's role to ensure users only see menu items they have permission to access.

---

## Platform Admin Navigation

Platform administrators have access to all system features across all agencies.

### Main Navigation
```
├── 🏠 Dashboard
├── 🏢 Properties
│   ├── All Properties
│   ├── Create Property
│   └── Property Settings
├── 👥 Clients
│   ├── All Clients
│   ├── Create Client
│   └── Match Properties
├── 🏘️ Tenants
│   ├── All Tenants
│   ├── Create Tenant
│   └── Lease Management
├── 💰 Billing
│   ├── Invoices
│   ├── Create Invoice
│   ├── Payments
│   └── Financial Reports
├── 📧 Leads
│   ├── All Leads
│   ├── Convert to Client
│   └── Lead Sources
├── 👤 Users
│   ├── All Users
│   ├── Create User
│   └── User Roles
├── 🏛️ Agencies
│   ├── All Agencies
│   ├── Create Agency
│   └── Agency Settings
├── 🔧 Maintenance
│   ├── Service Requests
│   ├── Create Request
│   └── Maintenance Schedule
├── 📅 Calendar
│   ├── Appointments
│   ├── Viewings
│   └── Lease Renewals
└── ⚙️ Settings
    ├── Profile
    ├── System Settings
    └── Logout
```

**Features:**
- Can switch between agencies using agency selector
- Can view and manage data from all agencies
- Has access to system-wide settings and reports
- Can create and manage agencies

---

## Admin Navigation

Agency administrators have full access to features within their agency.

### Main Navigation
```
├── 🏠 Dashboard
├── 🏢 Properties
│   ├── All Properties
│   ├── Create Property
│   └── Property Settings
├── 👥 Clients
│   ├── All Clients
│   ├── Create Client
│   └── Match Properties
├── 🏘️ Tenants
│   ├── All Tenants
│   ├── Create Tenant
│   └── Lease Management
├── 💰 Billing
│   ├── Invoices
│   ├── Create Invoice
│   ├── Payments
│   └── Financial Reports
├── 📧 Leads
│   ├── All Leads
│   ├── Convert to Client
│   └── Lead Sources
├── 👤 Users
│   ├── All Users (agency only)
│   ├── Create User
│   └── User Roles
├── 🔧 Maintenance
│   ├── Service Requests
│   ├── Create Request
│   └── Maintenance Schedule
├── 📅 Calendar
│   ├── Appointments
│   ├── Viewings
│   └── Lease Renewals
└── ⚙️ Settings
    ├── Profile
    ├── Agency Settings
    └── Logout
```

**Features:**
- Can manage all aspects of their agency
- Can create and manage users within their agency
- Can access all financial and operational features
- Cannot access other agencies' data
- Cannot manage agencies

**Differences from Platform Admin:**
- ❌ No "Agencies" menu
- ❌ Cannot switch agencies
- ❌ Cannot access system-wide settings
- ✅ Can manage users within their agency

---

## Agent Navigation

Agents focus on property and client management.

### Main Navigation
```
├── 🏠 Dashboard
├── 🏢 Properties
│   ├── All Properties
│   ├── Create Property
│   └── My Listings
├── 👥 Clients
│   ├── All Clients
│   ├── Create Client
│   ├── Match Properties
│   └── My Clients
├── 📧 Leads
│   ├── All Leads
│   ├── My Leads
│   └── Convert to Client
├── 📅 Calendar
│   ├── My Appointments
│   ├── Property Viewings
│   └── Follow-ups
└── ⚙️ Settings
    ├── Profile
    └── Logout
```

**Features:**
- Can create and manage properties
- Can create and manage clients
- Can view and convert leads
- Can schedule appointments and viewings
- Cannot access financial features
- Cannot manage users
- Cannot access tenants (limited view only)

**Restrictions:**
- ❌ No "Billing" menu
- ❌ No "Tenants" menu
- ❌ No "Users" menu
- ❌ No "Agencies" menu
- ❌ No "Maintenance" menu
- ✅ Can view properties and clients
- ✅ Can manage leads

---

## Accountant Navigation

Accountants focus on financial management.

### Main Navigation
```
├── 🏠 Dashboard
├── 💰 Billing
│   ├── Invoices
│   ├── Create Invoice
│   ├── Payments
│   ├── Payment History
│   └── Financial Reports
├── 🏘️ Tenants (Read-Only)
│   ├── All Tenants
│   └── Payment History
├── 🏢 Properties (Read-Only)
│   ├── All Properties
│   └── Property Details
└── ⚙️ Settings
    ├── Profile
    └── Logout
```

**Features:**
- Full access to invoicing and payments
- Can view financial reports
- Can view tenants (read-only)
- Can view properties (read-only)
- Cannot create or modify properties
- Cannot manage clients
- Cannot manage users

**Restrictions:**
- ❌ No "Clients" menu
- ❌ No "Leads" menu
- ❌ No "Users" menu
- ❌ No "Agencies" menu
- ❌ Cannot create/edit properties
- ❌ Cannot create/edit tenants
- ✅ Full access to billing
- ✅ Can view properties and tenants

---

## Tenant Navigation

Tenants have limited access to their own data and service requests.

### Main Navigation
```
├── 🏠 Dashboard
├── 🏘️ My Tenancy
│   ├── Lease Details
│   ├── Property Information
│   └── Contact Landlord
├── 💰 My Invoices
│   ├── Current Invoices
│   ├── Payment History
│   └── Make Payment
├── 🔧 Service Requests
│   ├── My Requests
│   ├── Submit Request
│   └── Request History
└── ⚙️ Settings
    ├── Profile
    └── Logout
```

**Features:**
- Can view own lease details
- Can view and pay invoices
- Can submit service requests
- Can update own profile
- Cannot access other tenants' data
- Cannot access management features

**Restrictions:**
- ❌ No access to properties list
- ❌ No access to clients
- ❌ No access to other tenants
- ❌ No access to users
- ❌ No access to leads
- ✅ Can view own data only
- ✅ Can submit service requests
- ✅ Can pay invoices

---

## Client Navigation

Clients can browse properties and manage their profile.

### Main Navigation
```
├── 🏠 Dashboard
├── 🏢 Browse Properties
│   ├── Search Properties
│   ├── Saved Properties
│   └── Property Alerts
├── 👤 My Profile
│   ├── Personal Information
│   ├── Preferences
│   └── Search Criteria
├── 📧 My Inquiries
│   ├── Property Inquiries
│   └── Messages
└── ⚙️ Settings
    ├── Profile
    ├── Notifications
    └── Logout
```

**Features:**
- Can browse public properties
- Can save favorite properties
- Can set property alerts
- Can manage own profile and preferences
- Can view inquiry history
- Cannot access management features

**Restrictions:**
- ❌ No access to properties management
- ❌ No access to clients list
- ❌ No access to tenants
- ❌ No access to invoices
- ❌ No access to users
- ✅ Can browse public properties
- ✅ Can manage own profile
- ✅ Can submit inquiries

---

## Navigation Implementation

### Dynamic Menu Filtering

The navigation menu is filtered based on the user's role using the `usePermissions` hook:

```typescript
// Example: Sidebar.tsx
const { canViewProperties, canViewClients, canViewInvoices, canViewUsers, canViewAgencies } = usePermissions();

const navigationItems = [
  { path: '/dashboard', label: 'Dashboard', icon: HomeIcon, visible: true },
  { path: '/properties', label: 'Properties', icon: BuildingIcon, visible: canViewProperties },
  { path: '/clients', label: 'Clients', icon: UsersIcon, visible: canViewClients },
  { path: '/invoices', label: 'Billing', icon: CurrencyIcon, visible: canViewInvoices },
  { path: '/users', label: 'Users', icon: UserIcon, visible: canViewUsers },
  { path: '/agencies', label: 'Agencies', icon: OfficeBuildingIcon, visible: canViewAgencies },
].filter(item => item.visible);
```

### Permission Checks

Each navigation item checks permissions before rendering:

```typescript
// usePermissions.ts
export const usePermissions = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  
  return {
    canViewProperties: hasPermission(user?.role, 'view', 'properties'),
    canViewClients: hasPermission(user?.role, 'view', 'clients'),
    canViewInvoices: hasPermission(user?.role, 'view', 'invoices'),
    canViewUsers: hasPermission(user?.role, 'view', 'users'),
    canViewAgencies: hasPermission(user?.role, 'view', 'agencies'),
    // ... more permissions
  };
};
```

### Route Protection

Routes are protected using the `ProtectedRoute` component:

```typescript
// App.tsx
<Route
  path="/properties"
  element={
    <ProtectedRoute requiredRoles={['admin', 'agent', 'accountant']}>
      <Properties />
    </ProtectedRoute>
  }
/>
```

---

## Navigation Behavior by Role

### Platform Admin
- ✅ Sees all menu items
- ✅ Can switch between agencies
- ✅ Can access system settings
- ✅ No restrictions

### Admin
- ✅ Sees all menu items except "Agencies"
- ❌ Cannot switch agencies
- ✅ Can access agency settings
- ✅ Full access within agency

### Agent
- ✅ Sees Properties, Clients, Leads, Calendar
- ❌ No Billing menu
- ❌ No Users menu
- ❌ No Tenants menu
- ✅ Focus on sales and client management

### Accountant
- ✅ Sees Billing menu (full access)
- ✅ Sees Properties (read-only)
- ✅ Sees Tenants (read-only)
- ❌ No Clients menu
- ❌ No Users menu
- ✅ Focus on financial management

### Tenant
- ✅ Sees My Tenancy, My Invoices, Service Requests
- ❌ No management menus
- ❌ No access to other users' data
- ✅ Focus on own tenancy

### Client
- ✅ Sees Browse Properties, My Profile, My Inquiries
- ❌ No management menus
- ❌ No access to internal data
- ✅ Focus on property search

---

## Mobile Navigation

On mobile devices, the navigation collapses into a hamburger menu with the same role-based filtering:

```
☰ Menu
├── Dashboard
├── [Role-specific items]
└── Settings
```

**Mobile-specific features:**
- Bottom navigation bar for primary actions
- Swipe gestures for navigation
- Collapsible menu sections
- Quick action buttons

---

## Breadcrumbs

Breadcrumbs are displayed on all pages to show navigation hierarchy:

```
Home > Properties > Property Details > Edit
```

**Breadcrumb behavior:**
- Automatically generated based on route
- Clickable to navigate back
- Shows current location in hierarchy
- Respects role-based permissions

---

## Search and Quick Actions

### Global Search
Available to all roles (results filtered by permissions):
- Search properties
- Search clients
- Search tenants
- Search invoices
- Search users (admin only)

### Quick Actions
Role-specific quick actions in the header:
- **Admin/Agent:** Create Property, Create Client
- **Accountant:** Create Invoice
- **Tenant:** Submit Service Request
- **Client:** Save Property

---

## Notifications

Notification menu shows role-specific notifications:
- **Admin:** All agency notifications
- **Agent:** Property and client notifications
- **Accountant:** Payment and invoice notifications
- **Tenant:** Service request updates, payment reminders
- **Client:** Property alerts, inquiry responses

---

## Best Practices

1. **Always check permissions** before rendering navigation items
2. **Use consistent icons** across all roles
3. **Provide clear labels** for menu items
4. **Show active state** for current page
5. **Collapse nested menus** on mobile
6. **Cache navigation state** for performance
7. **Update navigation** when user role changes
8. **Test navigation** for all roles

---

## Accessibility

- All navigation items have proper ARIA labels
- Keyboard navigation supported (Tab, Enter, Escape)
- Screen reader friendly
- High contrast mode supported
- Focus indicators visible

---

## Support

For navigation support, contact: support@immomali.com
