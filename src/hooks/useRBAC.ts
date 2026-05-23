import { useAuth, UserRole } from '@/context/AuthContext'
import { canPerformAction, hasClearance, PermissionAction } from '@/lib/rbac'

export function useRBAC() {
  const { profile } = useAuth()

  const isAuthorized = (action: PermissionAction): boolean => {
    if (!profile) return false
    return canPerformAction(profile.role, action)
  }

  const canManageUser = (targetRole: UserRole): boolean => {
    if (!profile) return false
    return hasClearance(profile.role, targetRole)
  }

  return {
    isAuthorized,
    canManageUser,
    clearanceLevel: profile?.clearance_level || 7,
    role: profile?.role
  }
}
