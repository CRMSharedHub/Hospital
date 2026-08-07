import { useAuthStore } from '../store/authStore'
import type { Permission, Role } from './permissions'
import { hasPermission, hasAnyPermission, hasAllPermissions, ROLE_PERMISSIONS, getRoutePermission } from './permissions'

export function usePermission() {
  const user = useAuthStore((state) => state.user)

  return {
    can: (permission: Permission) => hasPermission(user, permission),
    canAny: (permissions: Permission[]) => hasAnyPermission(user, permissions),
    canAll: (permissions: Permission[]) => hasAllPermissions(user, permissions),
    role: user?.role ?? null,
    isAdmin: user?.role === 'admin',
    isDoctor: user?.role === 'doctor',
    isNurse: user?.role === 'nurse',
    isPatient: user?.role === 'patient',
    permissions: user ? ROLE_PERMISSIONS[user.role] ?? [] : [],
  }
}

export function useCanAccessRoute(path: string): boolean {
  const user = useAuthStore((state) => state.user)
  if (!user) return false
  const perm = getRoutePermission(path)
  if (!perm) return true
  return hasPermission(user, perm)
}

export type { Permission, Role }
