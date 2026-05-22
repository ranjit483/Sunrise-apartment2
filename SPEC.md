# Sunrise Apartment Management System - Specification

## 1. Project Overview

**Project Name:** Sunrise Apartment Management System
**Project Type:** Full-stack Enterprise SaaS Apartment Management ERP
**Location:** Sunrise Apartment, Nakhhu-13, Lalitpur, Nepal
**Core Functionality:** Multi-role apartment residence, rental, billing, accounting, maintenance & society management platform
**Target Users:** Super Admin, Manager, Office Assistant, Resident, Tenant, Rental Owner, General Staff, Plumber, Cleaner, Security Guard

---

## 2. Technology Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn UI
- **Language:** TypeScript
- **State Management:** React Context + Zustand
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod
- **Icons:** Lucide React

### Backend
- **Runtime:** Node.js with Next.js API Routes (for simplicity)
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Authentication:** NextAuth.js with JWT
- **Validation:** Zod

### Design Theme
- **Primary Color:** #95DBAE (Emerald Green)
- **Secondary Color:** #AAD792 (Sage Green)
- **Background:** White/Light Gray
- **Accent:** Blue, Orange, Red for alerts
- **Dark Mode:** Optional

---

## 3. UI/UX Specification

### Layout Structure
- **Sidebar:** Fixed left sidebar (280px desktop, collapsible on mobile)
- **Top Navbar:** Fixed header (64px height) with user menu, notifications
- **Main Content:** Scrollable content area with padding
- **Responsive Breakpoints:**
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px

### Visual Design
- **Cards:** Rounded corners (12px), soft shadows
- **Buttons:** Rounded (8px), hover animations
- **Typography:** Inter font family, professional hierarchy
- **Animations:** Smooth transitions (200ms ease)
- **Data Tables:** Zebra striping, hover states, pagination
- **Charts:** Clean, professional styling with tooltips

### Color Palette
```
--primary: #95DBAE
--primary-dark: #7BC98E
--secondary: #AAD792
--background: #F8FAFC
--surface: #FFFFFF
--border: #E2E8F0
--text-primary: #1E293B
--text-secondary: #64748B
--success: #10B981
--warning: #F59E0B
--error: #EF4444
--info: #3B82F6
```

---

## 4. Database Schema (Prisma Models)

### Core Tables
1. **User** - id, email, password, name, role, phone, image, isActive, createdAt
2. **Role** - id, name, permissions
3. **Building** - id, name, address, totalFloors, createdAt
4. **Floor** - id, buildingId, floorNumber
5. **Unit** - id, buildingId, floorId, unitNumber, type, area, bedrooms, bathrooms, parkingSlot, status, ownerId, tenantId, rent, createdAt
6. **Lease** - id, unitId, tenantId, startDate, endDate, monthlyRent, deposit, status, documentUrl
7. **Invoice** - id, unitId, tenantId, invoiceNumber, month, year, dueDate, totalAmount, status, createdAt
8. **InvoiceItem** - id, invoiceId, description, amount
9. **Payment** - id, invoiceId, amount, method, date, reference, status
10. **Expense** - id, category, description, amount, date, approvedBy
11. **MaintenanceTicket** - id, unitId, category, priority, description, status, assignedTo, createdAt
12. **Complaint** - id, unitId, category, description, status, createdAt
13. **Notice** - id, title, content, type, targetRoles, createdAt
14. **Visitor** - id, unitId, name, phone, vehicle, entryTime, exitTime, status
15. **ParkingSlot** - id, unitId, slotNumber, vehicleNumber, status
16. **StaffAttendance** - id, staffId, date, checkIn, checkOut, status

---

## 5. Module Specifications

### Module 1: Dashboard (Super Admin)
- KPI Cards: Total Apartments, Units, Occupied/Vacant, Revenue, Expenses, Pending Tickets
- Charts: Revenue trend, Occupancy pie, Payment analytics
- Activity feed, Recent payments, Upcoming lease expirations

### Module 2: Buildings & Units
- CRUD for buildings, floors, units
- Unit status tracking (Vacant, Occupied, Reserved, Maintenance)
- Unit assignment to owners/tenants

### Module 3: Lease Management
- Lease creation with start/end dates
- Deposit tracking, rent escalation
- Renewal alerts, expiry notifications

### Module 4: User & Role Management
- 10 Roles with RBAC
- User CRUD with profile images
- Permission management per role

### Module 5: Billing & Invoicing
- Auto-generate monthly invoices
- 15+ invoice line items (service charge, utilities, parking, etc.)
- Due date tracking, late fees
- PDF export capability

### Module 6: Payments
- Payment recording with multiple methods (Cash, Bank, eSewa, Khalti, FonePay)
- Receipt generation
- Partial payment support

### Module 7: Maintenance
- Ticket workflow: Open → Assigned → In Progress → Completed → Closed
- Auto-assignment based on category
- Priority levels, cost tracking

### Module 8: Staff Management
- Staff profiles, attendance tracking
- Shift scheduling, task assignment

### Module 9: Visitor Management
- Visitor registration, QR pass generation
- Entry/exit logs, vehicle tracking

### Module 10: Complaints & Notices
- Complaint submission and tracking
- Notice creation for announcements

### Module 11: Parking
- Slot allocation, vehicle registration
- Parking fee tracking

### Module 12: Reports & Analytics
- Occupancy, financial, revenue/expense reports
- Export to PDF/Excel

### Module 13: Settings
- Apartment info, invoice settings, tax config
- Notification preferences, role permissions

---

## 6. Acceptance Criteria

1. ✅ Responsive design works on mobile, tablet, desktop
2. ✅ Authentication system with 10 roles functional
3. ✅ Dashboard displays all KPIs and charts correctly
4. ✅ Buildings, floors, units CRUD operations work
5. ✅ Lease management with dates and alerts functional
6. ✅ User management with role-based access works
7. ✅ Invoice generation with auto-items works
8. ✅ Payment recording and receipt generation works
9. ✅ Maintenance ticket workflow complete
10. ✅ Reports and analytics generate correctly
11. ✅ Nepali currency (NPR) supported throughout
12. ✅ Clean, modern UI with specified color palette
13. ✅ Dark mode toggle functional