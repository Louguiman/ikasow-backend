# User Guide: Role-Based Features

## Introduction

Welcome to the Property Management System! This guide explains how different user roles work in the system and what features are available to each role. Understanding your role will help you make the most of the system's capabilities.

---

## Table of Contents

1. [Understanding User Roles](#understanding-user-roles)
2. [Platform Administrator Guide](#platform-administrator-guide)
3. [Agency Administrator Guide](#agency-administrator-guide)
4. [Agent Guide](#agent-guide)
5. [Accountant Guide](#accountant-guide)
6. [Tenant Guide](#tenant-guide)
7. [Client Guide](#client-guide)
8. [Common Tasks](#common-tasks)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

---

## Understanding User Roles

### Role Hierarchy

The system has six user roles, each with specific permissions:

```
Platform Admin (Highest Access)
    ↓
Agency Admin
    ↓
Agent / Accountant (Specialized Roles)
    ↓
Tenant / Client (Limited Access)
```

### Role Comparison Table

| Feature | Platform Admin | Admin | Agent | Accountant | Tenant | Client |
|---------|---------------|-------|-------|------------|--------|--------|
| Manage Properties | ✅ All | ✅ Agency | ✅ Agency | 👁️ View | ❌ | ❌ |
| Manage Clients | ✅ All | ✅ Agency | ✅ Agency | ❌ | ❌ | 👁️ Own |
| Manage Invoices | ✅ All | ✅ Agency | ❌ | ✅ Agency | 👁️ Own | ❌ |
| Manage Users | ✅ All | ✅ Agency | ❌ | ❌ | ❌ | ❌ |
| Manage Agencies | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View All Agencies | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Submit Service Requests | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Browse Public Properties | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Legend:
- ✅ Full Access
- 👁️ View Only
- ❌ No Access

---

## Platform Administrator Guide

### Overview
Platform administrators have the highest level of access and can manage the entire system across all agencies.

### Key Responsibilities
- Manage all agencies
- Oversee system-wide operations
- Create and manage agency administrators
- Monitor system performance
- Handle escalated issues

### Getting Started

#### 1. Accessing the System
1. Navigate to the login page
2. Enter your platform admin credentials
3. You'll see the full navigation menu with all features

#### 2. Managing Agencies

**Creating a New Agency:**
1. Click "Agencies" in the navigation menu
2. Click "Create Agency" button
3. Fill in agency details:
   - Agency Name
   - Contact Email
   - Phone Number
   - Address
   - City/Country
4. Click "Save"

**Viewing Agency Details:**
1. Go to "Agencies" menu
2. Click on any agency to view details
3. See agency statistics, users, and properties

**Switching Between Agencies:**
1. Use the agency selector in the header
2. Select the agency you want to view
3. All data will filter to that agency

#### 3. Managing Users Across Agencies

**Creating Users in Any Agency:**
1. Go to "Users" menu
2. Click "Create User"
3. Fill in user details
4. Select the agency from dropdown
5. Assign appropriate role
6. Click "Save"

**Viewing All Users:**
1. Go to "Users" menu
2. Use filters to view users by:
   - Agency
   - Role
   - Status
3. Click on any user to view/edit details

#### 4. Cross-Agency Operations

**Viewing Data Across Agencies:**
- Use the agency selector to switch between agencies
- Or use "All Agencies" view to see aggregated data

**Moving Resources Between Agencies:**
1. Navigate to the resource (user, property, etc.)
2. Click "Edit"
3. Change the agency assignment
4. Click "Save"

**Note:** All cross-agency operations are logged for audit purposes.

### Best Practices
- Regularly review agency performance
- Monitor user activity across agencies
- Set up proper agency administrators
- Document any cross-agency changes
- Review audit logs monthly

### Common Tasks
- [Creating a new agency](#creating-a-new-agency)
- [Assigning agency administrators](#assigning-agency-administrators)
- [Viewing system-wide reports](#viewing-system-wide-reports)
- [Handling escalated issues](#handling-escalated-issues)

---

## Agency Administrator Guide

### Overview
Agency administrators have full control over their agency's operations but cannot access other agencies' data.

### Key Responsibilities
- Manage agency users
- Oversee all agency operations
- Manage properties, clients, and tenants
- Handle financial operations
- Monitor agency performance

### Getting Started

#### 1. Dashboard Overview
After logging in, you'll see your agency dashboard with:
- Key metrics (properties, clients, revenue)
- Recent activities
- Pending tasks
- Quick actions

#### 2. Managing Properties

**Creating a Property:**
1. Go to "Properties" menu
2. Click "Create Property"
3. Fill in property details:
   - Title and Description
   - Property Type (Apartment, House, Commercial)
   - Price and Location
   - Features (bedrooms, bathrooms, area)
4. Upload property images
5. Click "Save"

**Publishing a Property:**
1. Go to property details
2. Click "Publish" button
3. Property will appear on public portal
4. Clients can now view and inquire

**Managing Property Status:**
- Available: Property is ready for rent/sale
- Rented: Property is currently occupied
- Sold: Property has been sold
- Maintenance: Property is under maintenance

#### 3. Managing Clients

**Adding a New Client:**
1. Go to "Clients" menu
2. Click "Create Client"
3. Enter client information:
   - Name and Contact Details
   - Preferred Property Type
   - Budget Range
   - Preferred Locations
4. Click "Save"

**Matching Properties to Clients:**
1. Go to client details
2. Click "Match Properties"
3. System will suggest matching properties
4. Send property recommendations to client

#### 4. Managing Users

**Creating Agency Users:**
1. Go to "Users" menu
2. Click "Create User"
3. Fill in user details
4. Select role:
   - Admin (another administrator)
   - Agent (property and client management)
   - Accountant (financial management)
5. Click "Save"

**Note:** You can only create users within your agency.

#### 5. Financial Management

**Creating Invoices:**
1. Go to "Billing" menu
2. Click "Create Invoice"
3. Select tenant
4. Add invoice items
5. Set due date
6. Click "Save"

**Viewing Financial Reports:**
1. Go to "Billing" > "Reports"
2. Select date range
3. View revenue, expenses, and outstanding payments

### Best Practices
- Keep property listings up to date
- Respond to client inquiries promptly
- Review financial reports weekly
- Maintain accurate tenant records
- Train your team on system usage

---

## Agent Guide

### Overview
Agents focus on property and client management, helping to match clients with suitable properties.

### Key Responsibilities
- List and manage properties
- Manage client relationships
- Convert leads to clients
- Schedule property viewings
- Close deals

### Getting Started

#### 1. Your Dashboard
Your dashboard shows:
- Your active listings
- Your clients
- Upcoming appointments
- Recent leads
- Performance metrics

#### 2. Managing Properties

**Adding a New Listing:**
1. Click "Properties" > "Create Property"
2. Enter property details
3. Upload high-quality photos
4. Add property features and amenities
5. Set pricing
6. Click "Save"

**Tips for Great Listings:**
- Use clear, descriptive titles
- Write detailed descriptions
- Upload multiple high-quality photos
- Highlight unique features
- Set competitive pricing
- Keep information accurate

#### 3. Managing Clients

**Adding a New Client:**
1. Go to "Clients" > "Create Client"
2. Enter client information
3. Record their preferences:
   - Property type
   - Location preferences
   - Budget range
   - Must-have features
4. Click "Save"

**Matching Properties:**
1. Open client profile
2. Click "Match Properties"
3. Review suggested matches
4. Send recommendations to client
5. Schedule viewings

#### 4. Working with Leads

**Viewing Leads:**
1. Go to "Leads" menu
2. See all incoming leads
3. Filter by:
   - Source (website, referral, etc.)
   - Status (new, contacted, qualified)
   - Date

**Converting Leads to Clients:**
1. Open lead details
2. Contact the lead
3. Qualify their interest
4. Click "Convert to Client"
5. Fill in additional client information
6. Start matching properties

#### 5. Scheduling Viewings

**Creating an Appointment:**
1. Go to "Calendar"
2. Click "New Appointment"
3. Select property
4. Select client
5. Choose date and time
6. Add notes
7. Click "Save"

**Managing Your Calendar:**
- View daily, weekly, or monthly
- Set reminders for appointments
- Block out unavailable times
- Sync with external calendar

### Best Practices
- Follow up with leads within 24 hours
- Keep client preferences updated
- Schedule viewings efficiently
- Document all client interactions
- Update property status promptly
- Maintain professional communication

### Common Scenarios

**Scenario 1: New Lead Inquiry**
1. Receive lead notification
2. Review lead details
3. Contact lead within 24 hours
4. Qualify their requirements
5. Send property recommendations
6. Schedule viewing
7. Follow up after viewing

**Scenario 2: Client Ready to Rent**
1. Client selects property
2. Prepare rental agreement
3. Coordinate with admin for paperwork
4. Update property status to "Rented"
5. Convert client to tenant (admin task)

---

## Accountant Guide

### Overview
Accountants manage all financial aspects of the agency, including invoicing, payments, and financial reporting.

### Key Responsibilities
- Create and manage invoices
- Track payments
- Generate financial reports
- Monitor outstanding balances
- Handle payment disputes

### Getting Started

#### 1. Financial Dashboard
Your dashboard shows:
- Total revenue
- Outstanding invoices
- Recent payments
- Overdue payments
- Monthly trends

#### 2. Managing Invoices

**Creating an Invoice:**
1. Go to "Billing" > "Invoices"
2. Click "Create Invoice"
3. Select tenant
4. Select property (auto-filled if tenant has one)
5. Add invoice items:
   - Rent
   - Utilities
   - Maintenance fees
   - Other charges
6. Set due date
7. Click "Save"

**Invoice Statuses:**
- Draft: Not yet sent
- Sent: Sent to tenant
- Paid: Payment received
- Overdue: Past due date
- Cancelled: Invoice cancelled

**Sending Invoices:**
1. Open invoice
2. Review details
3. Click "Send to Tenant"
4. Tenant receives email notification

#### 3. Recording Payments

**Recording a Payment:**
1. Go to invoice details
2. Click "Record Payment"
3. Enter payment details:
   - Amount
   - Payment method
   - Payment date
   - Reference number
4. Click "Save"

**Partial Payments:**
- System supports partial payments
- Remaining balance automatically calculated
- Invoice status updates accordingly

#### 4. Financial Reports

**Generating Reports:**
1. Go to "Billing" > "Reports"
2. Select report type:
   - Revenue Report
   - Outstanding Balances
   - Payment History
   - Tenant Payment Summary
3. Select date range
4. Click "Generate"
5. Export to PDF or Excel

**Available Reports:**
- Monthly Revenue Summary
- Outstanding Invoices
- Payment History
- Tenant Payment Trends
- Property Revenue Analysis

#### 5. Viewing Properties and Tenants

**Note:** You have read-only access to properties and tenants.

**Viewing Properties:**
- See all agency properties
- View property details
- Check rental status
- Cannot create or edit properties

**Viewing Tenants:**
- See all agency tenants
- View tenant details
- Check payment history
- Cannot create or edit tenants

### Best Practices
- Send invoices on time (e.g., 1st of month)
- Follow up on overdue payments
- Keep accurate payment records
- Reconcile accounts monthly
- Generate reports regularly
- Communicate with tenants professionally

### Common Tasks

**Monthly Invoicing Process:**
1. Generate invoices for all tenants (1st of month)
2. Review and verify amounts
3. Send invoices to tenants
4. Track payment status
5. Follow up on overdue payments (after 5 days)
6. Record payments as received
7. Generate monthly report (end of month)

---

## Tenant Guide

### Overview
Tenants can view their lease information, pay rent, and submit service requests.

### Key Responsibilities
- Pay rent on time
- Submit maintenance requests
- Keep contact information updated
- Communicate with property management

### Getting Started

#### 1. Your Dashboard
After logging in, you'll see:
- Your lease information
- Current invoices
- Recent service requests
- Important announcements

#### 2. Viewing Your Lease

**Lease Information:**
1. Go to "My Tenancy"
2. View lease details:
   - Property address
   - Lease start and end dates
   - Monthly rent amount
   - Security deposit
   - Landlord contact information

#### 3. Paying Rent

**Viewing Invoices:**
1. Go to "My Invoices"
2. See all invoices:
   - Current invoices
   - Paid invoices
   - Overdue invoices

**Making a Payment:**
1. Open invoice
2. Click "Pay Now"
3. Select payment method:
   - Credit/Debit Card
   - Bank Transfer
   - Other methods
4. Enter payment details
5. Click "Submit Payment"
6. Receive payment confirmation

**Payment Tips:**
- Pay before due date to avoid late fees
- Save payment confirmation
- Set up payment reminders
- Contact accountant if issues arise

#### 4. Submitting Service Requests

**Creating a Service Request:**
1. Go to "Service Requests"
2. Click "Submit Request"
3. Fill in details:
   - Title (brief description)
   - Category (maintenance, repair, etc.)
   - Priority (low, medium, high, urgent)
   - Detailed description
   - Upload photos if applicable
4. Click "Submit"

**Request Categories:**
- Maintenance: Regular upkeep
- Repair: Something is broken
- Complaint: Noise, disturbance, etc.
- Other: Miscellaneous issues

**Tracking Requests:**
1. Go to "Service Requests"
2. View request status:
   - Submitted: Request received
   - In Progress: Being worked on
   - Completed: Issue resolved
   - Cancelled: Request cancelled

#### 5. Updating Your Profile

**Updating Contact Information:**
1. Go to "Settings" > "Profile"
2. Update:
   - Phone number
   - Email address
   - Emergency contact
3. Click "Save"

### Best Practices
- Pay rent on time
- Report maintenance issues promptly
- Keep contact information current
- Communicate respectfully
- Document all interactions
- Save payment receipts

### Common Scenarios

**Scenario 1: Maintenance Issue**
1. Notice issue (e.g., leaky faucet)
2. Submit service request immediately
3. Include photos and detailed description
4. Wait for response (usually within 24 hours)
5. Provide access for repair
6. Confirm issue is resolved

**Scenario 2: Late Payment**
1. Receive overdue notice
2. Contact accountant immediately
3. Explain situation
4. Arrange payment plan if needed
5. Make payment as soon as possible

---

## Client Guide

### Overview
Clients can browse available properties, save favorites, and submit inquiries.

### Key Responsibilities
- Search for properties
- Save favorite properties
- Submit inquiries
- Keep preferences updated

### Getting Started

#### 1. Your Dashboard
Your dashboard shows:
- Recommended properties
- Saved properties
- Recent inquiries
- Property alerts

#### 2. Browsing Properties

**Searching for Properties:**
1. Go to "Browse Properties"
2. Use filters:
   - Property Type (Apartment, House, Commercial)
   - Location (City, Neighborhood)
   - Price Range
   - Bedrooms/Bathrooms
   - Features (parking, balcony, etc.)
3. Click "Search"

**Viewing Property Details:**
1. Click on any property
2. View:
   - Photos and virtual tour
   - Property description
   - Features and amenities
   - Location map
   - Price and availability
3. Contact agent for more information

#### 3. Saving Favorites

**Saving a Property:**
1. View property details
2. Click "Save" or heart icon
3. Property added to "Saved Properties"

**Managing Saved Properties:**
1. Go to "Saved Properties"
2. View all saved properties
3. Remove properties no longer interested
4. Compare saved properties

#### 4. Submitting Inquiries

**Inquiring About a Property:**
1. View property details
2. Click "Inquire" or "Contact Agent"
3. Fill in inquiry form:
   - Your message
   - Preferred contact method
   - Preferred viewing time
4. Click "Submit"

**Tracking Inquiries:**
1. Go to "My Inquiries"
2. View all inquiries and responses
3. Reply to agent messages

#### 5. Setting Up Property Alerts

**Creating an Alert:**
1. Go to "Property Alerts"
2. Click "Create Alert"
3. Set criteria:
   - Property type
   - Location
   - Price range
   - Features
4. Choose notification method (email, SMS)
5. Click "Save"

**Managing Alerts:**
- Edit alert criteria
- Pause alerts temporarily
- Delete alerts no longer needed

### Best Practices
- Keep your profile updated
- Respond to agent messages promptly
- Be specific about your requirements
- Schedule viewings in advance
- Ask questions about properties
- Save properties you're interested in

### Common Scenarios

**Scenario 1: Finding Your Dream Home**
1. Set up property alerts with your criteria
2. Browse new listings daily
3. Save interesting properties
4. Submit inquiries for top choices
5. Schedule viewings
6. Work with agent to make decision

**Scenario 2: Comparing Properties**
1. Save multiple properties
2. Go to "Saved Properties"
3. Compare features, prices, locations
4. Narrow down to top 2-3
5. Schedule viewings
6. Make final decision

---

## Common Tasks

### Changing Your Password

1. Go to "Settings" > "Profile"
2. Click "Change Password"
3. Enter current password
4. Enter new password
5. Confirm new password
6. Click "Save"

### Updating Your Profile

1. Go to "Settings" > "Profile"
2. Update information:
   - Name
   - Email
   - Phone
   - Photo
3. Click "Save"

### Viewing Notifications

1. Click bell icon in header
2. View recent notifications
3. Click notification to view details
4. Mark as read or delete

### Logging Out

1. Click your profile icon
2. Select "Logout"
3. You'll be redirected to login page

---

## Troubleshooting

### "You don't have permission to access this resource"

**Cause:** You're trying to access a feature not available to your role.

**Solution:**
- Check your role in profile settings
- Contact your administrator if you need additional permissions
- Refer to the role comparison table to see what's available to your role

### "Session expired, please log in again"

**Cause:** Your login session has expired (usually after 1 hour of inactivity).

**Solution:**
- Click "OK" on the message
- You'll be redirected to login page
- Log in again with your credentials
- You'll be returned to the page you were on

### "Unable to connect to server"

**Cause:** Network connection issue or server is down.

**Solution:**
- Check your internet connection
- Try refreshing the page
- Wait a few minutes and try again
- Contact support if issue persists

### Can't see expected menu items

**Cause:** Menu items are filtered based on your role.

**Solution:**
- Verify your role in profile settings
- Check the navigation structure guide for your role
- Contact administrator if you need access to additional features

### Invoice not showing up

**Cause:** Invoice may not be created yet or you're looking in wrong place.

**Solution:**
- Check "My Invoices" menu (for tenants)
- Check invoice date range filter
- Contact accountant if invoice should exist but doesn't

---

## FAQ

### General Questions

**Q: How do I know what my role is?**
A: Go to Settings > Profile. Your role is displayed at the top of your profile.

**Q: Can I have multiple roles?**
A: No, each user has one role. Contact your administrator if you need different permissions.

**Q: How long does my session last?**
A: Sessions last for 1 hour of inactivity. You'll be automatically logged out after that.

**Q: Can I access the system from mobile?**
A: Yes, the system is fully responsive and works on mobile devices.

### Platform Admin Questions

**Q: Can I delete an agency?**
A: Yes, but be careful. Deleting an agency will delete all associated data. Consider deactivating instead.

**Q: How do I view data from all agencies?**
A: Use the agency selector in the header and choose "All Agencies".

**Q: Are cross-agency operations logged?**
A: Yes, all cross-agency operations are logged for audit purposes.

### Admin Questions

**Q: Can I see other agencies' data?**
A: No, you can only see data from your own agency.

**Q: How many users can I create?**
A: There's no limit, but check your agency's subscription plan.

**Q: Can I change a user's role?**
A: Yes, edit the user and change their role. They'll need to log out and back in for changes to take effect.

### Agent Questions

**Q: Why can't I see the Billing menu?**
A: Agents don't have access to financial features. Contact your admin or accountant for billing matters.

**Q: Can I create invoices?**
A: No, only admins and accountants can create invoices.

**Q: How do I convert a lead to a client?**
A: Open the lead details and click "Convert to Client". Fill in additional information and save.

### Accountant Questions

**Q: Why can't I edit properties?**
A: Accountants have read-only access to properties. Contact an admin or agent to make changes.

**Q: Can I create tenants?**
A: No, only admins and agents can create tenants.

**Q: How do I handle partial payments?**
A: When recording a payment, enter the partial amount. The system will calculate the remaining balance.

### Tenant Questions

**Q: When is rent due?**
A: Check your lease details or invoice for the due date. Typically rent is due on the 1st of each month.

**Q: How do I report an emergency?**
A: For emergencies, call the emergency number in your lease. For non-emergencies, submit a service request.

**Q: Can I pay rent in installments?**
A: Contact your accountant to discuss payment arrangements.

### Client Questions

**Q: How do I schedule a property viewing?**
A: Submit an inquiry on the property and request a viewing. An agent will contact you to schedule.

**Q: Are all properties available?**
A: Only properties marked as "Available" are currently available. Saved properties may become unavailable.

**Q: How do I become a tenant?**
A: Work with an agent to find a property, complete the application, and sign a lease. Your account will be converted to a tenant account.

---

## Getting Help

### Contact Support

**Email:** support@immomali.com  
**Phone:** +1 (555) 123-4567  
**Hours:** Monday-Friday, 9 AM - 5 PM

### In-App Help

Click the "?" icon in the header for:
- Quick help articles
- Video tutorials
- Feature guides
- Contact support

### Training Resources

- Video tutorials: [training.immomali.com](https://training.immomali.com)
- User documentation: [docs.immomali.com](https://docs.immomali.com)
- Webinars: Check your email for upcoming sessions

---

## Conclusion

This guide covers the main features and workflows for each role in the system. For more detailed information, refer to the specific documentation for your role or contact support.

Remember:
- Your role determines what you can see and do
- Always keep your information up to date
- Report issues promptly
- Contact support if you need help

Thank you for using the Property Management System!
