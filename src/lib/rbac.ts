import type { UserRole } from '@/context/AuthContext'

export const RoleHierarchy: Record<UserRole, number> = {
  SUPER_ADMIN: 1,
  MANAGER: 2,
  OFFICE_ASSISTANT: 3,
  RESIDENT: 4,
  TENANT: 4,
  GENERAL_STAFF: 5,
  PLUMBER: 6,
  ELECTRICIAN: 6,
  CLEANER: 6,
  GUARD: 6,
  ACCOUNTANT: 3
}

export type PermissionAction = 
  | 'manage_users'
  | 'assign_roles'
  | 'manage_apartments'
  | 'approve_residents'
  | 'view_financial_reports'
  | 'manage_visitors'
  | 'view_audit_logs'

const RolePermissions: Record<UserRole, PermissionAction[]> = {
  SUPER_ADMIN: [
    'manage_users', 'assign_roles', 'manage_apartments', 
    'approve_residents', 'view_financial_reports', 'manage_visitors', 'view_audit_logs'
  ],
  MANAGER: [
    'manage_users', 'manage_apartments', 'approve_residents', 
    'view_financial_reports', 'manage_visitors'
  ],
  OFFICE_ASSISTANT: [
    'manage_visitors'
  ],
  RESIDENT: [
    'manage_visitors'
  ],
  TENANT: [],
  GENERAL_STAFF: [],
  PLUMBER: [],
  ELECTRICIAN: [],
  CLEANER: [],
  GUARD: [],
  ACCOUNTANT: ['view_financial_reports']
}

export function hasClearance(requesterRole: UserRole, targetRole: UserRole): boolean {
  const requesterLevel = RoleHierarchy[requesterRole]
  const targetLevel = RoleHierarchy[targetRole]
  
  if (requesterLevel === undefined || targetLevel === undefined) return false
  
  // A role can only modify roles with a HIGHER clearance level number (which means lower privilege)
  // Super Admin (1) can modify Admin (2)
  return requesterLevel < targetLevel
}

export function canPerformAction(role: UserRole | undefined, action: PermissionAction): boolean {
  if (!role) return false
  const permissions = RolePermissions[role] || []
  return permissions.includes(action)
}
