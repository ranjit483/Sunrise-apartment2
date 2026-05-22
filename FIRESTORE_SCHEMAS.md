# Firestore Database Schema

## 1. Users Collection
```
/users/{userId}
```

### Document Structure:
```typescript
interface UserDocument {
  uid: string;                    // Firebase Auth UID (matches document ID)
  email: string;                 // User's email address
  fullName: string;              // Full name from signup
  phone: string;                 // Phone number
  role: 
    | 'SUPER_ADMIN' 
    | 'MANAGER' 
    | 'OWNER' 
    | 'TENANT' 
    | 'OFFICE_STAFF' 
    | 'PLUMBER' 
    | 'GUARD';
  status: 
    | 'pending_approval'   // Default for new users
    | 'approved'           // After Super Admin approval
    | 'rejected';          // If rejected by Super Admin
  unitNumber?: string;      // Applicable for TENANT/OWNER
  profileImage?: string;   // URL from Google Auth
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
  approvedBy?: string;     // Super Admin UID who approved
  approvedAt?: string;     // ISO timestamp of approval
}
```

### Example Document:
```json
{
  "uid": "abc123xyz789",
  "email": "admin@sunrise.com",
  "fullName": "Admin User",
  "phone": "9841234567",
  "role": "SUPER_ADMIN",
  "status": "approved",
  "unitNumber": null,
  "profileImage": null,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

```json
{
  "uid": "tenant123",
  "email": "john@example.com",
  "fullName": "John Doe",
  "phone": "9841234568",
  "role": "TENANT",
  "status": "pending_approval",
  "unitNumber": "A-101",
  "profileImage": "https://example.com/photo.jpg",
  "createdAt": "2026-05-20T10:00:00.000Z",
  "updatedAt": "2026-05-20T10:00:00.000Z",
  "approvedBy": null,
  "approvedAt": null
}
```

## 2. User Roles Reference

| Role | Description | Default Status |
|------|-------------|-----------------|
| SUPER_ADMIN | Full system access, manages all settings | approved (auto) |
| MANAGER | Property management, staff oversight | pending_approval |
| OWNER | Property owner, views unit financials | pending_approval |
| TENANT | Rents units, makes payments | pending_approval |
| OFFICE_STAFF | Administrative tasks | pending_approval |
| PLUMBER | Maintenance vendor | pending_approval |
| GUARD | Security personnel | pending_approval |

## 3. Authentication Flow

### Sign Up Process:
1. User selects role from dropdown
2. Fills: Full Name, Phone, Email, Password
3. Optional: Unit Number (for TENANT/OWNER)
4. Firebase Auth creates user
5. Cloud Function creates user document with `status: 'pending_approval'`
6. User redirected to "Awaiting Approval" page

### Sign In Process:
1. User enters email/password OR uses Google Sign-In
2. System checks user document in Firestore
3. If `status === 'pending_approval'` → redirect to /awaiting-approval
4. If `status === 'approved'` → allow access to dashboard

### Approval Process (Super Admin Only):
1. Super Admin views pending users in dashboard
2. Reviews user details
3. Updates document: `status: 'approved'`, adds `approvedBy` and `approvedAt`
4. User can now access dashboard

## 4. Security Rules Summary

- **Own Profile**: Users can read/write only their own `/users/{uid}` document
- **Super Admin**: Can read/write all collections
- **Protected Data**: All other collections (buildings, units, invoices, etc.) accessible only to Super Admin
- **Approval Check**: Middleware checks `profile.status === 'approved'` before routing to protected pages